import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import readline from 'readline';
import path from 'path';
import { getScraperConfig } from './config';

export interface ScraperMeta {
    version: string;
    initializedAt: string | null;
    lastSyncAt: string | null;
    lastExportAt?: string | null;
    latestSeason: string | null;
    lastEloRankingDate: string | null;
    counts: Record<string, number>;
    totalSeasons?: number;
    [key: string]: any;
}

export class StateManager {
    private sets: Map<string, Set<string>> = new Map();
    public meta: ScraperMeta = {
        version: '2.0.0',
        initializedAt: null,
        lastSyncAt: null,
        latestSeason: null,
        lastEloRankingDate: null,
        counts: {},
    };

    private async getPaths() {
        const config = await getScraperConfig();
        return {
            storageDir: config.storageDir,
            dataDir: config.dataDir,
            cacheDir: config.cacheDir,
            checkpointsDir: config.checkpointsDir,
            stateFile: path.join(config.storageDir, 'scraper_state.json'),
        };
    }

    async init() {
        const { storageDir, dataDir, cacheDir, checkpointsDir, stateFile } = await this.getPaths();
        await fs.mkdir(checkpointsDir, { recursive: true });
        await fs.mkdir(storageDir, { recursive: true });
        await fs.mkdir(dataDir, { recursive: true });
        await fs.mkdir(cacheDir, { recursive: true });

        // Load metadata state
        try {
            if (existsSync(stateFile)) {
                const raw = await fs.readFile(stateFile, 'utf-8');
                this.meta = { ...this.meta, ...JSON.parse(raw) };
            }
        } catch {}

        if (!this.meta.initializedAt) {
            this.meta.initializedAt = new Date().toISOString();
        }
    }

    async getCheckpointPath(name: string) {
        const { checkpointsDir } = await this.getPaths();
        return path.join(checkpointsDir, `${name}.txt`);
    }

    // Load a checkpoint set into memory for fast O(1) checks
    async getSet(name: string): Promise<Set<string>> {
        if (this.sets.has(name)) {
            return this.sets.get(name)!;
        }

        const set = new Set<string>();
        const filePath = await this.getCheckpointPath(name);

        if (existsSync(filePath)) {
            const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
            const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

            for await (const line of rl) {
                const trimmed = line.trim();
                if (trimmed) set.add(trimmed);
            }
        }

        this.sets.set(name, set);
        return set;
    }

    async markCompleted(name: string, key: string | number) {
        const stringKey = String(key).trim();
        if (!stringKey) return;

        const set = await this.getSet(name);
        if (!set.has(stringKey)) {
            set.add(stringKey);
            const filePath = await this.getCheckpointPath(name);
            await fs.appendFile(filePath, `${stringKey}\n`, 'utf-8');
        }
    }

    async markBatchCompleted(name: string, keys: Array<string | number>) {
        const set = await this.getSet(name);
        const newKeys: string[] = [];

        for (const k of keys) {
            const stringKey = String(k).trim();
            if (stringKey && !set.has(stringKey)) {
                set.add(stringKey);
                newKeys.push(stringKey);
            }
        }

        if (newKeys.length > 0) {
            const filePath = await this.getCheckpointPath(name);
            await fs.appendFile(filePath, `${newKeys.join('\n')}\n`, 'utf-8');
        }
    }

    async isCompleted(name: string, key: string | number): Promise<boolean> {
        const set = await this.getSet(name);
        return set.has(String(key).trim());
    }

    async saveSet(name: string, set: Set<string>) {
        this.sets.set(name, set);
        const filePath = await this.getCheckpointPath(name);
        const lines = Array.from(set).join('\n') + (set.size > 0 ? '\n' : '');
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        await fs.writeFile(tempPath, lines, 'utf-8');
        await fs.rename(tempPath, filePath);
    }

    async saveMeta(updates: Partial<ScraperMeta> = {}) {
        const { stateFile } = await this.getPaths();
        this.meta = { ...this.meta, ...updates, updatedAt: new Date().toISOString() };
        const tempPath = `${stateFile}.tmp.${Date.now()}`;
        await fs.writeFile(tempPath, JSON.stringify(this.meta, null, 2), 'utf-8');
        await fs.rename(tempPath, stateFile);
    }

    async getSummary() {
        const { stateFile, dataDir, checkpointsDir } = await this.getPaths();

        // 1. Reload metadata from disk to ensure freshness
        try {
            if (existsSync(stateFile)) {
                const raw = await fs.readFile(stateFile, 'utf-8');
                this.meta = { ...this.meta, ...JSON.parse(raw) };
            }
        } catch {}

        // 2. Checkpoint line counts
        const checkpoints = [
            'seasons',
            'clubs',
            'players',
            'player_elo',
            'player_details',
            'championships',
            'groups',
            'completed_played_encounters',
            'completed_meeting_matches',
            'tournaments',
        ];

        const checkpointCounts: Record<string, number> = {};
        for (const cp of checkpoints) {
            const filePath = path.join(checkpointsDir, `${cp}.txt`);
            if (existsSync(filePath)) {
                const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
                const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
                let count = 0;
                for await (const line of rl) {
                    if (line.trim()) count++;
                }
                checkpointCounts[cp] = count;
            } else {
                checkpointCounts[cp] = 0;
            }
        }

        // 3. Exported Normalized Datasets (data/*.json)
        const datasetEntities = [
            'matches',
            'encounters',
            'groups',
            'categories',
            'competitions',
            'players',
            'player_histories',
            'clubs',
            'seasons',
        ];

        const datasetCounts: Record<string, { count: number; sizeBytes: number; exists: boolean }> = {};
        for (const entity of datasetEntities) {
            const jsonPath = path.join(dataDir, `${entity}.json`);
            if (existsSync(jsonPath)) {
                const stat = await fs.stat(jsonPath);
                const count = this.meta.counts?.[entity] ?? 0;
                datasetCounts[entity] = {
                    count,
                    sizeBytes: stat.size,
                    exists: true,
                };
            } else {
                datasetCounts[entity] = {
                    count: 0,
                    sizeBytes: 0,
                    exists: false,
                };
            }
        }

        return {
            meta: this.meta,
            counts: this.meta.counts || {},
            datasets: datasetCounts,
            checkpoints: checkpointCounts,
        };
    }
}

export const stateManager = new StateManager();


