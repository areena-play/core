export const API_VERSION = 'v1';
export const API_BASE = `/api/${API_VERSION}`;

let activeRequests = 0;
const loadingListeners = new Set<(activeCount: number) => void>();

export function subscribeApiLoading(listener: (activeCount: number) => void) {
    loadingListeners.add(listener);
    listener(activeRequests);
    return () => {
        loadingListeners.delete(listener);
    };
}

function notifyLoading() {
    loadingListeners.forEach((fn) => {
        try {
            fn(activeRequests);
        } catch (e) {
            console.error('Error in loading listener', e);
        }
    });
}

export class HttpClient {
    private inFlightRequests = new Map<string, Promise<any>>();

    protected getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('areena_token');
    }

    async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const method = (options.method || 'GET').toUpperCase();

        // In-flight deduplication: Only for idempotent GET requests
        if (method === 'GET') {
            const token = this.getToken();
            const dedupeKey = `${token ? 'auth:' : 'anon:'}${endpoint}`;
            const existing = this.inFlightRequests.get(dedupeKey);
            if (existing) {
                return existing as Promise<T>;
            }

            const promise = this.executeRequest<T>(endpoint, options).finally(() => {
                this.inFlightRequests.delete(dedupeKey);
            });

            this.inFlightRequests.set(dedupeKey, promise);
            return promise;
        }

        return this.executeRequest<T>(endpoint, options);
    }

    private async executeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        activeRequests++;
        notifyLoading();

        try {
            const token = this.getToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...((options.headers as Record<string, string>) || {}),
            };

            const res = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
            });

            if (!res.ok) {
                let errorMessage = `HTTP Error ${res.status}`;
                let errorData: any = {};
                try {
                    errorData = await res.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch {}
                const error: any = new Error(errorMessage);
                error.status = res.status;
                error.code = errorData.error;
                error.error = errorData.error;
                error.details = errorData.details;
                error.data = errorData;
                throw error;
            }

            return res.json();
        } finally {
            activeRequests = Math.max(0, activeRequests - 1);
            notifyLoading();
        }
    }
}

