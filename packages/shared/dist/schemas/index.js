"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogQuerySchema = exports.bexioConfigSchema = exports.updateInvoiceSchema = exports.createInvoiceSchema = exports.invoiceLineItemSchema = exports.createOAuthClientSchema = exports.createBroadcastSchema = exports.updateMatchScoreSchema = exports.createCategorySchema = exports.createCompetitionSchema = exports.createClubSchema = exports.createAssociationSchema = exports.updateAssociationSettingsSchema = exports.updateLicenseIdTemplateSchema = exports.approveLicenseSchema = exports.applyLicenseSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(5),
    street: zod_1.z.string().min(2),
    postalCode: zod_1.z.string().min(2),
    city: zod_1.z.string().min(1),
    country: zod_1.z.string().default('Switzerland'),
    birthDate: zod_1.z.string().optional().nullable(),
    gender: zod_1.z.nativeEnum(types_1.Gender).optional().nullable(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().min(5).optional(),
    street: zod_1.z.string().min(2).optional(),
    postalCode: zod_1.z.string().min(2).optional(),
    city: zod_1.z.string().min(1).optional(),
    country: zod_1.z.string().optional(),
    birthDate: zod_1.z.string().optional().nullable(),
    gender: zod_1.z.nativeEnum(types_1.Gender).optional().nullable(),
    avatarUrl: zod_1.z.string().url().optional().nullable(),
});
exports.applyLicenseSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional(), // if club admin applying for user
    type: zod_1.z.nativeEnum(types_1.LicenseType),
    clubId: zod_1.z.string().uuid().optional().nullable(),
    associationId: zod_1.z.string().uuid(),
    seasonId: zod_1.z.string().uuid().optional().nullable(),
    validFrom: zod_1.z.string().optional(),
    validUntil: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.approveLicenseSchema = zod_1.z.object({
    approved: zod_1.z.boolean(),
    rejectionReason: zod_1.z.string().optional(),
});
exports.updateLicenseIdTemplateSchema = zod_1.z.object({
    licenseIdTemplate: zod_1.z.string().min(3), // e.g. "{regionDigit}{year2}{counter3}"
    counter: zod_1.z.number().int().nonnegative().optional(),
});
exports.updateAssociationSettingsSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    shortName: zod_1.z.string().min(1).optional(),
    logoUrl: zod_1.z.string().optional().nullable(),
    licenseIdTemplate: zod_1.z.string().min(3).optional(),
    counter: zod_1.z.number().int().nonnegative().optional(),
    regionDigit: zod_1.z.number().int().min(1).max(9).optional(),
});
exports.createAssociationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    shortName: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    level: zod_1.z.nativeEnum(types_1.AssociationLevel),
    isTopLevel: zod_1.z.boolean().default(false),
    parentAssociationIds: zod_1.z.array(zod_1.z.string().uuid()).optional().default([]),
    rules: zod_1.z.record(zod_1.z.any()).optional().default({}),
    licenseIdTemplate: zod_1.z.string().optional(),
    regionDigit: zod_1.z.number().int().min(1).max(9).optional(),
});
exports.createClubSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    code: zod_1.z.string().min(1),
    address: zod_1.z.string().min(2),
    city: zod_1.z.string().min(1),
    postalCode: zod_1.z.string().min(2),
    country: zod_1.z.string().default('Switzerland'),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(5),
    website: zod_1.z.string().url().optional().nullable(),
    associationIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
exports.createCompetitionSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(types_1.CompetitionType),
    associationId: zod_1.z.string().uuid(),
    seasonId: zod_1.z.string().uuid().optional().nullable(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    location: zod_1.z.string().optional().nullable(),
});
exports.createCategorySchema = zod_1.z.object({
    competitionId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2),
    teamSize: zod_1.z.number().int().positive().default(1),
    minElo: zod_1.z.number().int().optional().nullable(),
    maxElo: zod_1.z.number().int().optional().nullable(),
    minAge: zod_1.z.number().int().optional().nullable(),
    maxAge: zod_1.z.number().int().optional().nullable(),
    genderRestriction: zod_1.z.nativeEnum(types_1.GenderRestriction).default(types_1.GenderRestriction.ANY),
    requiredLicenseType: zod_1.z.nativeEnum(types_1.LicenseType).optional().nullable(),
    encounterFormat: zod_1.z.array(zod_1.z.any()).optional(),
    roundsPerGroup: zod_1.z.number().int().positive().default(1),
});
exports.updateMatchScoreSchema = zod_1.z.object({
    sets: zod_1.z.array(zod_1.z.object({
        home: zod_1.z.number().int().nonnegative(),
        away: zod_1.z.number().int().nonnegative(),
    })),
    isFinished: zod_1.z.boolean().default(false),
});
exports.createBroadcastSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1),
    body: zod_1.z.string().min(1),
    channel: zod_1.z.nativeEnum(types_1.MessageChannel).default(types_1.MessageChannel.EMAIL),
    associationId: zod_1.z.string().uuid().optional().nullable(),
    clubId: zod_1.z.string().uuid().optional().nullable(),
    targetRole: zod_1.z.string().optional().nullable(), // e.g. "ALL", "CLUB_ADMINS", "PLAYERS", "COACHES", "REFEREES"
});
exports.createOAuthClientSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    requestedScopes: zod_1.z.array(zod_1.z.string()).min(1),
});
exports.invoiceLineItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    position: zod_1.z.number().int().positive().optional(),
    description: zod_1.z.string().min(1),
    quantity: zod_1.z.number().positive().default(1),
    unit: zod_1.z.string().default('pc'),
    unitPrice: zod_1.z.number(),
    taxRate: zod_1.z.number().nonnegative().default(0),
    bexioArticleId: zod_1.z.number().int().optional().nullable(),
});
exports.createInvoiceSchema = zod_1.z.object({
    associationId: zod_1.z.string().uuid().optional().nullable(),
    clubId: zod_1.z.string().uuid().optional().nullable(),
    targetType: zod_1.z.nativeEnum(types_1.InvoiceTargetType).default(types_1.InvoiceTargetType.MEMBER_CLUB),
    recipientClubId: zod_1.z.string().uuid().optional().nullable(),
    recipientUserId: zod_1.z.string().uuid().optional().nullable(),
    recipientName: zod_1.z.string().min(1),
    recipientEmail: zod_1.z.string().email().optional().nullable(),
    recipientAddress: zod_1.z.string().optional().nullable(),
    category: zod_1.z.nativeEnum(types_1.InvoiceCategory).default(types_1.InvoiceCategory.MEMBERSHIP_FEE),
    currency: zod_1.z.string().default('CHF'),
    taxRate: zod_1.z.number().nonnegative().default(0),
    issueDate: zod_1.z.string().optional(),
    dueDate: zod_1.z.string(),
    notes: zod_1.z.string().optional().nullable(),
    terms: zod_1.z.string().optional().nullable(),
    lineItems: zod_1.z.array(exports.invoiceLineItemSchema).min(1),
    syncToBexio: zod_1.z.boolean().optional().default(false),
});
exports.updateInvoiceSchema = zod_1.z.object({
    recipientName: zod_1.z.string().min(1).optional(),
    recipientEmail: zod_1.z.string().email().optional().nullable(),
    recipientAddress: zod_1.z.string().optional().nullable(),
    category: zod_1.z.nativeEnum(types_1.InvoiceCategory).optional(),
    dueDate: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional().nullable(),
    terms: zod_1.z.string().optional().nullable(),
    status: zod_1.z.nativeEnum(types_1.InvoiceStatus).optional(),
    lineItems: zod_1.z.array(exports.invoiceLineItemSchema).optional(),
});
exports.bexioConfigSchema = zod_1.z.object({
    associationId: zod_1.z.string().uuid().optional().nullable(),
    clubId: zod_1.z.string().uuid().optional().nullable(),
    apiToken: zod_1.z.string().optional().nullable(),
    bankAccountId: zod_1.z.number().int().optional().nullable(),
    taxId: zod_1.z.number().int().optional().nullable(),
    paymentTypeId: zod_1.z.number().int().optional().nullable(),
    iban: zod_1.z.string().optional().nullable(),
    qrIban: zod_1.z.string().optional().nullable(),
    companyName: zod_1.z.string().optional().nullable(),
    companyAddress: zod_1.z.string().optional().nullable(),
    autoSync: zod_1.z.boolean().default(true),
});
exports.auditLogQuerySchema = zod_1.z.object({
    associationId: zod_1.z.string().uuid().optional(),
    clubId: zod_1.z.string().uuid().optional(),
    tournamentId: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid().optional(),
    category: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(200).default(50),
});
//# sourceMappingURL=index.js.map