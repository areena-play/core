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

export const registerSchema = z
    .object({
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
        playingGender: z.enum(['MALE', 'FEMALE']).default('MALE'),
    })
    .refine(
        (data) => {
            if (data.gender === Gender.MALE && data.playingGender !== 'MALE') {
                return false;
            }
            if (data.gender === Gender.FEMALE && data.playingGender !== 'FEMALE') {
                return false;
            }
            return true;
        },
        {
            message: 'Playing gender must align with actual gender (Male must play as Male, Female must play as Female).',
            path: ['playingGender'],
        }
    );

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
    phoneticFirstName: z.string().max(60).optional().nullable(),
    phoneticLastName: z.string().max(60).optional().nullable(),
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
    phoneticFirstName: z.string().max(60).optional().nullable(),
    phoneticLastName: z.string().max(60).optional().nullable(),
    email: z.string().email().optional(),
    phone: optionalPhoneSchema,
    street: z.string().min(2).optional(),
    postalCode: z.string().min(2).optional(),
    city: z.string().min(1).optional(),
    country: z.string().optional(),
    birthDate: z.string().optional().nullable(),
    gender: z.nativeEnum(Gender).optional().nullable(),
    playingGender: z.enum(['MALE', 'FEMALE']).optional(),
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

export const claimProfileByLicenseSchema = z.object({
    licenseId: z.string().min(1, 'License number is required'),
    birthDate: z.string().min(1, 'Date of birth is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: strongPasswordSchema,
    phone: optionalPhoneSchema,
    street: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    country: z.string().default('Switzerland'),
});

export const claimProfileByTokenSchema = z.object({
    claimToken: z.string().min(6, 'Valid claim token is required'),
    email: z.string().email('Please enter a valid email address'),
    password: strongPasswordSchema,
    phone: optionalPhoneSchema,
    street: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    country: z.string().default('Switzerland'),
});

export type ClaimProfileByLicenseInput = z.infer<typeof claimProfileByLicenseSchema>;
export type ClaimProfileByTokenInput = z.infer<typeof claimProfileByTokenSchema>;

export const checkDuplicateUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    birthDate: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    licenseId: z.string().optional().nullable(),
    excludeUserId: z.string().optional(),
});

export const mergeDuplicateUsersSchema = z.object({
    primaryUserId: z.string().min(1, 'Primary user ID is required'),
    duplicateUserId: z.string().min(1, 'Duplicate user ID is required'),
    keepDuplicateEmailIfUnset: z.boolean().optional(),
});

export type CheckDuplicateUserInput = z.infer<typeof checkDuplicateUserSchema>;
export type MergeDuplicateUsersInput = z.infer<typeof mergeDuplicateUsersSchema>;

