"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@areena/shared");
const auth_1 = require("../middleware/auth");
const hierarchyService_1 = require("../services/hierarchyService");
const router = (0, express_1.Router)();
// GET /associations - Full hierarchy & tree
router.get('/', async (req, res, next) => {
    try {
        const hierarchy = await hierarchyService_1.HierarchyService.getFullHierarchy();
        res.json(hierarchy);
    }
    catch (err) {
        next(err);
    }
});
// GET /associations/:id - Single association details
router.get('/:id', async (req, res, next) => {
    try {
        const association = await prisma_1.prisma.association.findUnique({
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
    }
    catch (err) {
        next(err);
    }
});
// GET /associations/:id/rules - Effective rules with national overrides
router.get('/:id/rules', async (req, res, next) => {
    try {
        const effectiveRules = await hierarchyService_1.HierarchyService.getEffectiveRules(req.params.id);
        res.json(effectiveRules);
    }
    catch (err) {
        next(err);
    }
});
// POST /associations - Create sub-association
router.post('/', auth_1.authenticateToken, auth_1.requireSuperAdmin, (0, validate_1.validate)(shared_1.createAssociationSchema), async (req, res, next) => {
    try {
        const { name, shortName, code, level, isTopLevel, parentAssociationIds, rules, licenseIdTemplate, regionDigit } = req.body;
        const existingCode = await prisma_1.prisma.association.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ error: `Association with code '${code}' already exists` });
        }
        const association = await prisma_1.prisma.association.create({
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
            await prisma_1.prisma.associationHierarchy.createMany({
                data: parentAssociationIds.map((parentId) => ({
                    parentId,
                    childId: association.id,
                })),
            });
        }
        res.status(201).json(association);
    }
    catch (err) {
        next(err);
    }
});
// PUT /associations/:id/settings/license-template - Main association settings for License ID format
router.put('/:id/settings/license-template', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.updateLicenseIdTemplateSchema), async (req, res, next) => {
    try {
        const targetAssoc = await prisma_1.prisma.association.findUnique({ where: { id: req.params.id } });
        if (!targetAssoc) {
            return res.status(404).json({ error: 'Association not found' });
        }
        // Must be super admin or main association admin
        const isMainAdmin = req.user?.isSuperAdmin || req.user?.associationRoles.some((r) => r.associationId === targetAssoc.id);
        if (!isMainAdmin) {
            return res.status(403).json({ error: 'Only main association administrators can update the license ID template' });
        }
        const { licenseIdTemplate, counter } = req.body;
        const updated = await prisma_1.prisma.association.update({
            where: { id: req.params.id },
            data: {
                licenseIdTemplate,
                ...(counter !== undefined ? { licenseCounter: counter } : {}),
            },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
// POST /associations/:id/seasons - Create Season
router.post('/:id/seasons', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { name, startDate, endDate, isCurrent } = req.body;
        if (isCurrent) {
            await prisma_1.prisma.season.updateMany({
                where: { associationId: req.params.id },
                data: { isCurrent: false },
            });
        }
        const season = await prisma_1.prisma.season.create({
            data: {
                associationId: req.params.id,
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isCurrent: !!isCurrent,
            },
        });
        res.status(201).json(season);
    }
    catch (err) {
        next(err);
    }
});
// GET /associations/:id/seasons - List seasons
router.get('/:id/seasons', async (req, res, next) => {
    try {
        const seasons = await prisma_1.prisma.season.findMany({
            where: { associationId: req.params.id },
            orderBy: { startDate: 'desc' },
        });
        res.json(seasons);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
