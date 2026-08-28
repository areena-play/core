import { z } from 'zod';
import { InvoiceStatus, InvoiceCategory, InvoiceTargetType } from '../types';

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

