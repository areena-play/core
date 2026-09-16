import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    adminUpdateUserSchema,
    adminResetPasswordSchema,
    mergeDuplicateUsersSchema,
    AuditCategory,
    parseSearchTokens,
    generateSearchVariants,
    formatPhoneNumber,
} from '@areena/shared';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';
import { DuplicateDetectionService } from '../services/duplicateDetection.service';

const router = Router();

// All routes here require Super Admin privileges
router.use(authenticateToken, requireSuperAdmin);

/**
 * GET /users/admin/list
 * Paginated and searchable member & admin directory for Super Admins.
 */
router.get('/admin/list', async (req: AuthRequest, res: Response, next) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
        const skip = (page - 1) * limit;

        const q = (req.query.q as string)?.trim() || '';
        const role = (req.query.role as string)?.trim() || '';
        const associationId = (req.query.associationId as string)?.trim() || '';
        const clubId = (req.query.clubId as string)?.trim() || '';
        const status = (req.query.status as string)?.trim() || '';
        const sortBy = (req.query.sortBy as string) || 'lastName';
        const sortDir = ((req.query.sortDir as string) || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

        // Build where filter
        const where: any = {};
        const andConditions: any[] = [];

        if (q) {
            const tokens = parseSearchTokens(q);
            tokens.forEach((tok) => {
                if (tok.isExact) {
                    andConditions.push({
                        OR: [
                            { firstName: { contains: tok.text, mode: 'insensitive' } },
                            { lastName: { contains: tok.text, mode: 'insensitive' } },
                            { email: { contains: tok.text, mode: 'insensitive' } },
                            { licenseId: { contains: tok.text, mode: 'insensitive' } },
                            { city: { contains: tok.text, mode: 'insensitive' } },
                            { phone: { contains: tok.text, mode: 'insensitive' } },
                        ],
                    });
                } else {
                    const variants = generateSearchVariants(tok.text);

                    andConditions.push({
                        OR: variants.flatMap((v) => [
                            { firstName: { contains: v, mode: 'insensitive' } },
                            { lastName: { contains: v, mode: 'insensitive' } },
                            { email: { contains: v, mode: 'insensitive' } },
                            { licenseId: { contains: v, mode: 'insensitive' } },
                            { city: { contains: v, mode: 'insensitive' } },
                            { phone: { contains: v, mode: 'insensitive' } },
                        ]),
                    });
                }
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

        const normalizedRole = role.toUpperCase();
        if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ADMIN') {
            where.isSuperAdmin = true;
        } else if (normalizedRole === 'FEDERATION' || normalizedRole === 'OFFICIAL') {
            where.associationRoles = { some: {} };
        } else if (normalizedRole === 'CLUB' || normalizedRole === 'CLUB_ADMIN') {
            where.clubRoles = { some: {} };
        } else if (normalizedRole === 'ATHLETE' || normalizedRole === 'PLAYER') {
            where.licenses = { some: { type: 'PLAYER' } };
        } else if (normalizedRole === 'COACH') {
            where.licenses = { some: { type: 'COACH' } };
        } else if (normalizedRole === 'REFEREE' || normalizedRole === 'UMPIRE') {
            where.licenses = { some: { type: { in: ['REFEREE', 'UMPIRE'] } } };
        } else if (normalizedRole === 'UNVERIFIED') {
            where.emailVerified = false;
        } else if (normalizedRole === 'VERIFIED') {
            where.emailVerified = true;
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        let orderBy: any = [{ lastName: 'asc' }, { firstName: 'asc' }];
        if (sortBy === 'name' || sortBy === 'lastName') {
            orderBy = [{ lastName: sortDir }, { firstName: sortDir }];
        } else if (sortBy === 'firstName') {
            orderBy = [{ firstName: sortDir }, { lastName: sortDir }];
        } else if (['email', 'licenseId', 'eloPoints', 'rank', 'city', 'createdAt', 'updatedAt', 'phone', 'birthDate', 'gender', 'playingGender', 'emailVerified', 'isSuperAdmin'].includes(sortBy)) {
            orderBy = { [sortBy]: sortDir };
        }

        // Parallel queries: users list, total matching count, and overall stats
        const [users, total, totalUsers, superAdmins, verifiedUsers, unverifiedUsers] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy,
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
                    playingGender: true,
                    licenseId: true,
                    eloPoints: true,
                    rank: true,
                    avatarUrl: true,
                    phoneticFirstName: true,
                    phoneticLastName: true,
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
            totalUnfiltered: totalUsers,
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
 * GET /users/admin/duplicates
 * Scan and return potential duplicate user clusters across the system.
 */
router.get('/admin/duplicates', async (req: AuthRequest, res: Response, next) => {
    try {
        const clusters = await DuplicateDetectionService.scanAllDuplicates();
        res.json({
            count: clusters.length,
            clusters,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /users/admin/duplicates/merge
 * Merge a duplicate user account into a primary user account.
 */
router.post('/admin/duplicates/merge', validate(mergeDuplicateUsersSchema), async (req: AuthRequest, res: Response, next) => {
    try {
        const { primaryUserId, duplicateUserId, keepDuplicateEmailIfUnset } = req.body;
        const result = await DuplicateDetectionService.mergeDuplicateUsers(
            req,
            primaryUserId,
            duplicateUserId,
            keepDuplicateEmailIfUnset ?? true
        );
        res.json(result);
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
                licenses: {
                    include: {
                        club: true,
                        association: true,
                        season: true,
                        appliedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
                        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                courseAttendances: {
                    include: {
                        course: true,
                        attestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
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
            phoneticFirstName,
            phoneticLastName,
            email,
            phone,
            street,
            postalCode,
            city,
            country,
            birthDate,
            gender,
            playingGender,
            isSuperAdmin,
            emailVerified,
            eloPoints,
            licenseId,
        } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check playingGender changes: must be Super Admin or Main Association Manager
        if (playingGender && playingGender !== existingUser.playingGender) {
            const isSuper = req.user?.isSuperAdmin;
            let isMainAssocManager = false;
            if (!isSuper) {
                const topLevelRole = await prisma.userAssociationRole.findFirst({
                    where: {
                        userId: req.user!.id,
                        association: { isTopLevel: true },
                    },
                });
                isMainAssocManager = Boolean(topLevelRole);
            }

            if (!isSuper && !isMainAssocManager) {
                return res.status(403).json({
                    error: 'Only a Super Administrator or Main Association Manager can change a user’s playing gender.',
                });
            }
        }

        // If email is changing, verify it is not already taken
        if (email && email.toLowerCase() !== (existingUser.email?.toLowerCase() || '')) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                return res.status(400).json({ error: `The email address ${email} is already in use by another user.` });
            }
        }

        // Safeguard: Prevent admin from removing their own admin rights
        if (id === req.user!.id && isSuperAdmin === false && existingUser.isSuperAdmin) {
            return res.status(400).json({
                error: 'You cannot remove your own administrator rights.',
            });
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
                ...(phoneticFirstName !== undefined ? { phoneticFirstName: phoneticFirstName ? phoneticFirstName.trim() : null } : {}),
                ...(phoneticLastName !== undefined ? { phoneticLastName: phoneticLastName ? phoneticLastName.trim() : null } : {}),
                ...(email !== undefined ? { email: email.toLowerCase() } : {}),
                ...(phone !== undefined ? { phone: formatPhoneNumber(phone) } : {}),
                ...(street !== undefined ? { street } : {}),
                ...(postalCode !== undefined ? { postalCode } : {}),
                ...(city !== undefined ? { city } : {}),
                ...(country !== undefined ? { country } : {}),
                ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
                ...(gender !== undefined ? { gender } : {}),
                ...(playingGender !== undefined ? { playingGender } : {}),
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
                phoneticFirstName: true,
                phoneticLastName: true,
                phone: true,
                street: true,
                postalCode: true,
                city: true,
                country: true,
                birthDate: true,
                gender: true,
                playingGender: true,
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
            if (targetUser.email) {
                await EmailService.sendPasswordResetEmail(targetUser.email, targetUser.firstName, finalPassword);
            }

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

        // Safeguard: Prevent admin from removing their own admin rights
        if (id === req.user!.id && targetUser.isSuperAdmin) {
            return res.status(400).json({
                error: 'You cannot remove your own administrator rights.',
            });
        }

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

        await EmailService.sendVerificationEmail(targetUser.email!, targetUser.firstName, verificationToken);

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
