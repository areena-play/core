import { z } from 'zod';
import { MessageChannel } from '../types';

export const createBroadcastSchema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    channel: z.nativeEnum(MessageChannel).default(MessageChannel.EMAIL),
    associationId: z.string().uuid().optional().nullable(),
    clubId: z.string().uuid().optional().nullable(),
    targetRole: z.string().optional().nullable(),
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

export const createNoticeSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required'),
    titleI18n: z.record(z.string()).optional().nullable(),
    contentI18n: z.record(z.string()).optional().nullable(),
    type: z.enum(['INFO', 'WARNING', 'CRITICAL', 'SUCCESS']).default('INFO'),
    displayMode: z.enum(['BANNER', 'MODAL']).default('BANNER'),
    targetGroup: z
        .enum([
            'ALL',
            'SUPER_ADMINS',
            'ASSOCIATION_ADMINS',
            'CLUB_ADMINS',
            'PLAYERS',
            'COACHES',
            'REFEREES',
        ])
        .default('ALL'),
    associationId: z.string().uuid().optional().nullable(),
    clubId: z.string().uuid().optional().nullable(),
    isDismissible: z.boolean().default(true),
    isActive: z.boolean().default(true),
    priority: z.number().int().default(0),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
});

export const updateNoticeSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    titleI18n: z.record(z.string()).optional().nullable(),
    contentI18n: z.record(z.string()).optional().nullable(),
    type: z.enum(['INFO', 'WARNING', 'CRITICAL', 'SUCCESS']).optional(),
    displayMode: z.enum(['BANNER', 'MODAL']).optional(),
    targetGroup: z
        .enum([
            'ALL',
            'SUPER_ADMINS',
            'ASSOCIATION_ADMINS',
            'CLUB_ADMINS',
            'PLAYERS',
            'COACHES',
            'REFEREES',
        ])
        .optional(),
    associationId: z.string().uuid().optional().nullable(),
    clubId: z.string().uuid().optional().nullable(),
    isDismissible: z.boolean().optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().optional(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
});


