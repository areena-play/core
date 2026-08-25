"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@areena/shared");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /clubs
router.get('/', async (req, res, next) => {
    try {
        const clubs = await prisma_1.prisma.club.findMany({
            include: {
                associations: { include: { association: true } },
                _count: { select: { licenses: true, teams: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(clubs);
    }
    catch (err) {
        next(err);
    }
});
// GET /clubs/:id
router.get('/:id', async (req, res, next) => {
    try {
        const club = await prisma_1.prisma.club.findUnique({
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
    }
    catch (err) {
        next(err);
    }
});
// POST /clubs
router.post('/', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.createClubSchema), async (req, res, next) => {
    try {
        const { name, code, address, city, postalCode, country, email, phone, website, associationIds } = req.body;
        const existingCode = await prisma_1.prisma.club.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ error: `Club with code '${code}' already exists` });
        }
        const club = await prisma_1.prisma.club.create({
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
            await prisma_1.prisma.clubAssociation.createMany({
                data: associationIds.map((associationId) => ({
                    clubId: club.id,
                    associationId,
                })),
            });
        }
        // Grant creator as club admin if not super admin
        await prisma_1.prisma.userClubRole.create({
            data: {
                userId: req.user.id,
                clubId: club.id,
                role: 'ADMIN',
            },
        });
        res.status(201).json(club);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
