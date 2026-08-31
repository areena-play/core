import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/prisma';

export interface IngressRequest extends Request {
    isOAuth?: boolean;
    isFrontend?: boolean;
    user?: any;
    oauth?: {
        clientId: string;
        userId?: string | null;
        scopes: string[];
    };
}

// In-memory sliding-window token bucket rate limiter for frontend web users
interface RateLimitBucket {
    tokens: number;
    lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();
const RATE_LIMIT_CAPACITY = 120; // 120 requests capacity
const REFILL_RATE_PER_SEC = 2; // +2 requests per second refill (120 req/min sustained)

function checkFrontendRateLimit(rateLimitKey: string): { allowed: boolean; remaining: number; retryAfter: number } {
    const now = Date.now();
    let bucket = rateLimitMap.get(rateLimitKey);

    if (!bucket) {
        bucket = { tokens: RATE_LIMIT_CAPACITY, lastRefill: now };
        rateLimitMap.set(rateLimitKey, bucket);
    } else {
        const timePassed = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(RATE_LIMIT_CAPACITY, bucket.tokens + timePassed * REFILL_RATE_PER_SEC);
        bucket.lastRefill = now;
    }

    // Clean up memory periodically
    if (rateLimitMap.size > 10000) {
        const cutoff = now - 3600000;
        for (const [k, v] of rateLimitMap.entries()) {
            if (v.lastRefill < cutoff) rateLimitMap.delete(k);
        }
    }

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
    }

    const retryAfter = Math.ceil((1 - bucket.tokens) / REFILL_RATE_PER_SEC);
    return { allowed: false, remaining: 0, retryAfter };
}

/**
 * Global Ingress & Rate Limiting Middleware
 * 
 * Rules:
 * 1. Public Whitelist (/health, /oauth/token, /upload/file/*) -> Allowed
 * 2. OAuth 2.0 / API Keys -> Unrestricted / No Rate Limit
 * 3. Local Development (npm run dev on localhost/127.0.0.1) -> Allowed with Rate Limiting
 * 4. Requests from Frontend Web Pages (Same-Origin, SSR, User JWT) -> Allowed with Rate Limiting
 * 5. Direct Unauthenticated API calls (scrapers/bots) -> Blocked (401 Unauthorized)
 */
export async function apiIngressGuard(req: IngressRequest, res: Response, next: NextFunction) {
    const path = req.path;
    const method = req.method.toUpperCase();
    const isDev = process.env.NODE_ENV !== 'production';

    const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';

    // -------------------------------------------------------------------------
    // 1. Whitelist Public Bootstrap & Static Media Endpoints
    // -------------------------------------------------------------------------
    if (
        path === '/health' ||
        path.startsWith('/setup') ||
        (path.startsWith('/upload/file') && method === 'GET') ||
        (path === '/oauth/token' && method === 'POST')
    ) {
        return next();
    }

    // -------------------------------------------------------------------------
    // 2. Check for OAuth 2.0 / API Key (Unrestricted Access - No Rate Limit)
    // -------------------------------------------------------------------------
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();

        // Check if token matches OAuth Token in DB
        try {
            const oauthToken = await prisma.oAuthToken.findUnique({
                where: { token },
                include: { client: true, user: true },
            });

            if (oauthToken) {
                if (new Date() > oauthToken.expiresAt) {
                    return res.status(401).json({
                        error: 'unauthorized',
                        message: 'OAuth access token has expired. Please refresh your token via POST /oauth/token.',
                    });
                }

                if (oauthToken.client.status !== 'APPROVED') {
                    return res.status(403).json({
                        error: 'forbidden',
                        message: 'OAuth client is suspended or pending administrator approval.',
                    });
                }

                req.isOAuth = true;
                req.oauth = {
                    clientId: oauthToken.clientId,
                    userId: oauthToken.userId,
                    scopes: oauthToken.scopes,
                };

                // Unrestricted - Bypass rate limit
                res.setHeader('X-RateLimit-Limit', 'unlimited');
                return next();
            }
        } catch (err: any) {
            console.error('[Ingress Guard] OAuth verification error:', err);
        }

        // Check if it is a valid User Session JWT
        try {
            const payload = jwt.verify(token, config.jwtSecret) as any;
            if (payload && payload.userId) {
                req.user = payload;
                // Key by User ID so multiple users sharing a single WiFi/NAT IP don't exhaust each other's quota
                const rl = checkFrontendRateLimit(`user:${payload.userId}`);
                if (!rl.allowed) {
                    return res.status(429).json({
                        error: 'Too Many Requests',
                        message: 'Rate limit exceeded. Please slow down your requests.',
                        retryAfterSeconds: rl.retryAfter,
                    });
                }
                res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
                return next();
            }
        } catch {}
    }

    // -------------------------------------------------------------------------
    // 3. Allow Local Development Environment (npm run dev)
    // -------------------------------------------------------------------------
    const host = (req.headers['host'] as string) || '';
    const isLocalhost =
        host.includes('localhost') ||
        host.includes('127.0.0.1') ||
        clientIp === '127.0.0.1' ||
        clientIp === '::1' ||
        clientIp === '::ffff:127.0.0.1';

    if (isDev && isLocalhost) {
        req.isFrontend = true;
        const rl = checkFrontendRateLimit(`ip:${clientIp}`);
        res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
        return next();
    }

    // -------------------------------------------------------------------------
    // 4. Check for Requests Originating from the Frontend Web Page / SSR
    // -------------------------------------------------------------------------
    const secFetchSite = req.headers['sec-fetch-site'] as string;
    const origin = req.headers['origin'] as string;
    const referer = req.headers['referer'] as string;

    const isSameOriginFetch = secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none';
    const isMatchingOrigin =
        (origin && (origin.includes(host) || origin.includes('localhost') || origin.includes('127.0.0.1'))) ||
        (referer && (referer.includes(host) || referer.includes('localhost') || referer.includes('127.0.0.1')));

    if (isSameOriginFetch || isMatchingOrigin) {
        req.isFrontend = true;

        const rl = checkFrontendRateLimit(`ip:${clientIp}`);
        if (!rl.allowed) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please slow down your requests.',
                retryAfterSeconds: rl.retryAfter,
            });
        }

        res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
        return next();
    }

    // -------------------------------------------------------------------------
    // 5. Block Direct Unauthenticated API Access (Scrapers, Bots, Raw Curl)
    // -------------------------------------------------------------------------
    return res.status(401).json({
        error: 'Unauthorized',
        message:
            'Direct access to the AREENA API is restricted. Please authenticate with an OAuth 2.0 Bearer token (POST /oauth/token) or access via the web application.',
        docs: '/developers',
    });
}
