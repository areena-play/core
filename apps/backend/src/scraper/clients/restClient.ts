import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getScraperConfig } from '../config';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RestClient {
    private token: string | null = null;
    private tokenExpiry = 0;
    private authFailedUntil = 0;

    async getAccessToken(forceFresh = false): Promise<string | null> {
        const config = await getScraperConfig();
        const tokenFile = path.join(config.storageDir, 'token.json');

        if (forceFresh && Date.now() < this.authFailedUntil) {
            return null;
        }

        // 1. Check existing token file
        if (!forceFresh && existsSync(tokenFile)) {
            try {
                const tokenData = JSON.parse(await fs.readFile(tokenFile, 'utf-8'));
                const now = Math.floor(Date.now() / 1000);
                if (tokenData && tokenData.access_token && tokenData.expires_at && tokenData.expires_at > now + 60) {
                    this.token = tokenData.access_token;
                    this.tokenExpiry = tokenData.expires_at * 1000;
                    return this.token;
                }

                // Try refresh token
                if (tokenData.refresh_token && config.clientId && config.clientSecret) {
                    const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
                    const params = new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: tokenData.refresh_token,
                    });

                    const res = await fetch(`${config.baseUrl}/auth/token`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Basic ${authHeader}`,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params,
                    });

                    if (res.ok) {
                        const newTokens = (await res.json()) as any;
                        newTokens.expires_at = Math.floor(Date.now() / 1000) + (newTokens.expires_in || 3600);
                        await fs.writeFile(tokenFile, JSON.stringify(newTokens, null, 2), 'utf-8');
                        this.token = newTokens.access_token;
                        this.tokenExpiry = newTokens.expires_at * 1000;
                        return this.token;
                    }
                }
            } catch {}
        }

        if (!config.clientId || !config.clientSecret) {
            return this.token;
        }

        // 2. Request new client_credentials token
        try {
            const authUrl = `${config.baseUrl}/auth/token`;
            const params = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config.clientId,
                client_secret: config.clientSecret,
                scope: 'nuPortalRS_federation',
            });

            const res = await fetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
            });

            if (res.ok) {
                const tokenData = (await res.json()) as any;
                tokenData.expires_at = Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600);
                await fs.writeFile(tokenFile, JSON.stringify(tokenData, null, 2), 'utf-8');
                this.token = tokenData.access_token;
                this.tokenExpiry = tokenData.expires_at * 1000;
                return this.token;
            } else {
                this.authFailedUntil = Date.now() + 60000;
            }
        } catch {
            this.authFailedUntil = Date.now() + 60000;
        }

        return null;
    }

    getCachePath(cacheDir: string, endpoint: string): string {
        const safe = endpoint.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 200);
        return path.join(cacheDir, `${safe}.json`);
    }

    async get(endpoint: string, options: { bypassCache?: boolean; maxRetries?: number } = {}): Promise<any> {
        const config = await getScraperConfig();
        const cacheFile = this.getCachePath(config.cacheDir, endpoint);

        if (!options.bypassCache && existsSync(cacheFile)) {
            try {
                const content = await fs.readFile(cacheFile, 'utf-8');
                return JSON.parse(content);
            } catch {}
        }

        const url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`;
        const maxRetries = options.maxRetries || 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            if (config.requestDelayMs > 0) {
                await delay(config.requestDelayMs);
            }

            const token = await this.getAccessToken();
            const headers: Record<string, string> = {
                Accept: 'application/json',
                'User-Agent': 'AREENA-ClickTT-Scraper/2.0',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            try {
                const res = await fetch(url, { headers });

                if (res.status === 401 && token) {
                    await this.getAccessToken(true);
                    continue;
                }

                if (res.status === 404) {
                    return null;
                }

                if (!res.ok) {
                    if (attempt === maxRetries) {
                        return null;
                    }
                    await delay(1000 * attempt);
                    continue;
                }

                const data = await res.json();
                try {
                    await fs.writeFile(cacheFile, JSON.stringify(data, null, 2), 'utf-8');
                } catch {}

                return data;
            } catch (err: any) {
                if (attempt === maxRetries) {
                    return null;
                }
                await delay(1000 * attempt);
            }
        }

        return null;
    }
}

export const restClient = new RestClient();

