import { prisma } from '../config/prisma';
import { EncounterStatus, MatchWinner, MatchType } from '@areena/shared';
import { redisPub } from '../config/redis';

export class CompetitionService {
    /**
     * Generates round-robin encounters for a competition group.
     * Every team plays every other team `roundsPerGroup` times.
     */
    static async generateGroupEncounters(
        categoryId: string,
        groupId: string,
        teamIds: string[],
        roundsPerGroup: number = 1,
    ) {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            include: { competition: true },
        });

        if (!category) {
            throw new Error('Category not found');
        }

        const n = teamIds.length;
        if (n < 2) {
            throw new Error('At least 2 teams required to generate group encounters');
        }

        const encountersCreated = [];
        const encounterFormat = (category.encounterFormat as any[]) || [];
        let scheduledDate = new Date(category.competition.startDate);

        for (let round = 1; round <= roundsPerGroup; round++) {
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const homeTeamId = round % 2 === 1 ? teamIds[i] : teamIds[j];
                    const awayTeamId = round % 2 === 1 ? teamIds[j] : teamIds[i];

                    // Advance date slightly per round/match
                    const matchDate = new Date(scheduledDate);
                    matchDate.setDate(matchDate.getDate() + (round - 1) * 7 + ((i + j) % 3));

                    const encounter = await prisma.encounter.create({
                        data: {
                            categoryId,
                            groupId,
                            round,
                            scheduledAt: matchDate,
                            homeTeamId,
                            awayTeamId,
                            status: EncounterStatus.SCHEDULED,
                        },
                    });

                    // Create matches within encounter
                    if (encounterFormat.length > 0) {
                        for (let mIndex = 0; mIndex < encounterFormat.length; mIndex++) {
                            const fmt = encounterFormat[mIndex];
                            await prisma.match.create({
                                data: {
                                    encounterId: encounter.id,
                                    orderIndex: mIndex + 1,
                                    matchType: fmt.type || MatchType.SINGLE,
                                    label: fmt.label || `Match ${mIndex + 1}: ${fmt.type || 'Single'}`,
                                    status: EncounterStatus.SCHEDULED,
                                    sets: [],
                                },
                            });
                        }
                    } else {
                        // Default 1 single match
                        await prisma.match.create({
                            data: {
                                encounterId: encounter.id,
                                orderIndex: 1,
                                matchType: MatchType.SINGLE,
                                label: 'Match 1',
                                status: EncounterStatus.SCHEDULED,
                                sets: [],
                            },
                        });
                    }

                    // Create calendar event
                    await prisma.calendarEvent.create({
                        data: {
                            title: `${category.competition.name}: ${category.name}`,
                            description: `Encounter Round ${round}`,
                            eventType: 'LEAGUE_MATCH',
                            competitionId: category.competitionId,
                            encounterId: encounter.id,
                            startDate: matchDate,
                            endDate: new Date(matchDate.getTime() + 2 * 60 * 60 * 1000),
                        },
                    });

                    encountersCreated.push(encounter);
                }
            }
        }

        // Initialize group standings if not existing
        for (const tId of teamIds) {
            await prisma.groupStanding.upsert({
                where: {
                    groupId_teamId: {
                        groupId,
                        teamId: tId,
                    },
                },
                update: {},
                create: {
                    groupId,
                    teamId: tId,
                },
            });
        }

        return encountersCreated;
    }

    /**
     * Updates an individual match score (sets, winner) and recalculates the encounter score & group standings.
     */
    static async updateMatchScore(data: {
        matchId: string;
        sets: Array<{ home: number; away: number }>;
        isFinished: boolean;
    }) {
        const match = await prisma.match.findUnique({
            where: { id: data.matchId },
            include: {
                encounter: {
                    include: {
                        category: true,
                        matches: true,
                        group: true,
                    },
                },
            },
        });

        if (!match) {
            throw new Error('Match not found');
        }

        let homeWonSets = 0;
        let awayWonSets = 0;

        for (const s of data.sets) {
            if (s.home > s.away) homeWonSets++;
            else if (s.away > s.home) awayWonSets++;
        }

        let winner: MatchWinner = MatchWinner.PENDING;
        let matchStatus = EncounterStatus.LIVE;

        if (data.isFinished) {
            matchStatus = EncounterStatus.FINISHED;
            if (homeWonSets > awayWonSets) winner = MatchWinner.HOME;
            else if (awayWonSets > homeWonSets) winner = MatchWinner.AWAY;
            else winner = MatchWinner.DRAW;
        }

        const updatedMatch = await prisma.match.update({
            where: { id: data.matchId },
            data: {
                sets: data.sets,
                homeWonSets,
                awayWonSets,
                winner,
                status: matchStatus,
            },
        });

        // Recalculate encounter score
        const allMatches = await prisma.match.findMany({
            where: { encounterId: match.encounterId },
        });

        let homeScore = 0;
        let awayScore = 0;
        let allFinished = true;
        let anyLiveOrFinished = false;

        for (const m of allMatches) {
            if (m.winner === MatchWinner.HOME) homeScore++;
            else if (m.winner === MatchWinner.AWAY) awayScore++;

            if (m.status !== EncounterStatus.FINISHED) {
                allFinished = false;
            }
            if (m.status === EncounterStatus.LIVE || m.status === EncounterStatus.FINISHED) {
                anyLiveOrFinished = true;
            }
        }

        let encounterStatus: EncounterStatus = EncounterStatus.SCHEDULED;
        if (allFinished && allMatches.length > 0) {
            encounterStatus = EncounterStatus.FINISHED;
        } else if (anyLiveOrFinished) {
            encounterStatus = EncounterStatus.LIVE;
        }

        const updatedEncounter = await prisma.encounter.update({
            where: { id: match.encounterId },
            data: {
                homeScore,
                awayScore,
                status: encounterStatus,
            },
            include: {
                homeTeam: true,
                awayTeam: true,
                category: true,
                matches: {
                    include: {
                        homePlayer1: true,
                        homePlayer2: true,
                        awayPlayer1: true,
                        awayPlayer2: true,
                    },
                },
            },
        });

        // If encounter is in a group, update group standings
        if (match.encounter.groupId) {
            await this.recalculateGroupStandings(match.encounter.groupId);
        }

        // Broadcast realtime live score event over Redis pub/sub
        try {
            await redisPub.publish(
                'areena:scores',
                JSON.stringify({
                    event: 'MATCH_SCORE_UPDATE',
                    matchId: updatedMatch.id,
                    encounterId: match.encounterId,
                    sets: data.sets,
                    homeWonSets,
                    awayWonSets,
                    winner,
                    encounterHomeScore: homeScore,
                    encounterAwayScore: awayScore,
                    encounterStatus,
                }),
            );
        } catch {}

        return {
            match: updatedMatch,
            encounter: updatedEncounter,
        };
    }

    /**
     * Recalculates standings for all teams in a group based on finished/live encounters.
     */
    static async recalculateGroupStandings(groupId: string) {
        const encounters = await prisma.encounter.findMany({
            where: { groupId },
            include: { matches: true },
        });

        const standingsMap = new Map<
            string,
            {
                played: number;
                won: number;
                drawn: number;
                lost: number;
                matchesWon: number;
                matchesLost: number;
                setsWon: number;
                setsLost: number;
                pointsWon: number;
                pointsLost: number;
                tablePoints: number;
            }
        >();

        for (const enc of encounters) {
            if (!standingsMap.has(enc.homeTeamId)) {
                standingsMap.set(enc.homeTeamId, {
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    matchesWon: 0,
                    matchesLost: 0,
                    setsWon: 0,
                    setsLost: 0,
                    pointsWon: 0,
                    pointsLost: 0,
                    tablePoints: 0,
                });
            }
            if (!standingsMap.has(enc.awayTeamId)) {
                standingsMap.set(enc.awayTeamId, {
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    matchesWon: 0,
                    matchesLost: 0,
                    setsWon: 0,
                    setsLost: 0,
                    pointsWon: 0,
                    pointsLost: 0,
                    tablePoints: 0,
                });
            }

            const home = standingsMap.get(enc.homeTeamId)!;
            const away = standingsMap.get(enc.awayTeamId)!;

            if (enc.status === EncounterStatus.FINISHED) {
                home.played++;
                away.played++;

                home.matchesWon += enc.homeScore;
                home.matchesLost += enc.awayScore;
                away.matchesWon += enc.awayScore;
                away.matchesLost += enc.homeScore;

                if (enc.homeScore > enc.awayScore) {
                    home.won++;
                    home.tablePoints += 2; // Standard 2 points for win
                    away.lost++;
                } else if (enc.awayScore > enc.homeScore) {
                    away.won++;
                    away.tablePoints += 2;
                    home.lost++;
                } else {
                    home.drawn++;
                    away.drawn++;
                    home.tablePoints += 1;
                    away.tablePoints += 1;
                }

                // Aggregate sets and points from all matches
                for (const m of enc.matches) {
                    home.setsWon += m.homeWonSets;
                    home.setsLost += m.awayWonSets;
                    away.setsWon += m.awayWonSets;
                    away.setsLost += m.homeWonSets;

                    const sets = (m.sets as Array<{ home: number; away: number }>) || [];
                    for (const s of sets) {
                        home.pointsWon += s.home || 0;
                        home.pointsLost += s.away || 0;
                        away.pointsWon += s.away || 0;
                        away.pointsLost += s.home || 0;
                    }
                }
            }
        }

        // Persist standings
        for (const [teamId, stats] of standingsMap.entries()) {
            await prisma.groupStanding.upsert({
                where: {
                    groupId_teamId: { groupId, teamId },
                },
                update: {
                    ...stats,
                },
                create: {
                    groupId,
                    teamId,
                    ...stats,
                },
            });
        }
    }
}
