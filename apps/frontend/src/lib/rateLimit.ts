/**
 * In-Memory Sliding Window Rate Limiter for Next.js Frontend Server Proxy
 */

interface RateLimitRecord {
    tokens: number;
    lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const MAX_TOKENS = 120; // 120 requests capacity
const REFILL_RATE_PER_SECOND = 2; // 2 tokens added per second (120/min sustained)
const SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute cleanup interval

let lastSweep = Date.now();

function sweepOldRecords() {
    const now = Date.now();
    if (now - lastSweep < SWEEP_INTERVAL_MS) return;
    lastSweep = now;

    const maxIdleMs = 5 * 60 * 1000; // Remove IPs inactive for 5 minutes
    rateLimitMap.forEach((record, ip) => {
        if (now - record.lastRefill > maxIdleMs) {
            rateLimitMap.delete(ip);
        }
    });
}

/**
 * Checks and updates rate limit for the given client IP.
 * Returns true if the request is permitted, false if rate limited.
 */
export function checkRateLimit(clientIp: string): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
} {
    sweepOldRecords();

    const now = Date.now();
    let record = rateLimitMap.get(clientIp);

    if (!record) {
        record = {
            tokens: MAX_TOKENS - 1,
            lastRefill: now,
        };
        rateLimitMap.set(clientIp, record);
        return { allowed: true, remaining: record.tokens, retryAfterSeconds: 0 };
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = (now - record.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * REFILL_RATE_PER_SECOND;
    record.tokens = Math.min(MAX_TOKENS, record.tokens + tokensToAdd);
    record.lastRefill = now;

    if (record.tokens >= 1) {
        record.tokens -= 1;
        return {
            allowed: true,
            remaining: Math.floor(record.tokens),
            retryAfterSeconds: 0,
        };
    } else {
        const needed = 1 - record.tokens;
        const retryAfterSeconds = Math.ceil(needed / REFILL_RATE_PER_SECOND);
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, retryAfterSeconds),
        };
    }
}

