"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateOAuthToken = authenticateOAuthToken;
exports.requireOAuthScope = requireOAuthScope;
const prisma_1 = require("../config/prisma");
async function authenticateOAuthToken(req, res, next) {
    if (req.oauth) {
        return next();
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'OAuth Bearer token required' });
    }
    try {
        const oauthToken = await prisma_1.prisma.oAuthToken.findUnique({
            where: { token },
            include: { client: true, user: true },
        });
        if (!oauthToken) {
            return res.status(401).json({ error: 'Invalid OAuth token' });
        }
        if (new Date() > oauthToken.expiresAt) {
            return res.status(401).json({ error: 'OAuth token has expired' });
        }
        if (oauthToken.client.status !== 'APPROVED') {
            return res.status(403).json({ error: 'OAuth client is suspended or pending approval' });
        }
        req.oauth = {
            clientId: oauthToken.clientId,
            userId: oauthToken.userId,
            scopes: oauthToken.scopes,
        };
        next();
    }
    catch (err) {
        return res.status(500).json({ error: 'OAuth authentication failed', details: err.message });
    }
}
function requireOAuthScope(requiredScope) {
    return (req, res, next) => {
        if (!req.oauth) {
            return res.status(401).json({ error: 'OAuth authentication required' });
        }
        const hasScope = req.oauth.scopes.includes(requiredScope) ||
            req.oauth.scopes.includes('*') ||
            req.oauth.scopes.includes('admin:*');
        if (!hasScope) {
            return res.status(403).json({
                error: `Insufficient OAuth scope. Required scope: ${requiredScope}`,
                grantedScopes: req.oauth.scopes,
            });
        }
        next();
    };
}
