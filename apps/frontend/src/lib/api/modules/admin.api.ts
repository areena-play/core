import { HttpClient } from '../client';

export class AdminApi {
    constructor(private http: HttpClient) {}

    getAdminDashboard() {
        return this.http.request('/admin/dashboard');
    }

    getAdminSettings() {
        return this.http.request('/admin/settings');
    }

    updateMailgunSettings(body: { apiKey?: string; domain?: string; url?: string; fromEmail?: string; fromName?: string }) {
        return this.http.request('/admin/settings/mailgun', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    testMailgunSettings(toEmail: string) {
        return this.http.request('/admin/settings/mailgun/test', {
            method: 'POST',
            body: JSON.stringify({ toEmail }),
        });
    }

    updateSmtpSettings(body: { host?: string; port?: number; user?: string; pass?: string; secure?: boolean; from?: string }) {
        return this.http.request('/admin/settings/smtp', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    testSmtpSettings(toEmail: string) {
        return this.http.request('/admin/settings/smtp/test', {
            method: 'POST',
            body: JSON.stringify({ toEmail }),
        });
    }

    updateRateLimitSettings(body: { enabled?: boolean; capacity?: number; refillRatePerSec?: number; blockAnonymousBots?: boolean }) {
        return this.http.request('/admin/settings/ratelimit', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    exportDatabase() {
        return this.http.request('/admin/database/export');
    }

    importDatabase(dumpData: any) {
        return this.http.request('/admin/database/import', {
            method: 'POST',
            body: JSON.stringify(dumpData),
        });
    }
}

