import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { validate } from '../middleware/validate';
import {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    verifyEmailSchema,
    resendVerificationSchema,
    requestEmailChangeSchema,
    confirmEmailChangeSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    claimProfileByLicenseSchema,
    claimProfileByTokenSchema,
    checkDuplicateUserSchema,
    AuditCategory,
    parseSearchTokens,
    generateSearchVariants,
    formatPhoneNumber,
} from '@areena/shared';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';
import { PrivacyService } from '../services/privacy.service';
import { DuplicateDetectionService } from '../services/duplicateDetection.service';
import { GeminiService } from '../services/gemini.service';

const router = Router();

// Helper to check if email verification is mandatory in current environment
export function isEmailVerificationRequired(): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const isDemo = config.isDemo;
    return isProd && !isDemo;
}

// POST /auth/check-duplicate
router.post('/check-duplicate', validate(checkDuplicateUserSchema), async (req, res, next) => {
    try {
        const { firstName, lastName, birthDate, email, licenseId, excludeUserId } = req.body;
        const result = await DuplicateDetectionService.findSimilarUsers({
            firstName,
            lastName,
            birthDate,
            email,
            licenseId,
            excludeUserId,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// POST /auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone, street, postalCode, city, country, birthDate, gender, playingGender } =
            req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        const effectivePlayingGender = playingGender || (gender === 'FEMALE' ? 'FEMALE' : 'MALE');

        const passwordHash = await bcrypt.hash(password, 10);
        const requiresVerification = isEmailVerificationRequired();

        // Generate verification token if in production
        const verificationToken = requiresVerification ? crypto.randomBytes(32).toString('hex') : null;
        const verificationExpires = requiresVerification ? new Date(Date.now() + 24 * 3600 * 1000) : null;

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
                phone: phone ? formatPhoneNumber(phone) : phone,
                street,
                postalCode,
                city,
                country: country || 'Switzerland',
                birthDate: birthDate ? new Date(birthDate) : null,
                gender: gender || null,
                playingGender: effectivePlayingGender,
                emailVerified: !requiresVerification,
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
            },
        });

        // Dispatch verification email
        if (verificationToken) {
            const clientOrigin = (req.headers.origin || req.headers.referer) as string | undefined;
            await EmailService.sendVerificationEmail(user.email!, user.firstName, verificationToken, clientOrigin);
        }

        const token = jwt.sign({ userId: user.id, tokenVersion: (user as any).tokenVersion ?? 0 }, config.jwtSecret, { expiresIn: '7d' });

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email ?? undefined,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'AUTH_REGISTER',
            category: AuditCategory.AUTH,
            entityType: 'User',
            entityId: user.id,
            description: `New user registration for ${user.firstName} ${user.lastName} (${user.email})${requiresVerification ? ' [Verification Pending]' : ' [Auto-Verified]' }`,
            status: 'SUCCESS',
            metadata: {
                email: user.email,
                country: user.country,
                city: user.city,
                gender: user.gender,
                playingGender: user.playingGender,
                emailVerified: user.emailVerified,
            },
        });

        res.status(201).json({
            token,
            requiresVerification,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                street: user.street,
                postalCode: user.postalCode,
                city: user.city,
                country: user.country,
                birthDate: user.birthDate,
                gender: user.gender,
                playingGender: user.playingGender,
                licenseId: user.licenseId,
                eloPoints: user.eloPoints,
                rank: user.rank,
                isSuperAdmin: user.isSuperAdmin,
                emailVerified: user.emailVerified,
            },
        });
    } catch (err) {
        next(err);
    }
});

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                associationRoles: { include: { association: true } },
                clubRoles: { include: { club: true } },
                licenses: { include: { club: true, association: true, season: true } },
            },
        });

        if (!user) {
            await AuditService.record({
                req,
                userEmail: email,
                action: 'AUTH_LOGIN_FAILED',
                category: AuditCategory.SECURITY,
                description: `Failed login attempt for email ${email} (Account not found)`,
                status: 'FAILURE',
                metadata: { email, reason: 'USER_NOT_FOUND' },
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if ((user as any).canLogin === false || !user.passwordHash || (user as any).accountStatus === 'MANAGED') {
            return res.status(403).json({
                error: 'This profile is managed by a guardian and does not have independent login credentials.',
            });
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            await AuditService.record({
                req,
                userId: user.id,
                userEmail: user.email ?? undefined,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'AUTH_LOGIN_FAILED',
                category: AuditCategory.SECURITY,
                entityType: 'User',
                entityId: user.id,
                description: `Failed login attempt for ${user.email} (Incorrect password)`,
                status: 'FAILURE',
                metadata: { email, reason: 'INVALID_PASSWORD' },
            });
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check email verification in production environments
        if (isEmailVerificationRequired() && !user.emailVerified) {
            await AuditService.record({
                req,
                userId: user.id,
                userEmail: user.email ?? undefined,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'AUTH_LOGIN_BLOCKED_UNVERIFIED',
                category: AuditCategory.SECURITY,
                entityType: 'User',
                entityId: user.id,
                description: `Login blocked for unverified email: ${user.email}`,
                status: 'FAILURE',
                metadata: { email: user.email },
            });

            return res.status(403).json({
                error: 'EMAIL_NOT_VERIFIED',
                message: 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
                email: user.email,
            });
        }

        const token = jwt.sign({ userId: user.id, tokenVersion: (user as any).tokenVersion ?? 0 }, config.jwtSecret, { expiresIn: '7d' });

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email ?? undefined,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'AUTH_LOGIN',
            category: AuditCategory.AUTH,
            entityType: 'User',
            entityId: user.id,
            description: `User ${user.firstName} ${user.lastName} (${user.email}) signed in`,
            status: 'SUCCESS',
            metadata: {
                isSuperAdmin: user.isSuperAdmin,
                associationRoleCount: user.associationRoles.length,
                clubRoleCount: user.clubRoles.length,
            },
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneticFirstName: (user as any).phoneticFirstName,
                phoneticLastName: (user as any).phoneticLastName,
                phone: user.phone,
                street: user.street,
                postalCode: user.postalCode,
                city: user.city,
                country: user.country,
                birthDate: user.birthDate,
                gender: user.gender,
                licenseId: user.licenseId,
                eloPoints: user.eloPoints,
                rank: user.rank,
                isSuperAdmin: user.isSuperAdmin,
                subscriptionStatus: (user as any).subscriptionStatus,
                subscriptionPlan: (user as any).subscriptionPlan,
                emailVerified: user.emailVerified,
                associationRoles: user.associationRoles,
                clubRoles: user.clubRoles,
                licenses: user.licenses,
            },
        });
    } catch (err) {
        next(err);
    }
});

// POST /auth/verify-email
router.post('/verify-email', async (req, res, next) => {
    try {
        const token = (req.body.token || req.query.token) as string;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const user = await prisma.user.findFirst({
            where: {
                emailVerificationToken: token,
                emailVerificationExpires: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({
                error: 'INVALID_OR_EXPIRED_TOKEN',
                message: 'The email verification link is invalid or has expired. Please request a new verification link.',
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
            include: {
                associationRoles: { include: { association: true } },
                clubRoles: { include: { club: true } },
                licenses: { include: { club: true, association: true, season: true } },
            },
        });

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email ?? undefined,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'AUTH_EMAIL_VERIFIED',
            category: AuditCategory.AUTH,
            entityType: 'User',
            entityId: user.id,
            description: `Email address verified successfully for ${user.email}`,
            status: 'SUCCESS',
        });

        const authToken = jwt.sign({ userId: user.id, tokenVersion: (updatedUser as any).tokenVersion ?? 0 }, config.jwtSecret, { expiresIn: '7d' });

        res.json({
            message: 'Email address verified successfully! You are now logged in.',
            token: authToken,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                phone: updatedUser.phone,
                street: updatedUser.street,
                postalCode: updatedUser.postalCode,
                city: updatedUser.city,
                country: updatedUser.country,
                birthDate: updatedUser.birthDate,
                gender: updatedUser.gender,
                licenseId: updatedUser.licenseId,
                eloPoints: updatedUser.eloPoints,
                rank: updatedUser.rank,
                isSuperAdmin: updatedUser.isSuperAdmin,
                emailVerified: updatedUser.emailVerified,
                associationRoles: updatedUser.associationRoles,
                clubRoles: updatedUser.clubRoles,
                licenses: updatedUser.licenses,
            },
        });
    } catch (err) {
        next(err);
    }
});

// POST /auth/resend-verification
router.post('/resend-verification', validate(resendVerificationSchema), async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Return success message anyway to prevent user enumeration
            return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
        }

        if (user.emailVerified) {
            return res.json({ message: 'This email address is already verified. You can log in.' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 3600 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
            },
        });

        const clientOrigin = (req.headers.origin || req.headers.referer) as string | undefined;
        await EmailService.sendVerificationEmail(user.email!, user.firstName, verificationToken, clientOrigin);

        await AuditService.record({
            req,
            userId: user.id,
            userEmail: user.email ?? undefined,
            userName: `${user.firstName} ${user.lastName}`,
            action: 'AUTH_VERIFICATION_RESENT',
            category: AuditCategory.AUTH,
            entityType: 'User',
            entityId: user.id,
            description: `Resent verification email to ${user.email}`,
            status: 'SUCCESS',
        });

        res.json({ message: 'A new verification link has been sent to your email address.' });
    } catch (err) {
        next(err);
    }
});

// POST /auth/request-email-change
router.post(
    '/request-email-change',
    authenticateToken,
    validate(requestEmailChangeSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { newEmail } = req.body;
            const normalizedNewEmail = newEmail.trim().toLowerCase();

            const user = await prisma.user.findUnique({
                where: { id: req.user!.id },
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if ((user.email?.toLowerCase() || '') === normalizedNewEmail) {
                return res.status(400).json({ error: 'This is already your current email address.' });
            }

            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedNewEmail },
            });

            if (existingUser && existingUser.id !== user.id) {
                return res.status(400).json({ error: 'This email address is already registered to another account.' });
            }

            const pendingEmailToken = crypto.randomBytes(32).toString('hex');
            const pendingEmailExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

            await (prisma.user as any).update({
                where: { id: user.id },
                data: {
                    pendingEmail: normalizedNewEmail,
                    pendingEmailToken,
                    pendingEmailExpires,
                },
            });

            await EmailService.sendEmailChangeConfirmationEmail(normalizedNewEmail, user.firstName, pendingEmailToken);

            await AuditService.record({
                req,
                userId: user.id,
                userEmail: user.email ?? undefined,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'AUTH_EMAIL_CHANGE_REQUESTED',
                category: AuditCategory.AUTH,
                entityType: 'User',
                entityId: user.id,
                description: `Requested email change from ${user.email} to ${normalizedNewEmail}`,
                status: 'SUCCESS',
                metadata: {
                    currentEmail: user.email,
                    requestedNewEmail: normalizedNewEmail,
                },
            });

            res.json({
                message: `A confirmation link has been sent to ${normalizedNewEmail}. Please check your inbox and confirm the change to activate it.`,
                pendingEmail: normalizedNewEmail,
            });
        } catch (err) {
            next(err);
        }
    },
);

// POST /auth/confirm-email-change
router.post(
    '/confirm-email-change',
    validate(confirmEmailChangeSchema),
    async (req, res, next) => {
        try {
            const { token } = req.body;

            const user = await (prisma.user as any).findFirst({
                where: {
                    pendingEmailToken: token,
                    pendingEmailExpires: {
                        gt: new Date(),
                    },
                },
            });

            if (!user || !user.pendingEmail) {
                return res.status(400).json({ error: 'Invalid or expired confirmation link. Please request a new email change.' });
            }

            const existingWithEmail = await prisma.user.findUnique({
                where: { email: user.pendingEmail },
            });

            if (existingWithEmail && existingWithEmail.id !== user.id) {
                return res.status(400).json({ error: 'This email address is already in use by another account.' });
            }

            const oldEmail = user.email;
            const newEmail = user.pendingEmail;

            const updated = await (prisma.user as any).update({
                where: { id: user.id },
                data: {
                    email: newEmail,
                    emailVerified: true,
                    pendingEmail: null,
                    pendingEmailToken: null,
                    pendingEmailExpires: null,
                },
            });

            await AuditService.record({
                req,
                userId: updated.id,
                userEmail: updated.email,
                userName: `${updated.firstName} ${updated.lastName}`,
                action: 'AUTH_EMAIL_CHANGE_CONFIRMED',
                category: AuditCategory.AUTH,
                entityType: 'User',
                entityId: updated.id,
                description: `Successfully updated user email from ${oldEmail} to ${newEmail}`,
                status: 'SUCCESS',
                metadata: {
                    oldEmail,
                    newEmail,
                },
            });

            res.json({
                message: 'Your email address has been successfully updated and verified.',
                newEmail: updated.email,
            });
        } catch (err) {
            next(err);
        }
    },
);

// POST /auth/forgot-password
router.post(
    '/forgot-password',
    validate(forgotPasswordSchema),
    async (req, res, next) => {
        try {
            const { email } = req.body;
            const normalizedEmail = email.trim().toLowerCase();

            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (user) {
                const passwordResetToken = crypto.randomBytes(32).toString('hex');
                const passwordResetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        passwordResetToken,
                        passwordResetExpires,
                    },
                });

                await EmailService.sendPasswordResetLinkEmail(user.email!, user.firstName, passwordResetToken);

                await AuditService.record({
                    req,
                    userId: user.id,
                    userEmail: user.email ?? undefined,
                    userName: `${user.firstName} ${user.lastName}`,
                    action: 'AUTH_PASSWORD_RESET_REQUESTED',
                    category: AuditCategory.AUTH,
                    entityType: 'User',
                    entityId: user.id,
                    description: `Password reset link requested for ${user.email}`,
                    status: 'SUCCESS',
                });
            }

            // Always respond with a generic success to prevent email enumeration
            res.json({
                message: 'If an account exists with this email address, a password reset link has been sent.',
            });
        } catch (err) {
            next(err);
        }
    },
);

// POST /auth/reset-password
router.post(
    '/reset-password',
    validate(resetPasswordSchema),
    async (req, res, next) => {
        try {
            const { token, password } = req.body;

            const user = await prisma.user.findFirst({
                where: {
                    passwordResetToken: token,
                    passwordResetExpires: {
                        gt: new Date(),
                    },
                },
            });

            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new link.' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash,
                    passwordResetToken: null,
                    passwordResetExpires: null,
                    tokenVersion: { increment: 1 },
                },
            });

            await AuditService.record({
                req,
                userId: user.id,
                userEmail: user.email ?? undefined,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'AUTH_PASSWORD_RESET_COMPLETED',
                category: AuditCategory.AUTH,
                entityType: 'User',
                entityId: user.id,
                description: `Password reset successfully completed for ${user.email}. All sessions invalidated.`,
                status: 'SUCCESS',
            });

            res.json({
                message: 'Your password has been successfully reset. You can now log in with your new password.',
            });
        } catch (err) {
            next(err);
        }
    },
);

// POST /auth/change-password
router.post(
    '/change-password',
    authenticateToken,
    validate(changePasswordSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user!.id;

            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (!user.passwordHash) {
                return res.status(400).json({ error: 'Account does not have a password configured.' });
            }

            const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isValid) {
                return res.status(400).json({ error: 'Current password is incorrect.' });
            }

            const isSame = await bcrypt.compare(newPassword, user.passwordHash);
            if (isSame) {
                return res.status(400).json({ error: 'New password must be different from your current password.' });
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    passwordHash,
                    passwordResetToken: null,
                    passwordResetExpires: null,
                    tokenVersion: { increment: 1 },
                },
                include: {
                    associationRoles: true,
                    clubRoles: true,
                },
            });

            // Issue fresh JWT for the current device so it stays logged in
            const token = jwt.sign(
                { userId: updatedUser.id, tokenVersion: (updatedUser as any).tokenVersion },
                config.jwtSecret,
                { expiresIn: '7d' },
            );

            await AuditService.record({
                req,
                userId: user.id,
                userEmail: user.email ?? undefined,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'AUTH_PASSWORD_CHANGED',
                category: AuditCategory.AUTH,
                entityType: 'User',
                entityId: user.id,
                description: `User ${user.email} changed their account password. All other active sessions have been invalidated.`,
                status: 'SUCCESS',
            });

            res.json({
                success: true,
                message: 'Password changed successfully. All other active sessions have been signed out.',
                token,
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    isSuperAdmin: updatedUser.isSuperAdmin,
                },
            });
        } catch (err) {
            next(err);
        }
    },
);

// GET /auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: {
                associationRoles: { include: { association: true } },
                clubRoles: { include: { club: true } },
                licenses: { include: { club: true, association: true, season: true } },
                courseAttendances: { include: { course: true } },
            },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found or session invalidated' });
        }

        res.json(user);
    } catch (err) {
        next(err);
    }
});

// GET /auth/profile-overview
router.get('/profile-overview', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                associationRoles: {
                    include: { association: true },
                },
                clubRoles: {
                    include: { club: true },
                },
                licenses: {
                    include: {
                        club: true,
                        association: true,
                        season: true,
                        appliedBy: { select: { id: true, firstName: true, lastName: true } },
                        approvedBy: { select: { id: true, firstName: true, lastName: true } },
                    },
                    orderBy: { validUntil: 'desc' },
                },
                courseAttendances: {
                    include: {
                        course: {
                            include: {
                                association: true,
                                instructor: {
                                    select: { id: true, firstName: true, lastName: true, email: true },
                                },
                            },
                        },
                    },
                    orderBy: { course: { date: 'desc' } },
                },
                instructedCourses: {
                    include: {
                        association: true,
                        _count: { select: { attendances: true } },
                    },
                    orderBy: { date: 'desc' },
                },
                teamMemberships: {
                    include: {
                        team: {
                            include: {
                                club: true,
                                registrations: {
                                    include: {
                                        category: {
                                            include: {
                                                competition: {
                                                    include: {
                                                        association: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 1. Resolve registered competitions
        const compMap = new Map<string, any>();
        for (const tm of user.teamMemberships) {
            for (const reg of tm.team.registrations) {
                const comp = reg.category?.competition;
                if (comp) {
                    const key = `${comp.id}:${reg.category.id}:${tm.team.id}`;
                    if (!compMap.has(key)) {
                        compMap.set(key, {
                            id: comp.id,
                            name: comp.name,
                            slug: comp.slug,
                            seriesSlug: comp.seriesSlug,
                            type: comp.type,
                            status: comp.status,
                            startDate: comp.startDate,
                            endDate: comp.endDate,
                            location: comp.location,
                            association: comp.association,
                            category: {
                                id: reg.category.id,
                                name: reg.category.name,
                            },
                            team: {
                                id: tm.team.id,
                                name: tm.team.name,
                                role: tm.role,
                                club: tm.team.club,
                            },
                        });
                    }
                }
            }
        }
        const registeredCompetitions = Array.from(compMap.values());

        // 2. Resolve Admin Access Overview
        let adminAssociations: any[] = [];
        let adminClubs: any[] = [];
        let adminCompetitions: any[] = [];

        if (user.isSuperAdmin) {
            const [allAssocs, allClubs, allComps] = await Promise.all([
                prisma.association.findMany({
                    orderBy: [{ level: 'asc' }, { name: 'asc' }],
                }),
                prisma.club.findMany({
                    orderBy: { name: 'asc' },
                }),
                prisma.competition.findMany({
                    include: { association: true },
                    orderBy: { startDate: 'desc' },
                    take: 20,
                }),
            ]);
            adminAssociations = allAssocs.map((a) => ({
                id: a.id,
                name: a.name,
                code: a.code,
                slug: a.slug,
                level: a.level,
                isTopLevel: a.isTopLevel,
                role: 'SUPER_ADMIN',
            }));
            adminClubs = allClubs.map((c) => ({
                id: c.id,
                name: c.name,
                code: c.code,
                slug: c.slug,
                city: c.city,
                role: 'SUPER_ADMIN',
            }));
            adminCompetitions = allComps.map((cp) => ({
                id: cp.id,
                name: cp.name,
                slug: cp.slug,
                seriesSlug: cp.seriesSlug,
                type: cp.type,
                status: cp.status,
                startDate: cp.startDate,
                association: cp.association,
                role: 'SUPER_ADMIN',
            }));
        } else {
            // Associations where user has admin/governance role
            const eligibleAssocRoles = ['SUPER_ADMIN', 'ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'OFFICIAL'];
            adminAssociations = user.associationRoles
                .filter((ar) => eligibleAssocRoles.includes(ar.role))
                .map((ar) => ({
                    id: ar.association.id,
                    name: ar.association.name,
                    code: ar.association.code,
                    slug: ar.association.slug,
                    level: ar.association.level,
                    isTopLevel: ar.association.isTopLevel,
                    role: ar.role,
                }));

            // Clubs where user has admin role
            const eligibleClubRoles = ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COACH'];
            adminClubs = user.clubRoles
                .filter((cr) => eligibleClubRoles.includes(cr.role))
                .map((cr) => ({
                    id: cr.club.id,
                    name: cr.club.name,
                    code: cr.club.code,
                    slug: cr.club.slug,
                    city: cr.club.city,
                    role: cr.role,
                }));

            // Competitions hosted by the admin associations
            const adminAssocIds = adminAssociations.map((a) => a.id);
            if (adminAssocIds.length > 0) {
                const comps = await prisma.competition.findMany({
                    where: { associationId: { in: adminAssocIds } },
                    include: { association: true },
                    orderBy: { startDate: 'desc' },
                });
                adminCompetitions = comps.map((cp) => ({
                    id: cp.id,
                    name: cp.name,
                    slug: cp.slug,
                    seriesSlug: cp.seriesSlug,
                    type: cp.type,
                    status: cp.status,
                    startDate: cp.startDate,
                    association: cp.association,
                    role: 'ASSOCIATION_ADMIN',
                }));
            }
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneticFirstName: user.phoneticFirstName,
                phoneticLastName: user.phoneticLastName,
                phone: user.phone,
                street: user.street,
                postalCode: user.postalCode,
                city: user.city,
                country: user.country,
                birthDate: user.birthDate,
                gender: user.gender,
                playingGender: user.playingGender,
                licenseId: user.licenseId,
                eloPoints: user.eloPoints,
                rank: user.rank,
                avatarUrl: user.avatarUrl,
                isSuperAdmin: user.isSuperAdmin,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
            },
            licenses: user.licenses,
            courseAttendances: user.courseAttendances,
            instructedCourses: user.instructedCourses,
            registeredCompetitions,
            adminAccess: {
                isSuperAdmin: user.isSuperAdmin,
                associations: adminAssociations,
                clubs: adminClubs,
                competitions: adminCompetitions,
            },
        });
    } catch (err) {
        next(err);
    }
});

// PUT /auth/profile
router.put(
    '/profile',
    authenticateToken,
    validate(updateProfileSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const {
                firstName,
                lastName,
                phoneticFirstName,
                phoneticLastName,
                phone,
                street,
                postalCode,
                city,
                country,
                birthDate,
                gender,
                avatarUrl,
                isPubliclyHidden,
                displayNameChoice,
                hideEloRanking,
                hideContactInfo,
            } = req.body;

            const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
            if (!currentUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            // If actual gender is being updated, ensure it does not conflict with locked playingGender
            if (gender) {
                if (gender === 'MALE' && currentUser.playingGender === 'FEMALE') {
                    return res.status(400).json({
                        error: 'Your actual gender cannot be set to Male while your official playing category is Female. Please contact the national association manager to adjust your playing category.',
                    });
                }
                if (gender === 'FEMALE' && currentUser.playingGender === 'MALE') {
                    return res.status(400).json({
                        error: 'Your actual gender cannot be set to Female while your official playing category is Male. Please contact the national association manager to adjust your playing category.',
                    });
                }
            }

            // Validate phonetic names if updated
            if (phoneticFirstName !== undefined || phoneticLastName !== undefined) {
                const targetFirst = firstName || currentUser.firstName;
                const targetLast = lastName || currentUser.lastName;
                const pFirst = phoneticFirstName !== undefined ? phoneticFirstName : currentUser.phoneticFirstName;
                const pLast = phoneticLastName !== undefined ? phoneticLastName : currentUser.phoneticLastName;

                const validation = await GeminiService.validatePhoneticName(
                    targetFirst,
                    targetLast,
                    pFirst,
                    pLast
                );

                if (!validation.isValid) {
                    return res.status(400).json({
                        error: validation.reason || 'Invalid phonetic name. Please enter a reasonable phonetic pronunciation of your actual name.',
                    });
                }
            }

            const updated = await prisma.user.update({
                where: { id: req.user!.id },
                data: {
                    ...(firstName ? { firstName } : {}),
                    ...(lastName ? { lastName } : {}),
                    ...(phoneticFirstName !== undefined ? { phoneticFirstName: phoneticFirstName ? phoneticFirstName.trim() : null } : {}),
                    ...(phoneticLastName !== undefined ? { phoneticLastName: phoneticLastName ? phoneticLastName.trim() : null } : {}),
                    ...(phone ? { phone: formatPhoneNumber(phone) } : {}),
                    ...(street ? { street } : {}),
                    ...(postalCode ? { postalCode } : {}),
                    ...(city ? { city } : {}),
                    ...(country ? { country } : {}),
                    ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
                    ...(gender !== undefined ? { gender } : {}),
                    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
                    ...(isPubliclyHidden !== undefined ? { isPubliclyHidden } : {}),
                    ...(displayNameChoice !== undefined ? { displayNameChoice } : {}),
                    ...(hideEloRanking !== undefined ? { hideEloRanking } : {}),
                    ...(hideContactInfo !== undefined ? { hideContactInfo } : {}),
                },
            });

            res.json(updated);
        } catch (err) {
            next(err);
        }
    },
);

// GET /auth/users (Member directory search)
router.get('/users', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const query = (req.query.q as string) || '';
        const associationId = (req.query.associationId as string)?.trim() || '';
        const role = (req.query.role as string)?.trim().toLowerCase() || '';

        const where: any = {};
        const andConditions: any[] = [];

        if (query) {
            const tokens = parseSearchTokens(query);
            tokens.forEach((tok) => {
                if (tok.isExact) {
                    // Quoted phrase -> match exact substring/phrase
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
                    // Unquoted token -> expand variants (e.g. 'muller' -> ['muller', 'müller'], 'rene' -> ['rene', 'rené'])
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

        let resolvedAssocId = associationId;
        if (resolvedAssocId) {
            const a = await prisma.association.findFirst({
                where: {
                    OR: [
                        { id: resolvedAssocId },
                        { slug: resolvedAssocId.toLowerCase() },
                        { code: resolvedAssocId.toUpperCase() },
                    ],
                },
                select: { id: true },
            });
            if (a) resolvedAssocId = a.id;
        }

        if (resolvedAssocId) {
            andConditions.push({
                OR: [
                    { associationRoles: { some: { associationId: resolvedAssocId } } },
                    { clubRoles: { some: { club: { associations: { some: { associationId: resolvedAssocId } } } } } },
                    { licenses: { some: { associationId: resolvedAssocId } } },
                    { licenses: { some: { club: { associations: { some: { associationId: resolvedAssocId } } } } } },
                    { teamMemberships: { some: { team: { club: { associations: { some: { associationId: resolvedAssocId } } } } } } },
                ],
            });
        }

        if (role === 'player') {
            andConditions.push({
                licenses: {
                    some: {
                        type: { in: ['PLAYER_REGULAR', 'PLAYER_TCARD', 'PLAYER_WOMEN', 'PLAYER_JUNIOR', 'PLAYER_SENIOR'] }
                    }
                }
            });
        } else if (role === 'referee') {
            andConditions.push({
                licenses: {
                    some: {
                        type: 'REFEREE'
                    }
                }
            });
        } else if (role === 'coach') {
            andConditions.push({
                licenses: {
                    some: {
                        type: 'COACH'
                    }
                }
            });
        } else if (role === 'official') {
            andConditions.push({
                OR: [
                    { associationRoles: { some: {} } },
                    { clubRoles: { some: {} } },
                    { isSuperAdmin: true }
                ]
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : 1;
        const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10))) : 25;
        const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
        const skip = (page - 1) * limit;

        const [users, total, totalUnfiltered] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    city: true,
                    country: true,
                    licenseId: true,
                    eloPoints: true,
                    currentLevel: true,
                    rank: true,
                    avatarUrl: true,
                    associationRoles: {
                        select: {
                            id: true,
                            role: true,
                            association: { select: { id: true, name: true, shortName: true, code: true } },
                        },
                    },
                    clubRoles: {
                        select: {
                            id: true,
                            role: true,
                            club: { select: { id: true, name: true, code: true } },
                        },
                    },
                    licenses: {
                        select: {
                            id: true,
                            type: true,
                            status: true,
                            validUntil: true,
                            club: { select: { id: true, name: true, code: true } },
                        },
                    },
                    teamMemberships: {
                        select: {
                            id: true,
                            role: true,
                            team: { select: { id: true, name: true, club: { select: { id: true, name: true, code: true } } } },
                        },
                    },
                },
                skip: hasPagination ? skip : 0,
                take: hasPagination ? limit : 100,
                orderBy: { lastName: 'asc' },
            }),
            prisma.user.count({ where }),
            prisma.user.count({}),
        ]);

        if (hasPagination) {
            const totalPages = Math.ceil(total / limit) || 1;
            res.json({
                users,
                total,
                totalUnfiltered,
                page,
                totalPages,
                limit,
            });
        } else {
            res.json(users);
        }
    } catch (err) {
        next(err);
    }
});

/**
 * GET /auth/users/:identifier
 * Public/authenticated view of a person profile by UUID or license ID with management permissions guard.
 */
router.get('/users/:identifier', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { identifier } = req.params;
        if (!identifier) {
            return res.status(400).json({ error: 'User identifier is required' });
        }

        // Support matching either UUID or licenseId
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { licenseId: identifier },
                ],
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneticFirstName: true,
                phoneticLastName: true,
                email: true,
                phone: true,
                street: true,
                postalCode: true,
                city: true,
                country: true,
                licenseId: true,
                eloPoints: true,
                currentLevel: true,
                rank: true,
                avatarUrl: true,
                birthDate: true,
                gender: true,
                accountStatus: true,
                createdAt: true,
                updatedAt: true,
                isPubliclyHidden: true,
                displayNameChoice: true,
                hideEloRanking: true,
                hideContactInfo: true,
                associationRoles: {
                    select: {
                        id: true,
                        role: true,
                        createdAt: true,
                        association: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                                code: true,
                                slug: true,
                            },
                        },
                    },
                },
                clubRoles: {
                    select: {
                        id: true,
                        role: true,
                        createdAt: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                slug: true,
                            },
                        },
                    },
                },
                teamMemberships: {
                    select: {
                        id: true,
                        role: true,
                        createdAt: true,
                        team: {
                            select: {
                                id: true,
                                name: true,
                                clubId: true,
                                club: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                        slug: true,
                                    },
                                },
                                registrations: {
                                    select: {
                                        category: {
                                            select: {
                                                id: true,
                                                name: true,
                                                competition: {
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        slug: true,
                                                        type: true,
                                                        season: {
                                                            select: {
                                                                id: true,
                                                                name: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                licenses: {
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        validFrom: true,
                        validUntil: true,
                        scope: true,
                        isSecondaryClubLicense: true,
                        createdAt: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                slug: true,
                            },
                        },
                        association: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                slug: true,
                            },
                        },
                        season: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                courseAttendances: {
                    select: {
                        id: true,
                        attested: true,
                        attestedAt: true,
                        course: {
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                location: true,
                                date: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Determine if viewer has management rights for this person
        const viewer = req.user;
        const isSelf = viewer ? viewer.id === user.id : false;
        const isSuperAdmin = viewer?.isSuperAdmin || false;

        let isClubManager = false;
        let isAssociationManager = false;
        let isGuardianManager = false;

        if (viewer && !isSelf && !isSuperAdmin) {
            // Check if viewer is official in any club connected to user
            const userClubIds = new Set<string>();
            user.clubRoles.forEach((cr: any) => cr.club?.id && userClubIds.add(cr.club.id));
            user.licenses.forEach((lic: any) => lic.club?.id && userClubIds.add(lic.club.id));
            user.teamMemberships.forEach((tm: any) => tm.team?.clubId && userClubIds.add(tm.team.clubId));

            const viewerClubRoles = viewer.clubRoles || [];
            isClubManager = viewerClubRoles.some((vcr: any) =>
                userClubIds.has(vcr.clubId) &&
                ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COACH', 'TECHNICAL_DIRECTOR', 'JUNIOR_COACH', 'OFFICIAL'].includes(vcr.role)
            );

            // Check if viewer is official in any association connected to user
            const userAssocIds = new Set<string>();
            user.associationRoles.forEach((ar: any) => ar.association?.id && userAssocIds.add(ar.association.id));
            user.licenses.forEach((lic: any) => lic.association?.id && userAssocIds.add(lic.association.id));

            const viewerAssocRoles = viewer.associationRoles || [];
            isAssociationManager = viewerAssocRoles.some((varr: any) =>
                userAssocIds.has(varr.associationId) &&
                ['ADMIN', 'PRESIDENT', 'SECRETARY', 'OFFICIAL', 'HEAD_REFEREE', 'DIRECTOR'].includes(varr.role)
            );

            // Check if viewer has a management relationship with this user
            const relationship = await (prisma as any).userRelationship.findFirst({
                where: {
                    managerUserId: viewer.id,
                    managedUserId: user.id,
                    permission: { in: ['FULL_MANAGEMENT', 'TOURNAMENT_ONLY'] },
                },
            });
            if (relationship) {
                isGuardianManager = true;
            }
        }

        const canManage = isSelf || isSuperAdmin || isClubManager || isAssociationManager || isGuardianManager;

        // Privacy sanitization
        const sanitized = PrivacyService.sanitizePlayerProfile(user, {
            viewerUserId: viewer?.id,
            isSuperAdmin,
            canManage,
        });

        // Filter licenses & roles if not manager/self:
        // Non-managers only see approved/active licenses and active affiliations
        if (!canManage) {
            sanitized.licenses = sanitized.licenses?.filter((l: any) => l.status === 'APPROVED') || [];
        }

        res.json({
            ...sanitized,
            canManage,
            isSelf,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /auth/users/:identifier/stats
 * Statistics, match history, and Elo timeline for a person.
 */
router.get('/users/:identifier/stats', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { identifier } = req.params;
        if (!identifier) {
            return res.status(400).json({ error: 'User identifier is required' });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { licenseId: identifier },
                ],
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                licenseId: true,
                eloPoints: true,
                currentLevel: true,
                rank: true,
                hideEloRanking: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Fetch completed matches where user participated
        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    { homePlayer1Id: user.id },
                    { homePlayer2Id: user.id },
                    { awayPlayer1Id: user.id },
                    { awayPlayer2Id: user.id },
                    { participants: { some: { userId: user.id } } },
                ],
                status: 'FINISHED',
            },
            include: {
                encounter: {
                    include: {
                        category: {
                            include: {
                                competition: {
                                    include: {
                                        season: true,
                                    },
                                },
                            },
                        },
                        homeTeam: {
                            include: {
                                club: {
                                    select: { id: true, name: true, code: true },
                                },
                            },
                        },
                        awayTeam: {
                            include: {
                                club: {
                                    select: { id: true, name: true, code: true },
                                },
                            },
                        },
                    },
                },
                homePlayer1: {
                    select: { id: true, firstName: true, lastName: true, licenseId: true, eloPoints: true, avatarUrl: true },
                },
                homePlayer2: {
                    select: { id: true, firstName: true, lastName: true, licenseId: true, eloPoints: true, avatarUrl: true },
                },
                awayPlayer1: {
                    select: { id: true, firstName: true, lastName: true, licenseId: true, eloPoints: true, avatarUrl: true },
                },
                awayPlayer2: {
                    select: { id: true, firstName: true, lastName: true, licenseId: true, eloPoints: true, avatarUrl: true },
                },
                participants: {
                    include: {
                        ratingSnapshot: true,
                    },
                },
            },
            orderBy: {
                encounter: {
                    scheduledAt: 'desc',
                },
            },
            take: 100,
        });

        // Fetch Elo snapshots history
        const eloHistory = await prisma.ratingSnapshotHistory.findMany({
            where: { userId: user.id },
            orderBy: { effectiveFrom: 'desc' },
            include: {
                association: {
                    select: { id: true, name: true, shortName: true, code: true },
                },
            },
            take: 50,
        });

        // Aggregate statistics
        let wins = 0;
        let losses = 0;
        let setsWon = 0;
        let setsLost = 0;
        let singlesWins = 0;
        let singlesLosses = 0;
        let doublesWins = 0;
        let doublesLosses = 0;

        const formattedMatches = matches.map((m) => {
            const isHome = m.homePlayer1Id === user.id || m.homePlayer2Id === user.id;
            const isWinner = (isHome && m.winner === 'HOME') || (!isHome && m.winner === 'AWAY');
            const isDraw = m.winner === 'DRAW';

            if (isWinner) {
                wins++;
                if (m.matchType === 'SINGLE') singlesWins++;
                else doublesWins++;
            } else if (!isDraw && m.winner !== 'PENDING') {
                losses++;
                if (m.matchType === 'SINGLE') singlesLosses++;
                else doublesLosses++;
            }

            const mySets = isHome ? m.homeWonSets : m.awayWonSets;
            const oppSets = isHome ? m.awayWonSets : m.homeWonSets;
            setsWon += mySets;
            setsLost += oppSets;

            const opponents = isHome
                ? [m.awayPlayer1, m.awayPlayer2].filter(Boolean)
                : [m.homePlayer1, m.homePlayer2].filter(Boolean);

            const partners = isHome
                ? [m.homePlayer1, m.homePlayer2].filter((p) => p && p.id !== user.id)
                : [m.awayPlayer1, m.awayPlayer2].filter((p) => p && p.id !== user.id);

            const myTeam = isHome ? m.encounter?.homeTeam : m.encounter?.awayTeam;
            const oppTeam = isHome ? m.encounter?.awayTeam : m.encounter?.homeTeam;

            return {
                id: m.id,
                matchType: m.matchType,
                date: m.encounter?.scheduledAt || m.createdAt,
                competitionName: m.encounter?.category?.competition?.name || 'League / Tournament',
                competitionType: m.encounter?.category?.competition?.type || 'LEAGUE',
                categoryName: m.encounter?.category?.name || 'Category',
                seasonName: m.encounter?.category?.competition?.season?.name || '',
                isHome,
                result: isWinner ? 'WIN' : isDraw ? 'DRAW' : 'LOSS',
                scoreSets: `${mySets}:${oppSets}`,
                setsDetail: m.sets,
                opponents,
                partners,
                myTeam: myTeam ? { id: myTeam.id, name: myTeam.name, club: (myTeam as any).club } : null,
                oppTeam: oppTeam ? { id: oppTeam.id, name: oppTeam.name, club: (oppTeam as any).club } : null,
            };
        });

        // Compute Head-to-Head opponent summary
        const h2hMap = new Map<string, any>();
        formattedMatches.forEach((m) => {
            m.opponents.forEach((opp: any) => {
                if (!opp || !opp.id || opp.id === user.id) return;
                const existing = h2hMap.get(opp.id) || {
                    opponent: {
                        id: opp.id,
                        firstName: opp.firstName,
                        lastName: opp.lastName,
                        licenseId: opp.licenseId,
                        eloPoints: opp.eloPoints,
                        avatarUrl: opp.avatarUrl,
                    },
                    totalMatches: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    setsWon: 0,
                    setsLost: 0,
                    lastMatchDate: m.date,
                    lastMatchResult: m.result,
                    matches: [],
                };

                existing.totalMatches += 1;
                if (m.result === 'WIN') existing.wins += 1;
                else if (m.result === 'LOSS') existing.losses += 1;
                else existing.draws += 1;

                const [myS, oppS] = m.scoreSets.split(':').map((s: string) => parseInt(s, 10) || 0);
                existing.setsWon += myS;
                existing.setsLost += oppS;

                existing.matches.push({
                    id: m.id,
                    date: m.date,
                    competitionName: m.competitionName,
                    competitionType: m.competitionType,
                    categoryName: m.categoryName,
                    matchType: m.matchType,
                    result: m.result,
                    scoreSets: m.scoreSets,
                    setsDetail: m.setsDetail,
                });

                h2hMap.set(opp.id, existing);
            });
        });

        const headToHead = Array.from(h2hMap.values())
            .map((h: any) => ({
                ...h,
                matchesCount: h.totalMatches,
                winRate: h.totalMatches > 0 ? Math.round((h.wins / h.totalMatches) * 100) : 0,
            }))
            .sort((a, b) => b.totalMatches - a.totalMatches || b.wins - a.wins);

        const totalMatches = wins + losses;
        const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
        const totalSets = setsWon + setsLost;
        const setWinRate = totalSets > 0 ? Math.round((setsWon / totalSets) * 100) : 0;
        const eloValues = eloHistory.map((h: any) => h.elo).concat(user.eloPoints);
        const highestElo = eloValues.length > 0 ? Math.round(Math.max(...eloValues)) : user.eloPoints;
        const lowestElo = eloValues.length > 0 ? Math.round(Math.min(...eloValues)) : user.eloPoints;
        const recentForm = formattedMatches.slice(0, 5).map((m: any) => m.result);

        res.json({
            stats: {
                totalMatches,
                wins,
                losses,
                winRate,
                setsWon,
                setsLost,
                setWinRate,
                singles: {
                    played: singlesWins + singlesLosses,
                    wins: singlesWins,
                    losses: singlesLosses,
                },
                doubles: {
                    played: doublesWins + doublesLosses,
                    wins: doublesWins,
                    losses: doublesLosses,
                },
                currentElo: user.eloPoints,
                currentLevel: user.currentLevel,
                highestElo,
                lowestElo,
                rank: user.rank,
                recentForm,
            },
            matches: formattedMatches,
            headToHead,
            eloHistory,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /auth/users/:identifier/h2h/:opponentIdentifier
 * Direct Head-to-Head breakdown and analysis between two players.
 */
router.get('/users/:identifier/h2h/:opponentIdentifier', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { identifier, opponentIdentifier } = req.params;
        if (!identifier || !opponentIdentifier) {
            return res.status(400).json({ error: 'Both player identifiers are required' });
        }

        const [player, opponent] = await Promise.all([
            prisma.user.findFirst({
                where: { OR: [{ id: identifier }, { licenseId: identifier }] },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    licenseId: true,
                    eloPoints: true,
                    currentLevel: true,
                    rank: true,
                    avatarUrl: true,
                    clubRoles: {
                        select: { club: { select: { id: true, name: true, code: true, slug: true } } },
                    },
                },
            }),
            prisma.user.findFirst({
                where: { OR: [{ id: opponentIdentifier }, { licenseId: opponentIdentifier }] },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    licenseId: true,
                    eloPoints: true,
                    currentLevel: true,
                    rank: true,
                    avatarUrl: true,
                    clubRoles: {
                        select: { club: { select: { id: true, name: true, code: true, slug: true } } },
                    },
                },
            }),
        ]);

        if (!player || !opponent) {
            return res.status(404).json({ error: 'One or both players could not be found' });
        }

        // Fetch matches between player and opponent
        const matches = await prisma.match.findMany({
            where: {
                status: 'FINISHED',
                AND: [
                    {
                        OR: [
                            { homePlayer1Id: player.id },
                            { homePlayer2Id: player.id },
                            { awayPlayer1Id: player.id },
                            { awayPlayer2Id: player.id },
                        ],
                    },
                    {
                        OR: [
                            { homePlayer1Id: opponent.id },
                            { homePlayer2Id: opponent.id },
                            { awayPlayer1Id: opponent.id },
                            { awayPlayer2Id: opponent.id },
                        ],
                    },
                ],
            },
            include: {
                encounter: {
                    include: {
                        category: {
                            include: {
                                competition: {
                                    include: { season: true },
                                },
                            },
                        },
                    },
                },
                homePlayer1: { select: { id: true, firstName: true, lastName: true } },
                homePlayer2: { select: { id: true, firstName: true, lastName: true } },
                awayPlayer1: { select: { id: true, firstName: true, lastName: true } },
                awayPlayer2: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { encounter: { scheduledAt: 'desc' } },
        });

        let wins = 0;
        let losses = 0;
        let draws = 0;
        let setsWon = 0;
        let setsLost = 0;

        const formattedMatches = matches.map((m) => {
            const isHome = m.homePlayer1Id === player.id || m.homePlayer2Id === player.id;
            const isWinner = (isHome && m.winner === 'HOME') || (!isHome && m.winner === 'AWAY');
            const isDraw = m.winner === 'DRAW';

            if (isWinner) wins++;
            else if (!isDraw && m.winner !== 'PENDING') losses++;
            else draws++;

            const mySets = isHome ? m.homeWonSets : m.awayWonSets;
            const oppSets = isHome ? m.awayWonSets : m.homeWonSets;
            setsWon += mySets;
            setsLost += oppSets;

            return {
                id: m.id,
                date: m.encounter?.scheduledAt || m.createdAt,
                competitionName: m.encounter?.category?.competition?.name || 'Competition',
                competitionType: m.encounter?.category?.competition?.type || 'LEAGUE',
                categoryName: m.encounter?.category?.name || 'Category',
                matchType: m.matchType,
                result: isWinner ? 'WIN' : isDraw ? 'DRAW' : 'LOSS',
                scoreSets: `${mySets}:${oppSets}`,
                setsDetail: m.sets,
            };
        });

        const totalMatches = wins + losses + draws;
        const winRate = totalMatches > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0;
        const eloDiff = player.eloPoints - opponent.eloPoints;
        const expectedWinProbability = Math.round(
            (1 / (1 + Math.pow(10, (opponent.eloPoints - player.eloPoints) / 400))) * 100
        );

        res.json({
            player,
            opponent,
            eloDifference: eloDiff,
            expectedWinProbability,
            record: {
                totalMatches,
                wins,
                losses,
                draws,
                setsWon,
                setsLost,
                winRate,
            },
            matches: formattedMatches,
        });
    } catch (err) {
        next(err);
    }
});

// POST /auth/claim-profile (3-Factor Self-Service Claim: License + Birthdate + Last Name)
router.post('/claim-profile', validate(claimProfileByLicenseSchema), async (req, res, next) => {
    try {
        const { licenseId, birthDate, lastName, email, password, phone, street, postalCode, city, country } = req.body;

        const trimmedLicense = licenseId.trim();
        const trimmedLastName = lastName.trim().toLowerCase();

        // Find candidate user by license number
        const candidate = await prisma.user.findFirst({
            where: {
                licenseId: { equals: trimmedLicense, mode: 'insensitive' },
            },
        });

        if (!candidate) {
            return res.status(404).json({
                error: 'No profile found with this license number. Please check the license number or contact your club administrator.',
            });
        }

        // Anti-hijacking: check if account is already claimed with an active login
        if (candidate.canLogin && candidate.email && candidate.accountStatus === 'ACTIVE') {
            return res.status(400).json({
                error: 'This profile has already been claimed and activated. Please log in using your email address, or use "Forgot Password" if you lost access.',
            });
        }

        // Verification Factor 1: Last Name Match
        if (candidate.lastName.trim().toLowerCase() !== trimmedLastName) {
            return res.status(400).json({
                error: 'Verification failed: The provided last name does not match the records for this license number.',
            });
        }

        // Verification Factor 2: Birth Date Match (if recorded in legacy profile)
        if (candidate.birthDate) {
            const d1 = new Date(candidate.birthDate);
            const d2 = new Date(birthDate);

            const sameUtcDate =
                d1.getUTCFullYear() === d2.getUTCFullYear() &&
                d1.getUTCMonth() === d2.getUTCMonth() &&
                d1.getUTCDate() === d2.getUTCDate();

            const sameLocalDate =
                d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate();

            if (!sameUtcDate && !sameLocalDate) {
                return res.status(400).json({
                    error: 'Verification failed: The provided date of birth does not match the records for this license number.',
                });
            }
        }

        // Check if destination email is taken by another account
        const normalizedEmail = email.trim().toLowerCase();
        const emailConflict = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                id: { not: candidate.id },
            },
        });

        if (emailConflict) {
            return res.status(400).json({
                error: 'This email address is already registered to another user account. Please use a different email or log into that account.',
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const requiresVerification = isEmailVerificationRequired();
        const verificationToken = requiresVerification ? crypto.randomBytes(32).toString('hex') : null;
        const verificationExpires = requiresVerification ? new Date(Date.now() + 24 * 3600 * 1000) : null;

        const updatedUser = await prisma.user.update({
            where: { id: candidate.id },
            data: {
                email: normalizedEmail,
                passwordHash,
                canLogin: !requiresVerification,
                accountStatus: requiresVerification ? 'INVITED' : 'ACTIVE',
                emailVerified: !requiresVerification,
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
                claimToken: null,
                claimTokenExpires: null,
                phone: phone ? formatPhoneNumber(phone) : candidate.phone || '',
                street: street || candidate.street || '',
                postalCode: postalCode || candidate.postalCode || '',
                city: city || candidate.city || '',
                country: country || candidate.country || 'Switzerland',
            },
        });

        // Send email verification if required
        if (verificationToken) {
            const clientOrigin = (req.headers.origin || req.headers.referer) as string | undefined;
            await EmailService.sendVerificationEmail(updatedUser.email!, updatedUser.firstName, verificationToken, clientOrigin);
        }

        await AuditService.record({
            req,
            userId: updatedUser.id,
            userEmail: updatedUser.email ?? undefined,
            userName: `${updatedUser.firstName} ${updatedUser.lastName}`,
            action: 'AUTH_CLAIM_PROFILE',
            category: AuditCategory.AUTH,
            entityType: 'User',
            entityId: updatedUser.id,
            description: `Legacy profile claimed for ${updatedUser.firstName} ${updatedUser.lastName} (License: ${updatedUser.licenseId}) with email ${updatedUser.email}`,
            status: 'SUCCESS',
            metadata: {
                licenseId: updatedUser.licenseId,
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified,
            },
        });

        let token: string | undefined;
        if (!requiresVerification) {
            token = jwt.sign(
                { userId: updatedUser.id, tokenVersion: (updatedUser as any).tokenVersion ?? 0 },
                config.jwtSecret,
                { expiresIn: '7d' }
            );
        }

        res.json({
            success: true,
            requiresVerification,
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                licenseId: updatedUser.licenseId,
                eloPoints: updatedUser.eloPoints,
            },
            message: requiresVerification
                ? 'Profile claimed successfully! Please check your email inbox to verify your address and complete activation.'
                : 'Profile claimed successfully! You are now logged in.',
        });
    } catch (err) {
        next(err);
    }
});

// POST /auth/claim-token (Token / QR Code Claim)
router.post('/claim-token', validate(claimProfileByTokenSchema), async (req, res, next) => {
    try {
        const { claimToken, email, password, phone, street, postalCode, city, country } = req.body;

        const candidate = await (prisma.user.findFirst as any)({
            where: {
                claimToken,
                claimTokenExpires: { gt: new Date() },
            },
        });

        if (!candidate) {
            return res.status(400).json({
                error: 'The claim invite token is invalid, already used, or has expired.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingEmail = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                id: { not: candidate.id },
            },
        });

        if (existingEmail) {
            return res.status(400).json({
                error: 'This email address is already in use by another account.',
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const requiresVerification = isEmailVerificationRequired();
        const verificationToken = requiresVerification ? crypto.randomBytes(32).toString('hex') : null;
        const verificationExpires = requiresVerification ? new Date(Date.now() + 24 * 3600 * 1000) : null;

        const updatedUser = await (prisma.user.update as any)({
            where: { id: candidate.id },
            data: {
                email: normalizedEmail,
                passwordHash,
                canLogin: !requiresVerification,
                accountStatus: requiresVerification ? 'INVITED' : 'ACTIVE',
                claimToken: null,
                claimTokenExpires: null,
                emailVerified: !requiresVerification,
                emailVerificationToken: verificationToken,
                emailVerificationExpires: verificationExpires,
                phone: phone ? formatPhoneNumber(phone) : candidate.phone || '',
                street: street || candidate.street || '',
                postalCode: postalCode || candidate.postalCode || '',
                city: city || candidate.city || '',
                country: country || candidate.country || 'Switzerland',
            },
        });

        if (verificationToken) {
            const clientOrigin = (req.headers.origin || req.headers.referer) as string | undefined;
            await EmailService.sendVerificationEmail(updatedUser.email!, updatedUser.firstName, verificationToken, clientOrigin);
        }

        await AuditService.record({
            req,
            userId: updatedUser.id,
            userEmail: updatedUser.email ?? undefined,
            userName: `${updatedUser.firstName} ${updatedUser.lastName}`,
            action: 'AUTH_CLAIM_TOKEN',
            category: AuditCategory.AUTH,
            entityType: 'User',
            entityId: updatedUser.id,
            description: `Profile claimed via invite token for ${updatedUser.firstName} ${updatedUser.lastName} with email ${updatedUser.email}`,
            status: 'SUCCESS',
            metadata: {
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified,
            },
        });

        let token: string | undefined;
        if (!requiresVerification) {
            token = jwt.sign(
                { userId: updatedUser.id, tokenVersion: (updatedUser as any).tokenVersion ?? 0 },
                config.jwtSecret,
                { expiresIn: '7d' }
            );
        }

        res.json({
            success: true,
            requiresVerification,
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                licenseId: updatedUser.licenseId,
                eloPoints: updatedUser.eloPoints,
            },
            message: requiresVerification
                ? 'Profile claimed successfully! Please check your email to activate your account.'
                : 'Profile claimed successfully! You are now logged in.',
        });
    } catch (err) {
        next(err);
    }
});

export default router;

