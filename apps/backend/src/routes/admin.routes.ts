import { Router, Response } from 'express';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { registerTransactionTimeout } from '../middleware/autoTransaction';
import { SystemService } from '../services/system.service';
import { AuditService } from '../services/audit.service';
import { DatabaseBackupService } from '../services/databaseBackup.service';
import { CronSchedulerService } from '../services/cronScheduler.service';
import { ClickTTImportService } from '../services/clickttImport.service';
import { GeminiService } from '../services/gemini.service';
import { GoogleTtsService } from '../services/tts.service';

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
        const [mailgunConfig, smtpConfig, rateLimitConfig, stripeConfig, geminiConfig, googleTtsConfig] = await Promise.all([
            SystemService.getMailgunConfig(),
            SystemService.getSmtpConfig(),
            SystemService.getRateLimitConfig(),
            SystemService.getStripeConfig(),
            SystemService.getGeminiConfig(),
            SystemService.getGoogleTtsConfig(),
        ]);

        const maskedApiKey = mailgunConfig.apiKey
            ? mailgunConfig.apiKey.length > 8
                ? `${mailgunConfig.apiKey.substring(0, 4)}••••••••${mailgunConfig.apiKey.slice(-4)}`
                : '••••••••'
            : '';

        const maskedStripeSecret = stripeConfig.secretKey
            ? stripeConfig.secretKey.length > 12
                ? `${stripeConfig.secretKey.substring(0, 7)}••••••••${stripeConfig.secretKey.slice(-4)}`
                : '••••••••'
            : '';

        const maskedStripeWebhook = stripeConfig.webhookSecret
            ? stripeConfig.webhookSecret.length > 10
                ? `${stripeConfig.webhookSecret.substring(0, 6)}••••••••${stripeConfig.webhookSecret.slice(-4)}`
                : '••••••••'
            : '';

        const maskedGeminiKey = geminiConfig.apiKey
            ? geminiConfig.apiKey.length > 8
                ? `${geminiConfig.apiKey.substring(0, 6)}••••••••${geminiConfig.apiKey.slice(-4)}`
                : '••••••••'
            : '';

        const maskedGoogleTtsKey = googleTtsConfig.apiKey
            ? googleTtsConfig.apiKey.length > 8
                ? `${googleTtsConfig.apiKey.substring(0, 6)}••••••••${googleTtsConfig.apiKey.slice(-4)}`
                : '••••••••'
            : '';

        res.json({
            stripe: {
                publishableKey: stripeConfig.publishableKey,
                hasSecretKey: stripeConfig.hasSecretKey,
                secretKeyMasked: maskedStripeSecret,
                hasWebhookSecret: stripeConfig.hasWebhookSecret,
                webhookSecretMasked: maskedStripeWebhook,
                proMonthlyPriceId: stripeConfig.proMonthlyPriceId,
                proYearlyPriceId: stripeConfig.proYearlyPriceId,
                isConfigured: stripeConfig.isConfigured,
            },
            gemini: {
                apiKey: maskedGeminiKey,
                hasApiKey: Boolean(geminiConfig.apiKey),
                model: geminiConfig.model,
                enabled: geminiConfig.enabled,
                isConfigured: geminiConfig.isConfigured,
            },
            googleTts: {
                apiKey: maskedGoogleTtsKey,
                hasApiKey: Boolean(googleTtsConfig.apiKey),
                languageCode: googleTtsConfig.languageCode,
                voiceName: googleTtsConfig.voiceName,
                enabled: googleTtsConfig.enabled,
                isConfigured: googleTtsConfig.isConfigured,
            },
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
 * PUT /api/admin/settings/stripe
 * Update Stripe API credentials & Price IDs in Database
 */
router.put('/settings/stripe', async (req: AuthRequest, res: Response) => {
    try {
        const { secretKey, publishableKey, webhookSecret, proMonthlyPriceId, proYearlyPriceId } = req.body;

        const updated = await SystemService.updateStripeConfig(
            {
                secretKey,
                publishableKey,
                webhookSecret,
                proMonthlyPriceId,
                proYearlyPriceId,
            },
            req.user?.id
        );

        await AuditService.record({
            req,
            action: 'UPDATE_SYSTEM_SETTING',
            entityType: 'SystemSetting',
            entityId: 'STRIPE_CONFIG',
            description: `Updated Stripe settings (Configured: ${updated.isConfigured}, Monthly Price ID: ${updated.proMonthlyPriceId || 'Default'}, Annual Price ID: ${updated.proYearlyPriceId || 'Default'})`,
            metadata: {
                hasSecretKey: updated.hasSecretKey,
                hasWebhookSecret: updated.hasWebhookSecret,
                publishableKey: updated.publishableKey,
                proMonthlyPriceId: updated.proMonthlyPriceId,
                proYearlyPriceId: updated.proYearlyPriceId,
            },
        });

        res.json({
            message: 'Stripe settings updated successfully',
            stripe: {
                publishableKey: updated.publishableKey,
                hasSecretKey: updated.hasSecretKey,
                hasWebhookSecret: updated.hasWebhookSecret,
                proMonthlyPriceId: updated.proMonthlyPriceId,
                proYearlyPriceId: updated.proYearlyPriceId,
                isConfigured: updated.isConfigured,
            },
        });
    } catch (err: any) {
        console.error('Update Stripe Settings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update Stripe settings' });
    }
});

/**
 * POST /api/admin/settings/stripe/test
 * Validate and test live Stripe API credentials
 */
router.post('/settings/stripe/test', async (req: AuthRequest, res: Response) => {
    try {
        const result = await SystemService.testStripeConnection();
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        await AuditService.record({
            req,
            action: 'TEST_STRIPE_CONNECTION',
            entityType: 'SystemSetting',
            entityId: 'STRIPE_TEST',
            description: `Tested Stripe API connection: SUCCESS (Livemode: ${result.livemode}, Currency: ${result.defaultCurrency})`,
            metadata: result,
        });

        res.json({
            message: `Stripe API connection verified successfully (${result.livemode ? 'Live Mode' : 'Test Mode'}, Currency: ${result.defaultCurrency})`,
            ...result,
        });
    } catch (err: any) {
        console.error('Test Stripe Error:', err);
        res.status(500).json({ error: err.message || 'Failed to test Stripe connection' });
    }
});

/**
 * PUT /api/admin/settings/gemini
 * Update Gemini AI API credentials & settings in Database
 */
router.put('/settings/gemini', async (req: AuthRequest, res: Response) => {
    try {
        const { apiKey, model, enabled } = req.body;

        const updated = await SystemService.updateGeminiConfig(
            {
                apiKey,
                model,
                enabled: enabled !== undefined ? Boolean(enabled) : undefined,
            },
            req.user?.id
        );

        await AuditService.record({
            req,
            action: 'UPDATE_SYSTEM_SETTING',
            entityType: 'SystemSetting',
            entityId: 'GEMINI_CONFIG',
            description: `Updated Gemini AI settings (Model: ${updated.model}, Enabled: ${updated.enabled}, HasKey: ${updated.hasApiKey})`,
            metadata: {
                hasApiKey: updated.hasApiKey,
                model: updated.model,
                enabled: updated.enabled,
            },
        });

        res.json({
            message: 'Gemini AI settings updated successfully',
            gemini: {
                hasApiKey: updated.hasApiKey,
                model: updated.model,
                enabled: updated.enabled,
                isConfigured: updated.isConfigured,
            },
        });
    } catch (err: any) {
        console.error('Update Gemini Settings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update Gemini settings' });
    }
});

/**
 * POST /api/admin/settings/gemini/models
 * Fetch all available Gemini models using stored or provided API key
 */
router.post('/settings/gemini/models', async (req: AuthRequest, res: Response) => {
    try {
        const { apiKey } = req.body;
        const result = await GeminiService.listAvailableModels(apiKey);
        res.json(result);
    } catch (err: any) {
        console.error('List Gemini Models Error:', err);
        res.status(500).json({ error: err.message || 'Failed to list Gemini models', models: GeminiService.getFallbackModels() });
    }
});

/**
 * GET /api/admin/settings/gemini/models
 */
router.get('/settings/gemini/models', async (req: AuthRequest, res: Response) => {
    try {
        const result = await GeminiService.listAvailableModels();
        res.json(result);
    } catch (err: any) {
        console.error('List Gemini Models Error:', err);
        res.status(500).json({ error: err.message || 'Failed to list Gemini models', models: GeminiService.getFallbackModels() });
    }
});

/**
 * POST /api/admin/settings/gemini/test
 * Validate and test live Gemini AI API credentials
 */
router.post('/settings/gemini/test', async (req: AuthRequest, res: Response) => {
    try {
        const { apiKey, model } = req.body;
        const result = await GeminiService.testConnection({ apiKey, model });
        if (!result.success) {
            return res.status(400).json({ error: result.error, model: result.model });
        }

        await AuditService.record({
            req,
            action: 'TEST_GEMINI_CONNECTION',
            entityType: 'SystemSetting',
            entityId: 'GEMINI_TEST',
            description: `Tested Gemini AI connection: SUCCESS (Model: ${result.model})`,
            metadata: result,
        });

        res.json({
            message: `Gemini AI connected successfully using ${result.model}`,
            ...result,
        });
    } catch (err: any) {
        console.error('Test Gemini Error:', err);
        res.status(500).json({ error: err.message || 'Failed to test Gemini connection' });
    }
});

/**
 * PUT /api/admin/settings/tts
 * Update Google Text-to-Speech API credentials & settings in Database
 */
router.put('/settings/tts', async (req: AuthRequest, res: Response) => {
    try {
        const { apiKey, languageCode, voiceName, enabled } = req.body;

        const updated = await SystemService.updateGoogleTtsConfig(
            {
                apiKey,
                languageCode,
                voiceName,
                enabled: enabled !== undefined ? Boolean(enabled) : undefined,
            },
            req.user?.id
        );

        await AuditService.record({
            req,
            action: 'UPDATE_SYSTEM_SETTING',
            entityType: 'SystemSetting',
            entityId: 'GOOGLE_TTS_CONFIG',
            description: `Updated Google TTS settings (Language: ${updated.languageCode}, Voice: ${updated.voiceName}, Enabled: ${updated.enabled})`,
            metadata: {
                hasApiKey: updated.hasApiKey,
                languageCode: updated.languageCode,
                voiceName: updated.voiceName,
                enabled: updated.enabled,
            },
        });

        res.json({
            message: 'Google TTS settings updated successfully',
            googleTts: {
                hasApiKey: updated.hasApiKey,
                languageCode: updated.languageCode,
                voiceName: updated.voiceName,
                enabled: updated.enabled,
                isConfigured: updated.isConfigured,
            },
        });
    } catch (err: any) {
        console.error('Update Google TTS Settings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update Google TTS settings' });
    }
});

/**
 * POST /api/admin/settings/tts/test
 * Validate and test live Google Cloud Text-to-Speech API
 */
router.post('/settings/tts/test', async (req: AuthRequest, res: Response) => {
    try {
        const result = await GoogleTtsService.testConnection();
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        await AuditService.record({
            req,
            action: 'TEST_GOOGLE_TTS_CONNECTION',
            entityType: 'SystemSetting',
            entityId: 'GOOGLE_TTS_TEST',
            description: `Tested Google TTS connection: SUCCESS (Voice: ${result.voiceName})`,
            metadata: { voiceName: result.voiceName, languageCode: result.languageCode },
        });

        res.json({
            message: `Google TTS speech synthesis verified successfully (${result.voiceName})`,
            ...result,
        });
    } catch (err: any) {
        console.error('Test Google TTS Error:', err);
        res.status(500).json({ error: err.message || 'Failed to test Google TTS connection' });
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

/**
 * GET /api/admin/import/clicktt/status
 * Check availability of local ClickTT scraped data files
 */
router.get('/import/clicktt/status', async (req: AuthRequest, res: Response) => {
    try {
        const customPath = req.query.path as string | undefined;
        const status = ClickTTImportService.checkDataset(customPath);
        res.json(status);
    } catch (err: any) {
        console.error('ClickTT Status Check Error:', err);
        res.status(500).json({ error: err.message || 'Failed to check ClickTT dataset status' });
    }
});

/**
 * POST /api/admin/import/clicktt
 * Trigger ClickTT import into Areena database
 */
router.post('/import/clicktt', async (req: AuthRequest, res: Response) => {
    try {
        const {
            dataPath,
            dryRun,
            batchSize,
            importLicenses,
            importEncounters,
            importMatches,
            maxMeetings,
            seasonsFilter,
        } = req.body || {};

        const result = await ClickTTImportService.importClickTTData({
            dataPath,
            dryRun: Boolean(dryRun),
            batchSize: batchSize ? parseInt(batchSize, 10) : undefined,
            importLicenses: importLicenses !== false,
            importEncounters: importEncounters !== false,
            importMatches: importMatches !== false,
            maxMeetings: maxMeetings ? parseInt(maxMeetings, 10) : undefined,
            seasonsFilter: Array.isArray(seasonsFilter) ? seasonsFilter : undefined,
        });

        await AuditService.record({
            req,
            action: dryRun ? 'CLICKTT_IMPORT_DRY_RUN' : 'CLICKTT_IMPORT_EXECUTE',
            entityType: 'ClickTTImport',
            entityId: 'global',
            description: `Admin ${req.user?.email} executed ClickTT data import (dryRun: ${dryRun})`,
            metadata: {
                dryRun,
                associationsProcessed: result.associationsProcessed,
                seasonsProcessed: result.seasonsProcessed,
                clubsProcessed: result.clubsProcessed,
                competitionsProcessed: result.competitionsProcessed,
                categoriesProcessed: result.categoriesProcessed,
                playersProcessed: result.playersProcessed,
                tcardPlayersProcessed: result.tcardPlayersProcessed,
                licensesCreated: result.licensesCreated,
                encountersProcessed: result.encountersProcessed,
                matchesProcessed: result.matchesProcessed,
                durationMs: result.durationMs,
            },
        });

        res.json(result);
    } catch (err: any) {
        console.error('ClickTT Import Execution Error:', err);
        res.status(500).json({ error: err.message || 'ClickTT import failed' });
    }
});
// Register custom 10-minute transaction timeout for ClickTT bulk ingestion
registerTransactionTimeout('/admin/import/clicktt', {
    timeout: 15 * 60 * 1000, // 15 minutes
    maxWait: 2 * 60 * 1000,  // 2 minutes
});

export default router;
