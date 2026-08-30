import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { AuditCategory } from '@areena/shared';
import { seedDemoDatabase } from './seedDemo.service';

let resetTimeoutHandle: NodeJS.Timeout | null = null;

/**
 * Calculates milliseconds from now until the next 02:00:00 AM local time.
 */
export function getMsUntilNext2Am(fromTime: Date = new Date()): { ms: number; targetDate: Date } {
    const target = new Date(fromTime);
    target.setHours(2, 0, 0, 0);

    // If 2:00 AM today has already passed, schedule for 2:00 AM tomorrow
    if (fromTime.getTime() >= target.getTime()) {
        target.setDate(target.getDate() + 1);
    }

    const ms = target.getTime() - fromTime.getTime();
    return { ms, targetDate: target };
}

/**
 * Executes a full demo reset and database re-seed.
 */
export async function executeDailyDemoReset(source: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER' = 'SCHEDULED_CRON') {
    console.log(`[Demo Scheduler] 🔄 Executing demo database reset (Source: ${source})...`);
    const startTime = Date.now();

    try {
        await seedDemoDatabase();

        const durationMs = Date.now() - startTime;
        console.log(`[Demo Scheduler] ✅ Demo database reset completed in ${durationMs}ms`);

        // Record audit trail
        try {
            await prisma.auditLog.create({
                data: {
                    userEmail: 'system.scheduler@areena.ch',
                    userName: 'System Demo Scheduler',
                    action: 'SYSTEM_DEMO_DAILY_RESET',
                    category: AuditCategory.GOVERNANCE,
                    description: `Automated daily demo database reset and seed executed successfully (${source}, took ${durationMs}ms).`,
                    status: 'SUCCESS',
                    metadata: { source, durationMs, resetAt: new Date().toISOString() },
                },
            });
        } catch (auditErr) {
            console.warn('[Demo Scheduler] Could not record reset audit log:', auditErr);
        }
    } catch (err: any) {
        console.error('[Demo Scheduler] ❌ Demo reset failed:', err);
    }
}

/**
 * Schedules the recurring 2:00 AM daily reset.
 */
function scheduleNextRun() {
    if (resetTimeoutHandle) {
        clearTimeout(resetTimeoutHandle);
        resetTimeoutHandle = null;
    }

    const { ms, targetDate } = getMsUntilNext2Am();
    const hours = (ms / (1000 * 60 * 60)).toFixed(2);

    console.log(
        `[Demo Scheduler] ⏰ Next daily demo database reset scheduled for: ${targetDate.toLocaleString()} (in ${hours} hours)`,
    );

    resetTimeoutHandle = setTimeout(async () => {
        try {
            await executeDailyDemoReset('SCHEDULED_CRON');
        } finally {
            scheduleNextRun();
        }
    }, ms);
}

/**
 * Starts the demo reset scheduler if config.isDemo is true.
 */
export function startDemoScheduler() {
    if (!config.isDemo) {
        console.log('[Demo Scheduler] IS_DEMO is false. Demo scheduler deactivated.');
        return;
    }

    console.log('[Demo Scheduler] 🚀 Demo mode active (IS_DEMO=true). Initializing 2:00 AM daily reset scheduler...');
    scheduleNextRun();
}

/**
 * Stops the scheduler timer (useful for clean shutdown or testing).
 */
export function stopDemoScheduler() {
    if (resetTimeoutHandle) {
        clearTimeout(resetTimeoutHandle);
        resetTimeoutHandle = null;
        console.log('[Demo Scheduler] Scheduler stopped.');
    }
}
