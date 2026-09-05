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
    AuditCategory,
    parseSearchTokens,
    generateSearchVariants,
    formatPhoneNumber,
} from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';
import { PrivacyService } from '../services/privacy.service';

const router = Router();

// Helper to check if email verification is mandatory in current environment
export function isEmailVerificationRequired(): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const isDemo = config.isDemo;
    return isProd && !isDemo;
}

// POST /auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone, street, postalCode, city, country, birthDate, gender } =
            req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

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
            return res.status(404).json({ error: 'User not found' });
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

            const updated = await prisma.user.update({
                where: { id: req.user!.id },
                data: {
                    ...(firstName ? { firstName } : {}),
                    ...(lastName ? { lastName } : {}),
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
                            club: { select: { id: true, name: true } },
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
 * Public/authenticated view of a person profile by UUID or license ID.
 */
router.get('/users/:identifier', async (req, res, next) => {
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
                email: true,
                city: true,
                country: true,
                licenseId: true,
                eloPoints: true,
                rank: true,
                avatarUrl: true,
                birthDate: true,
                gender: true,
                createdAt: true,
                isPubliclyHidden: true,
                displayNameChoice: true,
                hideEloRanking: true,
                hideContactInfo: true,
                associationRoles: {
                    select: {
                        id: true,
                        role: true,
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
                licenses: {
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        validUntil: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                        association: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                        season: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
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

        const sanitized = PrivacyService.sanitizePlayerProfile(user);
        res.json(sanitized);
    } catch (err) {
        next(err);
    }
});

export default router;
