import { Router, Response } from 'express';
import multer from 'multer';
import os from 'os';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/auth';
import { registerTransactionTimeout } from '../middleware/autoTransaction';
import { SystemService } from '../services/system.service';
import { AuditService } from '../services/audit.service';
import { DatabaseBackupService } from '../services/databaseBackup.service';
import { CronSchedulerService } from '../services/cronScheduler.service';
import { ClickTTScraperService } from '../services/clickttScraper.service';
import { GeminiService } from '../services/gemini.service';
import { GoogleTtsService } from '../services/tts.service';

const router = Router();

const backupUpload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB max file size
});

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
        const [mailgunConfig, smtpConfig, rateLimitConfig, stripeConfig, geminiConfig, googleTtsConfig, googleAnalyticsConfig] = await Promise.all([
            SystemService.getMailgunConfig(),
            SystemService.getSmtpConfig(),
            SystemService.getRateLimitConfig(),
            SystemService.getStripeConfig(),
            SystemService.getGeminiConfig(),
            SystemService.getGoogleTtsConfig(),
            SystemService.getGoogleAnalyticsConfig(),
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
            googleAnalytics: {
                measurementId: googleAnalyticsConfig.measurementId,
                enabled: googleAnalyticsConfig.enabled,
                anonymizeIp: googleAnalyticsConfig.anonymizeIp,
                isConfigured: googleAnalyticsConfig.isConfigured,
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
 * PUT /api/admin/settings/google-analytics
 * Update Google Analytics 4 (GA4) configuration in Database
 */
router.put('/settings/google-analytics', async (req: AuthRequest, res: Response) => {
    try {
        const { measurementId, enabled, anonymizeIp } = req.body;

        if (measurementId !== undefined && measurementId.trim() !== '') {
            const cleanId = measurementId.trim().toUpperCase();
            if (!/^G-[A-Z0-9]+$/i.test(cleanId)) {
                return res.status(400).json({
                    error: 'Invalid Google Analytics Measurement ID format. Expected format: G-XXXXXXXXXX',
                });
            }
        }

        const updated = await SystemService.updateGoogleAnalyticsConfig(
            {
                measurementId: measurementId !== undefined ? measurementId.trim().toUpperCase() : undefined,
                enabled: enabled !== undefined ? Boolean(enabled) : undefined,
                anonymizeIp: anonymizeIp !== undefined ? Boolean(anonymizeIp) : undefined,
            },
            req.user?.id
        );

        await AuditService.record({
            req,
            action: 'UPDATE_SYSTEM_SETTING',
            entityType: 'SystemSetting',
            entityId: 'GOOGLE_ANALYTICS_CONFIG',
            description: `Updated Google Analytics settings (Measurement ID: ${updated.measurementId || 'none'}, Enabled: ${updated.enabled}, AnonymizeIP: ${updated.anonymizeIp})`,
            metadata: {
                measurementId: updated.measurementId,
                enabled: updated.enabled,
                anonymizeIp: updated.anonymizeIp,
                isConfigured: updated.isConfigured,
            },
        });

        res.json({
            message: 'Google Analytics settings updated successfully',
            googleAnalytics: updated,
        });
    } catch (err: any) {
        console.error('Update Google Analytics Settings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update Google Analytics settings' });
    }
});

/**
 * GET /api/admin/database/export
 * Streams a compressed native PostgreSQL database dump (.dump)
 */
router.get('/database/export', async (req: AuthRequest, res: Response) => {
    try {
        await AuditService.record({
            req,
            action: 'EXPORT_DATABASE_DUMP',
            entityType: 'Database',
            entityId: 'FULL_BACKUP',
            description: `SuperAdmin ${req.user?.email} exported native PostgreSQL database dump`,
        });

        await DatabaseBackupService.streamDatabaseDump(res);
    } catch (err: any) {
        console.error('Database Export Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Failed to export database' });
        }
    }
});

/**
 * POST /api/admin/database/import
 * Restores the whole database from an uploaded PostgreSQL backup file (.dump / .sql)
 */
router.post('/database/import', backupUpload.single('backupFile'), async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                error: 'No backup file uploaded. Please upload a valid .dump or .sql backup file in "backupFile" field.',
            });
        }

        const result = await DatabaseBackupService.restoreDatabaseFromFile(file.path);

        await AuditService.record({
            req,
            action: 'IMPORT_DATABASE_DUMP',
            entityType: 'Database',
            entityId: 'FULL_RESTORE',
            description: `SuperAdmin ${req.user?.email} restored native PostgreSQL database from uploaded backup (${file.originalname}, ${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
            metadata: { originalName: file.originalname, sizeBytes: file.size },
        });

        res.json({
            success: true,
            message: result.message || 'Database backup successfully restored.',
        });
    } catch (err: any) {
        console.error('Database Import Error:', err);
        res.status(500).json({ error: err.message || 'Failed to restore database from backup file' });
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
 * POST /api/admin/cronjobs/:name/run & POST /api/admin/cronjobs/:name/trigger
 * Manually trigger a registered cronjob safely with distributed lock
 */
router.post(['/cronjobs/:name/run', '/cronjobs/:name/trigger'], async (req: AuthRequest, res: Response) => {
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
 * GET /api/admin/scraper/status
 * Get real-time ClickTT Scraper execution status and checkpoint summary
 */
router.get('/scraper/status', async (req: AuthRequest, res: Response) => {
    try {
        const status = await ClickTTScraperService.getStatus();
        res.json(status);
    } catch (err: any) {
        console.error('ClickTT Scraper Status Error:', err);
        res.status(500).json({ error: err.message || 'Failed to get scraper status' });
    }
});

/**
 * GET /api/admin/scraper/logs
 * Get live log stream / history from ClickTT Scraper memory buffer
 */
router.get('/scraper/logs', async (req: AuthRequest, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 200;
        const logs = ClickTTScraperService.getLogs(isNaN(limit) ? 200 : limit);
        res.json({ logs });
    } catch (err: any) {
        console.error('ClickTT Scraper Logs Error:', err);
        res.status(500).json({ error: err.message || 'Failed to get scraper logs' });
    }
});

/**
 * DELETE /api/admin/scraper/logs
 * Clear the in-memory scraper log buffer
 */
router.delete('/scraper/logs', async (req: AuthRequest, res: Response) => {
    try {
        ClickTTScraperService.clearLogs();
        res.json({ success: true, message: 'Scraper logs cleared.' });
    } catch (err: any) {
        console.error('ClickTT Clear Scraper Logs Error:', err);
        res.status(500).json({ error: err.message || 'Failed to clear scraper logs' });
    }
});

/**
 * GET /api/admin/scraper/config
 * Get ClickTT Scraper configuration (.env / SystemSetting)
 */
router.get('/scraper/config', async (req: AuthRequest, res: Response) => {
    try {
        const config = await SystemService.getClickTTScraperConfig();
        res.json(config);
    } catch (err: any) {
        console.error('ClickTT Scraper Config Error:', err);
        res.status(500).json({ error: err.message || 'Failed to load scraper config' });
    }
});

/**
 * PUT /api/admin/scraper/config
 * Save ClickTT Scraper configuration directly from Admin Dashboard
 */
router.put('/scraper/config', async (req: AuthRequest, res: Response) => {
    try {
        const updated = await SystemService.updateClickTTScraperConfig(req.body, req.user?.email);

        await AuditService.record({
            req,
            action: 'UPDATE_CLICKTT_SCRAPER_CONFIG',
            entityType: 'SystemSetting',
            entityId: 'CLICKTT_SCRAPER',
            description: `Admin ${req.user?.email} updated Click-TT Scraper configuration`,
            metadata: {
                baseUrl: updated.baseUrl,
                fedNickname: updated.fedNickname,
                concurrency: updated.concurrency,
                requestDelayMs: updated.requestDelayMs,
            },
        });

        res.json(updated);
    } catch (err: any) {
        console.error('Update ClickTT Scraper Config Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update scraper config' });
    }
});

/**
 * POST /api/admin/scraper/run
 * Trigger a background Scraper job (initial, sync, results, players, elo, export)
 */
router.post('/scraper/run', async (req: AuthRequest, res: Response) => {
    try {
        const { jobType = 'sync', options = {}, background = true } = req.body;

        await AuditService.record({
            req,
            action: `RUN_CLICKTT_SCRAPER_${String(jobType).toUpperCase()}`,
            entityType: 'ClickTTScraper',
            entityId: jobType,
            description: `Admin ${req.user?.email} triggered Click-TT Scraper job '${jobType}'`,
            metadata: { jobType, options, background },
        });

        if (background) {
            // Launch in background
            ClickTTScraperService.runJob(jobType, options).catch((err) => {
                console.error(`[ClickTTScraper Background Error (${jobType})]:`, err);
            });
            res.json({ success: true, message: `Scraper task '${jobType}' launched in background.` });
        } else {
            // Wait for job completion
            await ClickTTScraperService.runJob(jobType, options);
            res.json({ success: true, message: `Scraper task '${jobType}' completed.` });
        }
    } catch (err: any) {
        console.error('Run ClickTT Scraper Error:', err);
        res.status(400).json({ error: err.message || 'Failed to start scraper task' });
    }
});

/**
 * POST /api/admin/scraper/reset-and-import
 * Danger Zone: Wipe sports data and bulk-load all normalized V2 datasets
 */
router.post('/scraper/reset-and-import', async (req: AuthRequest, res: Response) => {
    try {
        const { background = true } = req.body;

        await AuditService.record({
            req,
            action: 'RESET_AND_IMPORT_DATABASE',
            entityType: 'Database',
            entityId: 'FULL_RESET',
            description: `Admin ${req.user?.email} initiated full database reset and bulk import from Click-TT datasets`,
            metadata: { background },
        });

        if (background) {
            ClickTTScraperService.runJob('reset-db', {}).catch((err) => {
                console.error('[ClickTTScraper Background Reset-DB Error]:', err);
            });
            res.json({ success: true, message: 'Full database reset and bulk reload launched in background.' });
        } else {
            await ClickTTScraperService.runJob('reset-db', {});
            res.json({ success: true, message: 'Full database reset and bulk reload completed successfully.' });
        }
    } catch (err: any) {
        console.error('Reset and Import Database Error:', err);
        res.status(500).json({ error: err.message || 'Failed to execute database reset and import' });
    }
});

/**
 * POST /api/admin/scraper/stop
 * Stop currently running scraper or DB ingestion job
 */
router.post('/scraper/stop', async (req: AuthRequest, res: Response) => {
    try {
        await AuditService.record({
            req,
            action: 'STOP_CLICKTT_SCRAPER',
            entityType: 'ClickTTScraper',
            entityId: 'STOP',
            description: `Admin ${req.user?.email} stopped the running Click-TT task`,
        });

        const stopped = ClickTTScraperService.stopJob();
        if (stopped) {
            res.json({ success: true, message: 'Scraper / DB ingestion task stopped successfully.' });
        } else {
            res.json({ success: false, message: 'No scraper or ingestion task is currently running.' });
        }
    } catch (err: any) {
        console.error('Stop ClickTT Scraper Error:', err);
        res.status(500).json({ error: err.message || 'Failed to stop scraper task' });
    }
});

export default router;
