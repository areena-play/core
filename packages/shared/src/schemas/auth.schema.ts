import { z } from 'zod';
import { Gender } from '../types';

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
    phone: z.string().min(5),
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
    phone: z.string().min(5).optional(),
    street: z.string().min(2).optional(),
    postalCode: z.string().min(2).optional(),
    city: z.string().min(1).optional(),
    country: z.string().optional(),
    birthDate: z.string().optional().nullable(),
    gender: z.nativeEnum(Gender).optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
});

export const createOAuthClientSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    requestedScopes: z.array(z.string()).min(1),
});

export const adminUpdateUserSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
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

