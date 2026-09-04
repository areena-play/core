import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createOAuthClientSchema } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

const router = Router();

// POST /oauth/clients - User requests OAuth API client
router.post(
    '/clients',
    authenticateToken,
    validate(createOAuthClientSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { name, description, requestReason, requestedScopes } = req.body;

            // Generate client credentials
            const clientId = `areena_${crypto.randomBytes(12).toString('hex')}`;
            const rawClientSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
            const clientSecretHash = await bcrypt.hash(rawClientSecret, 10);

            // Only Super Admins are auto-approved; all other requests require administrator approval
            const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
            const status = isSuperAdmin ? 'APPROVED' : 'PENDING_APPROVAL';

            const client = await (prisma.oAuthClient as any).create({
                data: {
                    clientId,
                    clientSecretHash,
                    name,
                    description,
                    requestReason,
                    ownerUserId: req.user!.id,
                    allowedScopes: requestedScopes.length > 0 ? requestedScopes : ['read:public'],
                    status,
                    approvedByUserId: isSuperAdmin ? req.user!.id : null,
                },
            });

            await AuditService.record({
                req,
                action: 'CREATE_OAUTH_CLIENT',
                entityType: 'OAuthClient',
                entityId: client.id,
                description: `Created OAuth Client application "${name}" (${clientId}) with status ${status}`,
                metadata: {
                    clientId,
                    name,
                    status,
                    isSuperAdmin,
                    requestReason,
                    requestedScopes,
                    allowedScopes: client.allowedScopes,
                },
            });

            res.status(201).json({
                client: {
                    id: client.id,
                    clientId: client.clientId,
                    name: client.name,
                    description: client.description,
                    requestReason: client.requestReason,
                    status: client.status,
                    allowedScopes: client.allowedScopes,
                },
                clientSecret: rawClientSecret, // Returned once upon creation!
                message: isSuperAdmin
                    ? 'Client created and ready to use.'
                    : 'Client application registered successfully. It is pending administrator approval before it can be used to generate tokens.',
            });
        } catch (err) {
            next(err);
        }
    },
);

// GET /oauth/clients - List user's or all OAuth clients
router.get('/clients', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const isSuperAdmin = Boolean(req.user!.isSuperAdmin);
        const queryAll = req.query.all === 'true' || req.query.all === '1';
        const whereClause = isSuperAdmin && queryAll ? {} : { ownerUserId: req.user!.id };

        const clients = await prisma.oAuthClient.findMany({
            where: whereClause,
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(clients);
    } catch (err) {
        next(err);
    }
});

// POST /oauth/clients/:id/approve - Main Association Admin or Super Admin approves & grants scopes
router.post('/clients/:id/approve', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        if (!req.user!.isSuperAdmin) {
            const topLevel = await prisma.association.findFirst({ where: { isTopLevel: true } });
            const isTopAdmin = topLevel && req.user!.associationRoles?.some((r) => r.associationId === topLevel.id);
            if (!isTopAdmin) {
                return res
                    .status(403)
                    .json({ error: 'Only main association administrators can grant enhanced API access rights' });
            }
        }

        const { approvedScopes, status, customRateLimitEnabled, rateLimitCapacity, rateLimitRefillRate } = req.body;

        const client = await prisma.oAuthClient.findUnique({ where: { id: req.params.id } });
        if (!client) {
            return res.status(404).json({ error: 'OAuth client not found' });
        }

        const updated = await (prisma.oAuthClient as any).update({
            where: { id: req.params.id },
            data: {
                status: status || 'APPROVED',
                allowedScopes: approvedScopes || client.allowedScopes,
                approvedByUserId: req.user!.id,
                customRateLimitEnabled: customRateLimitEnabled !== undefined ? Boolean(customRateLimitEnabled) : undefined,
                rateLimitCapacity: rateLimitCapacity !== undefined ? Math.max(5, Number(rateLimitCapacity)) : undefined,
                rateLimitRefillRate: rateLimitRefillRate !== undefined ? Math.max(0.1, Number(rateLimitRefillRate)) : undefined,
            },
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });

        await AuditService.record({
            req,
            action: 'APPROVE_OAUTH_CLIENT',
            entityType: 'OAuthClient',
            entityId: updated.id,
            description: `Admin approved OAuth client "${updated.name}" (${updated.clientId}) with scopes: ${updated.allowedScopes.join(', ')}`,
            metadata: {
                clientId: updated.clientId,
                name: updated.name,
                status: updated.status,
                allowedScopes: updated.allowedScopes,
                customRateLimitEnabled: updated.customRateLimitEnabled,
                rateLimitCapacity: updated.rateLimitCapacity,
                rateLimitRefillRate: updated.rateLimitRefillRate,
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// PUT /oauth/clients/:id/ratelimit - Super Admin configures custom rate limits for specific OAuth client
router.put('/clients/:id/ratelimit', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        if (!req.user!.isSuperAdmin) {
            return res.status(403).json({ error: 'Only Super Administrators can set custom client rate limits' });
        }

        const { customRateLimitEnabled, rateLimitCapacity, rateLimitRefillRate } = req.body;

        const client = await prisma.oAuthClient.findUnique({ where: { id: req.params.id } });
        if (!client) {
            return res.status(404).json({ error: 'OAuth client not found' });
        }

        const updated = await (prisma.oAuthClient as any).update({
            where: { id: req.params.id },
            data: {
                customRateLimitEnabled: customRateLimitEnabled !== undefined ? Boolean(customRateLimitEnabled) : undefined,
                rateLimitCapacity: rateLimitCapacity !== undefined ? Math.max(5, Number(rateLimitCapacity)) : undefined,
                rateLimitRefillRate: rateLimitRefillRate !== undefined ? Math.max(0.1, Number(rateLimitRefillRate)) : undefined,
            },
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });

        await AuditService.record({
            req,
            action: 'UPDATE_OAUTH_CLIENT_RATE_LIMIT',
            entityType: 'OAuthClient',
            entityId: updated.id,
            description: `Admin configured custom rate limit for client "${updated.name}" (${updated.clientId}): enabled=${updated.customRateLimitEnabled}, capacity=${updated.rateLimitCapacity}, refillRate=${updated.rateLimitRefillRate}/s`,
            metadata: {
                clientId: updated.clientId,
                customRateLimitEnabled: updated.customRateLimitEnabled,
                rateLimitCapacity: updated.rateLimitCapacity,
                rateLimitRefillRate: updated.rateLimitRefillRate,
            },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// POST /oauth/clients/:id/revoke - Revoke OAuth client
router.post('/clients/:id/revoke', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const client = await prisma.oAuthClient.findUnique({ where: { id: req.params.id } });
        if (!client) {
            return res.status(404).json({ error: 'OAuth client not found' });
        }

        const isOwner = client.ownerUserId === req.user!.id;
        const isSuperAdmin = req.user!.isSuperAdmin;

        if (!isOwner && !isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden. You cannot revoke this OAuth client.' });
        }

        const updated = await prisma.oAuthClient.update({
            where: { id: req.params.id },
            data: {
                status: 'REVOKED',
            },
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });

        // Delete active access tokens for this client to immediately terminate sessions
        await prisma.oAuthToken.deleteMany({ where: { clientId: req.params.id } });

        await AuditService.record({
            req,
            action: 'REVOKE_OAUTH_CLIENT',
            entityType: 'OAuthClient',
            entityId: updated.id,
            description: `Revoked access for OAuth client "${updated.name}" (${updated.clientId})`,
            metadata: { clientId: updated.clientId, name: updated.name },
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// DELETE /oauth/clients/:id - Delete OAuth client
router.delete('/clients/:id', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const client = await prisma.oAuthClient.findUnique({ where: { id: req.params.id } });
        if (!client) {
            return res.status(404).json({ error: 'OAuth client not found' });
        }

        const isOwner = client.ownerUserId === req.user!.id;
        const isSuperAdmin = req.user!.isSuperAdmin;

        if (!isOwner && !isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden. You cannot delete this OAuth client.' });
        }

        await prisma.oAuthClient.delete({ where: { id: req.params.id } });

        await AuditService.record({
            req,
            action: 'DELETE_OAUTH_CLIENT',
            entityType: 'OAuthClient',
            entityId: client.id,
            description: `Deleted OAuth client "${client.name}" (${client.clientId})`,
            metadata: { clientId: client.clientId, name: client.name },
        });

        res.json({ success: true, message: 'OAuth client removed successfully' });
    } catch (err) {
        next(err);
    }
});

// POST /oauth/token - OAuth 2.0 Client Credentials Grant
router.post('/token', async (req, res, next) => {
    try {
        const { grant_type, client_id, client_secret } = req.body;

        if (grant_type !== 'client_credentials') {
            return res
                .status(400)
                .json({
                    error: 'unsupported_grant_type',
                    error_description: "Grant type must be 'client_credentials'",
                });
        }

        if (!client_id || !client_secret) {
            return res
                .status(400)
                .json({ error: 'invalid_request', error_description: 'client_id and client_secret are required' });
        }

        const client = await prisma.oAuthClient.findUnique({
            where: { clientId: client_id },
        });

        if (!client) {
            return res.status(401).json({ error: 'invalid_client', error_description: 'Client not found' });
        }

        if (client.status !== 'APPROVED') {
            return res
                .status(403)
                .json({ error: 'unauthorized_client', error_description: 'Client is pending approval or revoked' });
        }

        const validSecret = await bcrypt.compare(client_secret, client.clientSecretHash);
        if (!validSecret) {
            return res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials' });
        }

        // Generate random token
        const tokenString = `atk_${crypto.randomBytes(32).toString('hex')}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

        const token = await prisma.oAuthToken.create({
            data: {
                clientId: client.id,
                token: tokenString,
                expiresAt,
                scopes: client.allowedScopes,
            },
        });

        res.json({
            access_token: token.token,
            token_type: 'Bearer',
            expires_in: 30 * 24 * 60 * 60,
            scope: client.allowedScopes.join(' '),
        });
    } catch (err) {
        next(err);
    }
});

export default router;
