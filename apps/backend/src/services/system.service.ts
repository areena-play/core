import { prisma } from '../config/prisma';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import nodemailer, { Transporter } from 'nodemailer';
import Stripe from 'stripe';

export interface MailgunConfig {
    apiKey: string;
    domain: string;
    url: string;
    fromEmail: string;
    fromName: string;
    isConfigured: boolean;
}

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    from: string;
    isConfigured: boolean;
    hasPassword?: boolean;
}

export interface RateLimitConfig {
    enabled: boolean;
    capacity: number;
    refillRatePerSec: number;
    blockAnonymousBots: boolean;
}

export interface StripeConfig {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    proMonthlyPriceId: string;
    proYearlyPriceId: string;
    isConfigured: boolean;
    hasSecretKey: boolean;
    hasWebhookSecret: boolean;
}

export interface GeminiConfig {
    apiKey: string;
    model: string;
    enabled: boolean;
    isConfigured: boolean;
    hasApiKey: boolean;
}

export interface GoogleTtsConfig {
    apiKey: string;
    languageCode: string;
    voiceName: string;
    enabled: boolean;
    isConfigured: boolean;
    hasApiKey: boolean;
}

export function formatEmailSender(
    fromEmail?: string,
    fromName?: string,
    defaultDomain: string = 'areena.ch'
): { formatted: string; cleanEmail: string; cleanName: string } {
    let rawEmail = (fromEmail || '').trim();
    let rawName = (fromName || '').trim();

    // Parse cases where rawEmail is "Display Name <user@domain.com>" or "<user@domain.com>"
    const match = rawEmail.match(/^(?:"?([^"]*)"?\s*)?<([^>]+)>$/);
    if (match) {
        if (!rawName && match[1]) {
            rawName = match[1].trim();
        }
        rawEmail = match[2].trim();
    }

    const cleanEmail = rawEmail || `noreply@${defaultDomain}`;
    const cleanName = rawName || 'AREENA Sports Platform';
    const formatted = `"${cleanName}" <${cleanEmail}>`;

    return { formatted, cleanEmail, cleanName };
}

export class SystemService {
    private static mailgunClientCache: any = null;
    private static mailgunConfigCache: MailgunConfig | null = null;
    private static smtpTransporterCache: Transporter | null = null;
    private static smtpConfigCache: SmtpConfig | null = null;
    private static rateLimitConfigCache: RateLimitConfig | null = null;

    public static async getRateLimitConfig(): Promise<RateLimitConfig> {
        if (this.rateLimitConfigCache) {
            return this.rateLimitConfigCache;
        }

        const [enabledStr, capacityStr, refillRateStr, blockAnonymousStr] = await Promise.all([
            this.getSetting('RATE_LIMIT_ENABLED', 'true'),
            this.getSetting('RATE_LIMIT_CAPACITY', '120'),
            this.getSetting('RATE_LIMIT_REFILL_PER_SEC', '2'),
            this.getSetting('RATE_LIMIT_BLOCK_ANONYMOUS', 'true'),
        ]);

        const capacity = Math.max(10, parseInt(capacityStr || '120', 10) || 120);
        const refillRatePerSec = Math.max(0.1, parseFloat(refillRateStr || '2') || 2);
        const enabled = enabledStr !== 'false';
        const blockAnonymousBots = blockAnonymousStr !== 'false';

        this.rateLimitConfigCache = {
            enabled,
            capacity,
            refillRatePerSec,
            blockAnonymousBots,
        };

        return this.rateLimitConfigCache;
    }

    public static async updateRateLimitConfig(
        data: {
            enabled?: boolean;
            capacity?: number;
            refillRatePerSec?: number;
            blockAnonymousBots?: boolean;
        },
        updatedBy?: string
    ): Promise<RateLimitConfig> {
        if (data.enabled !== undefined) {
            await this.setSetting('RATE_LIMIT_ENABLED', String(data.enabled), 'Global API Rate Limiter Master Toggle', false, updatedBy);
        }
        if (data.capacity !== undefined) {
            await this.setSetting('RATE_LIMIT_CAPACITY', String(Math.max(5, Math.floor(data.capacity))), 'API Rate Limit Max Burst Bucket Capacity (tokens)', false, updatedBy);
        }
        if (data.refillRatePerSec !== undefined) {
            await this.setSetting('RATE_LIMIT_REFILL_PER_SEC', String(Math.max(0.1, data.refillRatePerSec)), 'API Rate Limit Sustained Refill Rate (tokens/sec)', false, updatedBy);
        }
        if (data.blockAnonymousBots !== undefined) {
            await this.setSetting('RATE_LIMIT_BLOCK_ANONYMOUS', String(data.blockAnonymousBots), 'Block Direct Unauthenticated Bot & Scraper Traffic', false, updatedBy);
        }

        // Invalidate in-memory cache
        this.rateLimitConfigCache = null;

        return this.getRateLimitConfig();
    }

    public static async getSetting(key: string, defaultValue: string = ''): Promise<string> {
        try {
            const setting = await prisma.systemSetting.findUnique({ where: { key } });
            return setting ? setting.value : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    public static async setSetting(
        key: string,
        value: string,
        description?: string,
        isSecret: boolean = false,
        updatedBy?: string
    ): Promise<void> {
        await prisma.systemSetting.upsert({
            where: { key },
            update: { value, description, isSecret, updatedBy },
            create: { key, value, description, isSecret, updatedBy },
        });
    }

    // -------------------------------------------------------------------------
    // MAILGUN REST API CONFIGURATION
    // -------------------------------------------------------------------------

    public static async getMailgunConfig(): Promise<MailgunConfig> {
        if (this.mailgunConfigCache) {
            return this.mailgunConfigCache;
        }

        const [apiKey, domain, rawUrl, rawFromEmail, rawFromName] = await Promise.all([
            this.getSetting('MAILGUN_API_KEY'),
            this.getSetting('MAILGUN_DOMAIN'),
            this.getSetting('MAILGUN_HOST'),
            this.getSetting('MAILGUN_FROM_EMAIL'),
            this.getSetting('MAILGUN_FROM_NAME'),
        ]);

        const apiKeyClean = (apiKey || '').trim();
        const domainClean = (domain || '').trim();
        const urlClean = (rawUrl || '').trim() || 'https://api.mailgun.net';
        const sender = formatEmailSender(rawFromEmail, rawFromName, domainClean || 'areena.ch');

        const isConfigured = Boolean(apiKeyClean && domainClean);

        this.mailgunConfigCache = {
            apiKey: apiKeyClean,
            domain: domainClean,
            url: urlClean,
            fromEmail: sender.cleanEmail,
            fromName: sender.cleanName,
            isConfigured,
        };

        return this.mailgunConfigCache;
    }

    public static async getMailgunClient(): Promise<{ client: any; domain: string; from: string } | null> {
        const config = await this.getMailgunConfig();
        if (!config.isConfigured) return null;

        if (!this.mailgunClientCache) {
            const mailgun = new Mailgun(FormData);
            this.mailgunClientCache = mailgun.client({
                username: 'api',
                key: config.apiKey,
                url: config.url || 'https://api.mailgun.net',
            });
        }

        const sender = formatEmailSender(config.fromEmail, config.fromName, config.domain || 'areena.ch');
        return {
            client: this.mailgunClientCache,
            domain: config.domain,
            from: sender.formatted,
        };
    }

    public static async updateMailgunConfig(
        data: {
            apiKey?: string;
            domain?: string;
            url?: string;
            fromEmail?: string;
            fromName?: string;
        },
        updatedBy?: string
    ): Promise<MailgunConfig> {
        if (data.apiKey !== undefined && data.apiKey !== '') {
            await this.setSetting('MAILGUN_API_KEY', data.apiKey.trim(), 'Mailgun REST API Key', true, updatedBy);
        }
        if (data.domain !== undefined) {
            await this.setSetting('MAILGUN_DOMAIN', data.domain.trim(), 'Mailgun Sending Domain', false, updatedBy);
        }
        if (data.url !== undefined) {
            await this.setSetting('MAILGUN_HOST', data.url.trim() || 'https://api.mailgun.net', 'Mailgun API Regional Endpoint Host', false, updatedBy);
        }
        if (data.fromEmail !== undefined) {
            const sender = formatEmailSender(data.fromEmail, data.fromName);
            await this.setSetting('MAILGUN_FROM_EMAIL', sender.cleanEmail, 'Mailgun Default Sender Email', false, updatedBy);
            if (data.fromName === undefined && sender.cleanName) {
                await this.setSetting('MAILGUN_FROM_NAME', sender.cleanName, 'Mailgun Default Sender Name', false, updatedBy);
            }
        }
        if (data.fromName !== undefined) {
            await this.setSetting('MAILGUN_FROM_NAME', data.fromName.trim(), 'Mailgun Default Sender Name', false, updatedBy);
        }

        // Invalidate in-memory cache
        this.mailgunConfigCache = null;
        this.mailgunClientCache = null;

        return this.getMailgunConfig();
    }

    public static async testMailgunConnection(toEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const mailgun = await this.getMailgunClient();
        if (!mailgun) {
            return { success: false, error: 'Mailgun is not configured. Please set the API Key and sending Domain in Admin Settings.' };
        }

        try {
            console.log(`[Mailgun Test] Dispatching test message to "${toEmail}" via domain "${mailgun.domain}" (from: ${mailgun.from})...`);
            const res = await mailgun.client.messages.create(mailgun.domain, {
                from: mailgun.from,
                to: [toEmail],
                subject: '🚀 AREENA — Mailgun REST API Connection Test',
                text: `This is a test email confirming that your Mailgun API integration on AREENA is active.\n\nDomain: ${mailgun.domain}\nSender: ${mailgun.from}\nTimestamp: ${new Date().toISOString()}`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                        <h2 style="color: #0f172a; margin-top: 0;">🚀 Mailgun Connection Successful</h2>
                        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                            Your Mailgun REST API integration on <strong>AREENA</strong> is active and delivering emails.
                        </p>
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 12px; font-family: monospace; color: #0f172a;">
                            <div><strong>Domain:</strong> ${mailgun.domain}</div>
                            <div><strong>Sender:</strong> ${mailgun.from}</div>
                            <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
                        </div>
                    </div>
                `,
            });

            console.log(`[Mailgun Test] Successfully sent (Message ID: ${res.id})`);
            return { success: true, messageId: res.id };
        } catch (err: any) {
            console.error('[Mailgun Test Error]:', {
                status: err.status,
                message: err.message,
                details: err.details,
                body: err.body,
            });
            const errorMsg = err.details || err.body?.message || err.message || 'Failed to dispatch test email via Mailgun';
            return { success: false, error: errorMsg };
        }
    }

    // -------------------------------------------------------------------------
    // SMTP EMAIL RELAY CONFIGURATION
    // -------------------------------------------------------------------------

    public static async getSmtpConfig(): Promise<SmtpConfig> {
        if (this.smtpConfigCache) {
            return this.smtpConfigCache;
        }

        const [host, portStr, user, pass, secureStr, rawFrom] = await Promise.all([
            this.getSetting('SMTP_HOST'),
            this.getSetting('SMTP_PORT'),
            this.getSetting('SMTP_USER'),
            this.getSetting('SMTP_PASS'),
            this.getSetting('SMTP_SECURE'),
            this.getSetting('SMTP_FROM'),
        ]);

        const hostClean = (host || '').trim();
        const port = parseInt(portStr || '587', 10);
        const secure = secureStr === 'true' || port === 465;
        const isConfigured = Boolean(hostClean);
        const sender = formatEmailSender(rawFrom, undefined, 'areena.ch');

        this.smtpConfigCache = {
            host: hostClean,
            port,
            user: (user || '').trim(),
            pass: pass || '',
            secure,
            from: sender.formatted,
            isConfigured,
            hasPassword: Boolean(pass),
        };

        return this.smtpConfigCache;
    }

    public static async getSmtpTransporter(): Promise<{ transporter: Transporter; from: string } | null> {
        const config = await this.getSmtpConfig();
        if (!config.isConfigured) return null;

        if (!this.smtpTransporterCache) {
            this.smtpTransporterCache = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: config.user
                    ? {
                          user: config.user,
                          pass: config.pass,
                      }
                    : undefined,
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                },
            });
        }

        return {
            transporter: this.smtpTransporterCache,
            from: config.from,
        };
    }

    public static async updateSmtpConfig(
        data: {
            host?: string;
            port?: number;
            user?: string;
            pass?: string;
            secure?: boolean;
            from?: string;
        },
        updatedBy?: string
    ): Promise<SmtpConfig> {
        if (data.host !== undefined) {
            await this.setSetting('SMTP_HOST', data.host.trim(), 'SMTP Server Hostname', false, updatedBy);
        }
        if (data.port !== undefined) {
            await this.setSetting('SMTP_PORT', String(data.port), 'SMTP Port (587 / 465 / 25)', false, updatedBy);
        }
        if (data.user !== undefined) {
            await this.setSetting('SMTP_USER', data.user.trim(), 'SMTP Username / Auth', false, updatedBy);
        }
        if (data.pass !== undefined && data.pass !== '') {
            await this.setSetting('SMTP_PASS', data.pass.trim(), 'SMTP Password / Secret', true, updatedBy);
        }
        if (data.secure !== undefined) {
            await this.setSetting('SMTP_SECURE', String(data.secure), 'SMTP TLS/SSL Mode', false, updatedBy);
        }
        if (data.from !== undefined) {
            const sender = formatEmailSender(data.from);
            await this.setSetting('SMTP_FROM', sender.formatted, 'SMTP Default From Address', false, updatedBy);
        }

        // Invalidate in-memory cache
        this.smtpConfigCache = null;
        this.smtpTransporterCache = null;

        return this.getSmtpConfig();
    }

    public static async testSmtpConnection(toEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const smtpData = await this.getSmtpTransporter();
        if (!smtpData) {
            return { success: false, error: 'SMTP is not configured. Please set the SMTP Host in Admin Settings.' };
        }

        try {
            console.log(`[SMTP Test] Dispatching test message to "${toEmail}" via host...`);
            const info = await smtpData.transporter.sendMail({
                from: smtpData.from,
                to: toEmail,
                subject: '🚀 AREENA — SMTP Email Delivery Test',
                text: `This is a test email confirming that your SMTP settings on AREENA are active and delivering.\n\nTimestamp: ${new Date().toISOString()}`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                        <h2 style="color: #0f172a; margin-top: 0;">🚀 SMTP Delivery Successful</h2>
                        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                            Your SMTP server connection on <strong>AREENA</strong> is active and delivering emails.
                        </p>
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 12px; font-family: monospace; color: #0f172a;">
                            <div><strong>Sender:</strong> ${smtpData.from}</div>
                            <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
                        </div>
                    </div>
                `,
            });

            console.log(`[SMTP Test] Successfully sent (Message ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId };
        } catch (err: any) {
            console.error('[SMTP Test Error]:', err);
            return { success: false, error: err.message || 'Failed to dispatch test email via SMTP' };
        }
    }

    public static async getSystemMetrics(): Promise<any> {
        const [
            userCount,
            superAdminCount,
            associationCount,
            clubCount,
            competitionCount,
            licenseCount,
            invoiceCount,
            recentLogs,
            mailgunConfig,
            smtpConfig,
            stripeConfig,
            geminiConfig,
            googleTtsConfig,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isSuperAdmin: true } }),
            prisma.association.count(),
            prisma.club.count(),
            prisma.competition.count(),
            prisma.license.count(),
            prisma.invoice.count(),
            prisma.auditLog.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
            }),
            this.getMailgunConfig(),
            this.getSmtpConfig(),
            this.getStripeConfig(),
            this.getGeminiConfig(),
            this.getGoogleTtsConfig(),
        ]);

        return {
            users: {
                total: userCount,
                superAdmins: superAdminCount,
            },
            associations: {
                total: associationCount,
            },
            clubs: {
                total: clubCount,
            },
            competitions: {
                total: competitionCount,
            },
            licenses: {
                total: licenseCount,
            },
            invoices: {
                total: invoiceCount,
            },
            services: {
                database: { status: 'healthy', provider: 'PostgreSQL' },
                redis: { status: 'healthy' },
                stripe: {
                    status: stripeConfig.isConfigured ? 'configured' : 'not_configured',
                    hasSecretKey: stripeConfig.hasSecretKey,
                    publishableKey: stripeConfig.publishableKey || null,
                },
                gemini: {
                    status: geminiConfig.isConfigured ? 'configured' : 'not_configured',
                    model: geminiConfig.model,
                    enabled: geminiConfig.enabled,
                },
                googleTts: {
                    status: googleTtsConfig.isConfigured ? 'configured' : 'not_configured',
                    languageCode: googleTtsConfig.languageCode,
                    voiceName: googleTtsConfig.voiceName,
                    enabled: googleTtsConfig.enabled,
                },
                mailgun: {
                    status: mailgunConfig.isConfigured ? 'configured' : 'not_configured',
                    domain: mailgunConfig.domain || null,
                    sender: mailgunConfig.fromEmail || null,
                    endpoint: mailgunConfig.url,
                },
                smtp: {
                    status: smtpConfig.isConfigured ? 'configured' : 'not_configured',
                    host: smtpConfig.host || null,
                    port: smtpConfig.port,
                    sender: smtpConfig.from || null,
                },
                s3: {
                    status: 'configured',
                    bucket: process.env.AWS_BUCKET_NAME || 'areena-assets',
                },
            },
            recentLogs,
        };
    }

    // -------------------------------------------------------------------------
    // STRIPE CONFIGURATION
    // -------------------------------------------------------------------------

    private static stripeConfigCache: StripeConfig | null = null;

    public static async getStripeConfig(): Promise<StripeConfig> {
        if (this.stripeConfigCache) {
            return this.stripeConfigCache;
        }

        const [secretKey, publishableKey, webhookSecret, proMonthlyPriceId, proYearlyPriceId] =
            await Promise.all([
                this.getSetting('STRIPE_SECRET_KEY'),
                this.getSetting('STRIPE_PUBLISHABLE_KEY'),
                this.getSetting('STRIPE_WEBHOOK_SECRET'),
                this.getSetting('STRIPE_PRO_MONTHLY_PRICE_ID'),
                this.getSetting('STRIPE_PRO_YEARLY_PRICE_ID'),
            ]);

        const sk = (secretKey || '').trim();
        const pk = (publishableKey || '').trim();
        const wh = (webhookSecret || '').trim();

        this.stripeConfigCache = {
            secretKey: sk,
            publishableKey: pk,
            webhookSecret: wh,
            proMonthlyPriceId: (proMonthlyPriceId || '').trim(),
            proYearlyPriceId: (proYearlyPriceId || '').trim(),
            isConfigured: Boolean(sk && pk),
            hasSecretKey: Boolean(sk),
            hasWebhookSecret: Boolean(wh),
        };

        return this.stripeConfigCache;
    }

    public static async updateStripeConfig(
        data: {
            secretKey?: string;
            publishableKey?: string;
            webhookSecret?: string;
            proMonthlyPriceId?: string;
            proYearlyPriceId?: string;
        },
        updatedBy?: string
    ): Promise<StripeConfig> {
        if (data.secretKey !== undefined && data.secretKey.trim() !== '') {
            await this.setSetting('STRIPE_SECRET_KEY', data.secretKey.trim(), 'Stripe Secret API Key (Live / Test)', true, updatedBy);
        }
        if (data.publishableKey !== undefined) {
            await this.setSetting('STRIPE_PUBLISHABLE_KEY', data.publishableKey.trim(), 'Stripe Publishable Key', false, updatedBy);
        }
        if (data.webhookSecret !== undefined && data.webhookSecret.trim() !== '') {
            await this.setSetting('STRIPE_WEBHOOK_SECRET', data.webhookSecret.trim(), 'Stripe Webhook Signing Secret', true, updatedBy);
        }
        if (data.proMonthlyPriceId !== undefined) {
            await this.setSetting('STRIPE_PRO_MONTHLY_PRICE_ID', data.proMonthlyPriceId.trim(), 'Stripe Monthly Pro Plan Price ID', false, updatedBy);
        }
        if (data.proYearlyPriceId !== undefined) {
            await this.setSetting('STRIPE_PRO_YEARLY_PRICE_ID', data.proYearlyPriceId.trim(), 'Stripe Annual Pro Plan Price ID', false, updatedBy);
        }

        this.stripeConfigCache = null;
        return this.getStripeConfig();
    }

    public static async testStripeConnection(): Promise<{ success: boolean; accountId?: string; defaultCurrency?: string; livemode?: boolean; error?: string }> {
        const config = await this.getStripeConfig();
        if (!config.secretKey) {
            return { success: false, error: 'Stripe Secret Key is not configured.' };
        }

        try {
            const stripe = new Stripe(config.secretKey, { apiVersion: '2024-11-20.acacia' as any });
            const balance = await stripe.balance.retrieve();
            const primaryCurrency = balance.available?.[0]?.currency?.toUpperCase() || 'CHF';
            return {
                success: true,
                livemode: balance.livemode,
                defaultCurrency: primaryCurrency,
            };
        } catch (err: any) {
            return {
                success: false,
                error: err.message || 'Failed to authenticate with Stripe API.',
            };
        }
    }

    // -------------------------------------------------------------------------
    // GEMINI AI CONFIGURATION
    // -------------------------------------------------------------------------

    private static geminiConfigCache: GeminiConfig | null = null;

    public static async getGeminiConfig(): Promise<GeminiConfig> {
        if (this.geminiConfigCache) {
            return this.geminiConfigCache;
        }

        const [apiKey, model, enabledStr] = await Promise.all([
            this.getSetting('GEMINI_API_KEY'),
            this.getSetting('GEMINI_MODEL', 'gemini-1.5-flash'),
            this.getSetting('GEMINI_ENABLED', 'true'),
        ]);

        const k = (apiKey || process.env.GEMINI_API_KEY || '').trim();
        const m = (model || 'gemini-1.5-flash').trim();
        const enabled = enabledStr !== 'false';

        this.geminiConfigCache = {
            apiKey: k,
            model: m,
            enabled,
            isConfigured: Boolean(k),
            hasApiKey: Boolean(k),
        };

        return this.geminiConfigCache;
    }

    public static async updateGeminiConfig(
        data: {
            apiKey?: string;
            model?: string;
            enabled?: boolean;
        },
        updatedBy?: string
    ): Promise<GeminiConfig> {
        if (data.apiKey !== undefined && data.apiKey.trim() !== '') {
            await this.setSetting('GEMINI_API_KEY', data.apiKey.trim(), 'Google Gemini AI API Key', true, updatedBy);
        }
        if (data.model !== undefined) {
            await this.setSetting('GEMINI_MODEL', data.model.trim() || 'gemini-1.5-flash', 'Default Gemini AI Model', false, updatedBy);
        }
        if (data.enabled !== undefined) {
            await this.setSetting('GEMINI_ENABLED', data.enabled ? 'true' : 'false', 'Gemini AI Integration Enabled', false, updatedBy);
        }

        this.geminiConfigCache = null;
        return this.getGeminiConfig();
    }

    // -------------------------------------------------------------------------
    // GOOGLE TEXT-TO-SPEECH (TTS) CONFIGURATION
    // -------------------------------------------------------------------------

    private static googleTtsConfigCache: GoogleTtsConfig | null = null;

    public static async getGoogleTtsConfig(): Promise<GoogleTtsConfig> {
        if (this.googleTtsConfigCache) {
            return this.googleTtsConfigCache;
        }

        const [apiKey, languageCode, voiceName, enabledStr] = await Promise.all([
            this.getSetting('GOOGLE_TTS_API_KEY'),
            this.getSetting('GOOGLE_TTS_LANGUAGE_CODE', 'de-CH'),
            this.getSetting('GOOGLE_TTS_VOICE_NAME', 'de-CH-Wavenet-A'),
            this.getSetting('GOOGLE_TTS_ENABLED', 'true'),
        ]);

        const k = (apiKey || process.env.GOOGLE_TTS_API_KEY || '').trim();
        const lang = (languageCode || 'de-CH').trim();
        const voice = (voiceName || 'de-CH-Wavenet-A').trim();
        const enabled = enabledStr !== 'false';

        this.googleTtsConfigCache = {
            apiKey: k,
            languageCode: lang,
            voiceName: voice,
            enabled,
            isConfigured: Boolean(k),
            hasApiKey: Boolean(k),
        };

        return this.googleTtsConfigCache;
    }

    public static async updateGoogleTtsConfig(
        data: {
            apiKey?: string;
            languageCode?: string;
            voiceName?: string;
            enabled?: boolean;
        },
        updatedBy?: string
    ): Promise<GoogleTtsConfig> {
        if (data.apiKey !== undefined && data.apiKey.trim() !== '') {
            await this.setSetting('GOOGLE_TTS_API_KEY', data.apiKey.trim(), 'Google Cloud Text-to-Speech API Key', true, updatedBy);
        }
        if (data.languageCode !== undefined) {
            await this.setSetting('GOOGLE_TTS_LANGUAGE_CODE', data.languageCode.trim() || 'de-CH', 'Default Google TTS Language Code', false, updatedBy);
        }
        if (data.voiceName !== undefined) {
            await this.setSetting('GOOGLE_TTS_VOICE_NAME', data.voiceName.trim() || 'de-CH-Wavenet-A', 'Default Google TTS Voice Name', false, updatedBy);
        }
        if (data.enabled !== undefined) {
            await this.setSetting('GOOGLE_TTS_ENABLED', data.enabled ? 'true' : 'false', 'Google TTS Integration Enabled', false, updatedBy);
        }

        this.googleTtsConfigCache = null;
        return this.getGoogleTtsConfig();
    }
}
