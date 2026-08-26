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
    InvoiceStatus,
    InvoiceCategory,
    InvoiceTargetType,
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

export const updateAssociationSettingsSchema = z.object({
    name: z.string().min(2).optional(),
    shortName: z.string().min(1).optional(),
    logoUrl: z.string().optional().nullable(),
    licenseIdTemplate: z.string().min(3).optional(),
    counter: z.number().int().nonnegative().optional(),
    regionDigit: z.number().int().min(1).max(9).optional(),
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

export const invoiceLineItemSchema = z.object({
    id: z.string().uuid().optional(),
    position: z.number().int().positive().optional(),
    description: z.string().min(1),
    quantity: z.number().positive().default(1),
    unit: z.string().default('pc'),
    unitPrice: z.number(),
    taxRate: z.number().nonnegative().default(0),
    bexioArticleId: z.number().int().optional().nullable(),
});

export const createInvoiceSchema = z.object({
    associationId: z.string().uuid().optional().nullable(),
    clubId: z.string().uuid().optional().nullable(),
    targetType: z.nativeEnum(InvoiceTargetType).default(InvoiceTargetType.MEMBER_CLUB),
    recipientClubId: z.string().uuid().optional().nullable(),
    recipientUserId: z.string().uuid().optional().nullable(),
    recipientName: z.string().min(1),
    recipientEmail: z.string().email().optional().nullable(),
    recipientAddress: z.string().optional().nullable(),
    category: z.nativeEnum(InvoiceCategory).default(InvoiceCategory.MEMBERSHIP_FEE),
    currency: z.string().default('CHF'),
    taxRate: z.number().nonnegative().default(0),
    issueDate: z.string().optional(),
    dueDate: z.string(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    lineItems: z.array(invoiceLineItemSchema).min(1),
    syncToBexio: z.boolean().optional().default(false),
});

export const updateInvoiceSchema = z.object({
    recipientName: z.string().min(1).optional(),
    recipientEmail: z.string().email().optional().nullable(),
    recipientAddress: z.string().optional().nullable(),
    category: z.nativeEnum(InvoiceCategory).optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    status: z.nativeEnum(InvoiceStatus).optional(),
    lineItems: z.array(invoiceLineItemSchema).optional(),
});

export const bexioConfigSchema = z.object({
    associationId: z.string().uuid().optional().nullable(),
    clubId: z.string().uuid().optional().nullable(),
    apiToken: z.string().optional().nullable(),
    bankAccountId: z.number().int().optional().nullable(),
    taxId: z.number().int().optional().nullable(),
    paymentTypeId: z.number().int().optional().nullable(),
    iban: z.string().optional().nullable(),
    qrIban: z.string().optional().nullable(),
    companyName: z.string().optional().nullable(),
    companyAddress: z.string().optional().nullable(),
    autoSync: z.boolean().default(true),
});

export const auditLogQuerySchema = z.object({
    associationId: z.string().uuid().optional(),
    clubId: z.string().uuid().optional(),
    tournamentId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    category: z.string().optional(),
    action: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
});


