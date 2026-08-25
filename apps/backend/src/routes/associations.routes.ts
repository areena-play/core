import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createAssociationSchema, updateLicenseIdTemplateSchema } from '@areena/shared';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { HierarchyService } from '../services/hierarchyService';

const router = Router();

// GET /associations - Full hierarchy & tree
router.get('/', async (req, res, next) => {
    try {
        const hierarchy = await HierarchyService.getFullHierarchy();
        res.json(hierarchy);
    } catch (err) {
        next(err);
    }
});

// GET /associations/:id - Single association details
router.get('/:id', async (req, res, next) => {
    try {
        const association = await prisma.association.findUnique({
            where: { id: req.params.id },
            include: {
                parentHierarchies: { include: { parent: true } },
                childHierarchies: { include: { child: true } },
                clubAssociations: { include: { club: true } },
                seasons: { orderBy: { startDate: 'desc' } },
                adminRoles: { include: { user: true } },
            },
        });

        if (!association) {
            return res.status(404).json({ error: 'Association not found' });
        }

        res.json(association);
    } catch (err) {
        next(err);
    }
});

// GET /associations/:id/rules - Effective rules with national overrides
router.get('/:id/rules', async (req, res, next) => {
    try {
        const effectiveRules = await HierarchyService.getEffectiveRules(req.params.id);
        res.json(effectiveRules);
    } catch (err) {
        next(err);
    }
});

// POST /associations - Create sub-association
router.post(
    '/',
    authenticateToken,
    requireSuperAdmin,
    validate(createAssociationSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const {
                name,
                shortName,
                code,
                level,
                isTopLevel,
                parentAssociationIds,
                rules,
                licenseIdTemplate,
                regionDigit,
            } = req.body;

            const existingCode = await prisma.association.findUnique({ where: { code } });
            if (existingCode) {
                return res.status(400).json({ error: `Association with code '${code}' already exists` });
            }

            const association = await prisma.association.create({
                data: {
                    name,
                    shortName,
                    code,
                    level,
                    isTopLevel: !!isTopLevel,
                    rules: rules || {},
                    licenseIdTemplate: licenseIdTemplate || '{regionDigit}{year2}{counter3}',
                    regionDigit: regionDigit || 1,
                },
            });

            // Link parent associations (DAG)
            if (parentAssociationIds && parentAssociationIds.length > 0) {
                await prisma.associationHierarchy.createMany({
                    data: parentAssociationIds.map((parentId: string) => ({
                        parentId,
                        childId: association.id,
                    })),
                });
            }

            res.status(201).json(association);
        } catch (err) {
            next(err);
        }
    },
);

// PUT /associations/:id/settings/license-template - Main association settings for License ID format
router.put(
    '/:id/settings/license-template',
    authenticateToken,
    validate(updateLicenseIdTemplateSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const targetAssoc = await prisma.association.findUnique({ where: { id: req.params.id } });
            if (!targetAssoc) {
                return res.status(404).json({ error: 'Association not found' });
            }

            // Must be super admin or main association admin
            const isMainAdmin =
                req.user?.isSuperAdmin || req.user?.associationRoles.some((r) => r.associationId === targetAssoc.id);
            if (!isMainAdmin) {
                return res
                    .status(403)
                    .json({ error: 'Only main association administrators can update the license ID template' });
            }

            const { licenseIdTemplate, counter } = req.body;

            const updated = await prisma.association.update({
                where: { id: req.params.id },
                data: {
                    licenseIdTemplate,
                    ...(counter !== undefined ? { licenseCounter: counter } : {}),
                },
            });

            res.json(updated);
        } catch (err) {
            next(err);
        }
    },
);

// POST /associations/:id/seasons - Create Season
router.post('/:id/seasons', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { name, startDate, endDate, isCurrent } = req.body;

        if (isCurrent) {
            await prisma.season.updateMany({
                where: { associationId: req.params.id },
                data: { isCurrent: false },
            });
        }

        const season = await prisma.season.create({
            data: {
                associationId: req.params.id,
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isCurrent: !!isCurrent,
            },
        });

        res.status(201).json(season);
    } catch (err) {
        next(err);
    }
});

// GET /associations/:id/seasons - List seasons
router.get('/:id/seasons', async (req, res, next) => {
    try {
        const seasons = await prisma.season.findMany({
            where: { associationId: req.params.id },
            orderBy: { startDate: 'desc' },
        });
        res.json(seasons);
    } catch (err) {
        next(err);
    }
});

export default router;
