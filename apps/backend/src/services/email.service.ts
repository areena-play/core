import { config } from '../config/env';

export class EmailService {
    private static getAppBaseUrl(): string {
        if (process.env.APP_URL) return process.env.APP_URL;
        if (process.env.DOMAIN_NAME) return `https://${process.env.DOMAIN_NAME}`;
        return 'http://localhost:3000';
    }

    /**
     * Sends an email verification link to a newly registered user.
     */
    static async sendVerificationEmail(to: string, firstName: string, token: string): Promise<boolean> {
        const baseUrl = this.getAppBaseUrl();
        const verificationLink = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

        console.log('\n================== [EMAIL SERVICE] ==================');
        console.log(`✉️  Recipient: ${to} (${firstName})`);
        console.log(`📋 Subject: Verify your AREENA Platform account`);
        console.log(`🔗 Verification Link: ${verificationLink}`);
        console.log('=====================================================\n');

        // If in production and SMTP is configured, send via mail transport here
        return true;
    }

    /**
     * Sends password reset or temporary credentials to a user.
     */
    static async sendPasswordResetEmail(to: string, firstName: string, temporaryPassword?: string): Promise<boolean> {
        const baseUrl = this.getAppBaseUrl();
        const loginLink = `${baseUrl}/auth/login`;

        console.log('\n================== [EMAIL SERVICE] ==================');
        console.log(`✉️  Recipient: ${to} (${firstName})`);
        console.log(`📋 Subject: Your AREENA password has been reset`);
        if (temporaryPassword) {
            console.log(`🔑 Temporary Password: ${temporaryPassword}`);
        }
        console.log(`🔗 Login URL: ${loginLink}`);
        console.log('=====================================================\n');

        return true;
    }
}
