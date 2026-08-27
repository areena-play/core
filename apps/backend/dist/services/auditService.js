"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const prisma_1 = require("../config/prisma");
const shared_1 = require("@areena/shared");
class AuditService {
    /**
     * Extracts reliable client IP address from Express Request
     */
    static extractIp(req) {
        if (!req)
            return '127.0.0.1';
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const list = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
            if (list)
                return list.trim().replace(/^::ffff:/, '');
        }
        const realIp = req.headers['x-real-ip'];
        if (realIp && typeof realIp === 'string') {
            return realIp.trim().replace(/^::ffff:/, '');
        }
        const socketIp = req.socket?.remoteAddress || req.ip;
        if (socketIp) {
            return socketIp.replace(/^::ffff:/, '');
        }
        return '127.0.0.1';
    }
    /**
     * Extracts User-Agent string from Request
     */
    static extractUserAgent(req) {
        if (!req)
            return 'Internal System';
        const ua = req.headers['user-agent'];
        return ua ? String(ua).slice(0, 500) : 'Unknown Client';
    }
    /**
     * Records an immutable audit log entry in the database
     */
    static async record(params) {
        try {
            const req = params.req;
            const authUser = req?.user;
            const userId = params.userId !== undefined ? params.userId : authUser?.id || null;
            const userEmail = params.userEmail ||
                authUser?.email ||
                (req?.body?.email ? String(req.body.email) : 'system@areena.internal');
            const userName = params.userName ||
                (authUser ? `${authUser.firstName} ${authUser.lastName}`.trim() : null);
            const ipAddress = params.ipAddress || this.extractIp(req);
            const userAgent = params.userAgent || this.extractUserAgent(req);
            const category = params.category || shared_1.AuditCategory.GOVERNANCE;
            const status = params.status || 'SUCCESS';
            const metadata = params.metadata || {};
            return await prisma_1.prisma.auditLog.create({
                data: {
                    userId,
                    userEmail,
                    userName,
                    action: params.action,
                    category,
                    entityType: params.entityType || null,
                    entityId: params.entityId || null,
                    associationId: params.associationId || null,
                    clubId: params.clubId || null,
                    tournamentId: params.tournamentId || null,
                    description: params.description,
                    status,
                    ipAddress,
                    userAgent,
                    metadata: metadata,
                },
            });
        }
        catch (error) {
            // Fail-safe: Log error to console without breaking main business logic execution
            console.error('[AuditService.record] Failed to record audit log:', error);
            return null;
        }
    }
    /**
     * Query audit logs with rich filters and pagination
     */
    static async queryLogs(filters) {
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.associationId)
            where.associationId = filters.associationId;
        if (filters.clubId)
            where.clubId = filters.clubId;
        if (filters.tournamentId)
            where.tournamentId = filters.tournamentId;
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.category)
            where.category = filters.category;
        if (filters.action)
            where.action = filters.action;
        if (filters.status)
            where.status = filters.status;
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate)
                where.createdAt.lte = new Date(filters.endDate);
        }
        if (filters.search) {
            const query = filters.search.trim();
            where.OR = [
                { userEmail: { contains: query, mode: 'insensitive' } },
                { userName: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { ipAddress: { contains: query, mode: 'insensitive' } },
                { action: { contains: query, mode: 'insensitive' } },
                { entityId: { contains: query, mode: 'insensitive' } },
            ];
        }
        const [total, logs] = await Promise.all([
            prisma_1.prisma.auditLog.count({ where }),
            prisma_1.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    association: {
                        select: {
                            id: true,
                            name: true,
                            shortName: true,
                        },
                    },
                    club: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
        ]);
        return {
            data: logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Compute statistics and KPIs across audit events
     */
    static async getStats(filters) {
        const where = {};
        if (filters.associationId)
            where.associationId = filters.associationId;
        if (filters.clubId)
            where.clubId = filters.clubId;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const [totalLogs, todayLogs, allLogs] = await Promise.all([
            prisma_1.prisma.auditLog.count({ where }),
            prisma_1.prisma.auditLog.count({
                where: {
                    ...where,
                    createdAt: { gte: startOfToday },
                },
            }),
            prisma_1.prisma.auditLog.findMany({
                where,
                select: {
                    category: true,
                    status: true,
                    userEmail: true,
                    userName: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 1000,
            }),
        ]);
        const categoryBreakdown = {};
        const statusBreakdown = {};
        const actorCounts = {};
        const timelineMap = {};
        allLogs.forEach((log) => {
            categoryBreakdown[log.category] = (categoryBreakdown[log.category] || 0) + 1;
            statusBreakdown[log.status] = (statusBreakdown[log.status] || 0) + 1;
            if (log.userEmail) {
                if (!actorCounts[log.userEmail]) {
                    actorCounts[log.userEmail] = {
                        email: log.userEmail,
                        name: log.userName || log.userEmail,
                        count: 0,
                    };
                }
                actorCounts[log.userEmail].count++;
            }
            const dateKey = log.createdAt.toISOString().split('T')[0];
            timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
        });
        const topActors = Object.values(actorCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((a) => ({ userEmail: a.email, userName: a.name, count: a.count }));
        const recentTimeline = Object.entries(timelineMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-14)
            .map(([date, count]) => ({ date, count }));
        return {
            totalLogs,
            todayLogs,
            categoryBreakdown,
            statusBreakdown,
            topActors,
            recentTimeline,
        };
    }
}
exports.AuditService = AuditService;
