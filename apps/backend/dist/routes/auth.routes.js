"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@areena/shared");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const router = (0, express_1.Router)();
// POST /auth/register
router.post('/register', (0, validate_1.validate)(shared_1.registerSchema), async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone, street, postalCode, city, country, birthDate, gender } = req.body;
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
                phone,
                street,
                postalCode,
                city,
                country: country || 'Switzerland',
                birthDate: birthDate ? new Date(birthDate) : null,
                gender: gender || null,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.config.jwtSecret, { expiresIn: '7d' });
        await auditService_1.AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'AUTH_REGISTER',
            category: shared_1.AuditCategory.AUTH,
            entityType: 'User',
            entityId: user.id,
            description: `New user registration for ${user.firstName} ${user.lastName} (${user.email})`,
            status: 'SUCCESS',
            metadata: {
                email: user.email,
                country: user.country,
                city: user.city,
            },
        });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                street: user.street,
                postalCode: user.postalCode,
                city: user.city,
                country: user.country,
                birthDate: user.birthDate,
                gender: user.gender,
                licenseId: user.licenseId,
                eloPoints: user.eloPoints,
                rank: user.rank,
                isSuperAdmin: user.isSuperAdmin,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/login
router.post('/login', (0, validate_1.validate)(shared_1.loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
                associationRoles: { include: { association: true } },
                clubRoles: { include: { club: true } },
                licenses: { include: { club: true, association: true, season: true } },
            },
        });
        if (!user) {
            await auditService_1.AuditService.record({
                req,
                userEmail: email,
                action: 'AUTH_LOGIN_FAILED',
                category: shared_1.AuditCategory.SECURITY,
                description: `Failed login attempt for email ${email} (Account not found)`,
                status: 'FAILURE',
                metadata: { email, reason: 'USER_NOT_FOUND' },
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const match = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!match) {
            await auditService_1.AuditService.record({
                req,
                userId: user.id,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'AUTH_LOGIN_FAILED',
                category: shared_1.AuditCategory.SECURITY,
                entityType: 'User',
                entityId: user.id,
                description: `Failed login attempt for ${user.email} (Incorrect password)`,
                status: 'FAILURE',
                metadata: { email, reason: 'INVALID_PASSWORD' },
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.config.jwtSecret, { expiresIn: '7d' });
        await auditService_1.AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'AUTH_LOGIN',
            category: shared_1.AuditCategory.AUTH,
            entityType: 'User',
            entityId: user.id,
            description: `User ${user.firstName} ${user.lastName} (${user.email}) signed in`,
            status: 'SUCCESS',
            metadata: {
                isSuperAdmin: user.isSuperAdmin,
                associationRoleCount: user.associationRoles.length,
                clubRoleCount: user.clubRoles.length,
            },
        });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                street: user.street,
                postalCode: user.postalCode,
                city: user.city,
                country: user.country,
                birthDate: user.birthDate,
                gender: user.gender,
                licenseId: user.licenseId,
                eloPoints: user.eloPoints,
                rank: user.rank,
                isSuperAdmin: user.isSuperAdmin,
                associationRoles: user.associationRoles,
                clubRoles: user.clubRoles,
                licenses: user.licenses,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /auth/me
router.get('/me', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                associationRoles: { include: { association: true } },
                clubRoles: { include: { club: true } },
                licenses: { include: { club: true, association: true, season: true } },
                courseAttendances: { include: { course: true } },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
// PUT /auth/profile
router.put('/profile', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.updateProfileSchema), async (req, res, next) => {
    try {
        const { firstName, lastName, phone, street, postalCode, city, country, birthDate, gender, avatarUrl } = req.body;
        const updated = await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(firstName ? { firstName } : {}),
                ...(lastName ? { lastName } : {}),
                ...(phone ? { phone } : {}),
                ...(street ? { street } : {}),
                ...(postalCode ? { postalCode } : {}),
                ...(city ? { city } : {}),
                ...(country ? { country } : {}),
                ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
                ...(gender !== undefined ? { gender } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
// GET /auth/users (Member directory search)
router.get('/users', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const users = await prisma_1.prisma.user.findMany({
            where: query
                ? {
                    OR: [
                        { firstName: { contains: query, mode: 'insensitive' } },
                        { lastName: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } },
                        { licenseId: { contains: query, mode: 'insensitive' } },
                    ],
                }
                : {},
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                city: true,
                country: true,
                licenseId: true,
                eloPoints: true,
                rank: true,
                avatarUrl: true,
                licenses: {
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        validUntil: true,
                        club: { select: { id: true, name: true } },
                    },
                },
            },
            take: 50,
            orderBy: { lastName: 'asc' },
        });
        res.json(users);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
