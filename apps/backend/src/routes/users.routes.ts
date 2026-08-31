import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    adminUpdateUserSchema,
    adminResetPasswordSchema,
    AuditCategory,
} from '@areena/shared';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';

const router = Router();

// All routes here require Super Admin privileges
router.use(authenticateToken, requireSuperAdmin);

/**
 * GET /users/admin/list
 * Paginated and searchable member & admin directory for Super Admins.
 */
router.get('/admin/list', async (req: AuthRequest, res: Response, next) => {
    try {
        const q = (req.query.q as string)?.trim() || '';
        const role = (req.query.role as string) || 'ALL';
        const associationId = (req.query.associationId as string)?.trim() || '';
        const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortDir = (req.query.sortDir as string) === 'asc' ? 'asc' : 'desc';

        const skip = (page - 1) * limit;

        // Build where filter
        const where: any = {};
        const andConditions: any[] = [];

        if (q) {
            andConditions.push({
                OR: [
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { licenseId: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
            });
        }

        if (associationId) {
            andConditions.push({
                OR: [
                    { associationRoles: { some: { associationId } } },
                    { clubRoles: { some: { club: { associations: { some: { associationId } } } } } },
                    { licenses: { some: { associationId } } },
                    { licenses: { some: { club: { associations: { some: { associationId } } } } } },
                ],
            });
        }

        if (role === 'SUPER_ADMIN') {
            where.isSuperAdmin = true;
        } else if (role === 'FEDERATION') {
            where.associationRoles = { some: {} };
        } else if (role === 'CLUB') {
            where.clubRoles = { some: {} };
        } else if (role === 'ATHLETE') {
            where.licenses = { some: {} };
        } else if (role === 'UNVERIFIED') {
            where.emailVerified = false;
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        // Parallel queries: users list, total matching count, and overall stats
        const [users, total, totalUsers, superAdmins, verifiedUsers, unverifiedUsers] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortDir },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    street: true,
                    postalCode: true,
                    city: true,
                    country: true,
                    birthDate: true,
                    gender: true,
                    licenseId: true,
                    eloPoints: true,
                    rank: true,
                    avatarUrl: true,
                    isSuperAdmin: true,
                    emailVerified: true,
                    createdAt: true,
                    updatedAt: true,
                    associationRoles: {
                        select: {
                            id: true,
                            role: true,
                            association: {
                                select: { id: true, name: true, shortName: true, code: true },
                            },
                        },
                    },
                    clubRoles: {
                        select: {
                            id: true,
                            role: true,
                            club: {
                                select: { id: true, name: true, code: true },
                            },
                        },
                    },
                    licenses: {
                        select: {
                            id: true,
                            type: true,
                            status: true,
                            validUntil: true,
                            club: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
            prisma.user.count(),
            prisma.user.count({ where: { isSuperAdmin: true } }),
            prisma.user.count({ where: { emailVerified: true } }),
            prisma.user.count({ where: { emailVerified: false } }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        res.json({
            users,
            total,
            page,
            limit,
            totalPages,
            stats: {
                totalUsers,
                superAdmins,
                verifiedUsers,
                unverifiedUsers,
            },
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /users/admin/:id
 * Detailed user profile for inspection.
 */
router.get('/admin/:id', async (req: AuthRequest, res: Response, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
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
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /users/admin/:id
 * Update user details, email address, or verification status.
 */
router.put('/admin/:id', validate(adminUpdateUserSchema), async (req: AuthRequest, res: Response, next) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            email,
            phone,
            street,
            postalCode,
            city,
            country,
            birthDate,
            gender,
            isSuperAdmin,
            emailVerified,
            eloPoints,
            licenseId,
        } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If email is changing, verify it is not already taken
        if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                return res.status(400).json({ error: `The email address ${email} is already in use by another user.` });
            }
        }

        // Safeguard: Prevent removing superadmin if user is editing themselves and they are the only superadmin
        if (isSuperAdmin === false && existingUser.isSuperAdmin) {
            const superAdminCount = await prisma.user.count({ where: { isSuperAdmin: true } });
            if (superAdminCount <= 1) {
                return res.status(400).json({
                    error: 'Cannot remove the last remaining Super Administrator account from the platform.',
                });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(firstName !== undefined ? { firstName } : {}),
                ...(lastName !== undefined ? { lastName } : {}),
                ...(email !== undefined ? { email: email.toLowerCase() } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(street !== undefined ? { street } : {}),
                ...(postalCode !== undefined ? { postalCode } : {}),
                ...(city !== undefined ? { city } : {}),
                ...(country !== undefined ? { country } : {}),
                ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
                ...(gender !== undefined ? { gender } : {}),
                ...(isSuperAdmin !== undefined ? { isSuperAdmin } : {}),
                ...(emailVerified !== undefined ? { emailVerified } : {}),
                ...(eloPoints !== undefined ? { eloPoints } : {}),
                ...(licenseId !== undefined ? { licenseId: licenseId || null } : {}),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                street: true,
                postalCode: true,
                city: true,
                country: true,
                birthDate: true,
                gender: true,
                licenseId: true,
                eloPoints: true,
                rank: true,
                isSuperAdmin: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        await AuditService.record({
            req,
            userId: req.user!.id,
            userEmail: req.user!.email,
            userName: `${req.user!.firstName} ${req.user!.lastName}`,
            action: 'USER_ADMIN_UPDATE',
            category: AuditCategory.GOVERNANCE,
            entityType: 'User',
            entityId: id,
            description: `Super Admin updated user account: ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.email})`,
            status: 'SUCCESS',
            metadata: {
                targetUserId: id,
                updatedFields: Object.keys(req.body),
            },
        });

        res.json(updatedUser);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /users/admin/:id/reset-password
 * Reset user password (custom password or auto-generated secure password).
 */
router.post(
    '/admin/:id/reset-password',
    validate(adminResetPasswordSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { id } = req.params;
            const { newPassword, autoGenerate } = req.body;

            const targetUser = await prisma.user.findUnique({ where: { id } });
            if (!targetUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Generate temporary password if requested or if no custom password is provided
            let finalPassword = newPassword;
            let isAutoGenerated = false;

            if (!finalPassword || autoGenerate) {
                const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
                finalPassword = `Areena2026!${randomPart}`;
                isAutoGenerated = true;
            }

            const passwordHash = await bcrypt.hash(finalPassword, 10);

            await prisma.user.update({
                where: { id },
                data: {
                    passwordHash,
                    passwordResetToken: null,
                    passwordResetExpires: null,
                },
            });

            // Dispatch notification email
            await EmailService.sendPasswordResetEmail(targetUser.email, targetUser.firstName, finalPassword);

            await AuditService.record({
                req,
                userId: req.user!.id,
                userEmail: req.user!.email,
                userName: `${req.user!.firstName} ${req.user!.lastName}`,
                action: 'USER_PASSWORD_RESET_BY_ADMIN',
                category: AuditCategory.SECURITY,
                entityType: 'User',
                entityId: id,
                description: `Super Admin reset password for user ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`,
                status: 'SUCCESS',
                metadata: {
                    targetUserId: id,
                    isAutoGenerated,
                },
            });

            res.json({
                message: `Password reset successfully for ${targetUser.firstName} ${targetUser.lastName}.`,
                temporaryPassword: finalPassword,
            });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * POST /users/admin/:id/toggle-superadmin
 * Promote or demote a user to/from Super Administrator.
 */
router.post('/admin/:id/toggle-superadmin', async (req: AuthRequest, res: Response, next) => {
    try {
        const { id } = req.params;

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newStatus = !targetUser.isSuperAdmin;

        // Safeguard: Do not allow demoting the last super admin
        if (!newStatus && targetUser.isSuperAdmin) {
            const superAdminCount = await prisma.user.count({ where: { isSuperAdmin: true } });
            if (superAdminCount <= 1) {
                return res.status(400).json({
                    error: 'Cannot remove Super Admin privileges from the last remaining Super Administrator.',
                });
            }
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { isSuperAdmin: newStatus },
            select: { id: true, email: true, firstName: true, lastName: true, isSuperAdmin: true },
        });

        await AuditService.record({
            req,
            userId: req.user!.id,
            userEmail: req.user!.email,
            userName: `${req.user!.firstName} ${req.user!.lastName}`,
            action: 'USER_SUPERADMIN_TOGGLED',
            category: AuditCategory.GOVERNANCE,
            entityType: 'User',
            entityId: id,
            description: `Super Admin toggled SuperAdmin status for ${updated.firstName} ${updated.lastName} to ${newStatus}`,
            status: 'SUCCESS',
            metadata: { targetUserId: id, isSuperAdmin: newStatus },
        });

        res.json({
            message: `Super Admin status updated to ${newStatus ? 'ENABLED' : 'DISABLED'} for ${updated.firstName} ${updated.lastName}.`,
            user: updated,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /users/admin/:id/send-verification
 * Manually trigger or resend an email verification link for a user.
 */
router.post('/admin/:id/send-verification', async (req: AuthRequest, res: Response, next) => {
    try {
        const { id } = req.params;

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 3600 * 1000);

        await prisma.user.update({
            where: { id },
            data: {
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
            },
        });

        await EmailService.sendVerificationEmail(targetUser.email, targetUser.firstName, verificationToken);

        await AuditService.record({
            req,
            userId: req.user!.id,
            userEmail: req.user!.email,
            userName: `${req.user!.firstName} ${req.user!.lastName}`,
            action: 'USER_VERIFICATION_SENT_BY_ADMIN',
            category: AuditCategory.AUTH,
            entityType: 'User',
            entityId: id,
            description: `Super Admin sent verification link to ${targetUser.email}`,
            status: 'SUCCESS',
        });

        res.json({
            message: `Verification link sent successfully to ${targetUser.email}.`,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /users/admin/:id
 * Delete a user account.
 */
router.delete('/admin/:id', async (req: AuthRequest, res: Response, next) => {
    try {
        const { id } = req.params;

        if (id === req.user!.id) {
            return res.status(400).json({ error: 'You cannot delete your own account while logged in.' });
        }

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (targetUser.isSuperAdmin) {
            const superAdminCount = await prisma.user.count({ where: { isSuperAdmin: true } });
            if (superAdminCount <= 1) {
                return res.status(400).json({
                    error: 'Cannot delete the only remaining Super Administrator account.',
                });
            }
        }

        // Clean up user records
        await prisma.noticeDismissal.deleteMany({ where: { userId: id } });
        await prisma.userAssociationRole.deleteMany({ where: { userId: id } });
        await prisma.userClubRole.deleteMany({ where: { userId: id } });
        await prisma.teamMember.deleteMany({ where: { userId: id } });
        await prisma.courseAttendance.deleteMany({ where: { userId: id } });
        await prisma.license.deleteMany({ where: { userId: id } });
        await prisma.user.delete({ where: { id } });

        await AuditService.record({
            req,
            userId: req.user!.id,
            userEmail: req.user!.email,
            userName: `${req.user!.firstName} ${req.user!.lastName}`,
            action: 'USER_DELETED_BY_ADMIN',
            category: AuditCategory.GOVERNANCE,
            entityType: 'User',
            entityId: id,
            description: `Super Admin deleted user account: ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`,
            status: 'SUCCESS',
            metadata: { targetUserId: id, email: targetUser.email },
        });

        res.json({
            message: `User ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) was deleted successfully.`,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
