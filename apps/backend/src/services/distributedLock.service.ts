import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

export interface LockOptions {
    timeoutMs?: number;
}

export class DistributedLockService {
    /**
     * Executes an async operation with guaranteed cluster-wide mutual exclusion
     * using native PostgreSQL Transaction Advisory Locks (pg_advisory_xact_lock).
     *
     * How it works:
     * 1. Begins an isolated database transaction.
     * 2. Acquires pg_advisory_xact_lock(hashtext(resource)) on the PostgreSQL server.
     *    Any other backend instance (on any VPS or container) attempting to lock the same resource
     *    will wait safely in line until this transaction completes.
     * 3. Executes the callback, providing the transactional client `tx`.
     * 4. When the transaction commits or rolls back, PostgreSQL automatically and unconditionally
     *    releases the advisory lock. No orphaned or leaked locks are possible, even on process crashes.
     */
    static async withLock<T>(
        resource: string,
        operation: (tx: Prisma.TransactionClient) => Promise<T>,
        options: LockOptions = {},
    ): Promise<T> {
        return await prisma.$transaction(
            async (tx) => {
                // Acquire cluster-wide transaction-scoped advisory lock
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${resource}))`;
                return await operation(tx as any);
            },
            {
                timeout: options.timeoutMs || 20000, // 20s default timeout
            },
        );
    }

    /**
     * Attempts to acquire an immediate advisory lock without waiting.
     * If another instance/VPS already holds the lock, returns `null` (or skips)
     * instead of blocking in line. Ideal for scheduled cronjobs!
     */
    static async tryWithLock<T>(
        resource: string,
        operation: (tx: Prisma.TransactionClient) => Promise<T>,
        options: LockOptions = {},
    ): Promise<{ acquired: boolean; result?: T }> {
        return await prisma.$transaction(
            async (tx) => {
                const lockResult = await tx.$queryRaw<{ acquired: boolean }[]>`
                    SELECT pg_try_advisory_xact_lock(hashtext(${resource})) AS acquired
                `;

                const acquired = lockResult?.[0]?.acquired ?? false;
                if (!acquired) {
                    return { acquired: false };
                }

                const result = await operation(tx as any);
                return { acquired: true, result };
            },
            {
                timeout: options.timeoutMs || 60000, // 60s timeout
            },
        );
    }
}
