import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import {
    createCompetitionSchema,
    updateCompetitionSchema,
    createCategorySchema,
    updateMatchScoreSchema,
    assignCompetitionRoleSchema,
    speakerCalloutSchema,
    updateRegistrationPaymentSchema,
    CompetitionRole,
    CompetitionStatus,
    AuditCategory,
} from '@areena/shared';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth';
import { CompetitionService } from '../services/competition.service';
import { AuditService } from '../services/audit.service';
import { slugify } from '../utils/slugify';

const router = Router();

// Helper: Check if user has granular competition permission or admin rights
async function hasCompetitionPermission(userId: string, competitionId: string, allowedRoles: CompetitionRole[]): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { associationRoles: true, clubRoles: true },
    });
    if (!user) return false;
    if (user.isSuperAdmin) return true;

    const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) return false;

    // Check association admin
    const isAssocAdmin = user.associationRoles.some(
        (r) => r.associationId === competition.associationId && ['ADMIN', 'PRESIDENT'].includes(r.role),
    );
    if (isAssocAdmin) return true;

    // Check assigned competition roles
    const userRoles = await prisma.competitionUserRole.findMany({
        where: { competitionId, userId },
    });
    if (userRoles.some((r) => r.role === CompetitionRole.ADMIN)) return true;

    return userRoles.some((r) => allowedRoles.includes(r.role as CompetitionRole));
}

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

// GET /competitions/seasons - List available seasons
router.get('/seasons', async (req, res, next) => {
    try {
        const { associationId } = req.query;
        let resolvedAssocId = associationId ? String(associationId) : undefined;
        if (resolvedAssocId) {
            const a = await prisma.association.findFirst({
                where: {
                    OR: [
                        { id: resolvedAssocId },
                        { slug: resolvedAssocId.toLowerCase() },
                        { code: resolvedAssocId.toUpperCase() },
                    ],
                },
                select: { id: true },
            });
            if (a) resolvedAssocId = a.id;
        }

        const seasons = await prisma.season.findMany({
            where: {
                ...(resolvedAssocId ? { associationId: resolvedAssocId } : {}),
            },
            orderBy: { startDate: 'desc' },
            select: {
                id: true,
                name: true,
                isCurrent: true,
                startDate: true,
                endDate: true,
                associationId: true,
            },
        });

        // Deduplicate distinct season names
        const seenNames = new Set<string>();
        const distinctSeasons: any[] = [];
        for (const s of seasons) {
            if (!seenNames.has(s.name)) {
                seenNames.add(s.name);
                distinctSeasons.push(s);
            }
        }

        res.json(distinctSeasons);
    } catch (err) {
        next(err);
    }
});

// GET /competitions - List leagues and tournaments
router.get('/', async (req, res, next) => {
    try {
        const { type, associationId, seasonId, seasonName, isCurrentSeason, status, isOfficial } = req.query;

        let resolvedAssocId = associationId ? String(associationId) : undefined;
        if (resolvedAssocId) {
            const a = await prisma.association.findFirst({
                where: {
                    OR: [
                        { id: resolvedAssocId },
                        { slug: resolvedAssocId.toLowerCase() },
                        { code: resolvedAssocId.toUpperCase() },
                    ],
                },
                select: { id: true },
            });
            if (a) resolvedAssocId = a.id;
        }

        const competitions = await prisma.competition.findMany({
            where: {
                ...(type ? { type: type as any } : {}),
                ...(resolvedAssocId ? { associationId: resolvedAssocId } : {}),
                ...(seasonId ? { seasonId: String(seasonId) } : {}),
                ...(isCurrentSeason === 'true'
                    ? { season: { isCurrent: true } }
                    : seasonName
                    ? { season: { name: String(seasonName) } }
                    : {}),
                ...(status ? { status: status as any } : {}),
                ...(isOfficial !== undefined ? { isOfficial: isOfficial === 'true' } : {}),
            },
            include: {
                association: { select: { id: true, name: true, code: true, slug: true } },
                season: { select: { id: true, name: true, isCurrent: true, startDate: true, endDate: true } },
                categories: {
                    include: {
                        _count: { select: { teams: true, encounters: true } },
                    },
                },
                _count: { select: { categories: true, roles: true, locations: true } },
            },
            orderBy: { startDate: 'desc' },
        });

        res.json(competitions);
    } catch (err) {
        next(err);
    }
});

// GET /competitions/:id - Single competition details
router.get('/:id', async (req, res, next) => {
    try {
        const idOrSlug = req.params.id;

        const includeConfig = {
            association: true,
            season: true,
            roles: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, licenseId: true } },
                },
            },
            locations: {
                include: {
                    location: {
                        include: {
                            units: true,
                        },
                    },
                },
            },
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
                            group: true,
                            matches: {
                                include: {
                                    homePlayer1: true,
                                    homePlayer2: true,
                                    awayPlayer1: true,
                                    awayPlayer2: true,
                                },
                                orderBy: { orderIndex: 'asc' as const },
                            },
                        },
                        orderBy: { round: 'asc' as const },
                    },
                },
            },
        };

        let competition = await prisma.competition.findFirst({
            where: {
                OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
            },
            include: includeConfig,
        });

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

// POST /competitions - Create league or tournament with association governance rules
router.post(
    '/',
    authenticateToken,
    validate(createCompetitionSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const user = req.user!;
            const {
                name,
                slug: customSlug,
                seriesSlug,
                description,
                type,
                associationId,
                seasonId,
                startDate,
                endDate,
                location,
                isOfficial: customIsOfficial,
                countsForElo: customCountsForElo,
                requiresApproval: customRequiresApproval,
                entryFee,
                settings,
            } = req.body;

            // Load association governance rules
            const association = await prisma.association.findUnique({
                where: { id: associationId },
            });

            if (!association) {
                return res.status(404).json({ error: 'Association not found' });
            }

            const rules = (association.rules as any) || {};
            const compGov = rules.competitionGovernance || {};

            // 1. Check Creator Permissions
            const isSuperAdmin = user.isSuperAdmin;
            const isAssocAdmin = user.associationRoles.some(
                (r) => r.associationId === associationId && ['ADMIN', 'PRESIDENT'].includes(r.role),
            );
            const isClubAdmin = user.clubRoles.some((r) => ['ADMIN', 'PRESIDENT'].includes(r.role));

            const allowedCreator = compGov.allowedCreatorsByType?.[type] || compGov.allowedCreators || 'CLUB_ADMIN';

            if (allowedCreator === 'SUPER_ADMIN' && !isSuperAdmin) {
                return res.status(403).json({ error: 'Only Super Administrators can create competitions of this type.' });
            }
            if (allowedCreator === 'ASSOCIATION_ADMIN' && !isSuperAdmin && !isAssocAdmin) {
                return res.status(403).json({ error: 'Only Association Administrators can create competitions of this type.' });
            }
            if (allowedCreator === 'CLUB_ADMIN' && !isSuperAdmin && !isAssocAdmin && !isClubAdmin) {
                return res.status(403).json({ error: 'Only Club or Association Administrators can create competitions of this type.' });
            }

            // 2. Check Approval Requirement
            const ruleRequiresApproval =
                compGov.requireApprovalByType?.[type] !== undefined
                    ? compGov.requireApprovalByType[type]
                    : compGov.requireApproval !== undefined
                    ? compGov.requireApproval
                    : false;

            const isAutoApproved = isSuperAdmin || isAssocAdmin || !ruleRequiresApproval;
            const initialStatus = isAutoApproved ? CompetitionStatus.REGISTRATION_OPEN : CompetitionStatus.PENDING_APPROVAL;
            const approvalStatus = isAutoApproved ? 'APPROVED' : 'PENDING_APPROVAL';

            // 3. Inofficial / ELO Handling
            const isInofficial = type === 'INOFFICIAL' || customIsOfficial === false;
            const isOfficial = !isInofficial;
            const countsForElo = isInofficial ? false : (customCountsForElo !== undefined ? customCountsForElo : true);

            let finalSlug = customSlug ? customSlug.trim().toLowerCase() : slugify(name);
            const existing = await prisma.competition.findUnique({ where: { slug: finalSlug } });
            if (existing) {
                if (customSlug) {
                    return res.status(400).json({ error: `Competition slug '${finalSlug}' already exists` });
                }
                finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
            }

            // Build create data payload including direct competition columns
            const createData: any = {
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
                status: initialStatus as any,
                isOfficial,
                countsForElo,
                requiresApproval: !isAutoApproved,
                approvalStatus,
                createdById: user.id,
                entryFee: entryFee || 0,
            };

            // Date settings
            if (req.body.regStartTime) createData.regStartTime = new Date(req.body.regStartTime);
            if (req.body.regEndTime) createData.regEndTime = new Date(req.body.regEndTime);
            if (req.body.deregEndTime) createData.deregEndTime = new Date(req.body.deregEndTime);

            // Direct settings fields
            const allSettingFields = [
                'nameShort', 'nameDiploma', 'nameI18n', 'tournamentHomeText', 'sport', 'isSimpleMode',
                'plannedStartTime', 'plannedEndTime', 'deregInfo', 'blockEnrollment', 'regPassword', 'noRegPasswordForConfirmation',
                'currency', 'associationCostSingle', 'associationCostEachDay', 'noAssociationCostForUnlicensed', 'fineCost',
                'manyEnrollmentsDiscount', 'manyEnrollmentsNrCategories', 'manyEnrollmentsDiscountOnlyTotal', 'manyEnrollmentsAlsoJuniorCost',
                'manyEnrollmentsAlsoTeamCost', 'moreDiscounts', 'allowOnlinePayment', 'forcePaymentDelay', 'enrollmentConfirmationDelay',
                'maxNrRegistrationsPerPlayer', 'maxNrRegistrations', 'maxNrPlayers', 'allowOnlyRegions', 'allowOnlyClubs', 'playerBlacklist',
                'ageCutMonth', 'juniorAge', 'categoryConflicts', 'forceTelNr', 'additionalDataClub', 'additionalDataLevel', 'additionalDataEmail',
                'autoEnrollIfOnlyOneCategory', 'chiefReferee', 'allPlayersCanBeReferees', 'allowRefOnlyOnCorrectTable', 'allowDoubleCourtUsage',
                'noWhenCourtFreeMessage', 'allowMatchesWithoutCourt', 'usersCanAddAvailableCourts', 'defaultCourtOrder', 'autoSetGamesToCalledOut',
                'maxNrCallouts', 'automatedCallouts', 'usePushNotifications', 'skipAwardCeremonies', 'useShirtNumbers', 'printClubOnMatchform',
                'printLevelOnMatchform', 'printShortTournamentName', 'printPlannedStartTime', 'printCourtPlaceDetails', 'showOnlyPlaceNotCourt',
                'playersCanPrintMatchForm', 'advancedMatchFormTwoRows', 'allowWaitlist', 'hideWaitlistForNonadmins', 'autoConfirmTeams',
                'autoConfirmDoubles', 'teamChangeKeepWaitlist', 'drawOnlyDisplayPresentTeams', 'drawOnlyDisplayPaidTeams',
                'categoryRankingsShowAllTeams', 'categorySortMode', 'categorySortModeRestrictions', 'hasSubTournaments', 'subTournamentsName',
                'subTournamentsNamePlural', 'subTournamentPassword', 'allowSamePlayerInMultipleSubTournaments', 'newSubTournamentInfotext',
                'registrationMailText', 'registrationMailHideCost', 'organizerName', 'organizerIban', 'organizerCountry', 'organizerZip',
                'organizerCity', 'organizerStreet', 'organizerStreetNumber', 'autoBackup', 'keepNrBackups', 'backupWithChangeData',
                'showInArchive', 'hideInGlobalArchive',
            ];

            for (const f of allSettingFields) {
                if (req.body[f] !== undefined) {
                    createData[f] = req.body[f];
                }
            }

            const competition = await (prisma.competition.create as any)({
                data: createData,
            });

            // Automatically assign Creator as Competition Admin
            await (prisma as any).competitionUserRole.create({
                data: {
                    competitionId: competition.id,
                    userId: user.id,
                    role: CompetitionRole.ADMIN,
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

            await AuditService.record({
                req,
                userId: user.id,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'COMPETITION_CREATE',
                category: AuditCategory.TOURNAMENT,
                entityType: 'Competition',
                entityId: competition.id,
                associationId,
                description: `Created ${isOfficial ? 'official' : 'inofficial'} competition "${competition.name}" (${type})`,
                status: 'SUCCESS',
            });

            res.status(201).json(competition);
        } catch (err) {
            next(err);
        }
    },
);

// PUT /competitions/:id - Update general settings
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const canEdit = await hasCompetitionPermission(req.user!.id, req.params.id, [CompetitionRole.ADMIN]);
        if (!canEdit) {
            return res.status(403).json({ error: 'Permission denied to edit competition settings.' });
        }

        const { name, description, location, startDate, endDate, isOfficial, countsForElo, entryFee, status } = req.body;

        const current = await prisma.competition.findUnique({ where: { id: req.params.id } });
        if (!current) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        const updateData: any = {
            ...(name ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(location !== undefined ? { location } : {}),
            ...(startDate ? { startDate: new Date(startDate) } : {}),
            ...(endDate ? { endDate: new Date(endDate) } : {}),
            ...(isOfficial !== undefined ? { isOfficial: !!isOfficial } : {}),
            ...(countsForElo !== undefined ? { countsForElo: !!countsForElo } : {}),
            ...(entryFee !== undefined ? { entryFee: Number(entryFee) } : {}),
            ...(status ? { status: status as any } : {}),
        };

        // Dates
        if (req.body.regStartTime !== undefined) {
            updateData.regStartTime = req.body.regStartTime ? new Date(req.body.regStartTime) : null;
        }
        if (req.body.regEndTime !== undefined) {
            updateData.regEndTime = req.body.regEndTime ? new Date(req.body.regEndTime) : null;
        }
        if (req.body.deregEndTime !== undefined) {
            updateData.deregEndTime = req.body.deregEndTime ? new Date(req.body.deregEndTime) : null;
        }

        const allSettingFields = [
            'nameShort', 'nameDiploma', 'nameI18n', 'tournamentHomeText', 'sport', 'isSimpleMode',
            'plannedStartTime', 'plannedEndTime', 'deregInfo', 'blockEnrollment', 'regPassword', 'noRegPasswordForConfirmation',
            'currency', 'associationCostSingle', 'associationCostEachDay', 'noAssociationCostForUnlicensed', 'fineCost',
            'manyEnrollmentsDiscount', 'manyEnrollmentsNrCategories', 'manyEnrollmentsDiscountOnlyTotal', 'manyEnrollmentsAlsoJuniorCost',
            'manyEnrollmentsAlsoTeamCost', 'moreDiscounts', 'allowOnlinePayment', 'forcePaymentDelay', 'enrollmentConfirmationDelay',
            'maxNrRegistrationsPerPlayer', 'maxNrRegistrations', 'maxNrPlayers', 'allowOnlyRegions', 'allowOnlyClubs', 'playerBlacklist',
            'ageCutMonth', 'juniorAge', 'categoryConflicts', 'forceTelNr', 'additionalDataClub', 'additionalDataLevel', 'additionalDataEmail',
            'autoEnrollIfOnlyOneCategory', 'chiefReferee', 'allPlayersCanBeReferees', 'allowRefOnlyOnCorrectTable', 'allowDoubleCourtUsage',
            'noWhenCourtFreeMessage', 'allowMatchesWithoutCourt', 'usersCanAddAvailableCourts', 'defaultCourtOrder', 'autoSetGamesToCalledOut',
            'maxNrCallouts', 'automatedCallouts', 'usePushNotifications', 'skipAwardCeremonies', 'useShirtNumbers', 'printClubOnMatchform',
            'printLevelOnMatchform', 'printShortTournamentName', 'printPlannedStartTime', 'printCourtPlaceDetails', 'showOnlyPlaceNotCourt',
            'playersCanPrintMatchForm', 'advancedMatchFormTwoRows', 'allowWaitlist', 'hideWaitlistForNonadmins', 'autoConfirmTeams',
            'autoConfirmDoubles', 'teamChangeKeepWaitlist', 'drawOnlyDisplayPresentTeams', 'drawOnlyDisplayPaidTeams',
            'categoryRankingsShowAllTeams', 'categorySortMode', 'categorySortModeRestrictions', 'hasSubTournaments', 'subTournamentsName',
            'subTournamentsNamePlural', 'subTournamentPassword', 'allowSamePlayerInMultipleSubTournaments', 'newSubTournamentInfotext',
            'registrationMailText', 'registrationMailHideCost', 'organizerName', 'organizerIban', 'organizerCountry', 'organizerZip',
            'organizerCity', 'organizerStreet', 'organizerStreetNumber', 'autoBackup', 'keepNrBackups', 'backupWithChangeData',
            'showInArchive', 'hideInGlobalArchive',
        ];

        for (const f of allSettingFields) {
            if (req.body[f] !== undefined) {
                updateData[f] = req.body[f];
            }
        }

        const updated = await (prisma.competition.update as any)({
            where: { id: req.params.id },
            data: updateData,
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// PUT /competitions/:id/approval - Approve or reject competition (Association Admin only)
router.put('/:id/approval', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const comp = await prisma.competition.findUnique({ where: { id: req.params.id } });
        if (!comp) return res.status(404).json({ error: 'Competition not found' });

        const isAssocAdmin =
            req.user!.isSuperAdmin ||
            req.user!.associationRoles.some(
                (r) => r.associationId === comp.associationId && ['ADMIN', 'PRESIDENT'].includes(r.role),
            );

        if (!isAssocAdmin) {
            return res.status(403).json({ error: 'Only association administrators can approve competitions.' });
        }

        const { status } = req.body; // 'APPROVED' or 'REJECTED'
        const isApproved = status === 'APPROVED';

        const updated = await (prisma.competition.update as any)({
            where: { id: req.params.id },
            data: {
                approvalStatus: isApproved ? 'APPROVED' : 'REJECTED',
                status: (isApproved ? 'REGISTRATION_OPEN' : 'REJECTED') as any,
                requiresApproval: false,
            },
        });

        await AuditService.record({
            req,
            action: isApproved ? 'COMPETITION_APPROVED' : 'COMPETITION_REJECTED',
            category: AuditCategory.TOURNAMENT,
            entityType: 'Competition',
            entityId: updated.id,
            associationId: comp.associationId,
            description: `Association admin ${isApproved ? 'approved' : 'rejected'} competition "${comp.name}"`,
            status: 'SUCCESS',
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// GET /competitions/:id/roles - List user roles
router.get('/:id/roles', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const roles = await (prisma as any).competitionUserRole.findMany({
            where: { competitionId: req.params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatarUrl: true,
                        licenseId: true,
                        eloPoints: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json(roles);
    } catch (err) {
        next(err);
    }
});

// POST /competitions/:id/roles - Assign access role
router.post(
    '/:id/roles',
    authenticateToken,
    validate(assignCompetitionRoleSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const canManage = await hasCompetitionPermission(req.user!.id, req.params.id, [CompetitionRole.ADMIN]);
            if (!canManage) {
                return res.status(403).json({ error: 'Permission denied to manage competition access rights.' });
            }

            const { userId, role } = req.body;

            const existing = await (prisma as any).competitionUserRole.findUnique({
                where: {
                    competitionId_userId_role: {
                        competitionId: req.params.id,
                        userId,
                        role,
                    },
                },
            });

            if (existing) {
                return res.status(400).json({ error: 'User already has this role in the competition.' });
            }

            const assigned = await (prisma as any).competitionUserRole.create({
                data: {
                    competitionId: req.params.id,
                    userId,
                    role,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatarUrl: true,
                            licenseId: true,
                        },
                    },
                },
            });

            res.status(201).json(assigned);
        } catch (err) {
            next(err);
        }
    },
);

// DELETE /competitions/:id/roles/:roleId - Remove access role
router.delete('/:id/roles/:roleId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const canManage = await hasCompetitionPermission(req.user!.id, req.params.id, [CompetitionRole.ADMIN]);
        if (!canManage) {
            return res.status(403).json({ error: 'Permission denied to manage competition access rights.' });
        }

        await (prisma as any).competitionUserRole.delete({
            where: { id: req.params.roleId },
        });

        res.json({ message: 'Role revoked successfully' });
    } catch (err) {
        next(err);
    }
});

// GET /competitions/:id/players - Consolidated player roster with check-in & cashier status
router.get('/:id/players', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const categories = await prisma.category.findMany({
            where: { competitionId: req.params.id },
            include: {
                teams: {
                    include: {
                        team: {
                            include: {
                                club: true,
                                members: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                firstName: true,
                                                lastName: true,
                                                email: true,
                                                licenseId: true,
                                                eloPoints: true,
                                                rank: true,
                                                avatarUrl: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const playersList: any[] = [];
        categories.forEach((cat) => {
            cat.teams.forEach((reg: any) => {
                reg.team.members.forEach((member: any) => {
                    playersList.push({
                        registrationId: reg.id,
                        teamId: reg.team.id,
                        teamName: reg.team.name,
                        clubName: reg.team.club?.name || 'Independent / Individual',
                        categoryId: cat.id,
                        categoryName: cat.name,
                        user: member.user,
                        role: member.role,
                        isCheckedIn: reg.isCheckedIn,
                        paymentStatus: reg.paymentStatus,
                        paidAmount: reg.paidAmount,
                        paymentMethod: reg.paymentMethod,
                        registeredAt: reg.registeredAt,
                    });
                });
            });
        });

        res.json(playersList);
    } catch (err) {
        next(err);
    }
});

// POST /competitions/:id/players/:regId/checkin - Toggle checkin
router.post('/:id/players/:regId/checkin', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const canCheckin = await hasCompetitionPermission(req.user!.id, req.params.id, [
            CompetitionRole.ADMIN,
            CompetitionRole.EDIT_REGISTRATIONS,
            CompetitionRole.SPEAKER,
        ]);
        if (!canCheckin) return res.status(403).json({ error: 'Permission denied.' });

        const { isCheckedIn } = req.body;
        const reg = await (prisma.teamCategoryRegistration.update as any)({
            where: { id: req.params.regId },
            data: {
                isCheckedIn: isCheckedIn !== undefined ? !!isCheckedIn : true,
            },
        });

        res.json(reg);
    } catch (err) {
        next(err);
    }
});

// POST /competitions/:id/players/:regId/payment - Cashier update payment
router.post(
    '/:id/players/:regId/payment',
    authenticateToken,
    validate(updateRegistrationPaymentSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const canCashier = await hasCompetitionPermission(req.user!.id, req.params.id, [
                CompetitionRole.ADMIN,
                CompetitionRole.CASHIER,
            ]);
            if (!canCashier) return res.status(403).json({ error: 'Permission denied for cashier action.' });

            const { paymentStatus, paidAmount, paymentMethod } = req.body;
            const updated = await (prisma.teamCategoryRegistration.update as any)({
                where: { id: req.params.regId },
                data: {
                    paymentStatus,
                    ...(paidAmount !== undefined ? { paidAmount: Number(paidAmount) } : {}),
                    ...(paymentMethod !== undefined ? { paymentMethod } : {}),
                },
            });

            res.json(updated);
        } catch (err) {
            next(err);
        }
    },
);

// GET /competitions/:id/speaker/callouts - List speaker callouts
router.get('/:id/speaker/callouts', async (req, res, next) => {
    try {
        const callouts = await (prisma as any).competitionSpeakerCallout.findMany({
            where: { competitionId: req.params.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json(callouts);
    } catch (err) {
        next(err);
    }
});

// POST /competitions/:id/speaker/callouts - Announce callout
router.post(
    '/:id/speaker/callouts',
    authenticateToken,
    validate(speakerCalloutSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const canSpeak = await hasCompetitionPermission(req.user!.id, req.params.id, [
                CompetitionRole.ADMIN,
                CompetitionRole.SPEAKER,
                CompetitionRole.ASSIGN_COURTS,
            ]);
            if (!canSpeak) return res.status(403).json({ error: 'Permission denied for speaker callouts.' });

            const { title, message, type, unitName } = req.body;
            const callout = await (prisma as any).competitionSpeakerCallout.create({
                data: {
                    competitionId: req.params.id,
                    title,
                    message,
                    type: type || 'MATCH_CALL',
                    unitName: unitName || null,
                    status: 'PENDING',
                },
            });

            res.status(201).json(callout);
        } catch (err) {
            next(err);
        }
    },
);

// PUT /competitions/:id/speaker/callouts/:calloutId - Update callout status
router.put('/:id/speaker/callouts/:calloutId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { status } = req.body;
        const callout = await (prisma as any).competitionSpeakerCallout.update({
            where: { id: req.params.calloutId },
            data: { status },
        });
        res.json(callout);
    } catch (err) {
        next(err);
    }
});

// GET /competitions/:id/statistics - Compute tournament statistics
router.get('/:id/statistics', async (req, res, next) => {
    try {
        const competition = await prisma.competition.findUnique({
            where: { id: req.params.id },
            include: {
                categories: {
                    include: {
                        teams: {
                            include: {
                                team: { include: { club: true, members: true } },
                            },
                        },
                        encounters: {
                            include: {
                                matches: true,
                            },
                        },
                    },
                },
            },
        });

        if (!competition) return res.status(404).json({ error: 'Competition not found' });

        let totalTeams = 0;
        let totalMatches = 0;
        let completedMatches = 0;
        let liveMatches = 0;
        let totalSets = 0;
        const clubsSet = new Set<string>();
        const playersSet = new Set<string>();

        competition.categories.forEach((cat) => {
            totalTeams += cat.teams.length;
            cat.teams.forEach((t) => {
                if (t.team.club?.name) clubsSet.add(t.team.club.name);
                t.team.members.forEach((m) => playersSet.add(m.userId));
            });

            cat.encounters.forEach((enc) => {
                enc.matches.forEach((m) => {
                    totalMatches++;
                    if (m.status === 'FINISHED') completedMatches++;
                    if (m.status === 'LIVE') liveMatches++;
                    totalSets += (m.homeWonSets || 0) + (m.awayWonSets || 0);
                });
            });
        });

        res.json({
            competitionId: competition.id,
            competitionName: competition.name,
            totalCategories: competition.categories.length,
            totalTeams,
            totalPlayers: playersSet.size,
            totalClubs: clubsSet.size,
            totalMatches,
            completedMatches,
            liveMatches,
            pendingMatches: totalMatches - completedMatches - liveMatches,
            totalSets,
            completionPercentage: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
        });
    } catch (err) {
        next(err);
    }
});

// POST /competitions/:id/backup - Snapshot state backup
router.post('/:id/backup', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const canBackup = await hasCompetitionPermission(req.user!.id, req.params.id, [
            CompetitionRole.ADMIN,
            CompetitionRole.CREATE_BACKUPS,
        ]);
        if (!canBackup) return res.status(403).json({ error: 'Permission denied to create backups.' });

        const snapshot = await prisma.competition.findUnique({
            where: { id: req.params.id },
            include: {
                categories: {
                    include: {
                        groups: { include: { standings: true } },
                        teams: { include: { team: { include: { members: true, club: true } } } },
                        encounters: { include: { matches: true } },
                    },
                },
                roles: { include: { user: true } },
                locations: { include: { location: true } },
            },
        });

        res.json({
            exportedAt: new Date().toISOString(),
            version: '1.0',
            data: snapshot,
        });
    } catch (err) {
        next(err);
    }
});

// GET /competitions/:id/actions - Audit trail
router.get('/:id/actions', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                OR: [{ tournamentId: req.params.id }, { entityId: req.params.id }],
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        res.json(logs);
    } catch (err) {
        next(err);
    }
});

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
                    genderRestriction,
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

// POST /competitions/categories/:categoryId/teams - Register team
router.post('/categories/:categoryId/teams', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { teamName, clubId, playerUserIds } = req.body;

        const team = await prisma.team.create({
            data: {
                name: teamName,
                clubId: clubId || null,
                members: {
                    create: (playerUserIds || [req.user!.id]).map((userId: string) => ({
                        userId,
                        role: 'PLAYER',
                    })),
                },
                registrations: {
                    create: {
                        categoryId: req.params.categoryId,
                    },
                },
            },
            include: {
                members: { include: { user: true } },
                registrations: true,
            },
        });

        res.status(201).json(team);
    } catch (err) {
        next(err);
    }
});

// PUT /competitions/categories/:categoryId - Update category settings
router.post('/categories/:categoryId/update', authenticateToken, async (req: AuthRequest, res: Response, next) => {
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

        const updated = await prisma.category.update({
            where: { id: req.params.categoryId },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(nameI18n !== undefined ? { nameI18n } : {}),
                ...(teamSize !== undefined ? { teamSize: Number(teamSize) } : {}),
                ...(minElo !== undefined ? { minElo: minElo === null || minElo === '' ? null : Number(minElo) } : {}),
                ...(maxElo !== undefined ? { maxElo: maxElo === null || maxElo === '' ? null : Number(maxElo) } : {}),
                ...(minAge !== undefined ? { minAge: minAge === null || minAge === '' ? null : Number(minAge) } : {}),
                ...(maxAge !== undefined ? { maxAge: maxAge === null || maxAge === '' ? null : Number(maxAge) } : {}),
                ...(genderRestriction !== undefined ? { genderRestriction } : {}),
                ...(requiredLicenseType !== undefined ? { requiredLicenseType: requiredLicenseType || null } : {}),
                ...(encounterFormat !== undefined ? { encounterFormat } : {}),
                ...(roundsPerGroup !== undefined ? { roundsPerGroup: Number(roundsPerGroup) } : {}),
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

router.put('/categories/:categoryId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
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

        const updated = await prisma.category.update({
            where: { id: req.params.categoryId },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(nameI18n !== undefined ? { nameI18n } : {}),
                ...(teamSize !== undefined ? { teamSize: Number(teamSize) } : {}),
                ...(minElo !== undefined ? { minElo: minElo === null || minElo === '' ? null : Number(minElo) } : {}),
                ...(maxElo !== undefined ? { maxElo: maxElo === null || maxElo === '' ? null : Number(maxElo) } : {}),
                ...(minAge !== undefined ? { minAge: minAge === null || minAge === '' ? null : Number(minAge) } : {}),
                ...(maxAge !== undefined ? { maxAge: maxAge === null || maxAge === '' ? null : Number(maxAge) } : {}),
                ...(genderRestriction !== undefined ? { genderRestriction } : {}),
                ...(requiredLicenseType !== undefined ? { requiredLicenseType: requiredLicenseType || null } : {}),
                ...(encounterFormat !== undefined ? { encounterFormat } : {}),
                ...(roundsPerGroup !== undefined ? { roundsPerGroup: Number(roundsPerGroup) } : {}),
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// POST /competitions/categories/:categoryId/reset-draw - Clear existing draw/pools/encounters
router.post('/categories/:categoryId/reset-draw', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const categoryId = req.params.categoryId;
        await prisma.$transaction(async (tx) => {
            // Delete matches
            await tx.match.deleteMany({
                where: { encounter: { categoryId } },
            });
            // Delete encounters
            await tx.encounter.deleteMany({
                where: { categoryId },
            });
            // Delete group standings
            await tx.groupStanding.deleteMany({
                where: { group: { categoryId } },
            });
            // Delete competition groups
            await tx.competitionGroup.deleteMany({
                where: { categoryId },
            });
        });

        res.json({ success: true, message: 'Category draw and encounters cleared successfully.' });
    } catch (err) {
        next(err);
    }
});

// POST /competitions/categories/:categoryId/generate-groups - Generate pools & fixtures
router.post('/categories/:categoryId/generate-groups', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { groupCount = 1, customGroups } = req.body;

        const category = await prisma.category.findUnique({
            where: { id: req.params.categoryId },
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const registrations = await prisma.teamCategoryRegistration.findMany({
            where: { categoryId: req.params.categoryId },
            include: { team: true },
        });

        const allTeamIds = registrations.map((r) => r.teamId);
        if (allTeamIds.length < 2) {
            return res.status(400).json({ error: 'At least 2 teams required to generate draw' });
        }

        // Clean previous groups and encounters
        await prisma.$transaction(async (tx) => {
            await tx.match.deleteMany({ where: { encounter: { categoryId: category.id } } });
            await tx.encounter.deleteMany({ where: { categoryId: category.id } });
            await tx.groupStanding.deleteMany({ where: { group: { categoryId: category.id } } });
            await tx.competitionGroup.deleteMany({ where: { categoryId: category.id } });
        });

        const groups = [];

        if (Array.isArray(customGroups) && customGroups.length > 0) {
            // Custom groups distribution passed by admin
            for (let i = 0; i < customGroups.length; i++) {
                const cg = customGroups[i];
                const gTeamIds = (cg.teamIds || []).filter((id: string) => allTeamIds.includes(id));
                if (gTeamIds.length === 0) continue;

                const group = await prisma.competitionGroup.create({
                    data: {
                        categoryId: category.id,
                        name: cg.name || `Group ${String.fromCharCode(65 + i)}`,
                    },
                });

                if (gTeamIds.length >= 2) {
                    await CompetitionService.generateGroupEncounters(
                        category.id,
                        group.id,
                        gTeamIds,
                        category.roundsPerGroup || 1,
                    );
                }

                groups.push(group);
            }
        } else {
            // Automated equal distribution
            const teamsPerGroup = Math.ceil(allTeamIds.length / groupCount);

            for (let g = 0; g < groupCount; g++) {
                const groupLetter = String.fromCharCode(65 + g);
                const gTeamIds = allTeamIds.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);

                if (gTeamIds.length === 0) continue;

                const group = await prisma.competitionGroup.create({
                    data: {
                        categoryId: category.id,
                        name: `Group ${groupLetter}`,
                    },
                });

                if (gTeamIds.length >= 2) {
                    await CompetitionService.generateGroupEncounters(
                        category.id,
                        group.id,
                        gTeamIds,
                        category.roundsPerGroup || 1,
                    );
                }

                groups.push(group);
            }
        }

        res.status(201).json(groups);
    } catch (err) {
        next(err);
    }
});

// GET /competitions/encounters/:encounterId - Encounter detail
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

// PUT /competitions/matches/:matchId/score - Live score entry with ELO exemption handling
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
