import { prisma } from '../config/prisma';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import nodemailer, { Transporter } from 'nodemailer';

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

export class SystemService {
    private static mailgunClientCache: any = null;
    private static mailgunConfigCache: MailgunConfig | null = null;
    private static smtpTransporterCache: Transporter | null = null;
    private static smtpConfigCache: SmtpConfig | null = null;

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

        const [apiKey, domain, url, fromEmail, fromName] = await Promise.all([
            this.getSetting('MAILGUN_API_KEY', process.env.MAILGUN_API_KEY || ''),
            this.getSetting('MAILGUN_DOMAIN', process.env.MAILGUN_DOMAIN || ''),
            this.getSetting('MAILGUN_HOST', process.env.MAILGUN_HOST || 'https://api.mailgun.net'),
            this.getSetting('MAILGUN_FROM_EMAIL', process.env.EMAIL_FROM_DEFAULT || 'noreply@areena.ch'),
            this.getSetting('MAILGUN_FROM_NAME', 'AREENA Sports Platform'),
        ]);

        const isConfigured = Boolean(apiKey && domain);

        this.mailgunConfigCache = {
            apiKey,
            domain,
            url: url || 'https://api.mailgun.net',
            fromEmail: fromEmail || 'noreply@areena.ch',
            fromName: fromName || 'AREENA Sports Platform',
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
                url: config.url,
            });
        }

        const from = `"${config.fromName}" <${config.fromEmail}>`;
        return {
            client: this.mailgunClientCache,
            domain: config.domain,
            from,
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
            await this.setSetting('MAILGUN_HOST', data.url.trim(), 'Mailgun API Regional Endpoint Host', false, updatedBy);
        }
        if (data.fromEmail !== undefined) {
            await this.setSetting('MAILGUN_FROM_EMAIL', data.fromEmail.trim(), 'Mailgun Default Sender Email', false, updatedBy);
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

            return { success: true, messageId: res.id };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to dispatch test email via Mailgun' };
        }
    }

    // -------------------------------------------------------------------------
    // SMTP EMAIL RELAY CONFIGURATION
    // -------------------------------------------------------------------------

    public static async getSmtpConfig(): Promise<SmtpConfig> {
        if (this.smtpConfigCache) {
            return this.smtpConfigCache;
        }

        const [host, portStr, user, pass, secureStr, from] = await Promise.all([
            this.getSetting('SMTP_HOST', process.env.SMTP_HOST || ''),
            this.getSetting('SMTP_PORT', process.env.SMTP_PORT || '587'),
            this.getSetting('SMTP_USER', process.env.SMTP_USER || ''),
            this.getSetting('SMTP_PASS', process.env.SMTP_PASS || ''),
            this.getSetting('SMTP_SECURE', process.env.SMTP_SECURE || 'false'),
            this.getSetting('SMTP_FROM', process.env.EMAIL_FROM_DEFAULT || 'noreply@areena.ch'),
        ]);

        const port = parseInt(portStr || '587', 10);
        const secure = secureStr === 'true' || port === 465;
        const isConfigured = Boolean(host);

        this.smtpConfigCache = {
            host,
            port,
            user,
            pass,
            secure,
            from: from || 'noreply@areena.ch',
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
            await this.setSetting('SMTP_FROM', data.from.trim(), 'SMTP Default From Address', false, updatedBy);
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

            return { success: true, messageId: info.messageId };
        } catch (err: any) {
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
}
