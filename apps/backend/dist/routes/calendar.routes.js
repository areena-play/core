"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const hierarchyService_1 = require("../services/hierarchyService");
const router = (0, express_1.Router)();
// GET /calendar - Master association calendar with multi-level filtering
router.get('/', async (req, res, next) => {
    try {
        const { associationId, clubId, eventType, start, end, includeDescendants } = req.query;
        let targetAssociationIds = undefined;
        if (associationId) {
            targetAssociationIds = [String(associationId)];
            if (includeDescendants === 'true' || includeDescendants === '1') {
                const descendantIds = await hierarchyService_1.HierarchyService.getDescendantIds(String(associationId));
                targetAssociationIds = targetAssociationIds.concat(descendantIds);
            }
        }
        const events = await prisma_1.prisma.calendarEvent.findMany({
            where: {
                ...(targetAssociationIds ? { associationId: { in: targetAssociationIds } } : {}),
                ...(clubId ? { clubId: String(clubId) } : {}),
                ...(eventType ? { eventType: eventType } : {}),
                ...(start ? { startDate: { gte: new Date(String(start)) } } : {}),
                ...(end ? { endDate: { lte: new Date(String(end)) } } : {}),
            },
            include: {
                association: { select: { id: true, name: true, code: true } },
                club: { select: { id: true, name: true, code: true } },
                competition: { select: { id: true, name: true, type: true } },
                encounter: {
                    include: {
                        homeTeam: { select: { id: true, name: true } },
                        awayTeam: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { startDate: 'asc' },
        });
        res.json(events);
    }
    catch (err) {
        next(err);
    }
});
// POST /calendar - Create manual event
router.post('/', async (req, res, next) => {
    try {
        const { title, description, eventType, associationId, clubId, startDate, endDate, location, isPublic } = req.body;
        const event = await prisma_1.prisma.calendarEvent.create({
            data: {
                title,
                description,
                eventType,
                associationId,
                clubId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                location,
                isPublic: isPublic !== false,
            },
        });
        res.status(201).json(event);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
