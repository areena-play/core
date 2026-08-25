"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@areena/shared");
const auth_1 = require("../middleware/auth");
const competitionService_1 = require("../services/competitionService");
const router = (0, express_1.Router)();
// GET /competitions/live - Live encounters ticker
router.get('/live', async (req, res, next) => {
    try {
        const liveEncounters = await prisma_1.prisma.encounter.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
// GET /competitions - List leagues and tournaments
router.get('/', async (req, res, next) => {
    try {
        const { type, associationId, seasonId, status } = req.query;
        const competitions = await prisma_1.prisma.competition.findMany({
            where: {
                ...(type ? { type: type } : {}),
                ...(associationId ? { associationId: String(associationId) } : {}),
                ...(seasonId ? { seasonId: String(seasonId) } : {}),
                ...(status ? { status: status } : {}),
            },
            include: {
                association: { select: { id: true, name: true, code: true } },
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
    }
    catch (err) {
        next(err);
    }
});
// GET /competitions/:id - Single competition details
router.get('/:id', async (req, res, next) => {
    try {
        const competition = await prisma_1.prisma.competition.findUnique({
            where: { id: req.params.id },
            include: {
                association: true,
                season: true,
                categories: {
                    include: {
                        groups: {
                            include: {
                                standings: {
                                    include: { team: true },
                                    orderBy: [{ tablePoints: 'desc' }, { matchesWon: 'desc' }, { setsWon: 'desc' }],
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
                            orderBy: [{ round: 'asc' }, { scheduledAt: 'asc' }],
                        },
                    },
                },
            },
        });
        if (!competition) {
            return res.status(404).json({ error: 'Competition not found' });
        }
        res.json(competition);
    }
    catch (err) {
        next(err);
    }
});
// POST /competitions - Create league or tournament
router.post('/', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.createCompetitionSchema), async (req, res, next) => {
    try {
        const { name, description, type, associationId, seasonId, startDate, endDate, location } = req.body;
        const competition = await prisma_1.prisma.competition.create({
            data: {
                name,
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
        await prisma_1.prisma.calendarEvent.create({
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
    }
    catch (err) {
        next(err);
    }
});
// POST /competitions/:id/categories - Add category
router.post('/:id/categories', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.createCategorySchema), async (req, res, next) => {
    try {
        const { name, teamSize, minElo, maxElo, minAge, maxAge, genderRestriction, requiredLicenseType, encounterFormat, roundsPerGroup, } = req.body;
        const category = await prisma_1.prisma.category.create({
            data: {
                competitionId: req.params.id,
                name,
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
    }
    catch (err) {
        next(err);
    }
});
// POST /competitions/categories/:categoryId/teams - Register team in category
router.post('/categories/:categoryId/teams', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { name, clubId, playerUserIds } = req.body;
        const category = await prisma_1.prisma.category.findUnique({
            where: { id: req.params.categoryId },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        const team = await prisma_1.prisma.team.create({
            data: {
                name,
                clubId: clubId || null,
            },
        });
        // Add members
        if (playerUserIds && playerUserIds.length > 0) {
            await prisma_1.prisma.teamMember.createMany({
                data: playerUserIds.map((userId, idx) => ({
                    teamId: team.id,
                    userId,
                    role: idx === 0 ? 'CAPTAIN' : 'PLAYER',
                })),
            });
        }
        // Register team in category
        const registration = await prisma_1.prisma.teamCategoryRegistration.create({
            data: {
                teamId: team.id,
                categoryId: req.params.categoryId,
            },
            include: {
                team: { include: { members: { include: { user: true } } } },
            },
        });
        res.status(201).json(registration);
    }
    catch (err) {
        next(err);
    }
});
// POST /competitions/categories/:categoryId/generate-groups - Generate group & encounters
router.post('/categories/:categoryId/generate-groups', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { groupName, teamIds, roundsPerGroup } = req.body;
        const category = await prisma_1.prisma.category.findUnique({
            where: { id: req.params.categoryId },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        const group = await prisma_1.prisma.competitionGroup.create({
            data: {
                categoryId: req.params.categoryId,
                name: groupName || 'Group 1',
            },
        });
        const encounters = await competitionService_1.CompetitionService.generateGroupEncounters(req.params.categoryId, group.id, teamIds, roundsPerGroup || category.roundsPerGroup);
        res.status(201).json({ group, encountersCount: encounters.length });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// GET /competitions/encounters/:encounterId - Encounter detail with live score
router.get('/encounters/:encounterId', async (req, res, next) => {
    try {
        const encounter = await prisma_1.prisma.encounter.findUnique({
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
    }
    catch (err) {
        next(err);
    }
});
// PUT /competitions/matches/:matchId/score - Live score entry
router.put('/matches/:matchId/score', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.updateMatchScoreSchema), async (req, res, next) => {
    try {
        const { sets, isFinished } = req.body;
        const result = await competitionService_1.CompetitionService.updateMatchScore({
            matchId: req.params.matchId,
            sets,
            isFinished,
        });
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
