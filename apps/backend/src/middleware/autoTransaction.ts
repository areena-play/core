import { Request, Response, NextFunction } from 'express';
import { prismaRequestContext, RequestPrismaState } from './prismaCacheContext';
import { basePrisma } from '../config/prisma';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const DEFAULT_TRANSACTION_TIMEOUT = 300000; // 5 minutes default
export const DEFAULT_TRANSACTION_MAX_WAIT = 60000;  // 60 seconds default

export interface TransactionOptions {
    timeout?: number;
    maxWait?: number;
    skip?: boolean;
}

interface RouteTimeoutRule {
    pattern: string | RegExp;
    options: TransactionOptions;
}

/**
 * Registry of custom transaction timeout overrides per route pattern.
 */
const routeTimeoutRegistry: RouteTimeoutRule[] = [];

/**
 * Register custom transaction options / timeout for a specific route path or regex pattern.
 *
 * @example
 * registerTransactionTimeout('/admin/import/clicktt', 600000); // 10 minutes
 * registerTransactionTimeout(/\/admin\/bulk\/.+/, { timeout: 450000, maxWait: 90000 });
 */
export function registerTransactionTimeout(
    pattern: string | RegExp,
    optionsOrTimeout: number | TransactionOptions
) {
    const options: TransactionOptions =
        typeof optionsOrTimeout === 'number'
            ? { timeout: optionsOrTimeout }
            : optionsOrTimeout;

    routeTimeoutRegistry.unshift({ pattern, options });
}

/**
 * Resolves the effective transaction options (timeout, maxWait, skip) for an incoming request URL.
 */
export function resolveTransactionOptions(urlOrPath: string): {
    timeout: number;
    maxWait: number;
    skip: boolean;
} {
    for (const rule of routeTimeoutRegistry) {
        if (typeof rule.pattern === 'string') {
            if (urlOrPath.includes(rule.pattern)) {
                return {
                    timeout: rule.options.timeout ?? DEFAULT_TRANSACTION_TIMEOUT,
                    maxWait: rule.options.maxWait ?? DEFAULT_TRANSACTION_MAX_WAIT,
                    skip: Boolean(rule.options.skip),
                };
            }
        } else if (rule.pattern instanceof RegExp) {
            if (rule.pattern.test(urlOrPath)) {
                return {
                    timeout: rule.options.timeout ?? DEFAULT_TRANSACTION_TIMEOUT,
                    maxWait: rule.options.maxWait ?? DEFAULT_TRANSACTION_MAX_WAIT,
                    skip: Boolean(rule.options.skip),
                };
            }
        }
    }

    return {
        timeout: DEFAULT_TRANSACTION_TIMEOUT,
        maxWait: DEFAULT_TRANSACTION_MAX_WAIT,
        skip: false,
    };
}

/**
 * Automatically wraps mutating HTTP requests (POST, PUT, PATCH, DELETE) in an atomic database transaction.
 *
 * How it works:
 * 1. Begins a PostgreSQL transaction with the route-specific (or 5-minute default) timeout.
 * 2. Injects the active transaction client (`tx`) into the request-scoped AsyncLocalStorage.
 * 3. All `prisma.<model>.<action>` calls throughout the application automatically route through `tx`.
 * 4. If the route succeeds (response sent), the transaction COMMITS.
 * 5. If any error is thrown (or res.status >= 400), the transaction ROLLS BACK all changes.
 */
export function autoTransaction(req: Request, res: Response, next: NextFunction) {
    if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
        return next();
    }

    const targetUrl = req.originalUrl || req.url || req.path;

    // Skip transaction for explicit file stream uploads, health endpoints, or scraper background operations
    if (
        req.path.startsWith('/upload') ||
        req.path.startsWith('/health') ||
        targetUrl.includes('/scraper/')
    ) {
        return next();
    }

    const txOptions = resolveTransactionOptions(targetUrl);
    if (txOptions.skip) {
        return next();
    }

    let isFinished = false;

    basePrisma.$transaction(
        async (tx) => {
            return new Promise<void>((resolve, reject) => {
                const currentContext: RequestPrismaState = prismaRequestContext.getStore() || { cache: new Map() };
                currentContext.txClient = tx;

                // Intercept response finish
                const cleanup = () => {
                    if (isFinished) return;
                    isFinished = true;

                    if (res.statusCode >= 400) {
                        // HTTP error status code: Abort transaction
                        reject(new Error(`Transaction aborted: HTTP ${res.statusCode}`));
                    } else {
                        // Successful response: Commit transaction
                        resolve();
                    }
                };

                res.once('finish', cleanup);
                res.once('close', () => {
                    if (!isFinished) {
                        isFinished = true;
                        reject(new Error('Connection closed prematurely by client'));
                    }
                });

                // Run route handlers inside the updated context
                prismaRequestContext.run(currentContext, () => {
                    try {
                        next();
                    } catch (err) {
                        if (!isFinished) {
                            isFinished = true;
                            reject(err);
                        }
                    }
                });
            });
        },
        {
            maxWait: txOptions.maxWait,
            timeout: txOptions.timeout,
        }
    ).catch((err) => {
        // If transaction rolled back due to an error and response hasn't finished, delegate to Express error handler
        if (!res.headersSent) {
            next(err);
        } else {
            console.error('[AutoTransaction] Transaction rolled back after headers sent:', err?.message);
        }
    });
}
