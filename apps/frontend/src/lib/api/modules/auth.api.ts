import { HttpClient } from '../client';

export class AuthApi {
    constructor(private http: HttpClient) {}

    login(body: any) {
        return this.http.request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    }

    register(body: any) {
        return this.http.request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    }

    verifyEmail(token: string) {
        return this.http.request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
    }

    resendVerification(email: string) {
        return this.http.request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
    }

    getMe() {
        return this.http.request('/auth/me');
    }

    getProfileOverview() {
        return this.http.request('/auth/profile-overview');
    }

    updateProfile(body: any) {
        return this.http.request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
    }

    requestEmailChange(newEmail: string) {
        return this.http.request('/auth/request-email-change', { method: 'POST', body: JSON.stringify({ newEmail }) });
    }

    confirmEmailChange(token: string) {
        return this.http.request('/auth/confirm-email-change', { method: 'POST', body: JSON.stringify({ token }) });
    }

    forgotPassword(email: string) {
        return this.http.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    }

    resetPassword(body: { token: string; password: string }) {
        return this.http.request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) });
    }

    changePassword(body: { currentPassword: string; newPassword: string }) {
        return this.http.request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) });
    }

    getUsers(params: string | { q?: string; associationId?: string; role?: string; page?: number; limit?: number } = '') {
        if (typeof params === 'string') {
            return this.http.request(`/auth/users?q=${encodeURIComponent(params)}`);
        }
        const qs = new URLSearchParams();
        if (params.q) qs.set('q', params.q);
        if (params.associationId) qs.set('associationId', params.associationId);
        if (params.role) qs.set('role', params.role);
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return this.http.request(`/auth/users${query ? `?${query}` : ''}`);
    }

    getPerson(identifier: string) {
        return this.http.request(`/auth/users/${encodeURIComponent(identifier)}`);
    }

    globalSearch(query: string) {
        return this.http.request<{ results: any[] }>(`/search/global?q=${encodeURIComponent(query)}`);
    }
}

