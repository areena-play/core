"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@areena/shared");
const auth_1 = require("../middleware/auth");
const licenseService_1 = require("../services/licenseService");
const router = (0, express_1.Router)();
// GET /licenses - List licenses with filters
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { userId, clubId, associationId, type, status } = req.query;
        const licenses = await prisma_1.prisma.license.findMany({
            where: {
                ...(userId ? { userId: String(userId) } : {}),
                ...(clubId ? { clubId: String(clubId) } : {}),
                ...(associationId ? { associationId: String(associationId) } : {}),
                ...(type ? { type: type } : {}),
                ...(status ? { status: status } : {}),
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
    }
    catch (err) {
        next(err);
    }
});
// POST /licenses/apply - Apply for a license
router.post('/apply', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.applyLicenseSchema), async (req, res, next) => {
    try {
        const { userId, type, clubId, associationId, seasonId, validFrom, validUntil, notes } = req.body;
        const targetUserId = userId || req.user.id;
        // Check permissions: either applying for self, or club admin applying for player
        if (targetUserId !== req.user.id && !req.user.isSuperAdmin) {
            if (clubId) {
                const isClubAdmin = req.user.clubRoles.some((r) => r.clubId === clubId);
                if (!isClubAdmin) {
                    return res
                        .status(403)
                        .json({ error: 'Only a club admin or the user themself can apply for this license' });
                }
            }
        }
        const license = await licenseService_1.LicenseService.applyForLicense({
            userId: targetUserId,
            type,
            clubId,
            associationId,
            seasonId,
            validFrom: validFrom ? new Date(validFrom) : undefined,
            validUntil: validUntil ? new Date(validUntil) : undefined,
            appliedByUserId: req.user.id,
            notes,
        });
        res.status(201).json(license);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// POST /licenses/:id/approval - Approve or reject license
router.post('/:id/approval', auth_1.authenticateToken, (0, validate_1.validate)(shared_1.approveLicenseSchema), async (req, res, next) => {
    try {
        const { approved, rejectionReason } = req.body;
        const license = await prisma_1.prisma.license.findUnique({ where: { id: req.params.id } });
        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }
        // Verify permission: Club admin (if PENDING_CLUB) or Association admin / Super admin
        let canApprove = req.user.isSuperAdmin;
        if (!canApprove) {
            if (license.status === 'PENDING_CLUB' && license.clubId) {
                canApprove = req.user.clubRoles.some((r) => r.clubId === license.clubId);
            }
            if (license.status === 'PENDING_ASSOCIATION' || license.status === 'PENDING_CLUB') {
                canApprove =
                    canApprove || req.user.associationRoles.some((r) => r.associationId === license.associationId);
            }
        }
        if (!canApprove) {
            return res.status(403).json({ error: 'Insufficient permissions to approve or reject this license' });
        }
        const updated = await licenseService_1.LicenseService.processLicenseApproval({
            licenseId: req.params.id,
            approvedByUserId: req.user.id,
            approved,
            rejectionReason,
        });
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// PUT /licenses/user/:userId/license-id - Main Association Admin override of user's unique licenseId
router.put('/user/:userId/license-id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        if (!req.user.isSuperAdmin) {
            // Check if user is top-level association admin
            const topLevelAssoc = await prisma_1.prisma.association.findFirst({ where: { isTopLevel: true } });
            const isTopAdmin = topLevelAssoc && req.user.associationRoles.some((r) => r.associationId === topLevelAssoc.id);
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
        const existing = await prisma_1.prisma.user.findUnique({ where: { licenseId } });
        if (existing && existing.id !== req.params.userId) {
            return res.status(400).json({ error: 'This license ID is already assigned to another user' });
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: req.params.userId },
            data: { licenseId },
        });
        res.json(updatedUser);
    }
    catch (err) {
        next(err);
    }
});
// GET /licenses/courses - List refresher courses
router.get('/courses', async (req, res, next) => {
    try {
        const courses = await prisma_1.prisma.refresherCourse.findMany({
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
    }
    catch (err) {
        next(err);
    }
});
// POST /licenses/courses - Create refresher course
router.post('/courses', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { associationId, title, type, instructorId, location, date, durationHours, validityExtensionMonths } = req.body;
        const course = await prisma_1.prisma.refresherCourse.create({
            data: {
                associationId,
                title,
                type,
                instructorId: instructorId || req.user.id,
                location,
                date: new Date(date),
                durationHours: durationHours || 4,
                validityExtensionMonths: validityExtensionMonths || 12,
            },
        });
        // Create a calendar event for the refresher course
        await prisma_1.prisma.calendarEvent.create({
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
    }
    catch (err) {
        next(err);
    }
});
// POST /licenses/courses/:id/attest - Instructor attests course attendance
router.post('/courses/:id/attest', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { userId, notes } = req.body;
        const attendance = await licenseService_1.LicenseService.attestCourseAttendance({
            courseId: req.params.id,
            userId,
            instructorId: req.user.id,
            notes,
        });
        res.json(attendance);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
