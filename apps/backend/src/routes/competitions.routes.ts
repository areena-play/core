import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createCompetitionSchema, createCategorySchema, updateMatchScoreSchema } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CompetitionService } from '../services/competition.service';
import { slugify } from '../utils/slugify';

const router = Router();

// GET /competitions/live - Live encounters ticker
router.get('/live', async (req, res, next) => {
    try {
        const liveEncounters = await prisma.encounter.findMany({
            where: {
                status: { in: ['LIVE', 'SCHEDULED'] },
            },
            include: {
                homeTeam: true,
                awayTeam: true,
                category: { include: { competition: true } },
                matches: {
                    include: {
                        homePlayer1: true,
                        homePlayer2: true,
                        awayPlayer1: true,
                        awayPlayer2: true,
                    },
                },
            },
            take: 20,
            orderBy: { scheduledAt: 'asc' },
        });

        res.json(liveEncounters);
    } catch (err) {
        next(err);
    }
});

// GET /competitions - List leagues and tournaments
router.get('/', async (req, res, next) => {
    try {
        const { type, associationId, seasonId, status } = req.query;

        const competitions = await prisma.competition.findMany({
            where: {
                ...(type ? { type: type as any } : {}),
                ...(associationId ? { associationId: String(associationId) } : {}),
                ...(seasonId ? { seasonId: String(seasonId) } : {}),
                ...(status ? { status: status as any } : {}),
            },
            include: {
                association: { select: { id: true, name: true, code: true, slug: true } },
                season: { select: { id: true, name: true } },
                categories: {
                    include: {
                        _count: { select: { teams: true, encounters: true } },
                    },
                },
            },
            orderBy: { startDate: 'desc' },
        });

        res.json(competitions);
    } catch (err) {
        next(err);
    }
});

// GET /competitions/:id - Single competition details (by UUID, unique slug, or seriesSlug)
router.get('/:id', async (req, res, next) => {
    try {
        const idOrSlug = req.params.id;

        const includeConfig = {
            association: true,
            season: true,
            categories: {
                include: {
                    groups: {
                        include: {
                            standings: {
                                include: { team: true },
                                orderBy: [{ tablePoints: 'desc' as const }, { matchesWon: 'desc' as const }, { setsWon: 'desc' as const }],
                            },
                        },
                    },
                    teams: {
                        include: {
                            team: {
                                include: {
                                    members: { include: { user: true } },
                                    club: true,
                                },
                            },
                        },
                    },
                    encounters: {
                        include: {
                            homeTeam: true,
                            awayTeam: true,
                            matches: {
                                include: {
                                    homePlayer1: true,
                                    homePlayer2: true,
                                    awayPlayer1: true,
                                    awayPlayer2: true,
                                },
                            },
                        },
                        orderBy: [{ round: 'asc' as const }, { scheduledAt: 'asc' as const }],
                    },
                },
            },
        };

        // 1. Try finding by direct ID or unique slug
        let competition = await prisma.competition.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug },
                ],
            },
            include: includeConfig,
        });

        // 2. If not found, resolve canonical recurring series slug (latest active/most recent edition)
        if (!competition) {
            competition = await prisma.competition.findFirst({
                where: { seriesSlug: idOrSlug },
                orderBy: [{ startDate: 'desc' }],
                include: includeConfig,
            });
        }

        if (!competition) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        // Fetch sibling editions in the series if this competition belongs to a series
        let editions: any[] = [];
        if (competition.seriesSlug) {
            editions = await prisma.competition.findMany({
                where: { seriesSlug: competition.seriesSlug },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                },
                orderBy: { startDate: 'desc' },
            });
        }

        res.json({ ...competition, editions });
    } catch (err) {
        next(err);
    }
});

// POST /competitions - Create league or tournament
router.post(
    '/',
    authenticateToken,
    validate(createCompetitionSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { name, slug: customSlug, seriesSlug, description, type, associationId, seasonId, startDate, endDate, location } = req.body;

            let finalSlug = customSlug ? customSlug.trim().toLowerCase() : slugify(name);
            const existing = await prisma.competition.findUnique({ where: { slug: finalSlug } });
            if (existing) {
                if (customSlug) {
                    return res.status(400).json({ error: `Competition slug '${finalSlug}' already exists` });
                }
                finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
            }

            const competition = await prisma.competition.create({
                data: {
                    name,
                    slug: finalSlug,
                    seriesSlug: seriesSlug ? seriesSlug.trim().toLowerCase() : null,
                    description,
                    type,
                    associationId,
                    seasonId,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    location,
                    status: 'REGISTRATION_OPEN',
                },
            });

            // Create a calendar event for the competition
            await prisma.calendarEvent.create({
                data: {
                    title: `${type === 'LEAGUE' ? 'League' : 'Tournament'}: ${name}`,
                    description,
                    eventType: 'TOURNAMENT',
                    associationId,
                    competitionId: competition.id,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    location,
                },
            });

            res.status(201).json(competition);
        } catch (err) {
            next(err);
        }
    },
);

// POST /competitions/:id/categories - Add category
router.post(
    '/:id/categories',
    authenticateToken,
    validate(createCategorySchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const {
                name,
                nameI18n,
                teamSize,
                minElo,
                maxElo,
                minAge,
                maxAge,
                genderRestriction,
                requiredLicenseType,
                encounterFormat,
                roundsPerGroup,
            } = req.body;

            const category = await prisma.category.create({
                data: {
                    competitionId: req.params.id,
                    name,
                    nameI18n: nameI18n || null,
                    teamSize: teamSize || 1,
                    minElo,
                    maxElo,
                    minAge,
                    maxAge,
                    genderRestriction: genderRestriction || 'ANY',
                    requiredLicenseType,
                    encounterFormat: encounterFormat || [],
                    roundsPerGroup: roundsPerGroup || 1,
                },
            });

            res.status(201).json(category);
        } catch (err) {
            next(err);
        }
    },
);

// POST /competitions/categories/:categoryId/teams - Register team in category
router.post('/categories/:categoryId/teams', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { name, clubId, playerUserIds } = req.body;

        const category = await prisma.category.findUnique({
            where: { id: req.params.categoryId },
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const team = await prisma.team.create({
            data: {
                name,
                clubId: clubId || null,
            },
        });

        // Add members
        if (playerUserIds && playerUserIds.length > 0) {
            await prisma.teamMember.createMany({
                data: playerUserIds.map((userId: string, idx: number) => ({
                    teamId: team.id,
                    userId,
                    role: idx === 0 ? 'CAPTAIN' : 'PLAYER',
                })),
            });
        }

        // Register team in category
        const registration = await prisma.teamCategoryRegistration.create({
            data: {
                teamId: team.id,
                categoryId: req.params.categoryId,
            },
            include: {
                team: { include: { members: { include: { user: true } } } },
            },
        });

        res.status(201).json(registration);
    } catch (err) {
        next(err);
    }
});

// POST /competitions/categories/:categoryId/generate-groups - Generate group & encounters
router.post(
    '/categories/:categoryId/generate-groups',
    authenticateToken,
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { groupName, teamIds, roundsPerGroup } = req.body;

            const category = await prisma.category.findUnique({
                where: { id: req.params.categoryId },
            });

            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }

            const group = await prisma.competitionGroup.create({
                data: {
                    categoryId: req.params.categoryId,
                    name: groupName || 'Group 1',
                },
            });

            const encounters = await CompetitionService.generateGroupEncounters(
                req.params.categoryId,
                group.id,
                teamIds,
                roundsPerGroup || category.roundsPerGroup,
            );

            res.status(201).json({ group, encountersCount: encounters.length });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },
);

// GET /competitions/encounters/:encounterId - Encounter detail with live score
router.get('/encounters/:encounterId', async (req, res, next) => {
    try {
        const encounter = await prisma.encounter.findUnique({
            where: { id: req.params.encounterId },
            include: {
                homeTeam: { include: { members: { include: { user: true } } } },
                awayTeam: { include: { members: { include: { user: true } } } },
                category: { include: { competition: true } },
                group: true,
                matches: {
                    include: {
                        homePlayer1: true,
                        homePlayer2: true,
                        awayPlayer1: true,
                        awayPlayer2: true,
                    },
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });

        if (!encounter) {
            return res.status(404).json({ error: 'Encounter not found' });
        }

        res.json(encounter);
    } catch (err) {
        next(err);
    }
});

// PUT /competitions/matches/:matchId/score - Live score entry
router.put(
    '/matches/:matchId/score',
    authenticateToken,
    validate(updateMatchScoreSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { sets, isFinished } = req.body;

            const result = await CompetitionService.updateMatchScore({
                matchId: req.params.matchId,
                sets,
                isFinished,
            });

            res.json(result);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },
);

export default router;
