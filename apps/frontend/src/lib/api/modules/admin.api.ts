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

    updateStripeSettings(body: {
        secretKey?: string;
        publishableKey?: string;
        webhookSecret?: string;
        proMonthlyPriceId?: string;
        proYearlyPriceId?: string;
    }) {
        return this.http.request('/admin/settings/stripe', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    testStripeSettings() {
        return this.http.request('/admin/settings/stripe/test', {
            method: 'POST',
        });
    }

    updateGeminiSettings(body: {
        apiKey?: string;
        model?: string;
        enabled?: boolean;
    }) {
        return this.http.request('/admin/settings/gemini', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    testGeminiSettings(body?: { apiKey?: string; model?: string }) {
        return this.http.request('/admin/settings/gemini/test', {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    getGeminiModels(apiKey?: string) {
        return this.http.request<{
            success: boolean;
            models: Array<{
                id: string;
                displayName: string;
                description?: string;
                inputTokenLimit?: number;
                outputTokenLimit?: number;
            }>;
            error?: string;
        }>('/admin/settings/gemini/models', {
            method: 'POST',
            body: JSON.stringify({ apiKey }),
        });
    }

    updateGoogleTtsSettings(body: {
        apiKey?: string;
        languageCode?: string;
        voiceName?: string;
        enabled?: boolean;
    }) {
        return this.http.request('/admin/settings/tts', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    testGoogleTtsSettings() {
        return this.http.request('/admin/settings/tts/test', {
            method: 'POST',
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

    getClickTTStatus(path?: string) {
        return this.http.request(`/admin/import/clicktt/status${path ? `?path=${encodeURIComponent(path)}` : ''}`);
    }

    importClickTT(options: {
        dataPath?: string;
        dryRun?: boolean;
        batchSize?: number;
        importLicenses?: boolean;
        importEncounters?: boolean;
        importMatches?: boolean;
        maxMeetings?: number;
        seasonsFilter?: string[];
    } = {}) {
        return this.http.request('/admin/import/clicktt', {
            method: 'POST',
            body: JSON.stringify(options),
        });
    }
}

