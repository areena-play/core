import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createClubSchema, formatPhoneNumber } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { slugify } from '../utils/slugify';
import { RelationshipsService } from '../services/relationships.service';

const router = Router();

// Helper to resolve club by UUID, slug, or uppercase code
async function resolveClub(idOrSlug: string) {
    return prisma.club.findFirst({
        where: {
            OR: [
                { id: idOrSlug },
                { slug: idOrSlug.toLowerCase() },
                { code: idOrSlug.toUpperCase() },
            ],
        },
    });
}

// Helper to check if authenticated user is a club official
function isClubOfficial(req: AuthRequest, clubId: string) {
    if (!req.user) return false;
    if (req.user.isSuperAdmin) return true;
    return req.user.clubRoles?.some(
        (r) => r.clubId === clubId && ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COACH', 'TECHNICAL_DIRECTOR', 'JUNIOR_COACH', 'OFFICIAL'].includes(r.role)
    );
}

// GET /clubs
router.get('/', async (req, res, next) => {
    try {
        const clubs = await prisma.club.findMany({
            include: {
                associations: { include: { association: true } },
                _count: { select: { licenses: true, teams: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(clubs);
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id - Lookup by UUID, slug, or code
router.get('/:id', async (req, res, next) => {
    try {
        const idOrSlug = req.params.id;
        const club = await prisma.club.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug.toLowerCase() },
                    { code: idOrSlug.toUpperCase() },
                ],
            },
            include: {
                associations: { include: { association: true } },
                adminRoles: { include: { user: true } },
                teams: { include: { members: { include: { user: true } } } },
                licenses: {
                    where: { status: 'APPROVED' },
                    include: { user: true, season: true, association: true },
                },
                locations: {
                    include: {
                        location: {
                            include: { units: true },
                        },
                    },
                },
                calendarEvents: {
                    orderBy: { startDate: 'asc' },
                    take: 10,
                },
            },
        });

        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        res.json(club);
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id/contacts - Officials, address, and sports hall venues
router.get('/:id/contacts', async (req, res, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        const [officials, locationClubs] = await Promise.all([
            prisma.userClubRole.findMany({
                where: {
                    clubId: club.id,
                    role: {
                        in: [
                            'ADMIN',
                            'PRESIDENT',
                            'SECRETARY',
                            'TREASURER',
                            'COACH',
                            'JUNIOR_COACH',
                            'TECHNICAL_DIRECTOR',
                            'OFFICIAL',
                            'BOARD_MEMBER',
                        ],
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            avatarUrl: true,
                            licenseId: true,
                            currentLevel: true,
                        },
                    },
                },
                orderBy: { role: 'asc' },
            }),
            prisma.locationClub.findMany({
                where: { clubId: club.id },
                include: {
                    location: {
                        include: {
                            units: true,
                        },
                    },
                },
                orderBy: { isPrimary: 'desc' },
            }),
        ]);

        res.json({
            club: {
                id: club.id,
                name: club.name,
                code: club.code,
                slug: club.slug,
                address: club.address,
                city: club.city,
                postalCode: club.postalCode,
                country: club.country,
                email: club.email,
                phone: club.phone,
                website: club.website,
                logoUrl: club.logoUrl,
            },
            officials,
            locations: locationClubs.map((lc) => ({
                id: lc.location.id,
                name: lc.location.name,
                slug: lc.location.slug,
                address: lc.location.address,
                city: lc.location.city,
                postalCode: lc.location.postalCode,
                country: lc.location.country,
                googleMapsUrl: lc.location.googleMapsUrl,
                phone: lc.location.phone,
                email: lc.location.email,
                website: lc.location.website,
                imageUrl: lc.location.imageUrl,
                isPrimary: lc.isPrimary,
                units: lc.location.units,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id/members - Registered members & athletes
router.get('/:id/members', async (req, res, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        const [licenses, clubRoles] = await Promise.all([
            prisma.license.findMany({
                where: { clubId: club.id },
                include: {
                    user: true,
                    season: true,
                    association: true,
                },
                orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            }),
            prisma.userClubRole.findMany({
                where: { clubId: club.id },
                include: {
                    user: {
                        include: {
                            licenses: {
                                where: {
                                    OR: [{ clubId: club.id }, { clubId: null }],
                                },
                                include: { season: true, association: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // Build unified member list deduplicated by user ID
        const memberMap = new Map<string, any>();

        // 1. Add all direct club licenses
        for (const lic of licenses) {
            if (lic.userId) {
                memberMap.set(lic.userId, {
                    id: lic.id,
                    userId: lic.userId,
                    user: lic.user,
                    type: lic.type,
                    status: lic.status,
                    licenseNumber: lic.user?.licenseId || lic.id,
                    validUntil: lic.validUntil,
                    season: lic.season,
                    association: lic.association,
                });
            }
        }

        // 2. Add any members from club roles not yet in the map
        for (const cr of clubRoles) {
            if (cr.userId && !memberMap.has(cr.userId)) {
                const primaryLic = cr.user?.licenses?.[0];
                memberMap.set(cr.userId, {
                    id: primaryLic?.id || cr.id,
                    userId: cr.userId,
                    user: cr.user,
                    type: primaryLic?.type || (cr.role === 'PLAYER' ? 'PLAYER_REGULAR' : cr.role),
                    status: primaryLic?.status || 'APPROVED',
                    licenseNumber: cr.user?.licenseId || primaryLic?.id || 'MEMBER',
                    validUntil: primaryLic?.validUntil || null,
                    season: primaryLic?.season || null,
                    association: primaryLic?.association || null,
                });
            }
        }

        const unifiedMembers = Array.from(memberMap.values());
        const officialRoles = clubRoles.filter((cr) => cr.role !== 'PLAYER');

        res.json({
            club: { id: club.id, name: club.name, code: club.code, slug: club.slug },
            members: unifiedMembers,
            licenses: unifiedMembers,
            officials: officialRoles,
        });
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id/teams - All club teams across competitions (League, Cup, Tournaments) with season filter
router.get('/:id/teams', async (req, res, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        const { seasonId, type } = req.query;

        // Fetch all seasons
        const seasons = await prisma.season.findMany({
            orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
        });

        const currentSeason = seasons.find((s) => s.isCurrent) || seasons[0];

        // Query teams belonging to this club
        const teams = await prisma.team.findMany({
            where: {
                clubId: club.id,
                ...(seasonId && seasonId !== 'ALL'
                    ? {
                          registrations: {
                              some: {
                                  category: {
                                      competition: {
                                          seasonId: String(seasonId),
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            include: {
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
                                avatarUrl: true,
                                currentLevel: true,
                            },
                        },
                    },
                    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
                },
                registrations: {
                    include: {
                        category: {
                            include: {
                                competition: {
                                    include: {
                                        season: true,
                                        association: true,
                                    },
                                },
                            },
                        },
                    },
                },
                standings: {
                    include: {
                        group: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // Filter by competition type if requested
        const filteredTeams =
            type && type !== 'ALL'
                ? teams.filter((t) =>
                      t.registrations.some(
                          (r) => r.category?.competition?.type === String(type).toUpperCase()
                      )
                  )
                : teams;

        res.json({
            club: { id: club.id, name: club.name, code: club.code, slug: club.slug },
            teams: filteredTeams,
            seasons,
            currentSeason,
        });
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id/events - Club encounters, fixtures, and calendar events
router.get('/:id/events', async (req, res, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        const [calendarEvents, teams] = await Promise.all([
            prisma.calendarEvent.findMany({
                where: { clubId: club.id },
                orderBy: { startDate: 'asc' },
            }),
            prisma.team.findMany({
                where: { clubId: club.id },
                select: { id: true, name: true },
            }),
        ]);

        const teamIds = teams.map((t) => t.id);

        const encounters = teamIds.length > 0
            ? await prisma.encounter.findMany({
                  where: {
                      OR: [
                          { homeTeamId: { in: teamIds } },
                          { awayTeamId: { in: teamIds } },
                      ],
                  },
                  include: {
                      homeTeam: { include: { club: true } },
                      awayTeam: { include: { club: true } },
                      group: { include: { category: { include: { competition: true } } } },
                  },
                  orderBy: { scheduledAt: 'asc' },
              })
            : [];

        res.json({
            club: { id: club.id, name: club.name, code: club.code, slug: club.slug },
            calendarEvents,
            encounters,
            teams,
        });
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id/licensing - Licensing Hub (Club Officials Only)
router.get('/:id/licensing', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (!isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Restricted to club officials' });
        }

        const [pendingLicenses, activeLicenses, allLicenses, currentSeason, eligibleMembers] = await Promise.all([
            prisma.license.findMany({
                where: { clubId: club.id, status: { in: ['PENDING_CLUB', 'PENDING_ASSOCIATION'] } },
                include: { user: true, season: true, association: true, appliedBy: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.license.findMany({
                where: { clubId: club.id, status: 'APPROVED' },
                include: { user: true, season: true, association: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.license.findMany({
                where: { clubId: club.id },
                include: { user: true, season: true, association: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.season.findFirst({
                where: { isCurrent: true },
            }),
            prisma.user.findMany({
                where: {
                    OR: [
                        { clubRoles: { some: { clubId: club.id } } },
                        { licenses: { some: { clubId: club.id } } },
                    ],
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    licenseId: true,
                    eloPoints: true,
                    gender: true,
                    birthDate: true,
                },
                orderBy: { lastName: 'asc' },
            }),
        ]);

        res.json({
            club: { id: club.id, name: club.name, code: club.code, slug: club.slug },
            pendingLicenses,
            activeLicenses,
            allLicenses,
            currentSeason,
            eligibleMembers,
        });
    } catch (err) {
        next(err);
    }
});

// POST /clubs/:id/licenses/apply-behalf - Official submits license application for member
router.post('/:id/licenses/apply-behalf', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (!isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Restricted to club officials' });
        }

        const { userId, type, seasonId, notes } = req.body;
        if (!userId || !type) {
            return res.status(400).json({ error: 'User ID and license type are required' });
        }

        const targetSeason = seasonId
            ? await prisma.season.findUnique({ where: { id: seasonId } })
            : await prisma.season.findFirst({ where: { isCurrent: true } });

        if (!targetSeason) {
            return res.status(400).json({ error: 'No active season found' });
        }

        // Get top-level association affiliated with club
        const clubAssoc = await prisma.clubAssociation.findFirst({
            where: { clubId: club.id },
            include: { association: true },
        });

        const assocId = clubAssoc?.associationId || (await prisma.association.findFirst({ where: { isTopLevel: true } }))?.id;

        const licenseTypeMap: Record<string, any> = {
            PLAYER: 'PLAYER_REGULAR',
            PLAYER_STANDARD: 'PLAYER_REGULAR',
            PLAYER_JUNIOR: 'PLAYER_JUNIOR',
            PLAYER_SENIOR: 'PLAYER_SENIOR',
            COACH: 'COACH',
            REFEREE: 'REFEREE',
        };
        const mappedType = licenseTypeMap[type] || 'PLAYER_REGULAR';

        const license = await prisma.license.create({
            data: {
                userId,
                clubId: club.id,
                associationId: assocId!,
                seasonId: targetSeason.id,
                type: mappedType,
                status: 'APPROVED', // Pre-approved by club, active for club matches
                scope: 'ALL',
                appliedByUserId: req.user!.id,
                approvedByUserId: req.user!.id,
                validFrom: new Date(),
                validUntil: targetSeason.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
            include: {
                user: true,
                season: true,
                association: true,
            },
        });

        res.status(201).json({ success: true, license });
    } catch (err) {
        next(err);
    }
});

// POST /clubs/:id/licenses/:licenseId/club-approve
router.post('/:id/licenses/:licenseId/club-approve', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club || !isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const license = await prisma.license.update({
            where: { id: req.params.licenseId },
            data: {
                status: 'APPROVED',
                approvedByUserId: req.user!.id,
            },
            include: { user: true, season: true },
        });

        res.json({ success: true, license });
    } catch (err) {
        next(err);
    }
});

// POST /clubs/:id/licenses/:licenseId/club-reject
router.post('/:id/licenses/:licenseId/club-reject', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club || !isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const license = await prisma.license.update({
            where: { id: req.params.licenseId },
            data: { status: 'REJECTED' },
        });

        res.json({ success: true, license });
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id/members-hub - Members Hub (Club Officials Only)
router.get('/:id/members-hub', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (!isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Restricted to club officials' });
        }

        const [officials, licenses, clubRoles] = await Promise.all([
            prisma.userClubRole.findMany({
                where: {
                    clubId: club.id,
                    role: {
                        in: [
                            'ADMIN',
                            'PRESIDENT',
                            'SECRETARY',
                            'TREASURER',
                            'COACH',
                            'JUNIOR_COACH',
                            'TECHNICAL_DIRECTOR',
                            'OFFICIAL',
                            'BOARD_MEMBER',
                        ],
                    },
                },
                include: { user: true },
                orderBy: { role: 'asc' },
            }),
            prisma.license.findMany({
                where: { clubId: club.id },
                include: { user: true, season: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.userClubRole.findMany({
                where: { clubId: club.id },
                include: {
                    user: {
                        include: {
                            licenses: {
                                where: {
                                    OR: [{ clubId: club.id }, { clubId: null }],
                                },
                                include: { season: true, association: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const memberMap = new Map<string, any>();

        for (const lic of licenses) {
            if (lic.userId) {
                memberMap.set(lic.userId, {
                    id: lic.id,
                    userId: lic.userId,
                    user: lic.user,
                    type: lic.type,
                    status: lic.status,
                    licenseNumber: lic.user?.licenseId || lic.id,
                    validUntil: lic.validUntil,
                    season: lic.season,
                });
            }
        }

        for (const cr of clubRoles) {
            if (cr.userId && !memberMap.has(cr.userId)) {
                const primaryLic = cr.user?.licenses?.[0];
                memberMap.set(cr.userId, {
                    id: primaryLic?.id || cr.id,
                    userId: cr.userId,
                    user: cr.user,
                    type: primaryLic?.type || (cr.role === 'PLAYER' ? 'PLAYER_REGULAR' : cr.role),
                    status: primaryLic?.status || 'APPROVED',
                    licenseNumber: cr.user?.licenseId || primaryLic?.id || 'MEMBER',
                    validUntil: primaryLic?.validUntil || null,
                    season: primaryLic?.season || null,
                });
            }
        }

        const unifiedMembers = Array.from(memberMap.values());
        const activeMembers = unifiedMembers.filter((m) => m.status === 'APPROVED');
        const pastMembers = unifiedMembers.filter((m) => m.status !== 'APPROVED');

        res.json({
            club: { id: club.id, name: club.name, code: club.code, slug: club.slug },
            assignedOfficials: officials,
            officials,
            activeMembers,
            pastMembers,
            allLicenses: licenses,
        });
    } catch (err) {
        next(err);
    }
});

// POST /clubs/:id/members/register - Quick register a new person under the club
router.post('/:id/members/register', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club || !isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { firstName, lastName, email, phone, birthDate, gender, address, city, postalCode, licenseType } = req.body;
        if (!firstName || !lastName) {
            return res.status(400).json({ error: 'First and last name are required' });
        }

        const userEmail = email?.trim() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now().toString().slice(-4)}@club-member.areena.local`;

        const newUser = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email: userEmail,
                phone: phone ? formatPhoneNumber(phone) : undefined,
                birthDate: birthDate ? new Date(birthDate) : undefined,
                gender: gender || 'OTHER',
                street: address || undefined,
                city: city || club.city,
                postalCode: postalCode || club.postalCode,
                country: 'Switzerland',
                eloPoints: 1000,
                canLogin: Boolean(email),
                emailVerified: false,
            },
        });

        // Assign to current season license
        const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } });
        const clubAssoc = await prisma.clubAssociation.findFirst({ where: { clubId: club.id } });
        const assocId = clubAssoc?.associationId || (await prisma.association.findFirst({ where: { isTopLevel: true } }))?.id;

        if (currentSeason && assocId) {
            const licenseTypeMap: Record<string, any> = {
                PLAYER: 'PLAYER_REGULAR',
                PLAYER_STANDARD: 'PLAYER_REGULAR',
                PLAYER_JUNIOR: 'PLAYER_JUNIOR',
                PLAYER_SENIOR: 'PLAYER_SENIOR',
                COACH: 'COACH',
                REFEREE: 'REFEREE',
            };
            const mappedType = licenseTypeMap[licenseType] || 'PLAYER_REGULAR';

            await prisma.license.create({
                data: {
                    userId: newUser.id,
                    clubId: club.id,
                    associationId: assocId,
                    seasonId: currentSeason.id,
                    type: mappedType,
                    status: 'APPROVED',
                    scope: 'ALL',
                    appliedByUserId: req.user!.id,
                    approvedByUserId: req.user!.id,
                    validFrom: new Date(),
                    validUntil: currentSeason.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                },
            });
        }

        res.status(201).json({ success: true, user: newUser });
    } catch (err) {
        next(err);
    }
});

// POST /clubs/:id/roles - Grant official role to a member
router.post('/:id/roles', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club || !isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { userId, role } = req.body;
        if (!userId || !role) {
            return res.status(400).json({ error: 'User ID and role are required' });
        }

        const newRole = await prisma.userClubRole.create({
            data: {
                userId,
                clubId: club.id,
                role: role.toUpperCase(),
            },
            include: { user: true },
        });

        res.status(201).json({ success: true, role: newRole });
    } catch (err) {
        next(err);
    }
});

// DELETE /clubs/:id/roles/:roleId - Revoke official role
router.delete('/:id/roles/:roleId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club || !isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.userClubRole.delete({
            where: { id: req.params.roleId },
        });

        res.json({ success: true, message: 'Role revoked successfully' });
    } catch (err) {
        next(err);
    }
});

// GET /clubs/:id/communications - Club Communications Hub
router.get('/:id/communications', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club || !isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const messages = await prisma.broadcastMessage.findMany({
            where: { clubId: club.id },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true, email: true } },
                recipients: {
                    include: {
                        recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
                    },
                },
            },
            orderBy: { sentAt: 'desc' },
        });

        res.json({
            club: { id: club.id, name: club.name, code: club.code, slug: club.slug },
            messages,
        });
    } catch (err) {
        next(err);
    }
});

// POST /clubs/:id/communications - Send club broadcast
router.post('/:id/communications', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club || !isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { title, subject, content, body, targetAudience, targetGroup, channel } = req.body;
        const msgSubject = title || subject;
        const msgBody = content || body;
        if (!msgSubject || !msgBody) {
            return res.status(400).json({ error: 'Subject title and content message are required' });
        }

        // Get recipients according to target audience
        const clubMembers = await prisma.user.findMany({
            where: {
                OR: [
                    { clubRoles: { some: { clubId: club.id } } },
                    { licenses: { some: { clubId: club.id, status: 'APPROVED' } } },
                ],
                email: { not: '' },
            },
            select: { id: true, email: true },
        });

        const message = await prisma.broadcastMessage.create({
            data: {
                senderUserId: req.user!.id,
                clubId: club.id,
                subject: msgSubject,
                body: msgBody,
                channel: channel === 'SMS' ? 'SMS' : 'EMAIL',
                targetFilter: { targetGroup: targetAudience || targetGroup || 'ALL_MEMBERS' },
                sentAt: new Date(),
                recipients: {
                    create: clubMembers.map((m) => ({
                        recipientUserId: m.id,
                        status: 'SENT',
                    })),
                },
            },
            include: {
                sender: true,
                recipients: true,
            },
        });

        res.status(201).json({ success: true, message });
    } catch (err) {
        next(err);
    }
});

// POST /clubs
router.post('/', authenticateToken, validate(createClubSchema), async (req: AuthRequest, res: Response, next) => {
    try {
        const { name, code, slug: customSlug, address, city, postalCode, country, email, phone, website, associationIds } = req.body;

        const existingCode = await prisma.club.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ error: `Club with code '${code}' already exists` });
        }

        const finalSlug = customSlug ? customSlug.trim().toLowerCase() : slugify(name || code);
        const existingSlug = await prisma.club.findUnique({ where: { slug: finalSlug } });
        if (existingSlug) {
            return res.status(400).json({ error: `Club with slug '${finalSlug}' already exists` });
        }

        const club = await prisma.club.create({
            data: {
                name,
                code,
                slug: finalSlug,
                address,
                city,
                postalCode,
                country: country || 'Switzerland',
                email,
                phone: phone ? formatPhoneNumber(phone) : phone,
                website,
            },
        });

        if (associationIds && associationIds.length > 0) {
            await prisma.clubAssociation.createMany({
                data: associationIds.map((associationId: string) => ({
                    clubId: club.id,
                    associationId,
                })),
            });
        }

        // Grant creator as club admin if not super admin
        await prisma.userClubRole.create({
            data: {
                userId: req.user!.id,
                clubId: club.id,
                role: 'ADMIN',
            },
        });

        res.status(201).json(club);
    } catch (err) {
        next(err);
    }
});

// PUT /clubs/:id - Update club details with OCC
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const club = await resolveClub(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (!isClubOfficial(req, club.id)) {
            return res.status(403).json({ error: 'Unauthorized to modify this club' });
        }

        const {
            name,
            slug: newSlug,
            address,
            city,
            postalCode,
            country,
            email,
            phone,
            website,
            logoUrl,
            expectedUpdatedAt,
        } = req.body;

        if (expectedUpdatedAt && new Date(club.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) {
            return res.status(409).json({
                error: 'Conflict: This club was modified concurrently by another administrator. Please reload before saving.',
            });
        }

        let finalSlug = undefined;
        if (newSlug && newSlug.trim().toLowerCase() !== club.slug) {
            const candidateSlug = slugify(newSlug.trim().toLowerCase());
            const existingSlug = await prisma.club.findFirst({
                where: { slug: candidateSlug, id: { not: club.id } },
            });
            if (existingSlug) {
                return res.status(400).json({ error: `Slug '${candidateSlug}' is already in use by another club.` });
            }
            finalSlug = candidateSlug;
        }

        const updated = await prisma.club.update({
            where: { id: club.id },
            data: {
                ...(name ? { name } : {}),
                ...(finalSlug ? { slug: finalSlug } : {}),
                ...(address !== undefined ? { address } : {}),
                ...(city !== undefined ? { city } : {}),
                ...(postalCode !== undefined ? { postalCode } : {}),
                ...(country !== undefined ? { country } : {}),
                ...(email !== undefined ? { email } : {}),
                ...(phone !== undefined ? { phone: phone ? formatPhoneNumber(phone) : phone } : {}),
                ...(website !== undefined ? { website } : {}),
                ...(logoUrl !== undefined ? { logoUrl } : {}),
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

export default router;

