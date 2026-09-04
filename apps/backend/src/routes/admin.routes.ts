import { Router, Response } from 'express';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { SystemService } from '../services/system.service';
import { AuditService } from '../services/audit.service';
import { DatabaseBackupService } from '../services/databaseBackup.service';
import { CronSchedulerService } from '../services/cronScheduler.service';

const router = Router();

// All routes require Super Admin Authentication
router.use(authenticateToken as any, requireSuperAdmin as any);

/**
 * GET /api/admin/dashboard
 * Global Super Admin system health & platform metrics
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
    try {
        const metrics = await SystemService.getSystemMetrics();
        res.json(metrics);
    } catch (err: any) {
        console.error('Admin Dashboard Error:', err);
        res.status(500).json({ error: 'Failed to load admin metrics' });
    }
});

/**
 * GET /api/admin/settings
 * Read current system settings with secrets masked
 */
router.get('/settings', async (req: AuthRequest, res: Response) => {
    try {
        const [mailgunConfig, smtpConfig, rateLimitConfig] = await Promise.all([
            SystemService.getMailgunConfig(),
            SystemService.getSmtpConfig(),
            SystemService.getRateLimitConfig(),
        ]);

        const maskedApiKey = mailgunConfig.apiKey
            ? mailgunConfig.apiKey.length > 8
                ? `${mailgunConfig.apiKey.substring(0, 4)}••••••••${mailgunConfig.apiKey.slice(-4)}`
                : '••••••••'
            : '';

        res.json({
            mailgun: {
                apiKey: maskedApiKey,
                hasApiKey: Boolean(mailgunConfig.apiKey),
                domain: mailgunConfig.domain,
                url: mailgunConfig.url,
                fromEmail: mailgunConfig.fromEmail,
                fromName: mailgunConfig.fromName,
                isConfigured: mailgunConfig.isConfigured,
            },
            smtp: {
                host: smtpConfig.host,
                port: smtpConfig.port,
                user: smtpConfig.user,
                hasPassword: Boolean(smtpConfig.pass),
                secure: smtpConfig.secure,
                from: smtpConfig.from,
                isConfigured: smtpConfig.isConfigured,
            },
            rateLimit: rateLimitConfig,
            environment: {
                nodeEnv: process.env.NODE_ENV || 'development',
                databaseProvider: 'PostgreSQL',
                redisConfigured: Boolean(process.env.REDIS_URL),
                s3Bucket: process.env.AWS_BUCKET_NAME || 'areena-assets',
            },
        });
    } catch (err: any) {
        console.error('Get Admin Settings Error:', err);
        res.status(500).json({ error: 'Failed to retrieve system settings' });
    }
});

/**
 * PUT /api/admin/settings/ratelimit
 * Update API Rate Limiting and Traffic Throttling settings
 */
router.put('/settings/ratelimit', async (req: AuthRequest, res: Response) => {
    try {
        const { enabled, capacity, refillRatePerSec, blockAnonymousBots } = req.body;

        const updated = await SystemService.updateRateLimitConfig(
            {
                enabled: enabled !== undefined ? Boolean(enabled) : undefined,
                capacity: capacity !== undefined ? Number(capacity) : undefined,
                refillRatePerSec: refillRatePerSec !== undefined ? Number(refillRatePerSec) : undefined,
                blockAnonymousBots: blockAnonymousBots !== undefined ? Boolean(blockAnonymousBots) : undefined,
            },
            req.user?.id
        );

        await AuditService.record({
            req,
            action: 'UPDATE_SYSTEM_SETTING',
            entityType: 'SystemSetting',
            entityId: 'RATE_LIMIT_CONFIG',
            description: `Updated Rate Limiter settings: enabled=${updated.enabled}, capacity=${updated.capacity}, refillRate=${updated.refillRatePerSec}/s`,
            metadata: updated,
        });

        res.json({
            message: 'Rate limiting settings updated successfully',
            rateLimit: updated,
        });
    } catch (err: any) {
        console.error('Update Rate Limit Settings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update rate limit settings' });
    }
});

/**
 * PUT /api/admin/settings/mailgun
 * Update Mailgun API & Delivery settings in Database
 */
router.put('/settings/mailgun', async (req: AuthRequest, res: Response) => {
    try {
        const { apiKey, domain, url, fromEmail, fromName } = req.body;

        const updated = await SystemService.updateMailgunConfig(
            { apiKey, domain, url, fromEmail, fromName },
            req.user?.id
        );

        await AuditService.record({
            req,
            action: 'UPDATE_SYSTEM_SETTING',
            entityType: 'SystemSetting',
            entityId: 'MAILGUN_CONFIG',
            description: `Updated Mailgun settings for domain: ${updated.domain}`,
            metadata: {
                domain: updated.domain,
                fromEmail: updated.fromEmail,
                url: updated.url,
                hasApiKey: Boolean(updated.apiKey),
            },
        });

        res.json({
            message: 'Mailgun settings updated successfully',
            mailgun: {
                hasApiKey: Boolean(updated.apiKey),
                domain: updated.domain,
                url: updated.url,
                fromEmail: updated.fromEmail,
                fromName: updated.fromName,
                isConfigured: updated.isConfigured,
            },
        });
    } catch (err: any) {
        console.error('Update Mailgun Settings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update Mailgun settings' });
    }
});

/**
 * POST /api/admin/settings/mailgun/test
 * Send a test email via configured Mailgun REST API credentials
 */
router.post('/settings/mailgun/test', async (req: AuthRequest, res: Response) => {
    try {
        const targetEmail = req.body.toEmail || req.user?.email;
        if (!targetEmail) {
            return res.status(400).json({ error: 'Target email address required' });
        }

        const result = await SystemService.testMailgunConnection(targetEmail);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        await AuditService.record({
            req,
            action: 'TEST_MAILGUN_CONNECTION',
            entityType: 'SystemSetting',
            entityId: 'MAILGUN_TEST',
            description: `Dispatched test email to ${targetEmail} (Message ID: ${result.messageId})`,
            metadata: { targetEmail, messageId: result.messageId },
        });

        res.json({
            success: true,
            message: `Test email successfully dispatched to ${targetEmail}`,
            messageId: result.messageId,
        });
    } catch (err: any) {
        console.error('Test Mailgun Error:', err);
        res.status(500).json({ error: err.message || 'Failed to send test email' });
    }
});

/**
 * PUT /api/admin/settings/smtp
 * Update SMTP Server & Relay settings in Database
 */
router.put('/settings/smtp', async (req: AuthRequest, res: Response) => {
    try {
        const { host, port, user, pass, secure, from } = req.body;

        const updated = await SystemService.updateSmtpConfig(
            { host, port: Number(port), user, pass, secure: Boolean(secure), from },
            req.user?.id
        );

        await AuditService.record({
            req,
            action: 'UPDATE_SYSTEM_SETTING',
            entityType: 'SystemSetting',
            entityId: 'SMTP_CONFIG',
            description: `Updated SMTP settings for host: ${updated.host}:${updated.port}`,
            metadata: {
                host: updated.host,
                port: updated.port,
                user: updated.user,
                secure: updated.secure,
                from: updated.from,
                hasPassword: Boolean(updated.pass),
            },
        });

        res.json({
            message: 'SMTP settings updated successfully',
            smtp: {
                host: updated.host,
                port: updated.port,
                user: updated.user,
                hasPassword: Boolean(updated.pass),
                secure: updated.secure,
                from: updated.from,
                isConfigured: updated.isConfigured,
            },
        });
    } catch (err: any) {
        console.error('Update SMTP Settings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update SMTP settings' });
    }
});

/**
 * POST /api/admin/settings/smtp/test
 * Send a test email via configured SMTP settings
 */
router.post('/settings/smtp/test', async (req: AuthRequest, res: Response) => {
    try {
        const targetEmail = req.body.toEmail || req.user?.email;
        if (!targetEmail) {
            return res.status(400).json({ error: 'Target email address required' });
        }

        const result = await SystemService.testSmtpConnection(targetEmail);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        await AuditService.record({
            req,
            action: 'TEST_SMTP_CONNECTION',
            entityType: 'SystemSetting',
            entityId: 'SMTP_TEST',
            description: `Dispatched SMTP test email to ${targetEmail} (Message ID: ${result.messageId})`,
            metadata: { targetEmail, messageId: result.messageId },
        });

        res.json({
            success: true,
            message: `SMTP test email successfully dispatched to ${targetEmail}`,
            messageId: result.messageId,
        });
    } catch (err: any) {
        console.error('Test SMTP Error:', err);
        res.status(500).json({ error: err.message || 'Failed to send SMTP test email' });
    }
});

/**
 * GET /api/admin/database/export
 * Dumps the whole database to a structured JSON file/payload
 */
router.get('/database/export', async (req: AuthRequest, res: Response) => {
    try {
        const dump = await DatabaseBackupService.exportFullDatabase();

        await AuditService.record({
            req,
            action: 'EXPORT_DATABASE_DUMP',
            entityType: 'Database',
            entityId: 'FULL_BACKUP',
            description: `SuperAdmin ${req.user?.email} exported full database JSON dump (${Object.values(dump.counts).reduce((a, b) => a + b, 0)} total rows)`,
            metadata: { counts: dump.counts, exportedAt: dump.exportedAt },
        });

        const filename = `areena-database-dump-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(dump);
    } catch (err: any) {
        console.error('Database Export Error:', err);
        res.status(500).json({ error: err.message || 'Failed to export database' });
    }
});

/**
 * POST /api/admin/database/import
 * Imports and restores the whole database from JSON
 */
router.post('/database/import', async (req: AuthRequest, res: Response) => {
    try {
        const dump = req.body;
        if (!dump || !dump.tables) {
            return res.status(400).json({ error: 'Invalid database dump: "tables" object is missing.' });
        }

        const result = await DatabaseBackupService.importFullDatabase(dump);

        await AuditService.record({
            req,
            action: 'IMPORT_DATABASE_DUMP',
            entityType: 'Database',
            entityId: 'FULL_RESTORE',
            description: `SuperAdmin ${req.user?.email} imported and restored full database JSON dump (${Object.values(result.importedCounts).reduce((a, b) => a + b, 0)} total rows restored)`,
            metadata: { importedCounts: result.importedCounts },
        });

        res.json({
            success: true,
            message: 'Database dump successfully imported and database restored.',
            importedCounts: result.importedCounts,
        });
    } catch (err: any) {
        console.error('Database Import Error:', err);
        res.status(500).json({ error: err.message || 'Failed to import database dump' });
    }
});

/**
 * GET /api/admin/cronjobs
 * List all cluster-wide registered cron jobs and their last run status
 */
router.get('/cronjobs', async (req: AuthRequest, res: Response) => {
    try {
        const statuses = await CronSchedulerService.getJobStatuses();
        res.json({ jobs: statuses });
    } catch (err: any) {
        console.error('Admin Cronjobs Error:', err);
        res.status(500).json({ error: 'Failed to fetch cronjob statuses' });
    }
});

/**
 * POST /api/admin/cronjobs/:name/run
 * Manually trigger a registered cronjob safely with distributed lock
 */
router.post('/cronjobs/:name/run', async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.params;
        const result = await CronSchedulerService.triggerManual(name);

        await AuditService.record({
            req,
            action: 'MANUAL_CRON_TRIGGER',
            entityType: 'CronJob',
            entityId: name,
            description: `Admin ${req.user?.email} triggered cronjob '${name}'`,
            metadata: { result },
        });

        res.json({ success: true, message: `Cronjob '${name}' executed`, result });
    } catch (err: any) {
        console.error(`Admin Cronjob Run Error (${req.params.name}):`, err);
        res.status(500).json({ error: err.message || 'Failed to trigger cronjob' });
    }
});

/**
 * PATCH /api/admin/cronjobs/:name/toggle
 * Enable or disable a cronjob cluster-wide
 */
router.patch('/cronjobs/:name/toggle', async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.params;
        const { enabled } = req.body;
        await CronSchedulerService.setJobEnabled(name, Boolean(enabled));

        await AuditService.record({
            req,
            action: enabled ? 'ENABLE_CRONJOB' : 'DISABLE_CRONJOB',
            entityType: 'CronJob',
            entityId: name,
            description: `Admin ${req.user?.email} ${enabled ? 'enabled' : 'disabled'} cronjob '${name}'`,
            metadata: { enabled },
        });

        res.json({ success: true, message: `Cronjob '${name}' is now ${enabled ? 'enabled' : 'disabled'}` });
    } catch (err: any) {
        console.error(`Admin Cronjob Toggle Error (${req.params.name}):`, err);
        res.status(500).json({ error: err.message || 'Failed to update cronjob status' });
    }
});

/**
 * DELETE /api/admin/cronjobs/:name
 * Delete/unregister a cronjob from memory and clean up its stored state
 */
router.delete('/cronjobs/:name', async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.params;
        const deleted = await CronSchedulerService.unregisterJob(name);

        await AuditService.record({
            req,
            action: 'DELETE_CRONJOB',
            entityType: 'CronJob',
            entityId: name,
            description: `Admin ${req.user?.email} deleted cronjob '${name}'`,
            metadata: { deleted },
        });

        res.json({ success: true, message: `Cronjob '${name}' deleted successfully` });
    } catch (err: any) {
        console.error(`Admin Cronjob Delete Error (${req.params.name}):`, err);
        res.status(500).json({ error: err.message || 'Failed to delete cronjob' });
    }
});

export default router;
