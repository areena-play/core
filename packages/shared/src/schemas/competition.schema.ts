import { z } from 'zod';
import { CompetitionType, CompetitionRole, GenderRestriction, LicenseType } from '../types';

export const createCompetitionSchema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase alphanumeric characters and hyphens').optional(),
    seriesSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Series slug must contain only lowercase alphanumeric characters and hyphens').optional().nullable(),
    description: z.string().optional(),
    type: z.nativeEnum(CompetitionType),
    associationId: z.string().uuid(),
    seasonId: z.string().uuid().optional().nullable(),
    startDate: z.string(),
    endDate: z.string(),
    location: z.string().optional().nullable(),
    isOfficial: z.boolean().optional().default(true),
    countsForElo: z.boolean().optional().default(true),
    requiresApproval: z.boolean().optional().default(false),
    entryFee: z.number().nonnegative().optional().default(0),
});

export const updateCompetitionSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isOfficial: z.boolean().optional(),
    countsForElo: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    entryFee: z.number().nonnegative().optional(),
    status: z.string().optional(),
});

export const assignCompetitionRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.nativeEnum(CompetitionRole),
});

export const speakerCalloutSchema = z.object({
    title: z.string().min(1),
    message: z.string().min(1),
    type: z.string().optional().default('MATCH_CALL'),
    unitName: z.string().optional().nullable(),
});

export const updateRegistrationPaymentSchema = z.object({
    paymentStatus: z.enum(['UNPAID', 'PAID', 'EXEMPT', 'REFUNDED']),
    paidAmount: z.number().nonnegative().optional(),
    paymentMethod: z.string().optional().nullable(),
    isCheckedIn: z.boolean().optional(),
});

export const createCategorySchema = z.object({
    competitionId: z.string().uuid().optional(),
    name: z.string().min(2),
    nameI18n: z.record(z.string()).optional().nullable(),
    teamSize: z.number().int().positive().default(1),
    minElo: z.number().int().optional().nullable(),
    maxElo: z.number().int().optional().nullable(),
    minAge: z.number().int().optional().nullable(),
    maxAge: z.number().int().optional().nullable(),
    genderRestriction: z.nativeEnum(GenderRestriction).default(GenderRestriction.ANY),
    requiredLicenseType: z.nativeEnum(LicenseType).optional().nullable(),
    encounterFormat: z.array(z.any()).optional(),
    roundsPerGroup: z.number().int().positive().default(1),
});

export const updateMatchScoreSchema = z.object({
    sets: z.array(
        z.object({
            home: z.number().int().nonnegative(),
            away: z.number().int().nonnegative(),
        }),
    ),
    isFinished: z.boolean().default(false),
});
