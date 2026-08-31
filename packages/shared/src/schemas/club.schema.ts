import { z } from 'zod';

export const createClubSchema = z.object({
    name: z.string().min(2),
    code: z.string().min(1),
    slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase alphanumeric characters and hyphens').optional(),
    address: z.string().min(2),
    city: z.string().min(1),
    postalCode: z.string().min(2),
    country: z.string().default('Switzerland'),
    email: z.string().email(),
    phone: z.string().min(5),
    website: z.string().url().optional().nullable(),
    associationIds: z.array(z.string().uuid()).min(1),
});

