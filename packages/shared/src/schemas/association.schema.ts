import { z } from 'zod';
import { AssociationLevel } from '../types';

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

export const updateAssociationSettingsSchema = z.object({
    name: z.string().min(2).optional(),
    shortName: z.string().min(1).optional(),
    logoUrl: z.string().optional().nullable(),
    licenseIdTemplate: z.string().min(3).optional(),
    counter: z.number().int().nonnegative().optional(),
    regionDigit: z.number().int().min(1).max(9).optional(),
});

export const updateLicenseIdTemplateSchema = z.object({
    licenseIdTemplate: z.string().min(3), // e.g. "{regionDigit}{year2}{counter3}"
    counter: z.number().int().nonnegative().optional(),
});

