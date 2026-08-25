import { z } from 'zod';
import { AssociationLevel, Gender, LicenseType, CompetitionType, GenderRestriction, MessageChannel } from '../types';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodString;
    street: z.ZodString;
    postalCode: z.ZodString;
    city: z.ZodString;
    country: z.ZodDefault<z.ZodString>;
    birthDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    gender: z.ZodNullable<z.ZodOptional<z.ZodNativeEnum<typeof Gender>>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    birthDate?: string | null | undefined;
    gender?: Gender | null | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    country?: string | undefined;
    birthDate?: string | null | undefined;
    gender?: Gender | null | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    street: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    birthDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    gender: z.ZodNullable<z.ZodOptional<z.ZodNativeEnum<typeof Gender>>>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    street?: string | undefined;
    postalCode?: string | undefined;
    city?: string | undefined;
    country?: string | undefined;
    birthDate?: string | null | undefined;
    gender?: Gender | null | undefined;
    avatarUrl?: string | null | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    street?: string | undefined;
    postalCode?: string | undefined;
    city?: string | undefined;
    country?: string | undefined;
    birthDate?: string | null | undefined;
    gender?: Gender | null | undefined;
    avatarUrl?: string | null | undefined;
}>;
export declare const applyLicenseSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    type: z.ZodNativeEnum<typeof LicenseType>;
    clubId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    associationId: z.ZodString;
    seasonId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    validFrom: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: LicenseType;
    associationId: string;
    userId?: string | undefined;
    clubId?: string | null | undefined;
    seasonId?: string | null | undefined;
    validFrom?: string | undefined;
    validUntil?: string | undefined;
    notes?: string | undefined;
}, {
    type: LicenseType;
    associationId: string;
    userId?: string | undefined;
    clubId?: string | null | undefined;
    seasonId?: string | null | undefined;
    validFrom?: string | undefined;
    validUntil?: string | undefined;
    notes?: string | undefined;
}>;
export declare const approveLicenseSchema: z.ZodObject<{
    approved: z.ZodBoolean;
    rejectionReason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    approved: boolean;
    rejectionReason?: string | undefined;
}, {
    approved: boolean;
    rejectionReason?: string | undefined;
}>;
export declare const updateLicenseIdTemplateSchema: z.ZodObject<{
    licenseIdTemplate: z.ZodString;
    counter: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    licenseIdTemplate: string;
    counter?: number | undefined;
}, {
    licenseIdTemplate: string;
    counter?: number | undefined;
}>;
export declare const createAssociationSchema: z.ZodObject<{
    name: z.ZodString;
    shortName: z.ZodString;
    code: z.ZodString;
    level: z.ZodNativeEnum<typeof AssociationLevel>;
    isTopLevel: z.ZodDefault<z.ZodBoolean>;
    parentAssociationIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    rules: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    licenseIdTemplate: z.ZodOptional<z.ZodString>;
    regionDigit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    shortName: string;
    level: AssociationLevel;
    isTopLevel: boolean;
    parentAssociationIds: string[];
    rules: Record<string, any>;
    licenseIdTemplate?: string | undefined;
    regionDigit?: number | undefined;
}, {
    code: string;
    name: string;
    shortName: string;
    level: AssociationLevel;
    licenseIdTemplate?: string | undefined;
    isTopLevel?: boolean | undefined;
    parentAssociationIds?: string[] | undefined;
    rules?: Record<string, any> | undefined;
    regionDigit?: number | undefined;
}>;
export declare const createClubSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    postalCode: z.ZodString;
    country: z.ZodDefault<z.ZodString>;
    email: z.ZodString;
    phone: z.ZodString;
    website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    associationIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    email: string;
    phone: string;
    postalCode: string;
    city: string;
    country: string;
    code: string;
    name: string;
    address: string;
    associationIds: string[];
    website?: string | null | undefined;
}, {
    email: string;
    phone: string;
    postalCode: string;
    city: string;
    code: string;
    name: string;
    address: string;
    associationIds: string[];
    country?: string | undefined;
    website?: string | null | undefined;
}>;
export declare const createCompetitionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodNativeEnum<typeof CompetitionType>;
    associationId: z.ZodString;
    seasonId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: CompetitionType;
    associationId: string;
    name: string;
    startDate: string;
    endDate: string;
    seasonId?: string | null | undefined;
    description?: string | undefined;
    location?: string | null | undefined;
}, {
    type: CompetitionType;
    associationId: string;
    name: string;
    startDate: string;
    endDate: string;
    seasonId?: string | null | undefined;
    description?: string | undefined;
    location?: string | null | undefined;
}>;
export declare const createCategorySchema: z.ZodObject<{
    competitionId: z.ZodString;
    name: z.ZodString;
    teamSize: z.ZodDefault<z.ZodNumber>;
    minElo: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    maxElo: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    minAge: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    maxAge: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    genderRestriction: z.ZodDefault<z.ZodNativeEnum<typeof GenderRestriction>>;
    requiredLicenseType: z.ZodNullable<z.ZodOptional<z.ZodNativeEnum<typeof LicenseType>>>;
    encounterFormat: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    roundsPerGroup: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    competitionId: string;
    teamSize: number;
    genderRestriction: GenderRestriction;
    roundsPerGroup: number;
    minElo?: number | null | undefined;
    maxElo?: number | null | undefined;
    minAge?: number | null | undefined;
    maxAge?: number | null | undefined;
    requiredLicenseType?: LicenseType | null | undefined;
    encounterFormat?: any[] | undefined;
}, {
    name: string;
    competitionId: string;
    teamSize?: number | undefined;
    minElo?: number | null | undefined;
    maxElo?: number | null | undefined;
    minAge?: number | null | undefined;
    maxAge?: number | null | undefined;
    genderRestriction?: GenderRestriction | undefined;
    requiredLicenseType?: LicenseType | null | undefined;
    encounterFormat?: any[] | undefined;
    roundsPerGroup?: number | undefined;
}>;
export declare const updateMatchScoreSchema: z.ZodObject<{
    sets: z.ZodArray<z.ZodObject<{
        home: z.ZodNumber;
        away: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        home: number;
        away: number;
    }, {
        home: number;
        away: number;
    }>, "many">;
    isFinished: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sets: {
        home: number;
        away: number;
    }[];
    isFinished: boolean;
}, {
    sets: {
        home: number;
        away: number;
    }[];
    isFinished?: boolean | undefined;
}>;
export declare const createBroadcastSchema: z.ZodObject<{
    subject: z.ZodString;
    body: z.ZodString;
    channel: z.ZodDefault<z.ZodNativeEnum<typeof MessageChannel>>;
    associationId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    clubId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    targetRole: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    subject: string;
    body: string;
    channel: MessageChannel;
    clubId?: string | null | undefined;
    associationId?: string | null | undefined;
    targetRole?: string | null | undefined;
}, {
    subject: string;
    body: string;
    clubId?: string | null | undefined;
    associationId?: string | null | undefined;
    channel?: MessageChannel | undefined;
    targetRole?: string | null | undefined;
}>;
export declare const createOAuthClientSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    requestedScopes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    requestedScopes: string[];
    description?: string | undefined;
}, {
    name: string;
    requestedScopes: string[];
    description?: string | undefined;
}>;
//# sourceMappingURL=index.d.ts.map