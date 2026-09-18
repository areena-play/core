import { getScraperConfig } from '../config';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WebSession {
    private cookies = new Map<string, string>();
    private lastLoginTime = 0;
    private sessionLifetimeMs = 25 * 60 * 1000;
    private _loginPromise: Promise<boolean> | null = null;

    getCookieHeader() {
        return Array.from(this.cookies.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
    }

    updateCookiesFromResponse(res: Response) {
        const setCookieHeaders =
            typeof (res.headers as any).getSetCookie === 'function'
                ? (res.headers as any).getSetCookie()
                : [res.headers.get('set-cookie')].filter(Boolean);

        for (const header of setCookieHeaders) {
            const parts = header.split(';')[0].split('=');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                this.cookies.set(name, value);
            }
        }
    }

    async login(targetUrl?: string): Promise<boolean> {
        const config = await getScraperConfig();
        if (!config.clickttUsername || !config.clickttPassword) return false;
        if (this._loginPromise) return this._loginPromise;

        this._loginPromise = (async () => {
            const loginUrl =
                targetUrl ||
                `${config.webBaseUrl}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/eloFilter?federation=${encodeURIComponent(config.fedNickname)}`;

            const params = new URLSearchParams({
                username: config.clickttUsername,
                password: config.clickttPassword,
            });

            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Content-Type': 'application/x-www-form-urlencoded',
            };
            if (this.cookies.size > 0) {
                headers['Cookie'] = this.getCookieHeader();
            }

            try {
                const res = await fetch(loginUrl, {
                    method: 'POST',
                    headers,
                    body: params,
                    redirect: 'manual',
                });

                this.updateCookiesFromResponse(res);
                this.lastLoginTime = Date.now();
                return true;
            } catch (err: any) {
                console.warn('⚠️ Click-TT login attempt failed:', err.message);
                return false;
            } finally {
                this._loginPromise = null;
            }
        })();

        return this._loginPromise;
    }

    async fetchPage(
        url: string,
        options: { noAutoLogin?: boolean; maxRetries?: number } = {},
    ): Promise<{ ok: boolean; status: number; html: string }> {
        const config = await getScraperConfig();
        const hasCredentials = Boolean(config.clickttUsername && config.clickttPassword);
        const shouldCheckLocker = hasCredentials && !options.noAutoLogin;

        if (
            shouldCheckLocker &&
            (Date.now() - this.lastLoginTime > this.sessionLifetimeMs || this.cookies.size === 0)
        ) {
            await this.login(url);
        }

        const maxRetries = options.maxRetries || 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            if (config.requestDelayMs > 0) {
                await delay(config.requestDelayMs);
            }

            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            };
            if (this.cookies.size > 0) {
                headers['Cookie'] = this.getCookieHeader();
            }

            try {
                const res = await fetch(url, { headers, redirect: 'follow' });
                this.updateCookiesFromResponse(res);

                if (res.ok) {
                    const html = await res.text();
                    return { ok: true, status: res.status, html };
                }

                if (res.status === 404) {
                    return { ok: false, status: 404, html: '' };
                }

                if (attempt === maxRetries) {
                    return { ok: false, status: res.status, html: '' };
                }
                await delay(1000 * attempt);
            } catch (err: any) {
                if (attempt === maxRetries) {
                    return { ok: false, status: 0, html: '' };
                }
                await delay(1000 * attempt);
            }
        }

        return { ok: false, status: 0, html: '' };
    }
}

export const webSession = new WebSession();

