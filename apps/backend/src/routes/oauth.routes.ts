import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { validate } from '../middleware/validate';
import { createOAuthClientSchema } from '@areena/shared';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { authenticateOAuthToken, requireOAuthScope, OAuthRequest } from '../middleware/oauth';

const router = Router();

// POST /oauth/clients - User requests OAuth API client
router.post(
    '/clients',
    authenticateToken,
    validate(createOAuthClientSchema),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const { name, description, requestedScopes } = req.body;

            // Generate client credentials
            const clientId = `areena_${crypto.randomBytes(12).toString('hex')}`;
            const rawClientSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
            const clientSecretHash = await bcrypt.hash(rawClientSecret, 10);

            // Basic public scopes auto-approve, enhanced scopes require admin approval
            const defaultPublicScopes = ['read:public', 'read:calendar', 'read:competitions'];
            const requiresAdminApproval = requestedScopes.some((s: string) => !defaultPublicScopes.includes(s));

            const status = requiresAdminApproval ? 'PENDING_APPROVAL' : 'APPROVED';
            const grantedScopes = requiresAdminApproval
                ? requestedScopes.filter((s: string) => defaultPublicScopes.includes(s))
                : requestedScopes;

            const client = await prisma.oAuthClient.create({
                data: {
                    clientId,
                    clientSecretHash,
                    name,
                    description,
                    ownerUserId: req.user!.id,
                    allowedScopes: grantedScopes.length > 0 ? grantedScopes : ['read:public'],
                    status,
                },
            });

            res.status(201).json({
                client: {
                    id: client.id,
                    clientId: client.clientId,
                    name: client.name,
                    description: client.description,
                    status: client.status,
                    allowedScopes: client.allowedScopes,
                },
                clientSecret: rawClientSecret, // Returned once upon creation!
                message: requiresAdminApproval
                    ? 'Client created with basic public scopes. Elevated scopes are pending Main Association Admin approval.'
                    : 'Client created and ready to use.',
            });
        } catch (err) {
            next(err);
        }
    },
);

// GET /oauth/clients - List user's or all OAuth clients
router.get('/clients', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const isSuperAdmin = req.user!.isSuperAdmin;
        const clients = await prisma.oAuthClient.findMany({
            where: isSuperAdmin ? {} : { ownerUserId: req.user!.id },
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

// POST /oauth/clients/:id/approve - Main Association Admin grants specific access rights / scopes
router.post('/clients/:id/approve', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        if (!req.user!.isSuperAdmin) {
            const topLevel = await prisma.association.findFirst({ where: { isTopLevel: true } });
            const isTopAdmin = topLevel && req.user!.associationRoles.some((r) => r.associationId === topLevel.id);
            if (!isTopAdmin) {
                return res
                    .status(403)
                    .json({ error: 'Only main association administrators can grant enhanced API access rights' });
            }
        }

        const { approvedScopes, status } = req.body;

        const updated = await prisma.oAuthClient.update({
            where: { id: req.params.id },
            data: {
                status: status || 'APPROVED',
                allowedScopes: approvedScopes || [
                    'read:public',
                    'read:calendar',
                    'read:competitions',
                    'read:members_full',
                ],
                approvedByUserId: req.user!.id,
            },
        });

        res.json(updated);
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

// ------------------------------------------------------------------------
// PROTECTED OAUTH API V1 ENDPOINTS (Public & Partner API)
// ------------------------------------------------------------------------

// GET /oauth/api/v1/federation - Federation basic metadata (Scope: read:public)
router.get(
    '/api/v1/federation',
    authenticateOAuthToken,
    requireOAuthScope('read:public'),
    async (req: OAuthRequest, res: Response, next) => {
        try {
            const topAssociation = await prisma.association.findFirst({
                where: { isTopLevel: true },
                include: {
                    childHierarchies: { include: { child: true } },
                    seasons: { where: { isCurrent: true } },
                },
            });

            res.json({
                federation: topAssociation,
                activeScope: req.oauth?.scopes,
            });
        } catch (err) {
            next(err);
        }
    },
);

// GET /oauth/api/v1/calendar - Association Calendar feed (Scope: read:calendar)
router.get(
    '/api/v1/calendar',
    authenticateOAuthToken,
    requireOAuthScope('read:calendar'),
    async (req: OAuthRequest, res: Response, next) => {
        try {
            const events = await prisma.calendarEvent.findMany({
                where: { isPublic: true },
                take: 100,
                orderBy: { startDate: 'asc' },
            });
            res.json(events);
        } catch (err) {
            next(err);
        }
    },
);

// GET /oauth/api/v1/competitions - Competitions and league standings (Scope: read:competitions)
router.get(
    '/api/v1/competitions',
    authenticateOAuthToken,
    requireOAuthScope('read:competitions'),
    async (req: OAuthRequest, res: Response, next) => {
        try {
            const competitions = await prisma.competition.findMany({
                include: {
                    categories: {
                        include: {
                            groups: { include: { standings: { include: { team: true } } } },
                        },
                    },
                },
            });
            res.json(competitions);
        } catch (err) {
            next(err);
        }
    },
);

// GET /oauth/api/v1/members - Detailed member directory (Scope: read:members_full - Enhanced Partner Scope)
router.get(
    '/api/v1/members',
    authenticateOAuthToken,
    requireOAuthScope('read:members_full'),
    async (req: OAuthRequest, res: Response, next) => {
        try {
            const members = await prisma.user.findMany({
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    city: true,
                    country: true,
                    licenseId: true,
                    eloPoints: true,
                    rank: true,
                    licenses: true,
                },
            });
            res.json(members);
        } catch (err) {
            next(err);
        }
    },
);

export default router;
