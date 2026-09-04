import { HttpClient } from '../client';

export class UsersApi {
    constructor(private http: HttpClient) {}

    // Super Admin User Management
    getAdminUsers(params: Record<string, any> = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                searchParams.append(k, String(v));
            }
        });
        const queryStr = searchParams.toString();
        return this.http.request(`/users/admin/list${queryStr ? `?${queryStr}` : ''}`);
    }

    getAdminUser(id: string) {
        return this.http.request(`/users/admin/${id}`);
    }

    updateAdminUser(id: string, body: any) {
        return this.http.request(`/users/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    adminResetPassword(id: string, body: { newPassword?: string; autoGenerate?: boolean } = {}) {
        return this.http.request(`/users/admin/${id}/reset-password`, { method: 'POST', body: JSON.stringify(body) });
    }

    adminToggleSuperAdmin(id: string) {
        return this.http.request(`/users/admin/${id}/toggle-superadmin`, { method: 'POST' });
    }

    adminSendVerification(id: string) {
        return this.http.request(`/users/admin/${id}/send-verification`, { method: 'POST' });
    }

    adminDeleteUser(id: string) {
        return this.http.request(`/users/admin/${id}`, { method: 'DELETE' });
    }
}

