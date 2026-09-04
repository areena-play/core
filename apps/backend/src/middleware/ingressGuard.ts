import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { SystemService } from '../services/system.service';

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

// In-memory sliding-window token bucket rate limiter
interface RateLimitBucket {
    tokens: number;
    lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();

function checkRateLimit(
    rateLimitKey: string,
    capacity: number = 120,
    refillRatePerSec: number = 2
): { allowed: boolean; remaining: number; retryAfter: number } {
    const now = Date.now();
    let bucket = rateLimitMap.get(rateLimitKey);

    if (!bucket) {
        bucket = { tokens: capacity, lastRefill: now };
        rateLimitMap.set(rateLimitKey, bucket);
    } else {
        const timePassed = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(capacity, bucket.tokens + timePassed * refillRatePerSec);
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

    const retryAfter = Math.ceil((1 - bucket.tokens) / Math.max(0.1, refillRatePerSec));
    return { allowed: false, remaining: 0, retryAfter };
}

/**
 * Global Ingress & Rate Limiting Middleware
 * 
 * Rules:
 * 1. Public Whitelist (/health, /oauth/token, /upload/file/*) -> Allowed
 * 2. OAuth 2.0 / API Keys -> Allowed with elevated / dedicated access
 * 3. User Session / Web Frontend Requests -> Dynamically rate limited by User / IP
 * 4. Direct Unauthenticated API calls (scrapers/bots) -> Blocked (401) or rate limited if configured
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

    const rlConfig = await SystemService.getRateLimitConfig();

    // -------------------------------------------------------------------------
    // 2. Check for OAuth 2.0 / API Key (Elevated Access)
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

                const clientObj = oauthToken.client as any;
                if (clientObj?.customRateLimitEnabled) {
                    const clientCapacity = clientObj.rateLimitCapacity || rlConfig.capacity;
                    const clientRefill = clientObj.rateLimitRefillRate || rlConfig.refillRatePerSec;

                    const rl = checkRateLimit(`oauth:client:${oauthToken.clientId}`, clientCapacity, clientRefill);
                    res.setHeader('X-RateLimit-Limit', String(clientCapacity));
                    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));

                    if (!rl.allowed) {
                        res.setHeader('Retry-After', String(rl.retryAfter));
                        return res.status(429).json({
                            error: 'Too Many Requests',
                            message: `Custom rate limit exceeded for OAuth client application '${clientObj.name}'. Please reduce request frequency.`,
                            retryAfterSeconds: rl.retryAfter,
                        });
                    }

                    return next();
                }

                // Verified OAuth client credentials (Unrestricted)
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

                if (!rlConfig.enabled) {
                    res.setHeader('X-RateLimit-Limit', 'disabled');
                    return next();
                }

                // Key by User ID so multiple users sharing a single WiFi/NAT IP don't exhaust each other's quota
                const rl = checkRateLimit(`user:${payload.userId}`, rlConfig.capacity, rlConfig.refillRatePerSec);
                res.setHeader('X-RateLimit-Limit', String(rlConfig.capacity));
                res.setHeader('X-RateLimit-Remaining', String(rl.remaining));

                if (!rl.allowed) {
                    res.setHeader('Retry-After', String(rl.retryAfter));
                    return res.status(429).json({
                        error: 'Too Many Requests',
                        message: 'Rate limit exceeded. Please slow down your requests.',
                        retryAfterSeconds: rl.retryAfter,
                    });
                }

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

        if (!rlConfig.enabled) {
            res.setHeader('X-RateLimit-Limit', 'disabled');
            return next();
        }

        const rl = checkRateLimit(`ip:${clientIp}`, rlConfig.capacity, rlConfig.refillRatePerSec);
        res.setHeader('X-RateLimit-Limit', String(rlConfig.capacity));
        res.setHeader('X-RateLimit-Remaining', String(rl.remaining));

        if (!rl.allowed) {
            res.setHeader('Retry-After', String(rl.retryAfter));
            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please slow down your requests.',
                retryAfterSeconds: rl.retryAfter,
            });
        }

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

        if (!rlConfig.enabled) {
            res.setHeader('X-RateLimit-Limit', 'disabled');
            return next();
        }

        const rl = checkRateLimit(`ip:${clientIp}`, rlConfig.capacity, rlConfig.refillRatePerSec);
        res.setHeader('X-RateLimit-Limit', String(rlConfig.capacity));
        res.setHeader('X-RateLimit-Remaining', String(rl.remaining));

        if (!rl.allowed) {
            res.setHeader('Retry-After', String(rl.retryAfter));
            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please slow down your requests.',
                retryAfterSeconds: rl.retryAfter,
            });
        }

        return next();
    }

    // -------------------------------------------------------------------------
    // 5. Block Direct Unauthenticated API Access (Scrapers, Bots, Raw Curl)
    // -------------------------------------------------------------------------
    if (rlConfig.blockAnonymousBots) {
        return res.status(401).json({
            error: 'Unauthorized',
            message:
                'Direct access to the AREENA API is restricted. Please authenticate with an OAuth 2.0 Bearer token (POST /oauth/token) or access via the web application.',
            docs: '/developers',
        });
    }

    // If bot blocking is relaxed, apply IP rate limiting
    if (!rlConfig.enabled) {
        res.setHeader('X-RateLimit-Limit', 'disabled');
        return next();
    }

    const rl = checkRateLimit(`ip:${clientIp}`, rlConfig.capacity, rlConfig.refillRatePerSec);
    res.setHeader('X-RateLimit-Limit', String(rlConfig.capacity));
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));

    if (!rl.allowed) {
        res.setHeader('Retry-After', String(rl.retryAfter));
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down your requests.',
            retryAfterSeconds: rl.retryAfter,
        });
    }

    return next();
}
