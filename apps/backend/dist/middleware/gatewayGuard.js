"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayIngressGuard = gatewayIngressGuard;
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
/**
 * Global Gateway Ingress Guard
 *
 * Enforces that the Express Backend API is only accessible when:
 * 1. Authenticated via OAuth 2.0 (Bearer atk_...)
 * 2. Originating from the trusted AREENA Frontend Server (x-internal-secret)
 * 3. Whitelisted public bootstrap endpoints (POST /oauth/token, GET /health)
 */
async function gatewayIngressGuard(req, res, next) {
    const path = req.path;
    const method = req.method.toUpperCase();
    // 1. Whitelist public system endpoints & public media streams
    if (path === '/health') {
        return next();
    }
    // Public uploaded media streaming (logos, club badges, tournament banners)
    if (path.startsWith('/upload/file') && method === 'GET') {
        return next();
    }
    // Public OAuth token issuance endpoint (Client Credentials Grant)
    if (path === '/oauth/token' && method === 'POST') {
        return next();
    }
    // 2. Check for Frontend Server authorization (x-internal-secret header)
    const internalSecret = req.headers['x-internal-secret'] || req.headers['x-areena-internal-secret'];
    if (internalSecret && internalSecret === env_1.config.internalApiSecret) {
        req.isFrontendServer = true;
        return next();
    }
    // 3. Check for OAuth 2.0 Bearer token authorization
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        // If it matches an OAuth token in OAuthToken DB table
        try {
            const oauthToken = await prisma_1.prisma.oAuthToken.findUnique({
                where: { token },
                include: { client: true, user: true },
            });
            if (oauthToken) {
                if (new Date() > oauthToken.expiresAt) {
                    return res.status(401).json({
                        error: 'unauthorized',
                        message: 'OAuth access token has expired. Please request a new token via POST /oauth/token.',
                    });
                }
                if (oauthToken.client.status !== 'APPROVED') {
                    return res.status(403).json({
                        error: 'forbidden',
                        message: 'OAuth client is suspended or revoked by the federation administrator.',
                    });
                }
                req.isOAuth = true;
                req.oauth = {
                    clientId: oauthToken.clientId,
                    userId: oauthToken.userId,
                    scopes: oauthToken.scopes,
                };
                return next();
            }
        }
        catch (err) {
            console.error('[Gateway Guard] OAuth verification error:', err);
        }
    }
    // 4. Reject all other unauthenticated direct requests
    return res.status(401).json({
        error: 'Unauthorized',
        message: 'The AREENA backend API is protected. Direct queries are only allowed when authenticated via OAuth 2.0 or when routed through the AREENA frontend server.',
        docs: '/developers',
    });
}
