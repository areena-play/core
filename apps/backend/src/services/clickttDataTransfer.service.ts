import { spawn, spawnSync } from 'child_process';
import { Response } from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import { getScraperConfig } from '../scraper/config';
import { stateManager } from '../scraper/stateManager';
import { storageManager } from '../scraper/storageManager';
import { ClickTTScraperService } from './clickttScraper.service';

export interface ClickTTTransferSummary {
    totalFiles: number;
    totalSizeBytes: number;
    jsonlFiles: Array<{ name: string; sizeBytes: number; lineCount?: number }>;
    hasCheckpoints: boolean;
    hasNormalizedData: boolean;
    extractedAt: string;
}

export class ClickTTDataTransferService {
    /**
     * Streams a compressed .tar.gz archive of the ClickTT scraper storage directory
     * directly to the Express HTTP response.
     */
    static async streamScrapedArchive(res: Response, options: { includeCache?: boolean } = {}): Promise<void> {
        const config = await getScraperConfig();
        const storageDir = config.storageDir;

        if (!fs.existsSync(storageDir)) {
            await fsPromises.mkdir(storageDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `clicktt_scraped_data_${dateStr}.tar.gz`;

        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');

        console.log(`[ClickTTTransfer] 📦 Creating compressed archive from: ${storageDir} (includeCache=${Boolean(options.includeCache)})`);

        return new Promise((resolve, reject) => {
            const tarArgs = ['-czf', '-'];
            if (!options.includeCache) {
                tarArgs.push('--exclude=cache');
            }
            tarArgs.push('-C', storageDir, '.');

            const tarProc = spawn('tar', tarArgs, {
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let errorBuffer = '';

            tarProc.stderr.on('data', (chunk: Buffer) => {
                errorBuffer += chunk.toString();
            });

            tarProc.stdout.pipe(res);

            tarProc.on('error', (err: any) => {
                console.error('[ClickTTTransfer] Tar spawn error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: `Failed to create tar archive: ${err.message}` });
                }
                reject(err);
            });

            tarProc.on('close', (code: number | null) => {
                if (code === 0) {
                    console.log(`[ClickTTTransfer] ✅ Successfully streamed ClickTT archive: ${filename}`);
                    resolve();
                } else {
                    const errMsg = errorBuffer || `tar exited with code ${code}`;
                    console.error(`[ClickTTTransfer] ❌ Archive creation failed: ${errMsg}`);
                    reject(new Error(errMsg));
                }
            });

            res.on('close', () => {
                if (tarProc.exitCode === null) {
                    tarProc.kill();
                }
            });
        });
    }

    /**
     * Extracts an uploaded .tar.gz / .zip archive into the ClickTT storage directory,
     * verifies the contents, and reinitializes scraper state.
     */
    static async importScrapedArchive(
        archivePath: string,
        options: { triggerIngest?: boolean } = {}
    ): Promise<{ message: string; summary: ClickTTTransferSummary }> {
        const config = await getScraperConfig();
        const storageDir = config.storageDir;

        if (!fs.existsSync(archivePath)) {
            throw new Error(`Uploaded archive file not found at: ${archivePath}`);
        }

        const stats = await fsPromises.stat(archivePath);
        console.log(`[ClickTTTransfer] 📥 Importing ClickTT archive (${(stats.size / (1024 * 1024)).toFixed(2)} MB) into: ${storageDir}`);

        await fsPromises.mkdir(storageDir, { recursive: true });

        // Extract tar archive
        await new Promise<void>((resolve, reject) => {
            const tarProc = spawn('tar', ['-xzf', archivePath, '-C', storageDir], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let errorBuffer = '';
            tarProc.stderr.on('data', (chunk: Buffer) => {
                errorBuffer += chunk.toString();
            });

            tarProc.on('error', (err: any) => {
                console.error('[ClickTTTransfer] Tar extraction spawn error:', err);
                reject(new Error(`Failed to extract archive: ${err.message}`));
            });

            tarProc.on('close', (code: number | null) => {
                if (code === 0) {
                    resolve();
                } else {
                    const errMsg = errorBuffer || `tar exited with code ${code}`;
                    console.error(`[ClickTTTransfer] ❌ Archive extraction failed: ${errMsg}`);
                    reject(new Error(errMsg));
                }
            });
        });

        // Clean up temporary uploaded archive file
        try {
            await fsPromises.unlink(archivePath);
        } catch {
            // Ignore temp file cleanup error
        }

        // Re-initialize state and storage managers
        try {
            await storageManager.init();
            await stateManager.init();
        } catch (err) {
            console.warn('[ClickTTTransfer] Warning re-initializing state manager:', err);
        }

        // Inspect and build summary
        const summary = await this.inspectStorageDir(storageDir);

        console.log(`[ClickTTTransfer] ✅ Successfully imported ClickTT data: ${summary.totalFiles} files (${(summary.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
        ClickTTScraperService.log('success', `📥 Successfully imported ClickTT archive (${summary.totalFiles} files, ${(summary.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB).`);

        // If requested, trigger background ingestion into database
        if (options.triggerIngest) {
            console.log('[ClickTTTransfer] 🚀 Triggering automatic full database ingestion from imported datasets...');
            ClickTTScraperService.log('info', '🚀 Triggering automatic database reset & ingest from imported datasets...');
            ClickTTScraperService.runJob('reset-db', {}).catch((err) => {
                console.error('[ClickTTTransfer] Background ingestion error:', err);
            });
        }

        return {
            message: `ClickTT scraped data successfully imported (${summary.totalFiles} files).${options.triggerIngest ? ' Database ingestion initiated in background.' : ''}`,
            summary,
        };
    }

    /**
     * Inspects the storage directory and returns summary of files, sizes, and jsonl counts.
     */
    static async inspectStorageDir(dirPath: string): Promise<ClickTTTransferSummary> {
        let totalFiles = 0;
        let totalSizeBytes = 0;
        const jsonlFiles: Array<{ name: string; sizeBytes: number; lineCount?: number }> = [];
        let hasCheckpoints = false;
        let hasNormalizedData = false;

        async function walk(currentDir: string) {
            if (!fs.existsSync(currentDir)) return;
            const entries = await fsPromises.readdir(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'checkpoints') hasCheckpoints = true;
                    if (entry.name === 'data') hasNormalizedData = true;
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    totalFiles++;
                    const fileStat = await fsPromises.stat(fullPath);
                    totalSizeBytes += fileStat.size;

                    if (entry.name.endsWith('.jsonl')) {
                        jsonlFiles.push({
                            name: entry.name,
                            sizeBytes: fileStat.size,
                        });
                    }
                }
            }
        }

        await walk(dirPath);

        return {
            totalFiles,
            totalSizeBytes,
            jsonlFiles,
            hasCheckpoints,
            hasNormalizedData,
            extractedAt: new Date().toISOString(),
        };
    }
}
