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

    updateGoogleAnalyticsSettings(body: {
        measurementId?: string;
        enabled?: boolean;
        anonymizeIp?: boolean;
    }) {
        return this.http.request('/admin/settings/google-analytics', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    exportDatabase() {
        return this.http.requestBlob('/admin/database/export');
    }

    importDatabase(file: File) {
        const formData = new FormData();
        formData.append('backupFile', file);
        return this.http.request<{ success: boolean; message: string }>('/admin/database/import', {
            method: 'POST',
            body: formData,
        });
    }

    getScraperStatus(silent: boolean = false) {
        return this.http.request<{
            isRunning: boolean;
            activeJob: string | null;
            startedAt: string | null;
            elapsedSec: number;
            lastFinishedAt: string | null;
            lastResult: 'success' | 'error' | null;
            lastError: string | null;
            progress: any | null;
            summary: any | null;
        }>('/admin/scraper/status', { silent });
    }

    getScraperConfig(silent: boolean = false) {
        return this.http.request<{
            baseUrl: string;
            fedNickname: string;
            clientId: string;
            hasClientSecret: boolean;
            webBaseUrl: string;
            clickttUsername: string;
            hasPassword: boolean;
            requestDelayMs: number;
            concurrency: number;
            excludedClubs: string;
            tournamentRetroDays: number;
            isConfigured: boolean;
        }>('/admin/scraper/config', { silent });
    }

    updateScraperConfig(body: {
        baseUrl?: string;
        fedNickname?: string;
        clientId?: string;
        clientSecret?: string;
        webBaseUrl?: string;
        clickttUsername?: string;
        clickttPassword?: string;
        requestDelayMs?: number;
        concurrency?: number;
        excludedClubs?: string;
        tournamentRetroDays?: number;
    }) {
        return this.http.request('/admin/scraper/config', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    runScraperJob(jobType: 'initial' | 'sync' | 'results' | 'players' | 'elo' | 'export' | 'reset-db', options: any = {}, background: boolean = true) {
        return this.http.request<{ success: boolean; message: string }>('/admin/scraper/run', {
            method: 'POST',
            body: JSON.stringify({ jobType, options, background }),
        });
    }

    resetAndImportDatabase(background: boolean = true) {
        return this.http.request<{ success: boolean; message: string }>('/admin/scraper/reset-and-import', {
            method: 'POST',
            body: JSON.stringify({ background }),
        });
    }

    stopScraperJob(silent: boolean = false) {
        return this.http.request<{ success: boolean; message: string }>('/admin/scraper/stop', {
            method: 'POST',
            silent,
        });
    }

    getScraperLogs(limit: number = 200, silent: boolean = false) {
        return this.http.request<{ logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }> }>(
            `/admin/scraper/logs?limit=${limit}`,
            { silent }
        );
    }

    clearScraperLogs() {
        return this.http.request<{ success: boolean; message: string }>('/admin/scraper/logs', {
            method: 'DELETE',
        });
    }

    exportScrapedArchive() {
        return this.http.requestBlob('/admin/scraper/export-archive');
    }

    importScrapedArchive(file: File, options?: { triggerIngest?: boolean }) {
        const formData = new FormData();
        formData.append('archiveFile', file);
        if (options?.triggerIngest) {
            formData.append('triggerIngest', 'true');
        }
        return this.http.request<{
            message: string;
            summary: {
                totalFiles: number;
                totalSizeBytes: number;
                hasCheckpoints: boolean;
                hasNormalizedData: boolean;
                extractedAt: string;
            };
        }>('/admin/scraper/import-archive', {
            method: 'POST',
            body: formData,
        });
    }

    getCronJobs(silent: boolean = false) {
        return this.http.request<{
            jobs: Array<{
                name: string;
                title: string;
                description?: string;
                intervalMs: number;
                enabled: boolean;
                lastRunAt: string | null;
                nextRunAt: string | null;
                lastRunBy?: string;
            }>;
        }>('/admin/cronjobs', { silent });
    }

    toggleCronJob(name: string, enabled: boolean) {
        return this.http.request<{ success: boolean; message: string }>(`/admin/cronjobs/${encodeURIComponent(name)}/toggle`, {
            method: 'PATCH',
            body: JSON.stringify({ enabled }),
        });
    }

    triggerCronJob(name: string) {
        return this.http.request<{ success: boolean; message: string }>(`/admin/cronjobs/${encodeURIComponent(name)}/run`, {
            method: 'POST',
        });
    }
}



