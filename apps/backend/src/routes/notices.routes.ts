import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createNoticeSchema, updateNoticeSchema, AuditCategory, NoticeTargetGroup } from '@areena/shared';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();

/**
 * GET /notices/active
 * Returns all currently active notices targeted for the requesting user (or guest),
 * excluding notices that have been dismissed if dismissible.
 */
router.get('/active', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const now = new Date();
        const user = req.user;

        // Determine user audience groups
        const allowedGroups: NoticeTargetGroup[] = [NoticeTargetGroup.ALL];

        if (user) {
            if (user.isSuperAdmin) {
                allowedGroups.push(
                    NoticeTargetGroup.SUPER_ADMINS,
                    NoticeTargetGroup.ASSOCIATION_ADMINS,
                    NoticeTargetGroup.CLUB_ADMINS,
                    NoticeTargetGroup.PLAYERS,
                    NoticeTargetGroup.COACHES,
                    NoticeTargetGroup.REFEREES,
                );
            } else {
                if (user.associationRoles.length > 0) {
                    allowedGroups.push(NoticeTargetGroup.ASSOCIATION_ADMINS);
                }
                if (user.clubRoles.length > 0) {
                    allowedGroups.push(NoticeTargetGroup.CLUB_ADMINS);
                }

                // Check active licenses
                const activeLicenses = await prisma.license.findMany({
                    where: {
                        userId: user.id,
                        status: 'APPROVED',
                        validUntil: { gte: now },
                    },
                    select: { type: true },
                });

                for (const lic of activeLicenses) {
                    if (lic.type.startsWith('PLAYER')) {
                        if (!allowedGroups.includes(NoticeTargetGroup.PLAYERS)) {
                            allowedGroups.push(NoticeTargetGroup.PLAYERS);
                        }
                    } else if (lic.type === 'COACH') {
                        if (!allowedGroups.includes(NoticeTargetGroup.COACHES)) {
                            allowedGroups.push(NoticeTargetGroup.COACHES);
                        }
                    } else if (lic.type === 'REFEREE') {
                        if (!allowedGroups.includes(NoticeTargetGroup.REFEREES)) {
                            allowedGroups.push(NoticeTargetGroup.REFEREES);
                        }
                    }
                }
            }
        }

        // Fetch candidate notices
        const notices = await prisma.adminNotice.findMany({
            where: {
                isActive: true,
                startsAt: { lte: now },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                targetGroup: { in: allowedGroups },
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                association: {
                    select: { id: true, name: true, shortName: true },
                },
                club: {
                    select: { id: true, name: true },
                },
                dismissals: user
                    ? {
                          where: { userId: user.id },
                          select: { id: true },
                      }
                    : false,
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });

        // Filter out dismissed notices if isDismissible is true
        const filtered = notices.filter((n) => {
            if (user && n.isDismissible && Array.isArray((n as any).dismissals) && (n as any).dismissals.length > 0) {
                return false;
            }
            return true;
        });

        // Clean up response
        const cleanNotices = filtered.map((n) => {
            const { dismissals, ...rest } = n as any;
            return rest;
        });

        res.json(cleanNotices);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /notices
 * Admin list of all notices (active and archived) with dismissal statistics
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;

        // Must be super admin or association/club admin
        if (!user.isSuperAdmin && user.associationRoles.length === 0 && user.clubRoles.length === 0) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const where: any = {};
        if (!user.isSuperAdmin) {
            const assocIds = user.associationRoles.map((r) => r.associationId);
            const clubIds = user.clubRoles.map((r) => r.clubId);

            where.OR = [
                { createdById: user.id },
                { associationId: { in: assocIds } },
                { clubId: { in: clubIds } },
            ];
        }

        const notices = await prisma.adminNotice.findMany({
            where,
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                association: {
                    select: { id: true, name: true, shortName: true },
                },
                club: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { dismissals: true },
                },
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });

        res.json(notices);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /notices
 * Create a new admin notice
 */
router.post('/', authenticateToken, validate(createNoticeSchema), async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const {
            title,
            content,
            titleI18n,
            contentI18n,
            type,
            displayMode,
            targetGroup,
            associationId,
            clubId,
            isDismissible,
            isActive,
            priority,
            startsAt,
            expiresAt,
        } = req.body;

        // Authorization check: only super admin can target ALL, SUPER_ADMINS, or un-scoped notices
        let allowed = user.isSuperAdmin;
        if (!allowed && associationId) {
            allowed = user.associationRoles.some((r) => r.associationId === associationId);
        }
        if (!allowed && clubId) {
            allowed = user.clubRoles.some((r) => r.clubId === clubId);
        }

        if (!allowed) {
            return res.status(403).json({ error: 'Permission denied to create notice for this target group or scope' });
        }

        const notice = await prisma.adminNotice.create({
            data: {
                title,
                content,
                titleI18n: titleI18n || null,
                contentI18n: contentI18n || null,
                type: type || 'INFO',
                displayMode: displayMode || 'BANNER',
                targetGroup: targetGroup || 'ALL',
                associationId: associationId || null,
                clubId: clubId || null,
                isDismissible: isDismissible !== undefined ? isDismissible : true,
                isActive: isActive !== undefined ? isActive : true,
                priority: priority || 0,
                startsAt: startsAt ? new Date(startsAt) : new Date(),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                createdById: user.id,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                association: {
                    select: { id: true, name: true, shortName: true },
                },
                club: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { dismissals: true },
                },
            },
        });

        await AuditService.record({
            req,
            action: 'ADMIN_NOTICE_CREATE',
            category: AuditCategory.COMMUNICATION,
            entityType: 'AdminNotice',
            entityId: notice.id,
            associationId: notice.associationId,
            clubId: notice.clubId,
            description: `Created admin notice "${notice.title}" [${notice.type}] for target group ${notice.targetGroup}`,
            status: 'SUCCESS',
            metadata: {
                title: notice.title,
                type: notice.type,
                targetGroup: notice.targetGroup,
                isDismissible: notice.isDismissible,
            },
        });

        res.status(201).json(notice);
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /notices/:id
 * Update an admin notice (or toggle active status)
 */
router.put('/:id', authenticateToken, validate(updateNoticeSchema), async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const existing = await prisma.adminNotice.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Notice not found' });
        }

        let allowed = user.isSuperAdmin || existing.createdById === user.id;
        if (!allowed && existing.associationId) {
            allowed = user.associationRoles.some((r) => r.associationId === existing.associationId);
        }
        if (!allowed && existing.clubId) {
            allowed = user.clubRoles.some((r) => r.clubId === existing.clubId);
        }

        if (!allowed) {
            return res.status(403).json({ error: 'Permission denied to update this notice' });
        }

        const data: any = { ...req.body };
        if (data.startsAt) data.startsAt = new Date(data.startsAt);
        if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);

        const updated = await prisma.adminNotice.update({
            where: { id },
            data,
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                association: {
                    select: { id: true, name: true, shortName: true },
                },
                club: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { dismissals: true },
                },
            },
        });

        await AuditService.record({
            req,
            action: 'ADMIN_NOTICE_UPDATE',
            category: AuditCategory.COMMUNICATION,
            entityType: 'AdminNotice',
            entityId: updated.id,
            associationId: updated.associationId,
            clubId: updated.clubId,
            description: `Updated admin notice "${updated.title}"`,
            status: 'SUCCESS',
            metadata: req.body,
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /notices/:id
 * Delete an admin notice
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const existing = await prisma.adminNotice.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Notice not found' });
        }

        let allowed = user.isSuperAdmin || existing.createdById === user.id;
        if (!allowed && existing.associationId) {
            allowed = user.associationRoles.some((r) => r.associationId === existing.associationId);
        }
        if (!allowed && existing.clubId) {
            allowed = user.clubRoles.some((r) => r.clubId === existing.clubId);
        }

        if (!allowed) {
            return res.status(403).json({ error: 'Permission denied to delete this notice' });
        }

        // Explicitly clean up all user dismissals associated with this notice
        await prisma.noticeDismissal.deleteMany({ where: { noticeId: id } });
        await prisma.adminNotice.delete({ where: { id } });

        await AuditService.record({
            req,
            action: 'ADMIN_NOTICE_DELETE',
            category: AuditCategory.COMMUNICATION,
            entityType: 'AdminNotice',
            entityId: id,
            description: `Deleted admin notice "${existing.title}" and cleaned up associated user dismissals`,
            status: 'SUCCESS',
        });

        res.json({ message: 'Notice and associated dismissals deleted successfully', id });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /notices/:id/dismiss
 * Dismiss an admin notice for the current authenticated user
 */
router.post('/:id/dismiss', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const notice = await prisma.adminNotice.findUnique({ where: { id } });
        if (!notice) {
            return res.status(404).json({ error: 'Notice not found' });
        }

        if (!notice.isDismissible) {
            return res.status(400).json({ error: 'This admin notice cannot be dismissed' });
        }

        const dismissal = await prisma.noticeDismissal.upsert({
            where: {
                noticeId_userId: {
                    noticeId: id,
                    userId: user.id,
                },
            },
            update: {
                dismissedAt: new Date(),
            },
            create: {
                noticeId: id,
                userId: user.id,
            },
        });

        res.json({ message: 'Notice dismissed successfully', dismissal });
    } catch (err) {
        next(err);
    }
});

export default router;

