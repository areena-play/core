import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import readline from 'readline';
import path from 'path';
import { getScraperConfig } from './config';

export class StorageManager {
    public deltaTrackingActive = false;
    public deltaSession: Map<string, Map<string, any>> = new Map();
    public deltaStartTime: Date | null = null;

    async getPaths() {
        const config = await getScraperConfig();
        return {
            storageDir: config.storageDir,
            dataDir: config.dataDir,
        };
    }

    async init() {
        const { storageDir, dataDir } = await this.getPaths();
        await fs.mkdir(storageDir, { recursive: true });
        await fs.mkdir(dataDir, { recursive: true });
    }

    async getJsonlPath(entityName: string) {
        const { storageDir } = await this.getPaths();
        return path.join(storageDir, `${entityName}.jsonl`);
    }

    async getDataJsonPath(entityName: string) {
        const { dataDir } = await this.getPaths();
        return path.join(dataDir, `${entityName}.json`);
    }

    getRecordKey(entityName: string, record: any): string | null {
        if (!record) return null;
        const key =
            record.licenceNr ||
            record.clubNr ||
            record.competitionId ||
            record.encounterId ||
            record.matchId ||
            record.groupId ||
            record.categoryId ||
            record.seasonNickname ||
            record.id;
        return key ? String(key) : null;
    }

    // Append a single record to entity JSONL file (safe for streaming)
    async appendRecord(entityName: string, record: any) {
        if (!record) return;
        const filePath = await this.getJsonlPath(entityName);
        const line = JSON.stringify(record) + '\n';
        await fs.appendFile(filePath, line, 'utf-8');

        if (this.deltaTrackingActive) {
            if (!this.deltaSession.has(entityName)) {
                this.deltaSession.set(entityName, new Map());
            }
            const key = this.getRecordKey(entityName, record) || `gen_${Math.random()}`;
            this.deltaSession.get(entityName)!.set(key, record);
        }
    }

    // Append multiple records to entity JSONL file in a single batch
    async appendBatch(entityName: string, records: any[]) {
        if (!Array.isArray(records) || records.length === 0) return;
        const filePath = await this.getJsonlPath(entityName);
        const chunk = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
        await fs.appendFile(filePath, chunk, 'utf-8');

        if (this.deltaTrackingActive) {
            if (!this.deltaSession.has(entityName)) {
                this.deltaSession.set(entityName, new Map());
            }
            const entityMap = this.deltaSession.get(entityName)!;
            for (const r of records) {
                if (r) {
                    const key = this.getRecordKey(entityName, r) || `gen_${Math.random()}`;
                    entityMap.set(key, r);
                }
            }
        }
    }

    startDeltaTracking() {
        this.deltaTrackingActive = true;
        this.deltaSession = new Map();
        this.deltaStartTime = new Date();
    }

    clearDelta() {
        this.deltaTrackingActive = false;
        this.deltaSession = new Map();
    }

    getDelta() {
        const counts: Record<string, number> = {};
        const data: Record<string, any[]> = {};
        let totalRecords = 0;

        const knownEntities = [
            'players',
            'player_histories',
            'clubs',
            'seasons',
            'competitions',
            'categories',
            'groups',
            'encounters',
            'matches',
        ];

        for (const ent of knownEntities) {
            const map = this.deltaSession.get(ent);
            const records = map ? Array.from(map.values()) : [];
            counts[ent] = records.length;
            data[ent] = records;
            totalRecords += records.length;
        }

        return {
            startedAt: this.deltaStartTime?.toISOString() || null,
            endedAt: new Date().toISOString(),
            totalRecords,
            counts,
            data,
        };
    }

    async exportDeltaToJson(): Promise<{
        totalRecords: number;
        counts: Record<string, number>;
        filePath: string;
        fileName: string;
        fileSizeKb: string;
    }> {
        const delta = this.getDelta();
        const { dataDir } = await this.getPaths();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `delta_sync_${timestamp}.json`;
        const filePath = path.join(dataDir, fileName);

        await fs.writeFile(filePath, JSON.stringify(delta, null, 2), 'utf-8');

        // Also save latest delta pointer
        const latestPath = path.join(dataDir, 'latest_delta.json');
        await fs.writeFile(latestPath, JSON.stringify(delta, null, 2), 'utf-8');

        const stat = await fs.stat(filePath);
        const fileSizeKb = (stat.size / 1024).toFixed(1);

        this.clearDelta();

        return {
            totalRecords: delta.totalRecords,
            counts: delta.counts,
            filePath,
            fileName,
            fileSizeKb,
        };
    }

    // Stream records from entity JSONL
    async *streamRecords(entityName: string): AsyncGenerator<any> {
        const filePath = await this.getJsonlPath(entityName);
        if (!existsSync(filePath)) return;

        const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
            const trimmed = line.trim();
            if (trimmed) {
                try {
                    yield JSON.parse(trimmed);
                } catch {}
            }
        }
    }

    // Read all records from JSONL file in memory
    async readAllRecords(entityName: string): Promise<any[]> {
        const records: any[] = [];
        for await (const r of this.streamRecords(entityName)) {
            records.push(r);
        }
        return records;
    }

    // Deduplicate/compact JSONL by unique primary key
    async compactEntity(entityName: string, primaryKeyField: string): Promise<number> {
        const map = new Map<string, any>();
        for await (const r of this.streamRecords(entityName)) {
            const key = String(r[primaryKeyField] || r.id || '').trim();
            if (key) {
                // Latest write wins
                map.set(key, r);
            }
        }

        const filePath = await this.getJsonlPath(entityName);
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        const lines = Array.from(map.values()).map((r) => JSON.stringify(r)).join('\n') + (map.size > 0 ? '\n' : '');
        await fs.writeFile(tempPath, lines, 'utf-8');
        await fs.rename(tempPath, filePath);

        return map.size;
    }

    // Export compacted records from JSONL directly to formatted JSON
    async exportToJson(entityName: string): Promise<number> {
        const records = await this.readAllRecords(entityName);
        const targetPath = await this.getDataJsonPath(entityName);
        await fs.writeFile(targetPath, JSON.stringify(records, null, 2), 'utf-8');
        return records.length;
    }
}

export const storageManager = new StorageManager();

