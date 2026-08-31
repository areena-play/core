import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { AuditCategory } from '@areena/shared';

const router = Router();

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * GET /locations
 * List all locations with optional search and filtering.
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const q = (req.query.q as string)?.trim() || '';
        const associationId = (req.query.associationId as string)?.trim() || '';
        const clubId = (req.query.clubId as string)?.trim() || '';
        const competitionId = (req.query.competitionId as string)?.trim() || '';
        const city = (req.query.city as string)?.trim() || '';

        const where: any = {};
        const andConditions: any[] = [];

        if (q) {
            andConditions.push({
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { address: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            });
        }

        if (city) {
            andConditions.push({ city: { contains: city, mode: 'insensitive' } });
        }

        if (associationId) {
            andConditions.push({
                associations: { some: { associationId } },
            });
        }

        if (clubId) {
            andConditions.push({
                clubs: { some: { clubId } },
            });
        }

        if (competitionId) {
            andConditions.push({
                competitions: { some: { competitionId } },
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const locations = await prisma.location.findMany({
            where,
            orderBy: [{ city: 'asc' }, { name: 'asc' }],
            include: {
                associations: {
                    include: {
                        association: {
                            select: { id: true, name: true, shortName: true, code: true, slug: true, logoUrl: true, rules: true },
                        },
                    },
                },
                clubs: {
                    include: {
                        club: {
                            select: { id: true, name: true, code: true, slug: true, logoUrl: true, city: true },
                        },
                    },
                },
                units: {
                    orderBy: { orderIndex: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        unitNumber: true,
                        customType: true,
                        features: true,
                        status: true,
                        orderIndex: true,
                    },
                },
                competitions: {
                    include: {
                        competition: {
                            select: { id: true, name: true, slug: true, type: true, startDate: true, endDate: true, status: true },
                        },
                    },
                },
            },
        });

        res.json(locations);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /locations/:idOrSlug
 * Detailed view of a location by ID or slug.
 */
router.get('/:idOrSlug', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { idOrSlug } = req.params;

        const location = await prisma.location.findFirst({
            where: {
                OR: [{ id: idOrSlug }, { slug: idOrSlug }],
            },
            include: {
                associations: {
                    include: {
                        association: {
                            select: { id: true, name: true, shortName: true, code: true, slug: true, logoUrl: true, rules: true },
                        },
                    },
                },
                clubs: {
                    include: {
                        club: {
                            select: { id: true, name: true, code: true, slug: true, logoUrl: true, city: true, address: true, email: true },
                        },
                    },
                },
                units: {
                    orderBy: [{ orderIndex: 'asc' }, { unitNumber: 'asc' }],
                    include: {
                        reservations: {
                            where: {
                                endTime: { gte: new Date(Date.now() - 24 * 3600 * 1000) }, // Include recent & upcoming
                            },
                            orderBy: { startTime: 'asc' },
                            include: {
                                reservedByUser: {
                                    select: { id: true, firstName: true, lastName: true, email: true },
                                },
                                competition: {
                                    select: { id: true, name: true, slug: true, type: true },
                                },
                                club: {
                                    select: { id: true, name: true, code: true },
                                },
                            },
                        },
                    },
                },
                competitions: {
                    include: {
                        competition: {
                            select: { id: true, name: true, slug: true, type: true, startDate: true, endDate: true, status: true },
                        },
                    },
                },
            },
        });

        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }

        res.json(location);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /locations
 * Create a new location (Admin only).
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const isAuthorized =
            user.isSuperAdmin ||
            user.associationRoles.some((r) => ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role)) ||
            user.clubRoles.some((r) => ['ADMIN', 'PRESIDENT'].includes(r.role));

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Insufficient permissions to create a location.' });
        }

        const {
            name,
            slug: rawSlug,
            address,
            city,
            postalCode,
            country = 'Switzerland',
            description,
            imageUrl,
            phone,
            email,
            website,
            googleMapsUrl,
            clubIds = [],
            associationIds = [],
            initialUnitCount = 6,
            unitNaming = 'Table',
        } = req.body;

        if (!name || !address || !city || !postalCode) {
            return res.status(400).json({ error: 'Name, address, postal code, and city are required.' });
        }

        let slug = rawSlug ? slugify(rawSlug) : slugify(name);
        // Ensure uniqueness
        const existing = await prisma.location.findUnique({ where: { slug } });
        if (existing) {
            slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const location = await prisma.location.create({
            data: {
                name,
                slug,
                address,
                city,
                postalCode,
                country,
                description,
                imageUrl,
                phone,
                email,
                website,
                googleMapsUrl,
                clubs: {
                    create: clubIds.map((cid: string, idx: number) => ({
                        clubId: cid,
                        isPrimary: idx === 0,
                    })),
                },
                associations: {
                    create: associationIds.map((aid: string) => ({
                        associationId: aid,
                    })),
                },
            },
        });

        // Create initial units (e.g. Table 1, Table 2...)
        const unitCount = Math.max(1, Math.min(64, parseInt(String(initialUnitCount), 10) || 6));
        const unitPromises = [];
        for (let i = 1; i <= unitCount; i++) {
            unitPromises.push(
                prisma.locationUnit.create({
                    data: {
                        locationId: location.id,
                        name: `${unitNaming} ${i}`,
                        unitNumber: i,
                        orderIndex: i,
                        status: 'AVAILABLE',
                    },
                })
            );
        }
        await Promise.all(unitPromises);

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'LOCATION_CREATED',
            category: AuditCategory.GOVERNANCE,
            entityType: 'Location',
            entityId: location.id,
            description: `Created new sports location: ${location.name} (${location.city}) with ${unitCount} ${unitNaming}s`,
            status: 'SUCCESS',
        });

        res.status(201).json(location);
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /locations/:id
 * Update a location.
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const {
            name,
            slug: rawSlug,
            address,
            city,
            postalCode,
            country,
            description,
            imageUrl,
            phone,
            email,
            website,
            googleMapsUrl,
            isActive,
            clubIds,
            associationIds,
        } = req.body;

        const existing = await prisma.location.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Location not found' });
        }

        let slug = existing.slug;
        if (rawSlug && rawSlug !== existing.slug) {
            slug = slugify(rawSlug);
            const slugTaken = await prisma.location.findFirst({
                where: { slug, id: { not: id } },
            });
            if (slugTaken) {
                return res.status(400).json({ error: 'Slug is already in use by another location.' });
            }
        }

        const updated = await prisma.location.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(slug !== undefined ? { slug } : {}),
                ...(address !== undefined ? { address } : {}),
                ...(city !== undefined ? { city } : {}),
                ...(postalCode !== undefined ? { postalCode } : {}),
                ...(country !== undefined ? { country } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(imageUrl !== undefined ? { imageUrl } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(email !== undefined ? { email } : {}),
                ...(website !== undefined ? { website } : {}),
                ...(googleMapsUrl !== undefined ? { googleMapsUrl } : {}),
                ...(isActive !== undefined ? { isActive } : {}),
            },
        });

        // Update club relations if specified
        if (Array.isArray(clubIds)) {
            await prisma.locationClub.deleteMany({ where: { locationId: id } });
            if (clubIds.length > 0) {
                await prisma.locationClub.createMany({
                    data: clubIds.map((cid: string, idx: number) => ({
                        locationId: id,
                        clubId: cid,
                        isPrimary: idx === 0,
                    })),
                });
            }
        }

        // Update association relations if specified
        if (Array.isArray(associationIds)) {
            await prisma.locationAssociation.deleteMany({ where: { locationId: id } });
            if (associationIds.length > 0) {
                await prisma.locationAssociation.createMany({
                    data: associationIds.map((aid: string) => ({
                        locationId: id,
                        associationId: aid,
                    })),
                });
            }
        }

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'LOCATION_UPDATED',
            category: AuditCategory.GOVERNANCE,
            entityType: 'Location',
            entityId: id,
            description: `Updated sports location details for: ${updated.name}`,
            status: 'SUCCESS',
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /locations/:id
 * Delete location and associated data.
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const location = await prisma.location.findUnique({ where: { id } });
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }

        await prisma.location.delete({ where: { id } });

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'LOCATION_DELETED',
            category: AuditCategory.GOVERNANCE,
            entityType: 'Location',
            entityId: id,
            description: `Deleted sports location: ${location.name}`,
            status: 'SUCCESS',
        });

        res.json({ success: true, message: 'Location deleted successfully.' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /locations/:id/units
 * Add a playing unit (Court / Table) to a location.
 */
router.post('/:id/units', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { id: locationId } = req.params;
        const { name, unitNumber, customType, features = [], status = 'AVAILABLE' } = req.body;

        const location = await prisma.location.findUnique({ where: { id: locationId } });
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }

        const maxUnit = await prisma.locationUnit.findFirst({
            where: { locationId },
            orderBy: { unitNumber: 'desc' },
        });
        const nextNum = unitNumber || (maxUnit ? maxUnit.unitNumber + 1 : 1);

        const unit = await prisma.locationUnit.create({
            data: {
                locationId,
                name: name || `Unit ${nextNum}`,
                unitNumber: nextNum,
                customType,
                features,
                status,
                orderIndex: nextNum,
            },
        });

        res.status(201).json(unit);
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /locations/:id/units/:unitId
 * Update playing unit details or status (e.g. Maintenance).
 */
router.put('/:id/units/:unitId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { unitId } = req.params;
        const { name, unitNumber, customType, features, status, orderIndex } = req.body;

        const updated = await prisma.locationUnit.update({
            where: { id: unitId },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(unitNumber !== undefined ? { unitNumber } : {}),
                ...(customType !== undefined ? { customType } : {}),
                ...(features !== undefined ? { features } : {}),
                ...(status !== undefined ? { status } : {}),
                ...(orderIndex !== undefined ? { orderIndex } : {}),
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /locations/:id/units/:unitId
 * Delete a playing unit.
 */
router.delete('/:id/units/:unitId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { unitId } = req.params;
        await prisma.locationUnit.delete({ where: { id: unitId } });
        res.json({ success: true, message: 'Playing unit deleted.' });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /locations/:id/reservations
 * Query schedule and reservations for a location.
 */
router.get('/:id/reservations', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { id: locationId } = req.params;
        const unitId = (req.query.unitId as string)?.trim() || '';
        const startDate = (req.query.startDate as string) ? new Date(req.query.startDate as string) : undefined;
        const endDate = (req.query.endDate as string) ? new Date(req.query.endDate as string) : undefined;

        const where: any = {
            unit: { locationId },
        };

        if (unitId) {
            where.unitId = unitId;
        }

        if (startDate || endDate) {
            where.AND = [];
            if (startDate) where.AND.push({ endTime: { gte: startDate } });
            if (endDate) where.AND.push({ startTime: { lte: endDate } });
        }

        const reservations = await prisma.locationUnitReservation.findMany({
            where,
            orderBy: { startTime: 'asc' },
            include: {
                unit: true,
                reservedByUser: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                competition: {
                    select: { id: true, name: true, slug: true, type: true },
                },
                club: {
                    select: { id: true, name: true, code: true },
                },
            },
        });

        res.json(reservations);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /locations/:id/reservations
 * Reserve or block a playing unit (Table / Court) for competitions, training, or user bookings.
 */
router.post('/:id/reservations', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id: locationId } = req.params;
        const {
            unitId,
            unitIds = [], // Allows bulk blocking multiple courts/tables for a tournament
            type = 'USER_RESERVATION',
            status = 'CONFIRMED',
            startTime,
            endTime,
            title,
            description,
            competitionId,
            clubId,
        } = req.body;

        if (!startTime || !endTime || !title) {
            return res.status(400).json({ error: 'Start time, end time, and title are required.' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end <= start) {
            return res.status(400).json({ error: 'End time must be strictly after start time.' });
        }

        const targetUnitIds = unitIds.length > 0 ? unitIds : (unitId ? [unitId] : []);
        if (targetUnitIds.length === 0) {
            return res.status(400).json({ error: 'At least one playing unit must be selected.' });
        }

        // Verify units belong to location
        const units = await prisma.locationUnit.findMany({
            where: {
                id: { in: targetUnitIds },
                locationId,
            },
        });

        if (units.length !== targetUnitIds.length) {
            return res.status(400).json({ error: 'One or more selected units do not belong to this location.' });
        }

        // Check for conflicting reservations
        const conflicts = await prisma.locationUnitReservation.findMany({
            where: {
                unitId: { in: targetUnitIds },
                status: { not: 'CANCELLED' },
                startTime: { lt: end },
                endTime: { gt: start },
            },
            include: { unit: true },
        });

        if (conflicts.length > 0) {
            const conflictingNames = Array.from(new Set(conflicts.map((c) => c.unit.name))).join(', ');
            return res.status(400).json({
                error: `Conflict: ${conflictingNames} is already reserved or blocked during this time window.`,
                conflicts,
            });
        }

        const created = await Promise.all(
            targetUnitIds.map((uid: string) =>
                prisma.locationUnitReservation.create({
                    data: {
                        unitId: uid,
                        type,
                        status,
                        startTime: start,
                        endTime: end,
                        title,
                        description,
                        reservedByUserId: user.id,
                        competitionId: competitionId || null,
                        clubId: clubId || null,
                    },
                    include: {
                        unit: true,
                        competition: true,
                    },
                })
            )
        );

        // Also link competition to location if it's a competition block and not linked yet
        if (competitionId) {
            const compLink = await prisma.competitionLocation.findUnique({
                where: { competitionId_locationId: { competitionId, locationId } },
            });
            if (!compLink) {
                await prisma.competitionLocation.create({
                    data: { competitionId, locationId },
                });
            }
        }

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'LOCATION_UNIT_RESERVED',
            category: AuditCategory.TOURNAMENT,
            entityType: 'LocationUnitReservation',
            entityId: created[0].id,
            description: `Booked ${created.length} unit(s) at location: "${title}" (${type})`,
            status: 'SUCCESS',
            metadata: {
                locationId,
                unitCount: created.length,
                type,
                startTime,
                endTime,
                competitionId,
            },
        });

        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /locations/:id/reservations/:resId
 * Cancel or remove a reservation / block.
 */
router.delete('/:id/reservations/:resId', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { resId } = req.params;

        const reservation = await prisma.locationUnitReservation.findUnique({
            where: { id: resId },
            include: { unit: true },
        });

        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        const isOwner = reservation.reservedByUserId === user.id;
        const isAdmin =
            user.isSuperAdmin ||
            user.associationRoles.some((r) => ['ADMIN', 'PRESIDENT'].includes(r.role)) ||
            user.clubRoles.some((r) => ['ADMIN', 'PRESIDENT'].includes(r.role));

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'You are not authorized to cancel this reservation.' });
        }

        await prisma.locationUnitReservation.delete({ where: { id: resId } });

        res.json({ success: true, message: 'Reservation cancelled successfully.' });
    } catch (err) {
        next(err);
    }
});

export default router;
