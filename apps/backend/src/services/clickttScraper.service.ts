import { EventEmitter } from 'events';
import { runInitialScrape, runIncrementalSync, exportAllNormalizedDatasets, stateManager, storageManager, getScraperConfig } from '../scraper';
import type { IngestionProgress } from './clickttDbIngestion.service';

export interface ScraperExecutionStatus {
    isRunning: boolean;
    activeJob: string | null;
    startedAt: string | null;
    elapsedSec: number;
    lastFinishedAt: string | null;
    lastResult: 'success' | 'error' | null;
    lastError: string | null;
    progress: IngestionProgress | null;
    summary: any | null;
}

export interface ScraperLogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
}

class ClickTTScraperManager extends EventEmitter {
    private isRunning: boolean = false;
    private activeJob: string | null = null;
    private startedAt: number | null = null;
    private lastFinishedAt: string | null = null;
    private lastResult: 'success' | 'error' | null = null;
    private lastError: string | null = null;
    private progress: IngestionProgress | null = null;
    private logs: ScraperLogEntry[] = [];
    private maxLogs: number = 2000;
    private abortController: AbortController | null = null;

    constructor() {
        super();
    }

    public log(level: 'info' | 'warn' | 'error' | 'success', message: string) {
        const entry: ScraperLogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
        };
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.emit('log', entry);
    }

    public getLogs(limit = 200): ScraperLogEntry[] {
        return this.logs.slice(-limit);
    }

    public clearLogs() {
        this.logs = [];
    }

    public stopJob(): boolean {
        if (!this.isRunning) {
            return false;
        }
        const job = this.activeJob;
        this.log('warn', `🛑 Cancellation requested: Aborting active task "${job}"...`);
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isRunning = false;
        this.lastResult = 'error';
        this.lastError = 'Task was cancelled by administrator.';
        this.lastFinishedAt = new Date().toISOString();
        this.progress = {
            phase: 'error',
            phaseTitle: 'Stopped',
            percentage: this.progress?.percentage || 0,
            processed: this.progress?.processed || 0,
            total: this.progress?.total,
            message: `🛑 Task "${job}" stopped by administrator.`,
        };
        return true;
    }

    public async getStatus(): Promise<ScraperExecutionStatus> {
        let summary: any = null;
        try {
            await stateManager.init();
            summary = await stateManager.getSummary();
        } catch (err) {
            // Ignore if state manager not yet initialized
        }

        const elapsedSec = this.startedAt && this.isRunning ? Math.round((Date.now() - this.startedAt) / 1000) : 0;

        return {
            isRunning: this.isRunning,
            activeJob: this.activeJob,
            startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
            elapsedSec,
            lastFinishedAt: this.lastFinishedAt,
            lastResult: this.lastResult,
            lastError: this.lastError,
            progress: this.progress,
            summary,
        };
    }

    public async runJob(jobType: 'initial' | 'sync' | 'results' | 'players' | 'elo' | 'export' | 'reset-db', options: any = {}): Promise<void> {
        if (this.isRunning) {
            throw new Error(`A Click-TT scraper job (${this.activeJob}) is already running.`);
        }

        this.isRunning = true;
        this.activeJob = jobType;
        this.startedAt = Date.now();
        this.lastResult = null;
        this.lastError = null;
        this.abortController = new AbortController();
        const signal = this.abortController.signal;
        this.progress = {
            phase: 'cleanup',
            phaseTitle: `Starting ${jobType.toUpperCase()}`,
            percentage: 0,
            processed: 0,
            message: `Starting task ${jobType.toUpperCase()}...`,
        };

        // Hook console logging during job execution to capture only scraper-generated output
        const originalConsoleLog = console.log;
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;

        const isScraperMessage = (str: string): boolean => {
            if (!str || !str.trim()) return false;
            // Explicitly filter out general backend system and database queries
            if (/^prisma:(query|info|warn|error)/i.test(str)) return false;
            if (/^(GET|POST|PUT|DELETE|PATCH|OPTIONS)\s+\//i.test(str)) return false;
            if (/\[(Auth|Billing|Email|Security|Audit|DatabasePool|WebSocket)\]/i.test(str)) return false;
            if (/Executing query|Starting a postgresql pool/i.test(str)) return false;

            // Match scraper specific keywords & prefixes
            if (
                /(\[Step\s+\d|\[Elo Scraper\]|\[Tournaments\]|\[Leagues & Cups\]|\[Clubs\]|\[Players\]|\[Seasons\]|\[Delta Export\]|\[DB Bulk Ingest\]|\[Database Ingestion\]|Click-TT|ClickTT|Scraper Task|stateManager|storageManager)/i.test(
                    str
                )
            ) {
                return true;
            }

            // Match scraper emojis and structured headers
            if (/[🚀▶️⏭️📦🎉🏁⚡📈🎯📅✨⏩ℹ️🏆🏓🏢🏛️🧹❌✅]/.test(str)) {
                return true;
            }

            // Match divider borders
            if (/^={10,}/.test(str.trim())) {
                return true;
            }

            return false;
        };

        const formatArgs = (args: any[]) => args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

        console.log = (...args: any[]) => {
            const formatted = formatArgs(args);
            if (isScraperMessage(formatted)) {
                this.log('info', formatted);
            }
            originalConsoleLog.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            const formatted = formatArgs(args);
            if (isScraperMessage(formatted)) {
                this.log('warn', formatted);
            }
            originalConsoleWarn.apply(console, args);
        };

        console.error = (...args: any[]) => {
            const formatted = formatArgs(args);
            if (isScraperMessage(formatted)) {
                this.log('error', formatted);
            }
            originalConsoleError.apply(console, args);
        };

        try {
            this.log('info', `🚀 Starting Scraper Task: ${jobType.toUpperCase()}...`);

            if (jobType === 'initial') {
                await runInitialScrape(options);
                // Ingest latest delta if produced
                const delta = storageManager.getDelta();
                if (delta && delta.totalRecords > 0) {
                    const { ClickTTDbIngestionService } = await import('./clickttDbIngestion.service');
                    await ClickTTDbIngestionService.ingestDelta(delta, signal);
                }
            } else if (jobType === 'sync') {
                await runIncrementalSync(options);
                const delta = storageManager.getDelta();
                if (delta && delta.totalRecords > 0) {
                    const { ClickTTDbIngestionService } = await import('./clickttDbIngestion.service');
                    await ClickTTDbIngestionService.ingestDelta(delta, signal);
                }
            } else if (jobType === 'results') {
                await runIncrementalSync({ onlyResults: true, ...options });
                const delta = storageManager.getDelta();
                if (delta && delta.totalRecords > 0) {
                    const { ClickTTDbIngestionService } = await import('./clickttDbIngestion.service');
                    await ClickTTDbIngestionService.ingestDelta(delta, signal);
                }
            } else if (jobType === 'players') {
                await runIncrementalSync({ onlyPlayers: true, ...options });
                const delta = storageManager.getDelta();
                if (delta && delta.totalRecords > 0) {
                    const { ClickTTDbIngestionService } = await import('./clickttDbIngestion.service');
                    await ClickTTDbIngestionService.ingestDelta(delta, signal);
                }
            } else if (jobType === 'elo') {
                await runIncrementalSync({ onlyElo: true, ...options });
                const delta = storageManager.getDelta();
                if (delta && delta.totalRecords > 0) {
                    const { ClickTTDbIngestionService } = await import('./clickttDbIngestion.service');
                    await ClickTTDbIngestionService.ingestDelta(delta, signal);
                }
            } else if (jobType === 'export') {
                await exportAllNormalizedDatasets();
            } else if (jobType === 'reset-db') {
                const { ClickTTDbIngestionService } = await import('./clickttDbIngestion.service');
                await ClickTTDbIngestionService.resetAndLoadFullDatasets((progress) => {
                    this.progress = progress;
                    this.log('info', progress.message);
                }, signal);
            }

            this.lastResult = 'success';
            this.progress = {
                phase: 'done',
                phaseTitle: 'Completed',
                percentage: 100,
                processed: this.progress?.processed || 0,
                total: this.progress?.total,
                message: `Task "${jobType}" completed successfully!`,
            };
            this.log('success', `🎉 Scraper Task "${jobType}" completed successfully!`);
        } catch (err: any) {
            this.lastResult = 'error';
            this.lastError = err.message || String(err);
            this.progress = {
                phase: 'error',
                phaseTitle: 'Error',
                percentage: this.progress?.percentage || 0,
                processed: this.progress?.processed || 0,
                total: this.progress?.total,
                message: `Task failed: ${this.lastError}`,
            };
            this.log('error', `❌ Scraper Task failed with error: ${this.lastError}`);
            throw err;
        } finally {
            this.isRunning = false;
            this.lastFinishedAt = new Date().toISOString();
            console.log = originalConsoleLog;
            console.warn = originalConsoleWarn;
            console.error = originalConsoleError;
        }
    }

    public initCronJobs() {
        const { CronSchedulerService } = require('./cronScheduler.service');

        // 1. Incremental match results & tournaments sync (every 15 minutes)
        CronSchedulerService.registerJob({
            name: 'clicktt-incremental-results',
            title: 'Click-TT Match Results & Tournaments Sync',
            description: 'Extracts real-time match scores and active tournament brackets from Click-TT',
            intervalMs: 15 * 60 * 1000, // 15 minutes
            handler: async () => {
                await this.runJob('results', { skipTournaments: false });
                return 'Incremental results & tournaments sync completed';
            },
        });

        // 2. Daily new clubs & player roster sync (every 24 hours)
        CronSchedulerService.registerJob({
            name: 'clicktt-daily-players',
            title: 'Click-TT Clubs & Players Roster Sync',
            description: 'Scans for newly registered clubs, players and licensing updates in Click-TT',
            intervalMs: 24 * 60 * 60 * 1000, // 24 hours
            handler: async () => {
                await this.runJob('players');
                return 'Clubs & players roster sync completed';
            },
        });

        // 3. Monthly Elo Snapshot check (every 24 hours)
        CronSchedulerService.registerJob({
            name: 'clicktt-monthly-elo',
            title: 'Click-TT Monthly Elo Snapshot Sync',
            description: 'Checks for newly published monthly Elo ranking dates and updates player timelines',
            intervalMs: 24 * 60 * 60 * 1000, // 24 hours
            handler: async () => {
                await this.runJob('elo');
                return 'Monthly Elo snapshot check completed';
            },
        });
    }
}

export const ClickTTScraperService = new ClickTTScraperManager();
