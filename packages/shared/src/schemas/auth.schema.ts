import { z } from 'zod';
import { Gender } from '../types';

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
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
    newPassword: z.string().min(8).optional(),
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
    password: z.string().min(8),
});
