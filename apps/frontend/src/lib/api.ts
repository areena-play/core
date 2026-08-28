const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const DIRECT_BACKEND_URL = process.env.NEXT_PUBLIC_DIRECT_API_URL || 'http://localhost:4000';

class ApiClient {
    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('areena_token');
    }

    async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
            try {
                const errorData = await res.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {}
            throw new Error(errorMessage);
        }

        return res.json();
    }

    // System Initialization & Setup
    getSetupStatus() {
        return this.request('/setup/status');
    }

    initializeSetup(body: any) {
        return this.request('/setup/initialize', { method: 'POST', body: JSON.stringify(body) });
    }

    // Auth
    login(body: any) {
        return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    }

    register(body: any) {
        return this.request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    }

    getMe() {
        return this.request('/auth/me');
    }

    updateProfile(body: any) {
        return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
    }

    getUsers(query: string = '') {
        return this.request(`/auth/users?q=${encodeURIComponent(query)}`);
    }

    // Associations & Hierarchy
    getAssociations() {
        return this.request('/associations');
    }

    getAssociation(id: string) {
        return this.request(`/associations/${id}`);
    }

    getAssociationRules(id: string) {
        return this.request(`/associations/${id}/rules`);
    }

    createAssociation(body: any) {
        return this.request('/associations', { method: 'POST', body: JSON.stringify(body) });
    }

    updateAssociationSettings(associationId: string, body: any) {
        return this.request(`/associations/${associationId}/settings`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    uploadAssociationLogo(associationId: string, file: File) {
        const formData = new FormData();
        formData.append('logo', file);
        const token = this.getToken();
        return fetch(`${API_BASE}/associations/${associationId}/logo`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Logo upload failed with status ${res.status}`);
            }
            return res.json();
        });
    }

    deleteAssociationLogo(associationId: string) {
        return this.request(`/associations/${associationId}/logo`, {
            method: 'DELETE',
        });
    }

    updateLicenseIdTemplate(associationId: string, body: any) {
        return this.request(`/associations/${associationId}/settings/license-template`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    createSeason(associationId: string, body: any) {
        return this.request(`/associations/${associationId}/seasons`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    getSeasons(associationId: string) {
        return this.request(`/associations/${associationId}/seasons`);
    }

    // Clubs
    getClubs() {
        return this.request('/clubs');
    }

    getClub(id: string) {
        return this.request(`/clubs/${id}`);
    }

    createClub(body: any) {
        return this.request('/clubs', { method: 'POST', body: JSON.stringify(body) });
    }

    // Licenses
    getLicenses(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/licenses${qs ? `?${qs}` : ''}`);
    }

    applyLicense(body: any) {
        return this.request('/licenses/apply', { method: 'POST', body: JSON.stringify(body) });
    }

    approveLicense(licenseId: string, body: any) {
        return this.request(`/licenses/${licenseId}/approval`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateUserLicenseId(userId: string, licenseId: string) {
        return this.request(`/licenses/user/${userId}/license-id`, {
            method: 'PUT',
            body: JSON.stringify({ licenseId }),
        });
    }

    getRefresherCourses() {
        return this.request('/licenses/courses');
    }

    createRefresherCourse(body: any) {
        return this.request('/licenses/courses', { method: 'POST', body: JSON.stringify(body) });
    }

    attestCourseAttendance(courseId: string, body: any) {
        return this.request(`/licenses/courses/${courseId}/attest`, { method: 'POST', body: JSON.stringify(body) });
    }

    // Competitions (Leagues & Tournaments)
    getCompetitions(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/competitions${qs ? `?${qs}` : ''}`);
    }

    getCompetition(id: string) {
        return this.request(`/competitions/${id}`);
    }

    getLiveEncounters() {
        return this.request('/competitions/live');
    }

    createCompetition(body: any) {
        return this.request('/competitions', { method: 'POST', body: JSON.stringify(body) });
    }

    createCategory(competitionId: string, body: any) {
        return this.request(`/competitions/${competitionId}/categories`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    registerTeam(categoryId: string, body: any) {
        return this.request(`/competitions/categories/${categoryId}/teams`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    generateGroups(categoryId: string, body: any) {
        return this.request(`/competitions/categories/${categoryId}/generate-groups`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    getEncounter(id: string) {
        return this.request(`/competitions/encounters/${id}`);
    }

    updateMatchScore(matchId: string, body: any) {
        return this.request(`/competitions/matches/${matchId}/score`, { method: 'PUT', body: JSON.stringify(body) });
    }

    // Calendar
    getCalendarEvents(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/calendar${qs ? `?${qs}` : ''}`);
    }

    createCalendarEvent(body: any) {
        return this.request('/calendar', { method: 'POST', body: JSON.stringify(body) });
    }

    // Communications
    sendBroadcast(body: any) {
        return this.request('/messages/broadcast', { method: 'POST', body: JSON.stringify(body) });
    }

    getMessages() {
        return this.request('/messages');
    }

    // OAuth / Developer Portal
    getOAuthClients() {
        return this.request('/oauth/clients');
    }

    createOAuthClient(body: any) {
        return this.request('/oauth/clients', { method: 'POST', body: JSON.stringify(body) });
    }

    approveOAuthClient(clientId: string, body: any) {
        return this.request(`/oauth/clients/${clientId}/approve`, { method: 'POST', body: JSON.stringify(body) });
    }

    requestOAuthToken(body: any) {
        return this.request('/oauth/token', { method: 'POST', body: JSON.stringify(body) });
    }

    // Protected OAuth API Tester (Direct external OAuth verification against backend)
    fetchOAuthApi(endpoint: string, token: string) {
        return fetch(`${DIRECT_BACKEND_URL}/oauth${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then((res) => res.json());
    }

    // Billing & Invoicing
    getInvoices(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/invoices${qs ? `?${qs}` : ''}`);
    }

    getInvoiceStats(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/invoices/stats${qs ? `?${qs}` : ''}`);
    }

    getInvoice(id: string) {
        return this.request(`/invoices/${id}`);
    }

    createInvoice(body: any) {
        return this.request('/invoices', { method: 'POST', body: JSON.stringify(body) });
    }

    updateInvoice(id: string, body: any) {
        return this.request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    sendInvoice(id: string) {
        return this.request(`/invoices/${id}/send`, { method: 'POST' });
    }

    markInvoicePaid(id: string) {
        return this.request(`/invoices/${id}/pay`, { method: 'POST' });
    }

    deleteInvoice(id: string) {
        return this.request(`/invoices/${id}`, { method: 'DELETE' });
    }

    syncInvoiceBexio(id: string) {
        return this.request(`/invoices/${id}/sync-bexio`, { method: 'POST' });
    }

    getInvoiceQrBill(id: string) {
        return this.request(`/invoices/${id}/qr-bill`);
    }

    getBexioConfig(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/invoices/bexio/config${qs ? `?${qs}` : ''}`);
    }

    updateBexioConfig(body: any) {
        return this.request('/invoices/bexio/config', { method: 'PUT', body: JSON.stringify(body) });
    }

    // Audit Trail & Activity Traceability
    getAuditLogs(params: Record<string, string | number> = {}) {
        const strParams: Record<string, string> = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') strParams[k] = String(v);
        });
        const qs = new URLSearchParams(strParams).toString();
        return this.request(`/audit-logs${qs ? `?${qs}` : ''}`);
    }

    getAuditStats(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/audit-logs/stats${qs ? `?${qs}` : ''}`);
    }

    async exportAuditLogs(params: Record<string, string> = {}, format: 'csv' | 'json' = 'csv') {
        const token = typeof window !== 'undefined' ? localStorage.getItem('areena_token') : null;
        const strParams: Record<string, string> = { ...params, format };
        const qs = new URLSearchParams(strParams).toString();
        const res = await fetch(`${API_BASE}/audit-logs/export${qs ? `?${qs}` : ''}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `areena-audit-trail-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

export const api = new ApiClient();

