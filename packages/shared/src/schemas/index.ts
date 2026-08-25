import { z } from 'zod';
import {
    AssociationLevel,
    Gender,
    LicenseType,
    CourseType,
    CompetitionType,
    GenderRestriction,
    MatchType,
    EventType,
    MessageChannel,
} from '../types';

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

export const updateLicenseIdTemplateSchema = z.object({
    licenseIdTemplate: z.string().min(3), // e.g. "{regionDigit}{year2}{counter3}"
    counter: z.number().int().nonnegative().optional(),
});

export const createAssociationSchema = z.object({
    name: z.string().min(2),
    shortName: z.string().min(1),
    code: z.string().min(1),
    level: z.nativeEnum(AssociationLevel),
    isTopLevel: z.boolean().default(false),
    parentAssociationIds: z.array(z.string().uuid()).optional().default([]),
    rules: z.record(z.any()).optional().default({}),
    licenseIdTemplate: z.string().optional(),
    regionDigit: z.number().int().min(1).max(9).optional(),
});

export const createClubSchema = z.object({
    name: z.string().min(2),
    code: z.string().min(1),
    address: z.string().min(2),
    city: z.string().min(1),
    postalCode: z.string().min(2),
    country: z.string().default('Switzerland'),
    email: z.string().email(),
    phone: z.string().min(5),
    website: z.string().url().optional().nullable(),
    associationIds: z.array(z.string().uuid()).min(1),
});

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

export const createBroadcastSchema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    channel: z.nativeEnum(MessageChannel).default(MessageChannel.EMAIL),
    associationId: z.string().uuid().optional().nullable(),
    clubId: z.string().uuid().optional().nullable(),
    targetRole: z.string().optional().nullable(), // e.g. "ALL", "CLUB_ADMINS", "PLAYERS", "COACHES", "REFEREES"
});

export const createOAuthClientSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    requestedScopes: z.array(z.string()).min(1),
});
