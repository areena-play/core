import { z } from 'zod';
import { Gender } from '../types';
import { normalizePhoneNumber, isValidPhoneNumber } from '../phone';

export const phoneSchema = z.string().transform((val, ctx) => {
    const trimmed = val.trim();
    if (!trimmed) return trimmed;
    if (!isValidPhoneNumber(trimmed)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please enter a valid phone number (e.g. +41 79 123 45 67 or 079 123 45 67)',
        });
        return z.NEVER;
    }
    return normalizePhoneNumber(trimmed);
});

export const optionalPhoneSchema = z.string().optional().transform((val, ctx) => {
    if (!val) return val;
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    if (!isValidPhoneNumber(trimmed)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please enter a valid phone number (e.g. +41 79 123 45 67 or 079 123 45 67)',
        });
        return z.NEVER;
    }
    return normalizePhoneNumber(trimmed);
});

export const strongPasswordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
    email: z.string().email(),
    password: strongPasswordSchema,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: phoneSchema,
    street: z.string().min(2),
    postalCode: z.string().min(2),
    city: z.string().min(1),
    country: z.string().default('Switzerland'),
    birthDate: z.string().optional().nullable(),
    gender: z.nativeEnum(Gender).optional().nullable(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPasswordSchema,
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const updateProfileSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: optionalPhoneSchema,
    street: z.string().min(2).optional(),
    postalCode: z.string().min(2).optional(),
    city: z.string().min(1).optional(),
    country: z.string().optional(),
    birthDate: z.string().optional().nullable(),
    gender: z.nativeEnum(Gender).optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
    isPubliclyHidden: z.boolean().optional(),
    displayNameChoice: z.enum(['FULL_NAME', 'INITIALS', 'ANONYMOUS']).optional(),
    hideEloRanking: z.boolean().optional(),
    hideContactInfo: z.boolean().optional(),
});

export const createOAuthClientSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    requestReason: z.string().min(5, 'Please provide a clear justification of at least 5 characters for API access'),
    requestedScopes: z.array(z.string()).min(1, 'Please select at least one scope'),
});

export const adminUpdateUserSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: optionalPhoneSchema,
    street: z.string().min(2).optional(),
    postalCode: z.string().min(2).optional(),
    city: z.string().min(1).optional(),
    country: z.string().optional(),
    birthDate: z.string().optional().nullable(),
    gender: z.nativeEnum(Gender).optional().nullable(),
    isSuperAdmin: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    eloPoints: z.number().int().min(0).optional(),
    licenseId: z.string().optional().nullable(),
});

export const adminResetPasswordSchema = z.object({
    newPassword: strongPasswordSchema.optional(),
    autoGenerate: z.boolean().optional(),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(10),
});

export const resendVerificationSchema = z.object({
    email: z.string().email(),
});

export const requestEmailChangeSchema = z.object({
    newEmail: z.string().email(),
});

export const confirmEmailChangeSchema = z.object({
    token: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(10),
    password: strongPasswordSchema,
});

