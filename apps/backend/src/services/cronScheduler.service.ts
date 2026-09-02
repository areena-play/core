import os from 'os';
import { prisma } from '../config/prisma';
import { DistributedLockService } from './distributedLock.service';

export interface CronJobDefinition {
    name: string;
    title: string;
    description?: string;
    /**
     * Minimum interval in milliseconds between runs (e.g. 60_000 for 1m, 3600_000 for 1h, 86400_000 for daily)
     */
    intervalMs: number;
    /**
     * The actual task function to execute
     */
    handler: () => Promise<string | void>;
}

export class CronSchedulerService {
    private static registeredJobs = new Map<string, CronJobDefinition>();
    private static pollIntervalHandle: NodeJS.Timeout | null = null;
    private static isRunning = false;
    private static hostname = os.hostname() || 'areena-node';

    /**
     * Register a cluster-safe cron task.
     * Can be registered at app boot time or dynamically by services.
     */
    static registerJob(job: CronJobDefinition) {
        this.registeredJobs.set(job.name, job);
        console.log(`[CronScheduler] 📋 Registered job: ${job.name} (every ${Math.round(job.intervalMs / 1000)}s)`);
    }

    /**
     * Unregisters/deletes a cron task from memory and cleans up its stored state.
     */
    static async unregisterJob(name: string) {
        const removed = this.registeredJobs.delete(name);
        try {
            await prisma.systemSetting.deleteMany({
                where: {
                    key: {
                        in: [`cron_last_run:${name}`, `cron_disabled:${name}`],
                    },
                },
            });
        } catch (err) {
            console.warn(`[CronScheduler] Warning removing settings for '${name}':`, err);
        }
        return removed;
    }

    /**
     * Toggles whether a registered job is enabled or disabled cluster-wide via the database.
     */
    static async setJobEnabled(name: string, enabled: boolean) {
        const key = `cron_disabled:${name}`;
        if (enabled) {
            await prisma.systemSetting.deleteMany({ where: { key } });
        } else {
            await prisma.systemSetting.upsert({
                where: { key },
                create: { key, value: 'true', description: `Job ${name} disabled by admin` },
                update: { value: 'true', description: `Job ${name} disabled by admin` },
            });
        }
    }

    /**
     * Starts the background poller across this VPS node.
     * Checks periodically (e.g. every 10 seconds) if any job is due.
     */
    static start(pollIntervalMs = 10000) {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log(`[CronScheduler] ⏱️ Cluster Cron Runner started on ${this.hostname} (polling every ${pollIntervalMs / 1000}s)`);

        this.pollIntervalHandle = setInterval(async () => {
            await this.checkAndRunJobs();
        }, pollIntervalMs);

        // Run an immediate check on startup
        this.checkAndRunJobs().catch((err) => {
            console.error('[CronScheduler] Initial check error:', err);
        });
    }

    /**
     * Stops the scheduler.
     */
    static stop() {
        if (this.pollIntervalHandle) {
            clearInterval(this.pollIntervalHandle);
            this.pollIntervalHandle = null;
        }
        this.isRunning = false;
        console.log('[CronScheduler] Stopped.');
    }

    /**
     * Iterates through all registered jobs and executes any that are due,
     * protected by PostgreSQL distributed advisory lock.
     */
    private static async checkAndRunJobs() {
        const now = new Date();

        for (const [name, job] of this.registeredJobs.entries()) {
            try {
                // Check if job is disabled cluster-wide by admin
                const disabledSetting = await prisma.systemSetting.findUnique({
                    where: { key: `cron_disabled:${name}` },
                });
                if (disabledSetting?.value === 'true') {
                    continue;
                }

                // 1. Read last execution time using SystemSetting key
                const settingKey = `cron_last_run:${name}`;
                const lastRunSetting = await prisma.systemSetting.findUnique({
                    where: { key: settingKey },
                });

                if (lastRunSetting?.value) {
                    const lastRunDate = new Date(lastRunSetting.value);
                    const elapsedMs = now.getTime() - lastRunDate.getTime();
                    if (elapsedMs < job.intervalMs) {
                        // Not due yet, skip
                        continue;
                    }
                }

                // 2. Job is due! Try to acquire an exclusive distributed lock across all VPS nodes.
                // If another VPS acquired it milliseconds ago, tryWithLock returns { acquired: false }
                await this.executeJobWithLock(name, job, settingKey);
            } catch (err) {
                console.error(`[CronScheduler] Error inspecting job ${name}:`, err);
            }
        }
    }

    /**
     * Executes a specific job with guaranteed cluster-wide exclusivity.
     */
    static async executeJobWithLock(name: string, job: CronJobDefinition, settingKey?: string) {
        const key = settingKey || `cron_last_run:${name}`;
        const resource = `cron_lock:${name}`;

        const lockResult = await DistributedLockService.tryWithLock(resource, async (tx) => {
            // Re-verify inside the lock transaction to prevent double-execution
            const setting = await tx.systemSetting.findUnique({
                where: { key },
            });

            if (setting?.value) {
                const elapsed = Date.now() - new Date(setting.value).getTime();
                if (elapsed < job.intervalMs) {
                    return { skipped: true, reason: 'Already run by another instance' };
                }
            }

            console.log(`[CronScheduler] 🔒 Lock acquired on ${this.hostname}. Running job '${name}'...`);
            const startTime = Date.now();

            // Run the actual job
            let output: string | void;
            try {
                output = await job.handler();
            } catch (jobError: any) {
                console.error(`[CronScheduler] ❌ Job '${name}' failed:`, jobError);
                throw jobError;
            }

            const durationMs = Date.now() - startTime;
            console.log(`[CronScheduler] ✅ Job '${name}' completed in ${durationMs}ms`);

            // Update last run timestamp in database
            await tx.systemSetting.upsert({
                where: { key },
                create: {
                    key,
                    value: new Date().toISOString(),
                    description: `Last run of ${job.title} by ${this.hostname}`,
                },
                update: {
                    value: new Date().toISOString(),
                    description: `Last run of ${job.title} by ${this.hostname}`,
                },
            });

            return { skipped: false, durationMs, output };
        });

        if (!lockResult.acquired) {
            // Another VPS instance acquired the lock first - this node safely skips!
            // console.debug(`[CronScheduler] Job '${name}' skipped (locked by peer node).`);
            return;
        }
    }

    /**
     * Allows admin manual trigger via API / Admin Dashboard.
     */
    static async triggerManual(name: string) {
        const job = this.registeredJobs.get(name);
        if (!job) {
            throw new Error(`Job '${name}' not found.`);
        }
        return await this.executeJobWithLock(name, {
            ...job,
            intervalMs: 0, // Bypass interval check
        });
    }

    /**
     * Returns the current status of all registered cronjobs.
     */
    static async getJobStatuses() {
        const statuses = [];
        for (const [name, job] of this.registeredJobs.entries()) {
            const [lastRunSetting, disabledSetting] = await Promise.all([
                prisma.systemSetting.findUnique({ where: { key: `cron_last_run:${name}` } }),
                prisma.systemSetting.findUnique({ where: { key: `cron_disabled:${name}` } }),
            ]);

            const isEnabled = disabledSetting?.value !== 'true';
            const lastRunAt = lastRunSetting?.value ? new Date(lastRunSetting.value) : null;
            const nextRunAt = lastRunAt ? new Date(lastRunAt.getTime() + job.intervalMs) : new Date();

            statuses.push({
                name,
                title: job.title,
                description: job.description,
                intervalMs: job.intervalMs,
                enabled: isEnabled,
                lastRunAt,
                nextRunAt,
                lastRunBy: lastRunSetting?.description,
            });
        }
        return statuses;
    }
}
