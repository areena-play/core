import { AsyncLocalStorage } from 'node:async_hooks';
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface RequestPrismaState {
    cache: Map<string, Promise<any>>;
    txClient?: Prisma.TransactionClient;
}

/**
 * Request-scoped storage for Prisma query deduplication and auto-transactions.
 */
export const prismaRequestContext = new AsyncLocalStorage<RequestPrismaState>();

/**
 * Express middleware that initializes an isolated context for each incoming request.
 * Automatically garbage-collected when the HTTP response finishes.
 */
export function prismaCacheContext(req: Request, res: Response, next: NextFunction) {
    prismaRequestContext.run({ cache: new Map() }, () => next());
}
