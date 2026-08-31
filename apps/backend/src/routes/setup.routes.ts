import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { slugify } from '../utils/slugify';

const router = Router();

// GET /setup/status - Check if system is initialized with a main association
router.get('/status', async (req: Request, res: Response) => {
    try {
        const topAssoc = await prisma.association.findFirst({
            where: { isTopLevel: true },
        });

        const totalAssocs = await prisma.association.count();
        const isInitialized = Boolean(topAssoc || totalAssocs > 0);

        res.json({
            isInitialized,
            mainAssociation: topAssoc ? { id: topAssoc.id, name: topAssoc.name, code: topAssoc.code } : null,
        });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to check initialization status', details: err.message });
    }
});

// POST /setup/initialize - Bootstrap Super Admin and Main Association
router.post('/initialize', async (req: Request, res: Response) => {
    try {
        // 1. Guard against re-initialization
        const existingTopAssoc = await prisma.association.findFirst({
            where: { isTopLevel: true },
        });

        if (existingTopAssoc) {
            return res.status(400).json({
                error: 'Already Initialized',
                message: 'AREENA has already been initialized with a primary association.',
            });
        }

        const { admin, association } = req.body;

        if (!admin || !admin.email || !admin.password || !admin.firstName || !admin.lastName) {
            return res.status(400).json({
                error: 'Missing Admin Fields',
                message: 'First name, last name, email, and password are required for the super administrator.',
            });
        }

        if (!association || !association.name) {
            return res.status(400).json({
                error: 'Missing Association Fields',
                message: 'Association name is required to configure the primary organization.',
            });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(admin.password, 10);

        // 3. Database transaction
        const currentYear = new Date().getFullYear();
        const seasonName = `${currentYear}/${currentYear + 1}`;

        const result = await prisma.$transaction(async (tx) => {
            // A. Create Super Admin User
            const user = await tx.user.create({
                data: {
                    email: admin.email.toLowerCase().trim(),
                    passwordHash: hashedPassword,
                    firstName: admin.firstName.trim(),
                    lastName: admin.lastName.trim(),
                    phone: admin.phone?.trim() || '+41 00 000 00 00',
                    street: admin.street?.trim() || 'Central Sports Avenue 1',
                    postalCode: admin.postalCode?.trim() || '1000',
                    city: admin.city?.trim() || 'Central City',
                    country: admin.country?.trim() || association.country?.trim() || 'Switzerland',
                    isSuperAdmin: true,
                },
            });

            // B. Create Primary Main Association
            const finalSlug = association.slug
                ? association.slug.trim().toLowerCase()
                : slugify(association.code || association.shortName || association.name);

            const assoc = await tx.association.create({
                data: {
                    name: association.name.trim(),
                    shortName: association.shortName ? association.shortName.trim() : association.name.substring(0, 10),
                    code: association.code ? association.code.toUpperCase().trim() : 'MAIN',
                    slug: finalSlug,
                    level: (association.level as any) || 'NATIONAL',
                    isTopLevel: true,
                    regionDigit: association.regionDigit || 1,
                    licenseIdTemplate: association.licenseIdTemplate || '{regionDigit}{year2}{counter4}',
                    rules: association.rules || {
                        rankingSystem: 'ELO_OFFICIAL',
                        autoApproveDomesticTCards: true,
                        defaultSeasonLengthMonths: 12,
                    },
                    logoUrl: association.logoUrl || null,
                },
            });

            // C. Assign Super Admin Role on Main Association
            await tx.userAssociationRole.create({
                data: {
                    userId: user.id,
                    associationId: assoc.id,
                    role: 'SUPER_ADMIN',
                },
            });

            // D. Create Initial Season
            await tx.season.create({
                data: {
                    name: seasonName,
                    associationId: assoc.id,
                    startDate: new Date(currentYear, 6, 1), // July 1st
                    endDate: new Date(currentYear + 1, 5, 30), // June 30th
                    isCurrent: true,
                },
            });

            return { user, assoc };
        });

        // 4. Issue JWT auth token
        const token = jwt.sign(
            {
                userId: result.user.id,
                email: result.user.email,
                isSuperAdmin: true,
            },
            config.jwtSecret,
            { expiresIn: '7d' },
        );

        res.status(201).json({
            success: true,
            message: 'AREENA platform initialized successfully!',
            token,
            user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                isSuperAdmin: result.user.isSuperAdmin,
            },
            association: {
                id: result.assoc.id,
                name: result.assoc.name,
                shortName: result.assoc.shortName,
                code: result.assoc.code,
                isTopLevel: result.assoc.isTopLevel,
            },
        });
    } catch (err: any) {
        console.error('[Setup Initialize Error]:', err);
        res.status(500).json({ error: 'Failed to initialize platform', details: err.message });
    }
});

export default router;
