import { CronSchedulerService } from './cronScheduler.service';
import { RatingService } from './rating.service';
import { prisma } from '../config/prisma';

export class RatingSchedulerService {
    /**
     * Registers recurring cluster-safe cron jobs for rating and level calculations.
     */
    static init() {
        // 1. Monthly Elo and Standings Recalculation (runs daily check at 00:00 UTC)
        CronSchedulerService.registerJob({
            name: 'monthly-elo-recalculation',
            title: 'Monthly Elo & Leaderboard Snapshot',
            description: 'Computes official monthly ranking snapshot and national leaderboards (e.g. STT 10th of month)',
            intervalMs: 24 * 60 * 60 * 1000, // Check daily
            handler: async () => {
                const now = new Date();
                const dayOfMonth = now.getUTCDate();

                const associations = await prisma.association.findMany();
                let processedAssocs = 0;

                for (const assoc of associations) {
                    const rules = (assoc.rules as any) || {};
                    const targetDay = rules.ratingEngine?.eloUpdateDayOfMonth ?? 10; // Default 10th of the month

                    if (dayOfMonth === targetDay) {
                        try {
                            await RatingService.runScheduledBatchRecalculation(assoc.id);
                            processedAssocs++;
                        } catch (err) {
                            console.error(`[RatingScheduler] Failed batch rating recalc for association ${assoc.code}:`, err);
                        }
                    }
                }

                return `Processed monthly rating snapshots for ${processedAssocs} associations`;
            },
        });

        // 2. Bi-annual Classification Level Evaluation (Jan 1 & July 1)
        CronSchedulerService.registerJob({
            name: 'biannual-level-promotion',
            title: 'Bi-annual Level Classification Evaluation',
            description: 'Evaluates and locks promotion/relegation classification tiers (Jan 1 and July 1)',
            intervalMs: 24 * 60 * 60 * 1000, // Check daily
            handler: async () => {
                const now = new Date();
                const month = now.getUTCMonth(); // 0 = Jan, 6 = July
                const dayOfMonth = now.getUTCDate();

                if ((month === 0 || month === 6) && dayOfMonth === 1) {
                    const associations = await prisma.association.findMany();
                    let processedCount = 0;

                    for (const assoc of associations) {
                        try {
                            await RatingService.runBiAnnualLevelEvaluation(assoc.id);
                            processedCount++;
                        } catch (err) {
                            console.error(`[RatingScheduler] Failed bi-annual level evaluation for association ${assoc.code}:`, err);
                        }
                    }

                    return `Evaluated bi-annual classification levels for ${processedCount} associations`;
                }

                return 'Not due for bi-annual level evaluation today (runs Jan 1 & July 1)';
            },
        });
    }
}

