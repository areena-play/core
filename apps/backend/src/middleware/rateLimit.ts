import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

const playerTtsRateLimitMap = new Map<string, TokenBucket>();

/**
 * Player TTS Rate Limiter:
 * Heavily rate limits athlete speech preview tests to 5 requests per hour per user / IP.
 */
export function playerTtsRateLimiter(req: AuthRequest, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';

    // Tournament SuperAdmins bypassing player rate limit when testing
    if (req.user?.isSuperAdmin) {
        return next();
    }

    const key = userId ? `tts:player:${userId}` : `tts:ip:${clientIp}`;
    const capacity = 5; // max 5 previews per hour
    const refillIntervalSec = 3600; // 1 hour
    const tokensPerSec = capacity / refillIntervalSec;

    const now = Date.now();
    let bucket = playerTtsRateLimitMap.get(key);

    if (!bucket) {
        bucket = { tokens: capacity, lastRefill: now };
        playerTtsRateLimitMap.set(key, bucket);
    } else {
        const elapsedSec = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * tokensPerSec);
        bucket.lastRefill = now;
    }

    // Memory garbage collection
    if (playerTtsRateLimitMap.size > 5000) {
        const cutoff = now - 7200000; // 2 hours
        for (const [k, v] of playerTtsRateLimitMap.entries()) {
            if (v.lastRefill < cutoff) playerTtsRateLimitMap.delete(k);
        }
    }

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        res.setHeader('X-TTS-RateLimit-Limit', String(capacity));
        res.setHeader('X-TTS-RateLimit-Remaining', String(Math.floor(bucket.tokens)));
        return next();
    }

    const waitSeconds = Math.ceil((1 - bucket.tokens) / tokensPerSec);
    const minutesLeft = Math.ceil(waitSeconds / 60);

    res.setHeader('Retry-After', String(waitSeconds));
    return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `TTS audio preview rate limit reached. To conserve cloud speech resources, you can test your pronunciation up to 5 times per hour. Please try again in ~${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
        retryAfterSeconds: waitSeconds,
    });
}

