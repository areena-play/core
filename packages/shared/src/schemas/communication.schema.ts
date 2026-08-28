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

