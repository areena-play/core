import { Router } from 'express';
import { prisma } from '../config/prisma';
import { HierarchyService } from '../services/hierarchy.service';

const router = Router();

// GET /calendar - Master association calendar with multi-level filtering
router.get('/', async (req, res, next) => {
    try {
        const { associationId, clubId, eventType, start, end, includeDescendants } = req.query;

        let targetAssociationIds: string[] | undefined = undefined;

        if (associationId) {
            targetAssociationIds = [String(associationId)];
            if (includeDescendants === 'true' || includeDescendants === '1') {
                const descendantIds = await HierarchyService.getDescendantIds(String(associationId));
                targetAssociationIds = targetAssociationIds.concat(descendantIds);
            }
        }

        const events = await prisma.calendarEvent.findMany({
            where: {
                ...(targetAssociationIds ? { associationId: { in: targetAssociationIds } } : {}),
                ...(clubId ? { clubId: String(clubId) } : {}),
                ...(eventType ? { eventType: eventType as any } : {}),
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
    } catch (err) {
        next(err);
    }
});

// POST /calendar - Create manual event
router.post('/', async (req, res, next) => {
    try {
        const { title, description, eventType, associationId, clubId, startDate, endDate, location, isPublic } =
            req.body;

        const event = await prisma.calendarEvent.create({
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
    } catch (err) {
        next(err);
    }
});

export default router;
