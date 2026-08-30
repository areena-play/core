import { z } from 'zod';
import { CompetitionType, GenderRestriction, LicenseType } from '../types';

export const createCompetitionSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    type: z.nativeEnum(CompetitionType),
    associationId: z.string().uuid(),
    seasonId: z.string().uuid().optional().nullable(),
    startDate: z.string(),
    endDate: z.string(),
    location: z.string().optional().nullable(),
});

export const createCategorySchema = z.object({
    competitionId: z.string().uuid(),
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

