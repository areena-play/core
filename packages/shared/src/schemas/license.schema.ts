import { z } from 'zod';
import { LicenseType } from '../types';

export const applyLicenseSchema = z.object({
    userId: z.string().uuid().optional(), // if club admin applying for user
    type: z.nativeEnum(LicenseType),
    clubId: z.string().uuid().optional().nullable(),
    associationId: z.string().uuid(),
    seasonId: z.string().uuid().optional().nullable(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    notes: z.string().optional(),
});

export const approveLicenseSchema = z.object({
    approved: z.boolean(),
    rejectionReason: z.string().optional(),
});

