import { prisma } from '../config/prisma';
import {
    RatingTriggerReason,
    getLevelFromElo,
    calculateEloExchange,
} from '@areena/shared';
import { DistributedLockService } from './distributedLock.service';
import { redisPub } from '../config/redis';

export class RatingService {
    /**
     * Resolves official configured ELO rating tiers from the national association rules.
     */
    static async getEffectiveTiers(associationId?: string | null, tx: any = prisma) {
        try {
            let assoc: any = null;
            if (associationId) {
                assoc = await tx.association.findUnique({ where: { id: associationId } });
            }
            if (!assoc || !assoc.isTopLevel) {
                assoc = await tx.association.findFirst({
                    where: { isTopLevel: true },
                    orderBy: { createdAt: 'asc' },
                });
            }
            const rules = (assoc?.rules as any) || {};
            if (Array.isArray(rules.eloTiers) && rules.eloTiers.length > 0) {
                return rules.eloTiers;
            }
        } catch {}
        return undefined;
    }

    /**
     * Retrieves or creates a baseline initial snapshot for a player if none exists.
     */
    static async getOrCreateInitialSnapshot(
        userId: string,
        associationId?: string | null,
        tx: any = prisma,
    ) {
        const existing = await tx.ratingSnapshotHistory.findFirst({
            where: { userId },
            orderBy: { effectiveFrom: 'desc' },
        });

        if (existing) {
            return existing;
        }

        const user = await tx.user.findUnique({ where: { id: userId } });
        const baseElo = user?.eloPoints ?? 1000;
        const tiers = await this.getEffectiveTiers(associationId, tx);
        const level = getLevelFromElo(baseElo, tiers);
        const effectiveGender = user?.playingGender || (user?.gender === 'FEMALE' ? 'FEMALE' : 'MALE');

        const initialSnapshot = await tx.ratingSnapshotHistory.create({
            data: {
                userId,
                associationId: associationId || null,
                elo: baseElo,
                level,
                gender: effectiveGender,
                playingGender: effectiveGender,
                triggerReason: RatingTriggerReason.INITIAL_PROVISIONAL,
                effectiveFrom: user?.createdAt || new Date(),
            },
        });

        return initialSnapshot;
    }

    /**
     * Gets the effective rating snapshot for a user as of a specific date.
     */
    static async getEffectiveSnapshot(
        userId: string,
        asOfDate: Date = new Date(),
        tx: any = prisma,
    ) {
        const snapshot = await tx.ratingSnapshotHistory.findFirst({
            where: {
                userId,
                effectiveFrom: { lte: asOfDate },
                OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOfDate } }],
            },
            orderBy: { effectiveFrom: 'desc' },
        });

        if (snapshot) return snapshot;
        return await this.getOrCreateInitialSnapshot(userId, null, tx);
    }

    /**
     * Processes rating changes and links MatchParticipants to pre-match snapshots
     * whenever a competitive match concludes.
     */
    static async recordMatchResultRatingUpdate(matchId: string, txClient?: any) {
        const execute = async (tx: any) => {
            const match = await tx.match.findUnique({
                where: { id: matchId },
                include: {
                    encounter: {
                        include: {
                            category: {
                                include: {
                                    competition: true,
                                },
                            },
                            homeTeam: true,
                            awayTeam: true,
                        },
                    },
                    participants: true,
                },
            });

            if (!match) {
                throw new Error(`Match with ID ${matchId} not found`);
            }

            const competition = match.encounter?.category?.competition;
            if (!competition?.countsForElo || match.status !== 'FINISHED' || match.winner === 'PENDING') {
                return null;
            }

            const homeUserId = match.homePlayer1Id;
            const awayUserId = match.awayPlayer1Id;

            if (!homeUserId || !awayUserId) {
                // Cannot calculate rating if player IDs are not assigned (e.g. bye or walkover without user)
                return null;
            }

            // 1. Fetch pre-match rating snapshots
            const matchDate = match.encounter.scheduledAt || match.createdAt;
            const homePreSnapshot = await this.getEffectiveSnapshot(homeUserId, matchDate, tx);
            const awayPreSnapshot = await this.getEffectiveSnapshot(awayUserId, matchDate, tx);

            // 2. Ensure MatchParticipant records exist and point to pre-match snapshots
            await tx.matchParticipant.upsert({
                where: {
                    id: match.participants.find((p: any) => p.userId === homeUserId && p.side === 'HOME_1')?.id || 'new-home-1',
                },
                update: {
                    ratingSnapshotId: homePreSnapshot.id,
                    clubIdAtTime: match.encounter.homeTeam?.clubId || null,
                    teamId: match.encounter.homeTeamId,
                },
                create: {
                    matchId: match.id,
                    userId: homeUserId,
                    side: 'HOME_1',
                    ratingSnapshotId: homePreSnapshot.id,
                    clubIdAtTime: match.encounter.homeTeam?.clubId || null,
                    teamId: match.encounter.homeTeamId,
                },
            });

            await tx.matchParticipant.upsert({
                where: {
                    id: match.participants.find((p: any) => p.userId === awayUserId && p.side === 'AWAY_1')?.id || 'new-away-1',
                },
                update: {
                    ratingSnapshotId: awayPreSnapshot.id,
                    clubIdAtTime: match.encounter.awayTeam?.clubId || null,
                    teamId: match.encounter.awayTeamId,
                },
                create: {
                    matchId: match.id,
                    userId: awayUserId,
                    side: 'AWAY_1',
                    ratingSnapshotId: awayPreSnapshot.id,
                    clubIdAtTime: match.encounter.awayTeam?.clubId || null,
                    teamId: match.encounter.awayTeamId,
                },
            });

            // 3. Calculate Elo outcome
            const kFactor = 32; // Standard default K-factor
            const winnerOutcome = match.winner === 'HOME' ? 'HOME' : match.winner === 'AWAY' ? 'AWAY' : 'DRAW';
            const exchange = calculateEloExchange(homePreSnapshot.elo, awayPreSnapshot.elo, winnerOutcome, kFactor);

            const now = new Date();

            // 4. Update effectiveTo on old snapshots and create new post-match snapshots
            await tx.ratingSnapshotHistory.update({
                where: { id: homePreSnapshot.id },
                data: { effectiveTo: now },
            });
            await tx.ratingSnapshotHistory.update({
                where: { id: awayPreSnapshot.id },
                data: { effectiveTo: now },
            });

            const tiers = await this.getEffectiveTiers(competition.associationId, tx);
            const newHomeLevel = getLevelFromElo(exchange.newEloA, tiers);
            const newAwayLevel = getLevelFromElo(exchange.newEloB, tiers);

            const [homeUser, awayUser] = await Promise.all([
                tx.user.findUnique({ where: { id: homeUserId }, select: { gender: true, playingGender: true } }),
                tx.user.findUnique({ where: { id: awayUserId }, select: { gender: true, playingGender: true } }),
            ]);
            const homePGender = homeUser?.playingGender || (homeUser?.gender === 'FEMALE' ? 'FEMALE' : 'MALE');
            const awayPGender = awayUser?.playingGender || (awayUser?.gender === 'FEMALE' ? 'FEMALE' : 'MALE');

            const homePostSnapshot = await tx.ratingSnapshotHistory.create({
                data: {
                    userId: homeUserId,
                    associationId: competition.associationId,
                    elo: exchange.newEloA,
                    level: newHomeLevel,
                    gender: homePGender,
                    playingGender: homePGender,
                    effectiveFrom: now,
                    triggerReason: RatingTriggerReason.MATCH_EVENT,
                    metadata: {
                        matchId: match.id,
                        delta: exchange.deltaA,
                        opponentUserId: awayUserId,
                    },
                },
            });

            const awayPostSnapshot = await tx.ratingSnapshotHistory.create({
                data: {
                    userId: awayUserId,
                    associationId: competition.associationId,
                    elo: exchange.newEloB,
                    level: newAwayLevel,
                    gender: awayPGender,
                    playingGender: awayPGender,
                    effectiveFrom: now,
                    triggerReason: RatingTriggerReason.MATCH_EVENT,
                    metadata: {
                        matchId: match.id,
                        delta: exchange.deltaB,
                        opponentUserId: homeUserId,
                    },
                },
            });

            // 5. Update user current values
            await tx.user.update({
                where: { id: homeUserId },
                data: {
                    eloPoints: Math.round(exchange.newEloA),
                    currentLevel: newHomeLevel,
                },
            });

            await tx.user.update({
                where: { id: awayUserId },
                data: {
                    eloPoints: Math.round(exchange.newEloB),
                    currentLevel: newAwayLevel,
                },
            });

            return {
                exchange,
                homePostSnapshot,
                awayPostSnapshot,
            };
        };

        let result;
        if (txClient) {
            result = await execute(txClient);
        } else {
            result = await DistributedLockService.withLock(`match:${matchId}:rating-update`, execute);
        }

        if (result) {
            try {
                await redisPub.publish(
                    'areena:ratings',
                    JSON.stringify({
                        event: 'MATCH_RATING_UPDATED',
                        matchId,
                        exchange: result.exchange,
                    }),
                );
            } catch {}
        }

        return result;
    }

    /**
     * Executes scheduled batch recalculation of rankings for an association (e.g. monthly on the 10th).
     * Computes Overall, Gender, and Age Category leaderboards and issues snapshot history records.
     */
    static async runScheduledBatchRecalculation(associationId: string) {
        return await DistributedLockService.withLock(
            `association:${associationId}:batch-rating-recalc`,
            async (tx) => {
                const association = await tx.association.findUnique({
                    where: { id: associationId },
                });

                if (!association) {
                    throw new Error(`Association ${associationId} not found`);
                }

                // Fetch all licensed users in this association
                const users = await tx.user.findMany({
                    where: {
                        licenses: {
                            some: {
                                associationId,
                                status: 'APPROVED',
                            },
                        },
                    },
                    orderBy: { eloPoints: 'desc' },
                });

                const now = new Date();
                const snapshotRecords = [];

                // Recalculate rank positions
                let currentOverallRank = 1;
                let currentMaleRank = 1;
                let currentFemaleRank = 1;

                const tiers = await this.getEffectiveTiers(associationId, tx);

                for (let i = 0; i < users.length; i++) {
                    const u = users[i];
                    const rankOverall = currentOverallRank++;
                    let rankGender: number | null = null;
                    const pGender = u.playingGender || (u.gender === 'FEMALE' ? 'FEMALE' : 'MALE');

                    if (pGender === 'MALE') {
                        rankGender = currentMaleRank++;
                    } else if (pGender === 'FEMALE') {
                        rankGender = currentFemaleRank++;
                    }

                    const level = getLevelFromElo(u.eloPoints, tiers);

                    // Close previous open snapshot
                    await tx.ratingSnapshotHistory.updateMany({
                        where: {
                            userId: u.id,
                            effectiveTo: null,
                        },
                        data: { effectiveTo: now },
                    });

                    // Create new scheduled snapshot
                    const newSnapshot = await tx.ratingSnapshotHistory.create({
                        data: {
                            userId: u.id,
                            associationId,
                            elo: u.eloPoints,
                            level,
                            gender: pGender,
                            playingGender: pGender,
                            rankOverall,
                            rankGender,
                            triggerReason: RatingTriggerReason.MONTHLY_SCHEDULE,
                            effectiveFrom: now,
                        },
                    });

                    // Update user's official rank field
                    await tx.user.update({
                        where: { id: u.id },
                        data: {
                            rank: rankOverall,
                            currentLevel: level,
                        },
                    });

                    snapshotRecords.push(newSnapshot);
                }

                return {
                    associationId,
                    playersProcessed: users.length,
                    timestamp: now,
                };
            },
        );
    }

    /**
     * Evaluates classification levels (e.g. bi-annually on Jan 1 and July 1).
     * Locks promotion/relegation tiers for upcoming league seasons.
     */
    static async runBiAnnualLevelEvaluation(associationId: string) {
        return await DistributedLockService.withLock(
            `association:${associationId}:biannual-level-eval`,
            async (tx) => {
                const users = await tx.user.findMany({
                    where: {
                        licenses: {
                            some: {
                                associationId,
                                status: 'APPROVED',
                            },
                        },
                    },
                });

                const now = new Date();
                let evaluatedCount = 0;
                const tiers = await this.getEffectiveTiers(associationId, tx);

                for (const u of users) {
                    const newLevel = getLevelFromElo(u.eloPoints, tiers);
                    const pGender = u.playingGender || (u.gender === 'FEMALE' ? 'FEMALE' : 'MALE');

                    if (u.currentLevel !== newLevel) {
                        await tx.ratingSnapshotHistory.create({
                            data: {
                                userId: u.id,
                                associationId,
                                elo: u.eloPoints,
                                level: newLevel,
                                gender: pGender,
                                playingGender: pGender,
                                rankOverall: u.rank,
                                triggerReason: RatingTriggerReason.BI_ANNUAL_LEVEL,
                                effectiveFrom: now,
                                metadata: {
                                    previousLevel: u.currentLevel,
                                    newLevel,
                                },
                            },
                        });

                        await tx.user.update({
                            where: { id: u.id },
                            data: { currentLevel: newLevel },
                        });

                        evaluatedCount++;
                    }
                }

                return {
                    associationId,
                    totalPlayers: users.length,
                    levelsAdjusted: evaluatedCount,
                    timestamp: now,
                };
            },
        );
    }

    /**
     * Fetches rating snapshot history for a given user.
     */
    static async getUserRatingHistory(userId: string) {
        return await prisma.ratingSnapshotHistory.findMany({
            where: { userId },
            orderBy: { effectiveFrom: 'desc' },
            include: {
                association: {
                    select: { id: true, name: true, shortName: true, code: true },
                },
            },
        });
    }
}

