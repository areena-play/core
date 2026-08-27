import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { applyLicenseSchema, approveLicenseSchema, AuditCategory } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { LicenseService } from '../services/licenseService';
import { AuditService } from '../services/auditService';

const router = Router();

// GET /licenses - List licenses with filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { userId, clubId, associationId, type, status } = req.query;

        const licenses = await prisma.license.findMany({
            where: {
                ...(userId ? { userId: String(userId) } : {}),
                ...(clubId ? { clubId: String(clubId) } : {}),
                ...(associationId ? { associationId: String(associationId) } : {}),
                ...(type ? { type: type as any } : {}),
                ...(status ? { status: status as any } : {}),
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, licenseId: true, country: true },
                },
                club: { select: { id: true, name: true, code: true } },
                association: { select: { id: true, name: true, code: true } },
                season: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(licenses);
    } catch (err) {
        next(err);
    }
});

// POST /licenses/apply - Apply for a license
router.post(
    '/apply',
    authenticateToken,
    validate(applyLicenseSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { userId, type, clubId, associationId, seasonId, validFrom, validUntil, notes } = req.body;

            const targetUserId = userId || req.user!.id;

            // Check permissions: either applying for self, or club admin applying for player
            if (targetUserId !== req.user!.id && !req.user!.isSuperAdmin) {
                if (clubId) {
                    const isClubAdmin = req.user!.clubRoles.some((r) => r.clubId === clubId);
                    if (!isClubAdmin) {
                        return res
                            .status(403)
                            .json({ error: 'Only a club admin or the user themself can apply for this license' });
                    }
                }
            }

            const license = await LicenseService.applyForLicense({
                userId: targetUserId,
                type,
                clubId,
                associationId,
                seasonId,
                validFrom: validFrom ? new Date(validFrom) : undefined,
                validUntil: validUntil ? new Date(validUntil) : undefined,
                appliedByUserId: req.user!.id,
                notes,
            });

            await AuditService.record({
                req,
                action: 'LICENSE_APPLY',
                category: AuditCategory.LICENSING,
                entityType: 'License',
                entityId: license.id,
                associationId,
                clubId,
                description: `Applied for ${type} license for user #${targetUserId.slice(0, 8)}`,
                status: 'SUCCESS',
                metadata: {
                    type,
                    targetUserId,
                    seasonId,
                    clubId,
                    associationId,
                },
            });

            res.status(201).json(license);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },
);

// POST /licenses/:id/approval - Approve or reject license
router.post(
    '/:id/approval',
    authenticateToken,
    validate(approveLicenseSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { approved, rejectionReason } = req.body;

            const license = await prisma.license.findUnique({ where: { id: req.params.id } });
            if (!license) {
                return res.status(404).json({ error: 'License not found' });
            }

            // Verify permission: Club admin (if PENDING_CLUB) or Association admin / Super admin
            let canApprove = req.user!.isSuperAdmin;

            if (!canApprove) {
                if (license.status === 'PENDING_CLUB' && license.clubId) {
                    canApprove = req.user!.clubRoles.some((r) => r.clubId === license.clubId);
                }
                if (license.status === 'PENDING_ASSOCIATION' || license.status === 'PENDING_CLUB') {
                    canApprove =
                        canApprove || req.user!.associationRoles.some((r) => r.associationId === license.associationId);
                }
            }

            if (!canApprove) {
                return res.status(403).json({ error: 'Insufficient permissions to approve or reject this license' });
            }

            const updated = await LicenseService.processLicenseApproval({
                licenseId: req.params.id,
                approvedByUserId: req.user!.id,
                approved,
                rejectionReason,
            });

            await AuditService.record({
                req,
                action: approved ? 'LICENSE_APPROVE' : 'LICENSE_REJECT',
                category: AuditCategory.LICENSING,
                entityType: 'License',
                entityId: license.id,
                associationId: license.associationId,
                clubId: license.clubId,
                description: `${approved ? 'Approved' : 'Rejected'} ${license.type} license (Status: ${updated.status})${rejectionReason ? ` - Reason: ${rejectionReason}` : ''}`,
                status: 'SUCCESS',
                metadata: {
                    approved,
                    rejectionReason: rejectionReason || null,
                    licenseType: license.type,
                    targetUserId: license.userId,
                    newStatus: updated.status,
                },
            });

            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },
);

// PUT /licenses/user/:userId/license-id - Main Association Admin override of user's unique licenseId
router.put('/user/:userId/license-id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        if (!req.user!.isSuperAdmin) {
            // Check if user is top-level association admin
            const topLevelAssoc = await prisma.association.findFirst({ where: { isTopLevel: true } });
            const isTopAdmin =
                topLevelAssoc && req.user!.associationRoles.some((r) => r.associationId === topLevelAssoc.id);
            if (!isTopAdmin) {
                return res
                    .status(403)
                    .json({ error: 'Only main association administrators can manually change a user license ID' });
            }
        }

        const { licenseId } = req.body;
        if (!licenseId || typeof licenseId !== 'string') {
            return res.status(400).json({ error: 'Valid licenseId string required' });
        }

        const existing = await prisma.user.findUnique({ where: { licenseId } });
        if (existing && existing.id !== req.params.userId) {
            return res.status(400).json({ error: 'This license ID is already assigned to another user' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.params.userId },
            data: { licenseId },
        });

        res.json(updatedUser);
    } catch (err: any) {
        next(err);
    }
});

// GET /licenses/courses - List refresher courses
router.get('/courses', async (req, res, next) => {
    try {
        const courses = await prisma.refresherCourse.findMany({
            include: {
                association: true,
                instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
                attendances: {
                    include: { user: { select: { id: true, firstName: true, lastName: true, licenseId: true } } },
                },
            },
            orderBy: { date: 'desc' },
        });

        res.json(courses);
    } catch (err) {
        next(err);
    }
});

// POST /licenses/courses - Create refresher course
router.post('/courses', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { associationId, title, type, instructorId, location, date, durationHours, validityExtensionMonths } =
            req.body;

        const course = await prisma.refresherCourse.create({
            data: {
                associationId,
                title,
                type,
                instructorId: instructorId || req.user!.id,
                location,
                date: new Date(date),
                durationHours: durationHours || 4,
                validityExtensionMonths: validityExtensionMonths || 12,
            },
        });

        // Create a calendar event for the refresher course
        await prisma.calendarEvent.create({
            data: {
                title: `Refresher Course: ${title}`,
                description: `Refresher Course for ${type === 'COACH_REFRESHER' ? 'Coaches' : 'Referees'}`,
                eventType: 'REFRESHER_COURSE',
                associationId,
                startDate: new Date(date),
                endDate: new Date(new Date(date).getTime() + (durationHours || 4) * 60 * 60 * 1000),
                location,
            },
        });

        res.status(201).json(course);
    } catch (err) {
        next(err);
    }
});

// POST /licenses/courses/:id/attest - Instructor attests course attendance
router.post('/courses/:id/attest', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { userId, notes } = req.body;

        const attendance = await LicenseService.attestCourseAttendance({
            courseId: req.params.id,
            userId,
            instructorId: req.user!.id,
            notes,
        });

        res.json(attendance);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
