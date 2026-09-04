import { HttpClient, API_BASE } from '../client';

export class OAuthApi {
    constructor(private http: HttpClient) {}

    getOAuthClients(params: { all?: boolean } = {}) {
        const qs = params.all ? '?all=true' : '';
        return this.http.request(`/oauth/clients${qs}`);
    }

    createOAuthClient(body: any) {
        return this.http.request('/oauth/clients', { method: 'POST', body: JSON.stringify(body) });
    }

    approveOAuthClient(clientId: string, body: any) {
        return this.http.request(`/oauth/clients/${clientId}/approve`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateOAuthClientRateLimit(clientId: string, body: { customRateLimitEnabled: boolean; rateLimitCapacity?: number; rateLimitRefillRate?: number }) {
        return this.http.request(`/oauth/clients/${clientId}/ratelimit`, { method: 'PUT', body: JSON.stringify(body) });
    }

    revokeOAuthClient(clientId: string) {
        return this.http.request(`/oauth/clients/${clientId}/revoke`, { method: 'POST' });
    }

    deleteOAuthClient(clientId: string) {
        return this.http.request(`/oauth/clients/${clientId}`, { method: 'DELETE' });
    }

    requestOAuthToken(body: any) {
        return this.http.request('/oauth/token', { method: 'POST', body: JSON.stringify(body) });
    }

    // Protected OAuth API Tester (Direct external OAuth verification against backend)
    fetchOAuthApi(endpoint: string, token: string) {
        let url: string;
        if (endpoint.startsWith('/api/')) {
            url = endpoint;
        } else if (endpoint.startsWith('/')) {
            if (/^\/v[0-9]+/.test(endpoint)) {
                url = `/api${endpoint}`;
            } else {
                url = `${API_BASE}${endpoint}`;
            }
        } else {
            url = `${API_BASE}/${endpoint}`;
        }

        return fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(async (res) => {
            const data = await res.json().catch(() => ({ status: res.status, statusText: res.statusText }));
            return data;
        });
    }
}

