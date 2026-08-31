import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createClubSchema } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { slugify } from '../utils/slugify';

const router = Router();

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
                    include: { user: true, season: true },
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
                phone,
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

// PUT /clubs/:id - Update club details with Optimistic Concurrency Control (OCC)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { id } = req.params;
        const targetClub = await prisma.club.findUnique({ where: { id } });
        if (!targetClub) {
            return res.status(404).json({ error: 'Club not found' });
        }

        // Authorization check: SuperAdmin or Club Admin
        const isAuthorized =
            req.user?.isSuperAdmin ||
            req.user?.clubRoles.some((r) => r.clubId === id && ['ADMIN', 'PRESIDENT'].includes(r.role));
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Unauthorized to modify this club' });
        }

        const {
            name,
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

        // Optimistic concurrency control check
        if (expectedUpdatedAt && new Date(targetClub.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) {
            return res.status(409).json({
                error: 'Conflict: This club was modified concurrently by another administrator. Please reload before saving.',
            });
        }

        const updated = await prisma.club.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(address ? { address } : {}),
                ...(city ? { city } : {}),
                ...(postalCode ? { postalCode } : {}),
                ...(country ? { country } : {}),
                ...(email ? { email } : {}),
                ...(phone ? { phone } : {}),
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
