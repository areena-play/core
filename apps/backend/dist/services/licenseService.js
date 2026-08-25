"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseService = void 0;
const prisma_1 = require("../config/prisma");
const shared_1 = require("@areena/shared");
const redis_1 = require("../config/redis");
class LicenseService {
    /**
     * Generates a unique license ID based on the association's configurable template.
     * e.g. "{regionDigit}{year2}{counter3}" -> "126001"
     */
    static async generateLicenseId(associationId) {
        const association = await prisma_1.prisma.association.findUnique({
            where: { id: associationId },
        });
        if (!association) {
            throw new Error(`Association with ID ${associationId} not found`);
        }
        // Atomically increment counter
        const updatedAssoc = await prisma_1.prisma.association.update({
            where: { id: associationId },
            data: { licenseCounter: { increment: 1 } },
        });
        const now = new Date();
        const year4 = now.getFullYear().toString();
        const year2 = year4.slice(-2);
        const regionDigit = association.regionDigit ? association.regionDigit.toString() : '1';
        const regionCode = association.code || 'CH';
        const counter = updatedAssoc.licenseCounter;
        const counter3 = counter.toString().padStart(3, '0');
        const counter4 = counter.toString().padStart(4, '0');
        const counter5 = counter.toString().padStart(5, '0');
        let template = association.licenseIdTemplate || '{regionDigit}{year2}{counter3}';
        let licenseId = template
            .replace(/\{regionDigit\}/g, regionDigit)
            .replace(/\{regionCode\}/g, regionCode)
            .replace(/\{year2\}/g, year2)
            .replace(/\{year4\}/g, year4)
            .replace(/\{counter3\}/g, counter3)
            .replace(/\{counter4\}/g, counter4)
            .replace(/\{counter5\}/g, counter5);
        // Ensure uniqueness fallback
        const existing = await prisma_1.prisma.user.findUnique({ where: { licenseId } });
        if (existing) {
            licenseId = `${licenseId}-${Math.floor(Math.random() * 899 + 100)}`;
        }
        return licenseId;
    }
    /**
     * Applies for a license with validation rules.
     */
    static async applyForLicense(data) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: data.userId } });
        if (!user) {
            throw new Error('User not found');
        }
        // 1. Regular Player License: strictly 1 regular license per season
        if (data.type === shared_1.LicenseType.PLAYER_REGULAR) {
            if (!data.clubId) {
                throw new Error('Regular player license must be attached to a club');
            }
            if (data.seasonId) {
                const existingRegular = await prisma_1.prisma.license.findFirst({
                    where: {
                        userId: data.userId,
                        type: shared_1.LicenseType.PLAYER_REGULAR,
                        seasonId: data.seasonId,
                        status: { in: [shared_1.LicenseStatus.APPROVED, shared_1.LicenseStatus.PENDING_CLUB, shared_1.LicenseStatus.PENDING_ASSOCIATION] },
                    },
                });
                if (existingRegular) {
                    throw new Error('Player already has an active or pending regular license for this season. Only 1 regular license per season is permitted.');
                }
            }
        }
        // Determine validity dates
        let validFrom = data.validFrom || new Date();
        let validUntil = data.validUntil;
        if (!validUntil) {
            if (data.seasonId) {
                const season = await prisma_1.prisma.season.findUnique({ where: { id: data.seasonId } });
                if (season) {
                    validUntil = season.endDate;
                }
            }
            if (!validUntil) {
                // Default 1 year from now
                validUntil = new Date();
                validUntil.setFullYear(validUntil.getFullYear() + 1);
            }
        }
        // 2. Check T-Card auto-approval criteria
        let initialStatus = shared_1.LicenseStatus.PENDING_CLUB;
        let autoApproved = false;
        if (data.type === shared_1.LicenseType.PLAYER_TCARD) {
            const association = await prisma_1.prisma.association.findUnique({ where: { id: data.associationId } });
            const rules = association?.rules || {};
            const autoApproveDomestic = rules.autoApproveDomesticTCards !== false; // default true
            // If user is from Switzerland/domestic or matches rules
            if (autoApproveDomestic && user.country.toLowerCase() === (association?.code === 'CH' ? 'switzerland' : 'switzerland')) {
                initialStatus = shared_1.LicenseStatus.APPROVED;
                autoApproved = true;
            }
            else {
                initialStatus = shared_1.LicenseStatus.PENDING_ASSOCIATION;
            }
        }
        else if (data.type === shared_1.LicenseType.COACH || data.type === shared_1.LicenseType.REFEREE) {
            initialStatus = shared_1.LicenseStatus.PENDING_ASSOCIATION;
        }
        else if (data.type === shared_1.LicenseType.PLAYER_REGULAR) {
            // If applied by club admin for user, jump straight to PENDING_ASSOCIATION or APPROVED
            if (data.appliedByUserId !== data.userId) {
                initialStatus = shared_1.LicenseStatus.PENDING_ASSOCIATION;
            }
            else {
                initialStatus = shared_1.LicenseStatus.PENDING_CLUB;
            }
        }
        // Create license
        const license = await prisma_1.prisma.license.create({
            data: {
                userId: data.userId,
                type: data.type,
                status: initialStatus,
                clubId: data.clubId,
                associationId: data.associationId,
                seasonId: data.seasonId,
                validFrom,
                validUntil,
                autoApproved,
                appliedByUserId: data.appliedByUserId,
                metadata: data.notes ? { notes: data.notes } : {},
            },
            include: {
                user: true,
                club: true,
                association: true,
            },
        });
        // If auto-approved and user doesn't have a licenseId yet, generate one
        if (autoApproved && !user.licenseId) {
            const newLicenseId = await this.generateLicenseId(data.associationId);
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { licenseId: newLicenseId },
            });
        }
        // Publish event
        try {
            await redis_1.redisPub.publish('areena:licenses', JSON.stringify({
                event: 'LICENSE_APPLIED',
                licenseId: license.id,
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                type: license.type,
                status: license.status,
                autoApproved,
            }));
        }
        catch { }
        return license;
    }
    /**
     * Approves or rejects a license.
     */
    static async processLicenseApproval(data) {
        const license = await prisma_1.prisma.license.findUnique({
            where: { id: data.licenseId },
            include: { user: true, association: true },
        });
        if (!license) {
            throw new Error('License not found');
        }
        const nextStatus = data.approved ? shared_1.LicenseStatus.APPROVED : shared_1.LicenseStatus.REJECTED;
        const updatedLicense = await prisma_1.prisma.license.update({
            where: { id: data.licenseId },
            data: {
                status: nextStatus,
                approvedByUserId: data.approvedByUserId,
                rejectionReason: data.approved ? null : data.rejectionReason,
            },
            include: { user: true, club: true, association: true },
        });
        // If approved and user doesn't have a license ID yet, assign one
        if (data.approved && !license.user.licenseId) {
            const topAssociation = await prisma_1.prisma.association.findFirst({
                where: { isTopLevel: true },
            }) || license.association;
            const newLicenseId = await this.generateLicenseId(topAssociation.id);
            await prisma_1.prisma.user.update({
                where: { id: license.userId },
                data: { licenseId: newLicenseId },
            });
        }
        // Publish event
        try {
            await redis_1.redisPub.publish('areena:licenses', JSON.stringify({
                event: 'LICENSE_STATUS_UPDATED',
                licenseId: updatedLicense.id,
                userId: updatedLicense.userId,
                status: updatedLicense.status,
                approved: data.approved,
            }));
        }
        catch { }
        return updatedLicense;
    }
    /**
     * Attests a refresher course attendance and extends coach/referee license validity.
     */
    static async attestCourseAttendance(data) {
        const course = await prisma_1.prisma.refresherCourse.findUnique({
            where: { id: data.courseId },
        });
        if (!course) {
            throw new Error('Refresher course not found');
        }
        if (course.instructorId !== data.instructorId) {
            // Check if instructor has admin override
            const instructorUser = await prisma_1.prisma.user.findUnique({ where: { id: data.instructorId } });
            if (!instructorUser?.isSuperAdmin) {
                throw new Error('Only the designated course instructor or super admin can attest attendance');
            }
        }
        const targetLicenseType = course.type === 'COACH_REFRESHER' ? shared_1.LicenseType.COACH : shared_1.LicenseType.REFEREE;
        // Find the user's active/expired license of this type
        const activeLicense = await prisma_1.prisma.license.findFirst({
            where: {
                userId: data.userId,
                type: targetLicenseType,
            },
            orderBy: { validUntil: 'desc' },
        });
        const now = new Date();
        let newValidUntil = new Date(course.date);
        newValidUntil.setMonth(newValidUntil.getMonth() + course.validityExtensionMonths);
        // If license is still active and valid until later than the extension, push from current validUntil
        if (activeLicense && activeLicense.validUntil > now) {
            const extended = new Date(activeLicense.validUntil);
            extended.setMonth(extended.getMonth() + course.validityExtensionMonths);
            newValidUntil = extended;
        }
        // Update license if exists
        if (activeLicense) {
            await prisma_1.prisma.license.update({
                where: { id: activeLicense.id },
                data: {
                    status: shared_1.LicenseStatus.APPROVED,
                    validUntil: newValidUntil,
                },
            });
        }
        // Record attendance
        const attendance = await prisma_1.prisma.courseAttendance.upsert({
            where: {
                courseId_userId: {
                    courseId: data.courseId,
                    userId: data.userId,
                },
            },
            update: {
                attested: true,
                attestedAt: now,
                attestedByUserId: data.instructorId,
                licenseId: activeLicense?.id,
                notes: data.notes,
            },
            create: {
                courseId: data.courseId,
                userId: data.userId,
                licenseId: activeLicense?.id,
                attested: true,
                attestedAt: now,
                attestedByUserId: data.instructorId,
                notes: data.notes,
            },
            include: {
                course: true,
                user: true,
                attestedBy: true,
            },
        });
        return attendance;
    }
}
exports.LicenseService = LicenseService;
