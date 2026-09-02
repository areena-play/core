import { Request, Response, NextFunction } from 'express';
import { prismaRequestContext, RequestPrismaState } from './prismaCacheContext';
import { basePrisma } from '../config/prisma';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Automatically wraps mutating HTTP requests (POST, PUT, PATCH, DELETE) in an atomic database transaction.
 *
 * How it works:
 * 1. Begins a PostgreSQL transaction.
 * 2. Injects the active transaction client (`tx`) into the request-scoped AsyncLocalStorage.
 * 3. All `prisma.<model>.<action>` calls throughout the application automatically route through `tx`.
 * 4. If the route succeeds (response sent), the transaction COMMITS.
 * 5. If any error is thrown (or res.status >= 400), the transaction ROLLS BACK all changes.
 */
export function autoTransaction(req: Request, res: Response, next: NextFunction) {
    if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
        return next();
    }

    // Skip transaction for explicit file stream uploads or health endpoints
    if (req.path.startsWith('/upload') || req.path.startsWith('/health')) {
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
            timeout: 30000, // 30s transaction timeout for complex operations
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
