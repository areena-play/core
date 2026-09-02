import './env';
import { PrismaClient } from '@prisma/client';
import { prismaRequestContext } from '../middleware/prismaCacheContext';

export const basePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const MUTATION_OPERATIONS = new Set([
    'create',
    'createMany',
    'update',
    'updateMany',
    'upsert',
    'delete',
    'deleteMany',
]);

function invalidateModelCache(model: string) {
    const store = prismaRequestContext.getStore();
    if (!store) return;

    const prefix = `${model}:`;
    for (const key of store.cache.keys()) {
        if (key.startsWith(prefix)) {
            store.cache.delete(key);
        }
    }
}

function executeWithCache(
    model: string,
    operation: string,
    args: any,
    query: (args: any) => Promise<any>
): Promise<any> {
    const store = prismaRequestContext.getStore();
    if (!store) {
        return query(args);
    }

    const cacheKey = `${model}:${operation}:${JSON.stringify(args || {})}`;
    const existing = store.cache.get(cacheKey);
    if (existing) {
        return existing;
    }

    const promise = query(args);
    store.cache.set(cacheKey, promise);
    return promise;
}

export const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async findUnique({ model, operation, args, query }) {
                const store = prismaRequestContext.getStore();
                // If an active request transaction exists, delegate query to it
                if (store?.txClient && (store.txClient as any)[model]) {
                    return executeWithCache(model, operation, args, (a) => (store.txClient as any)[model][operation](a));
                }
                return executeWithCache(model, operation, args, query);
            },
            async findFirst({ model, operation, args, query }) {
                const store = prismaRequestContext.getStore();
                if (store?.txClient && (store.txClient as any)[model]) {
                    return executeWithCache(model, operation, args, (a) => (store.txClient as any)[model][operation](a));
                }
                return executeWithCache(model, operation, args, query);
            },
            async $allOperations({ model, operation, args, query }) {
                // Read-your-own-writes safety: Invalidate model cache on any mutation
                if (MUTATION_OPERATIONS.has(operation)) {
                    invalidateModelCache(model);
                }

                // If inside an active request-scoped transaction, route all mutations through txClient
                const store = prismaRequestContext.getStore();
                if (store?.txClient && (store.txClient as any)[model] && typeof (store.txClient as any)[model][operation] === 'function') {
                    return (store.txClient as any)[model][operation](args);
                }

                return query(args);
            },
        },
    },
});

export default prisma;
