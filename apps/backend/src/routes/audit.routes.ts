import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditLogQuerySchema } from '@areena/shared';
import { AuditService } from '../services/audit.service';

const router = Router();

// Helper to check audit access permission
function checkAuditAccess(req: AuthRequest, associationId?: string, clubId?: string): boolean {
    if (!req.user) return false;
    if (req.user.isSuperAdmin) return true;

    // Association admin can view logs for their association
    if (associationId) {
        return req.user.associationRoles.some((r) => r.associationId === associationId);
    }

    // Club admin can view logs for their club
    if (clubId) {
        return req.user.clubRoles.some((r) => r.clubId === clubId);
    }

    // Has any association admin role -> can view federation logs
    if (req.user.associationRoles.length > 0) return true;

    return false;
}

// GET /audit-logs - Query audit trail with rich filters
router.get(
    '/',
    authenticateToken,
    validate(auditLogQuerySchema, 'query'),
    async (req: AuthRequest, res: Response, next) => {
        try {
            const query = req.query as any;

            if (!checkAuditAccess(req, query.associationId, query.clubId)) {
                return res.status(403).json({ error: 'Access denied to audit logs' });
            }

            const result = await AuditService.queryLogs(query);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
);

// GET /audit-logs/stats - Aggregate KPIs and activity summary
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const { associationId, clubId } = req.query as { associationId?: string; clubId?: string };

        if (!checkAuditAccess(req, associationId, clubId)) {
            return res.status(403).json({ error: 'Access denied to audit statistics' });
        }

        const stats = await AuditService.getStats({ associationId, clubId });
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

// GET /audit-logs/export - Export audit logs as CSV or JSON
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const query = req.query as any;
        const format = (query.format as string) || 'csv';

        if (!checkAuditAccess(req, query.associationId, query.clubId)) {
            return res.status(403).json({ error: 'Access denied to export audit logs' });
        }

        const result = await AuditService.queryLogs({
            ...query,
            page: 1,
            limit: 1000,
        });

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=areena-audit-logs-${Date.now()}.json`);
            return res.send(JSON.stringify(result.data, null, 2));
        }

        // Generate CSV format
        const headers = [
            'ID',
            'Timestamp',
            'Category',
            'Action',
            'Status',
            'User Name',
            'User Email',
            'IP Address',
            'User Agent',
            'Description',
            'Entity Type',
            'Entity ID',
        ];

        const rows = result.data.map((log: any) => [
            `"${log.id}"`,
            `"${log.createdAt.toISOString()}"`,
            `"${log.category}"`,
            `"${log.action}"`,
            `"${log.status}"`,
            `"${(log.userName || '').replace(/"/g, '""')}"`,
            `"${(log.userEmail || '').replace(/"/g, '""')}"`,
            `"${log.ipAddress}"`,
            `"${(log.userAgent || '').replace(/"/g, '""')}"`,
            `"${(log.description || '').replace(/"/g, '""')}"`,
            `"${log.entityType || ''}"`,
            `"${log.entityId || ''}"`,
        ]);

        const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=areena-audit-logs-${Date.now()}.csv`);
        res.send(csvContent);
    } catch (err) {
        next(err);
    }
});

export default router;

