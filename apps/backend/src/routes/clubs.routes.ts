import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createClubSchema } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';

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

// GET /clubs/:id
router.get('/:id', async (req, res, next) => {
    try {
        const club = await prisma.club.findUnique({
            where: { id: req.params.id },
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
        const { name, code, address, city, postalCode, country, email, phone, website, associationIds } = req.body;

        const existingCode = await prisma.club.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ error: `Club with code '${code}' already exists` });
        }

        const club = await prisma.club.create({
            data: {
                name,
                code,
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

export default router;
