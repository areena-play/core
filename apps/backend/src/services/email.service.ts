import nodemailer, { Transporter } from 'nodemailer';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { config } from '../config/env';

export interface BulkRecipient {
    email: string;
    name?: string;
    variables?: Record<string, any>;
}

export interface BulkEmailOptions {
    recipients: BulkRecipient[];
    subject: string;
    text?: string;
    html?: string;
    title?: string;
    badge?: string;
    bodyHtml?: string;
    actionButton?: {
        label: string;
        url: string;
    };
    tags?: string[];
    replyTo?: string;
}

export class EmailService {
    private static transporterInstance: Transporter | null = null;
    private static mailgunClientInstance: any = null;

    /**
     * Resolves or initializes the Mailgun REST API client.
     */
    private static getMailgunClient(): any {
        if (this.mailgunClientInstance) {
            return this.mailgunClientInstance;
        }

        if (config.mailgun.apiKey && config.mailgun.domain) {
            const mailgun = new Mailgun(FormData);
            this.mailgunClientInstance = mailgun.client({
                username: 'api',
                key: config.mailgun.apiKey,
                url: config.mailgun.url || 'https://api.mailgun.net',
            });

            console.log(
                `[EmailService] Mailgun REST API Client configured (domain: ${config.mailgun.domain}, endpoint: ${config.mailgun.url || 'https://api.mailgun.net'}).`
            );
            return this.mailgunClientInstance;
        }

        return null;
    }

    /**
     * Resolves or initializes the Nodemailer SMTP transporter.
     */
    private static getSmtpTransporter(): Transporter | null {
        if (this.transporterInstance) {
            return this.transporterInstance;
        }

        if (config.smtp.host) {
            const isSecure = config.smtp.secure;
            this.transporterInstance = nodemailer.createTransport({
                host: config.smtp.host,
                port: config.smtp.port,
                secure: isSecure,
                auth: config.smtp.user
                    ? {
                          user: config.smtp.user,
                          pass: config.smtp.pass,
                      }
                    : undefined,
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                },
            });

            console.log(
                `[EmailService] SMTP Transporter configured (${config.smtp.host}:${config.smtp.port}, secure=${isSecure}, authUser=${config.smtp.user ? 'yes' : 'no'}).`
            );
            return this.transporterInstance;
        }

        return null;
    }

    private static getAppBaseUrl(): string {
        if (process.env.APP_URL) return process.env.APP_URL;
        if (process.env.DOMAIN_NAME) return `https://${process.env.DOMAIN_NAME}`;
        return 'http://localhost:3000';
    }

    /**
     * Builds a modern, responsive HTML email layout with AREENA brand styling.
     */
    public static renderHtmlTemplate(options: {
        title: string;
        badge?: string;
        greeting?: string;
        bodyHtml: string;
        actionButton?: {
            label: string;
            url: string;
        };
        footerNote?: string;
    }): string {
        const appUrl = this.getAppBaseUrl();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f1f5f9; padding: 32px 16px; }
        .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; text-align: left; }
        .logo-box { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        .brand-name { color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; }
        .badge { display: inline-block; background-color: rgba(220, 38, 38, 0.2); color: #f87171; border: 1px solid rgba(220, 38, 38, 0.4); font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; margin-top: 10px; }
        .content { padding: 32px; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .body-text { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
        .card-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3); }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; }
        .footer a { color: #dc2626; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <a href="${appUrl}" class="logo-box">
                    <span class="brand-name">AREENA</span>
                </a>
                ${options.badge ? `<br><span class="badge">${options.badge}</span>` : ''}
            </div>
            <div class="content">
                ${options.greeting ? `<div class="greeting">${options.greeting}</div>` : ''}
                <div class="body-text">${options.bodyHtml}</div>
                ${
                    options.actionButton
                        ? `<div class="btn-wrapper">
                            <a href="${options.actionButton.url}" class="btn" target="_blank">${options.actionButton.label}</a>
                           </div>`
                        : ''
                }
            </div>
            <div class="footer">
                ${options.footerNote ? `${options.footerNote}<br><br>` : ''}
                © ${new Date().getFullYear()} AREENA Platform • Unified Sports Governance & Tournament OS<br>
                <a href="${appUrl}">areena.ch</a>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Dispatches an individual email via Mailgun API -> SMTP -> Dev Console fallback.
     */
    private static async sendMail(options: {
        to: string;
        subject: string;
        text: string;
        html: string;
        replyTo?: string;
        tags?: string[];
    }): Promise<boolean> {
        const mailgunClient = this.getMailgunClient();

        // 1. Try Mailgun REST API (Fastest & most reliable on VPS)
        if (mailgunClient) {
            try {
                const messageData: any = {
                    from: config.mailgun.from || config.smtp.from,
                    to: [options.to],
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                };

                if (options.replyTo) {
                    messageData['h:Reply-To'] = options.replyTo;
                }
                if (options.tags && options.tags.length > 0) {
                    messageData['o:tag'] = options.tags;
                }

                const res = await mailgunClient.messages.create(config.mailgun.domain, messageData);
                console.log(`[EmailService] Dispatched via Mailgun API to "${options.to}" (ID: ${res.id})`);
                return true;
            } catch (err: any) {
                console.error(`[EmailService] Mailgun API delivery error to "${options.to}":`, err.message);
                // Fallback to SMTP if available
            }
        }

        // 2. Try Standard SMTP via Nodemailer
        const smtpTransporter = this.getSmtpTransporter();
        if (smtpTransporter) {
            try {
                const info = await smtpTransporter.sendMail({
                    from: config.smtp.from,
                    to: options.to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                    replyTo: options.replyTo,
                });
                console.log(`[EmailService] Dispatched via SMTP to "${options.to}" (Message ID: ${info.messageId})`);
                return true;
            } catch (err: any) {
                console.error(`[EmailService] SMTP delivery failed to "${options.to}":`, err.message);
                return false;
            }
        }

        // 3. Development Fallback: Pretty-print to terminal
        console.log('\n================== [DEV EMAIL SERVICE] ==================');
        console.log(`✉️  Recipient: ${options.to}`);
        console.log(`📋 Subject: ${options.subject}`);
        if (options.replyTo) console.log(`↩️  Reply-To: ${options.replyTo}`);
        if (options.tags) console.log(`🏷️  Tags: ${options.tags.join(', ')}`);
        console.log('📝 Message Text:');
        console.log(options.text);
        console.log('=========================================================\n');
        return true;
    }

    /**
     * High-Performance Bulk Email Dispatcher
     * - Uses Mailgun's native batch recipient-variables (up to 1,000 recipients per HTTP POST).
     * - Falls back to chunked SMTP or Dev logger if Mailgun API is not active.
     */
    public static async sendBulkEmail(options: BulkEmailOptions): Promise<{ total: number; successful: number; failed: number }> {
        const { recipients, subject, tags, replyTo } = options;
        if (!recipients || recipients.length === 0) {
            return { total: 0, successful: 0, failed: 0 };
        }

        let html = options.html;
        let text = options.text;

        if (!html && options.bodyHtml) {
            html = this.renderHtmlTemplate({
                title: options.title || subject,
                badge: options.badge || 'Announcement',
                bodyHtml: options.bodyHtml,
                actionButton: options.actionButton,
            });
        }

        if (!text && html) {
            text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const mailgunClient = this.getMailgunClient();

        // 1. MAILGUN BATCH SENDING (1 single HTTP request per 1,000 recipients)
        if (mailgunClient) {
            console.log(`[EmailService] Processing batch email for ${recipients.length} recipients via Mailgun API...`);

            const CHUNK_SIZE = 1000;
            let successful = 0;
            let failed = 0;

            for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
                const chunk = recipients.slice(i, i + CHUNK_SIZE);
                const recipientEmails = chunk.map((r) => r.email);

                const recipientVariables: Record<string, any> = {};
                chunk.forEach((r) => {
                    recipientVariables[r.email] = {
                        name: r.name || r.email.split('@')[0],
                        ...(r.variables || {}),
                    };
                });

                try {
                    const messageData: any = {
                        from: config.mailgun.from || config.smtp.from,
                        to: recipientEmails,
                        subject,
                        text: text || '',
                        html: html || '',
                        'recipient-variables': JSON.stringify(recipientVariables),
                    };

                    if (replyTo) messageData['h:Reply-To'] = replyTo;
                    if (tags && tags.length > 0) messageData['o:tag'] = tags;

                    const res = await mailgunClient.messages.create(config.mailgun.domain, messageData);
                    console.log(
                        `[EmailService] Successfully queued Mailgun batch chunk ${i / CHUNK_SIZE + 1} (${chunk.length} recipients, Batch ID: ${res.id})`
                    );
                    successful += chunk.length;
                } catch (err: any) {
                    console.error(`[EmailService] Mailgun batch chunk failed:`, err.message);
                    failed += chunk.length;
                }
            }

            return { total: recipients.length, successful, failed };
        }

        // 2. SMTP or DEV FALLBACK (Iterative sending)
        console.log(`[EmailService] Sending bulk email to ${recipients.length} recipients via SMTP / Dev Logger...`);
        let successful = 0;
        let failed = 0;

        for (const recipient of recipients) {
            const ok = await this.sendMail({
                to: recipient.email,
                subject,
                text: text || '',
                html: html || '',
                replyTo,
                tags,
            });
            if (ok) successful++;
            else failed++;
        }

        return { total: recipients.length, successful, failed };
    }

    /**
     * Sends an email verification link to a newly registered user.
     */
    static async sendVerificationEmail(to: string, firstName: string, token: string): Promise<boolean> {
        const baseUrl = this.getAppBaseUrl();
        const verificationLink = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

        const subject = 'Verify your AREENA Platform account';
        const text = `Hello ${firstName},\n\nWelcome to AREENA! Please verify your email address by opening the following link in your browser:\n\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe AREENA Team`;

        const html = this.renderHtmlTemplate({
            title: subject,
            badge: 'Account Verification',
            greeting: `Welcome, ${firstName}!`,
            bodyHtml: `Thank you for creating an account on the <strong>AREENA</strong> sports management platform.<br><br>
                       Please click the button below to verify your email address and activate your account.`,
            actionButton: {
                label: 'Verify Email Address',
                url: verificationLink,
            },
            footerNote: `If you did not register for an AREENA account, you can safely ignore this email. Link: ${verificationLink}`,
        });

        return await this.sendMail({
            to,
            subject,
            text,
            html,
            tags: ['auth-verification'],
        });
    }

    /**
     * Sends password reset or temporary credentials to a user.
     */
    static async sendPasswordResetEmail(to: string, firstName: string, temporaryPassword?: string): Promise<boolean> {
        const baseUrl = this.getAppBaseUrl();
        const loginLink = `${baseUrl}/auth/login`;

        const subject = 'Your AREENA password has been reset';
        let text = `Hello ${firstName},\n\nYour AREENA password has been reset.\n\n`;
        if (temporaryPassword) {
            text += `Your temporary password is: ${temporaryPassword}\n\n`;
        }
        text += `You can sign in here: ${loginLink}\n\nFor security reasons, please change your password immediately after signing in.\n\nBest regards,\nThe AREENA Team`;

        const credentialsHtml = temporaryPassword
            ? `<div class="card-box">
                 <strong style="color: #0f172a; font-size: 13px;">Temporary Password:</strong><br>
                 <code style="display: inline-block; font-size: 16px; color: #dc2626; background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 6px; font-weight: bold; letter-spacing: 1px;">${temporaryPassword}</code>
               </div>`
            : '';

        const html = this.renderHtmlTemplate({
            title: subject,
            badge: 'Security Notification',
            greeting: `Hello ${firstName},`,
            bodyHtml: `Your AREENA account password has been reset by an administrator or through the password recovery portal.
                       ${credentialsHtml}
                       Please log in and update your password in your profile settings.`,
            actionButton: {
                label: 'Sign In to AREENA',
                url: loginLink,
            },
            footerNote: 'If you did not request a password reset, please contact your federation administrator immediately.',
        });

        return await this.sendMail({
            to,
            subject,
            text,
            html,
            tags: ['auth-password-reset'],
        });
    }

    /**
     * Sends a support inquiry to the designated admin / support recipient.
     */
    static async sendSupportInquiryEmail(data: {
        to: string;
        ticketNumber: string;
        senderName: string;
        senderEmail: string;
        subjectTitle: string;
        contextLabel: string;
        message: string;
    }): Promise<boolean> {
        const subject = `[${data.ticketNumber}] ${data.subjectTitle}`;

        const text = `Ticket: ${data.ticketNumber}\nContext: ${data.contextLabel}\nFrom: ${data.senderName} <${data.senderEmail}>\nSubject: ${data.subjectTitle}\nFAQ Review Confirmed: YES\n\nMessage:\n${data.message}\n\n---\nRespond directly to this email to reply to ${data.senderName}.`;

        const bodyHtml = `
            <div class="card-box" style="margin-top: 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; width: 110px;"><strong>Ticket Ref:</strong></td>
                        <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0f172a;">${data.ticketNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Context:</strong></td>
                        <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${data.contextLabel}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Requester:</strong></td>
                        <td style="padding: 4px 0; color: #0f172a;">${data.senderName} &lt;<a href="mailto:${data.senderEmail}" style="color: #dc2626;">${data.senderEmail}</a>&gt;</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Subject:</strong></td>
                        <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${data.subjectTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>FAQ Checked:</strong></td>
                        <td style="padding: 4px 0; color: #16a34a; font-weight: 600;">✓ Confirmed by User</td>
                    </tr>
                </table>
            </div>
            <div style="margin-top: 18px;">
                <strong style="font-size: 13px; color: #0f172a;">Inquiry Message:</strong>
                <div style="margin-top: 8px; padding: 16px; background-color: #f8fafc; border-left: 4px solid #dc2626; border-radius: 4px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1e293b;">${data.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
        `;

        const html = this.renderHtmlTemplate({
            title: subject,
            badge: `Support Inquiry #${data.ticketNumber}`,
            greeting: 'New Support Inquiry Received',
            bodyHtml,
            footerNote: `You received this email because you are configured as the support recipient for ${data.contextLabel}. You can reply directly to this email to contact ${data.senderName}.`,
        });

        return await this.sendMail({
            to: data.to,
            subject,
            text,
            html,
            replyTo: data.senderEmail,
            tags: ['support-inquiry'],
        });
    }

    /**
     * Sends an automated confirmation receipt to the user who filed the inquiry.
     */
    static async sendSupportReceiptEmail(data: {
        to: string;
        senderName: string;
        ticketNumber: string;
        subjectTitle: string;
        contextLabel: string;
    }): Promise<boolean> {
        const subject = `[Receipt] Support Inquiry Received #${data.ticketNumber}`;

        const text = `Hello ${data.senderName},\n\nThank you for contacting support. We have received your inquiry and routed it to the administrators of ${data.contextLabel}.\n\nTicket Reference: ${data.ticketNumber}\nTopic: ${data.subjectTitle}\n\nOur team will review your request and reply to this email address as soon as possible.\n\nBest regards,\nAREENA Support`;

        const bodyHtml = `
            Thank you for reaching out to us. Your support inquiry has been received and routed to the responsible administrators for <strong>${data.contextLabel}</strong>.
            <div class="card-box">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; width: 120px;"><strong>Ticket Number:</strong></td>
                        <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #dc2626;">${data.ticketNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Topic / Subject:</strong></td>
                        <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${data.subjectTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;"><strong>Assigned To:</strong></td>
                        <td style="padding: 4px 0; color: #0f172a;">${data.contextLabel}</td>
                    </tr>
                </table>
            </div>
            An administrator will review your message and respond directly via email. Please reference your Ticket Number in any follow-up communications.
        `;

        const html = this.renderHtmlTemplate({
            title: subject,
            badge: 'Inquiry Confirmation',
            greeting: `Hello ${data.senderName},`,
            bodyHtml,
            footerNote: 'This is an automated confirmation receipt. Please do not reply directly to this message.',
        });

        return await this.sendMail({
            to: data.to,
            subject,
            text,
            html,
            tags: ['support-receipt'],
        });
    }
}
