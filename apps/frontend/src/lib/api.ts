export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || `/api/${API_VERSION}`;

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

class ApiClient {
    private inFlightRequests = new Map<string, Promise<any>>();

    private getToken(): string | null {
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

    // System Initialization, Setup & Public Config
    getPublicConfig() {
        return this.request('/config/public');
    }

    getSetupStatus() {
        return this.request('/setup/status');
    }

    initializeSetup(body: any) {
        return this.request('/setup/initialize', { method: 'POST', body: JSON.stringify(body) });
    }

    // Auth & Verification
    login(body: any) {
        return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    }

    register(body: any) {
        return this.request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    }

    verifyEmail(token: string) {
        return this.request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
    }

    resendVerification(email: string) {
        return this.request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
    }

    getMe() {
        return this.request('/auth/me');
    }

    getProfileOverview() {
        return this.request('/auth/profile-overview');
    }

    updateProfile(body: any) {
        return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
    }

    requestEmailChange(newEmail: string) {
        return this.request('/auth/request-email-change', { method: 'POST', body: JSON.stringify({ newEmail }) });
    }

    confirmEmailChange(token: string) {
        return this.request('/auth/confirm-email-change', { method: 'POST', body: JSON.stringify({ token }) });
    }

    forgotPassword(email: string) {
        return this.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    }

    resetPassword(body: { token: string; password: string }) {
        return this.request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) });
    }

    changePassword(body: { currentPassword: string; newPassword: string }) {
        return this.request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) });
    }

    getUsers(params: string | { q?: string; associationId?: string; role?: string; page?: number; limit?: number } = '') {
        if (typeof params === 'string') {
            return this.request(`/auth/users?q=${encodeURIComponent(params)}`);
        }
        const qs = new URLSearchParams();
        if (params.q) qs.set('q', params.q);
        if (params.associationId) qs.set('associationId', params.associationId);
        if (params.role) qs.set('role', params.role);
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        const query = qs.toString();
        return this.request(`/auth/users${query ? `?${query}` : ''}`);
    }

    getPerson(identifier: string) {
        return this.request(`/auth/users/${encodeURIComponent(identifier)}`);
    }

    globalSearch(query: string) {
        return this.request<{ results: any[] }>(`/search/global?q=${encodeURIComponent(query)}`);
    }

    // Super Admin User Management
    getAdminUsers(params: Record<string, any> = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                searchParams.append(k, String(v));
            }
        });
        const queryStr = searchParams.toString();
        return this.request(`/users/admin/list${queryStr ? `?${queryStr}` : ''}`);
    }

    getAdminUser(id: string) {
        return this.request(`/users/admin/${id}`);
    }

    updateAdminUser(id: string, body: any) {
        return this.request(`/users/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    adminResetPassword(id: string, body: { newPassword?: string; autoGenerate?: boolean } = {}) {
        return this.request(`/users/admin/${id}/reset-password`, { method: 'POST', body: JSON.stringify(body) });
    }

    adminToggleSuperAdmin(id: string) {
        return this.request(`/users/admin/${id}/toggle-superadmin`, { method: 'POST' });
    }

    adminSendVerification(id: string) {
        return this.request(`/users/admin/${id}/send-verification`, { method: 'POST' });
    }

    adminDeleteUser(id: string) {
        return this.request(`/users/admin/${id}`, { method: 'DELETE' });
    }

    // Associations & Hierarchy
    getTopAssociation() {
        return this.request('/associations?top=true');
    }

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

    updateSeason(associationId: string, seasonId: string, body: any) {
        return this.request(`/associations/${associationId}/seasons/${seasonId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    setCurrentSeason(associationId: string, seasonId: string) {
        return this.request(`/associations/${associationId}/seasons/${seasonId}/set-current`, {
            method: 'POST',
        });
    }

    deleteSeason(associationId: string, seasonId: string) {
        return this.request(`/associations/${associationId}/seasons/${seasonId}`, {
            method: 'DELETE',
        });
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

    // Locations & Playing Units (Tables / Courts)
    getLocations(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/locations${qs ? `?${qs}` : ''}`);
    }

    getLocation(idOrSlug: string) {
        return this.request(`/locations/${idOrSlug}`);
    }

    createLocation(body: any) {
        return this.request('/locations', { method: 'POST', body: JSON.stringify(body) });
    }

    updateLocation(id: string, body: any) {
        return this.request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    deleteLocation(id: string) {
        return this.request(`/locations/${id}`, { method: 'DELETE' });
    }

    createLocationUnit(locationId: string, body: any) {
        return this.request(`/locations/${locationId}/units`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateLocationUnit(locationId: string, unitId: string, body: any) {
        return this.request(`/locations/${locationId}/units/${unitId}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    deleteLocationUnit(locationId: string, unitId: string) {
        return this.request(`/locations/${locationId}/units/${unitId}`, { method: 'DELETE' });
    }

    getLocationReservations(locationId: string, params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/locations/${locationId}/reservations${qs ? `?${qs}` : ''}`);
    }

    createLocationReservation(locationId: string, body: any) {
        return this.request(`/locations/${locationId}/reservations`, { method: 'POST', body: JSON.stringify(body) });
    }

    deleteLocationReservation(locationId: string, resId: string) {
        return this.request(`/locations/${locationId}/reservations/${resId}`, { method: 'DELETE' });
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

    createCompetitionCategory(competitionId: string, body: any) {
        return this.createCategory(competitionId, body);
    }

    createCategoryTeam(categoryId: string, body: any) {
        return this.registerTeam(categoryId, body);
    }

    generateCategoryGroups(categoryId: string, body: any) {
        return this.generateGroups(categoryId, body);
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

    updateCompetition(id: string, body: any) {
        return this.request(`/competitions/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    approveCompetition(id: string, body: any) {
        return this.request(`/competitions/${id}/approval`, { method: 'PUT', body: JSON.stringify(body) });
    }

    getCompetitionRoles(id: string) {
        return this.request(`/competitions/${id}/roles`);
    }

    assignCompetitionRole(id: string, body: any) {
        return this.request(`/competitions/${id}/roles`, { method: 'POST', body: JSON.stringify(body) });
    }

    revokeCompetitionRole(id: string, roleId: string) {
        return this.request(`/competitions/${id}/roles/${roleId}`, { method: 'DELETE' });
    }

    getCompetitionPlayers(id: string) {
        return this.request(`/competitions/${id}/players`);
    }

    checkinCompetitionPlayer(id: string, regId: string, body: any) {
        return this.request(`/competitions/${id}/players/${regId}/checkin`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateCompetitionPlayerPayment(id: string, regId: string, body: any) {
        return this.request(`/competitions/${id}/players/${regId}/payment`, { method: 'POST', body: JSON.stringify(body) });
    }

    getCompetitionSpeakerCallouts(id: string) {
        return this.request(`/competitions/${id}/speaker/callouts`);
    }

    createCompetitionSpeakerCallout(id: string, body: any) {
        return this.request(`/competitions/${id}/speaker/callouts`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateCompetitionSpeakerCallout(id: string, calloutId: string, body: any) {
        return this.request(`/competitions/${id}/speaker/callouts/${calloutId}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    getCompetitionStatistics(id: string) {
        return this.request(`/competitions/${id}/statistics`);
    }

    backupCompetition(id: string) {
        return this.request(`/competitions/${id}/backup`, { method: 'POST' });
    }

    getCompetitionActions(id: string) {
        return this.request(`/competitions/${id}/actions`);
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
    getOAuthClients(params: { all?: boolean } = {}) {
        const qs = params.all ? '?all=true' : '';
        return this.request(`/oauth/clients${qs}`);
    }

    createOAuthClient(body: any) {
        return this.request('/oauth/clients', { method: 'POST', body: JSON.stringify(body) });
    }

    approveOAuthClient(clientId: string, body: any) {
        return this.request(`/oauth/clients/${clientId}/approve`, { method: 'POST', body: JSON.stringify(body) });
    }

    updateOAuthClientRateLimit(clientId: string, body: { customRateLimitEnabled: boolean; rateLimitCapacity?: number; rateLimitRefillRate?: number }) {
        return this.request(`/oauth/clients/${clientId}/ratelimit`, { method: 'PUT', body: JSON.stringify(body) });
    }

    revokeOAuthClient(clientId: string) {
        return this.request(`/oauth/clients/${clientId}/revoke`, { method: 'POST' });
    }

    deleteOAuthClient(clientId: string) {
        return this.request(`/oauth/clients/${clientId}`, { method: 'DELETE' });
    }

    requestOAuthToken(body: any) {
        return this.request('/oauth/token', { method: 'POST', body: JSON.stringify(body) });
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

    // System Admin Notices & Announcements
    getActiveNotices() {
        return this.request('/notices/active');
    }

    getAdminNotices() {
        return this.request('/notices');
    }

    createNotice(body: any) {
        return this.request('/notices', { method: 'POST', body: JSON.stringify(body) });
    }

    updateNotice(id: string, body: any) {
        return this.request(`/notices/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    deleteNotice(id: string) {
        return this.request(`/notices/${id}`, { method: 'DELETE' });
    }

    dismissNotice(id: string) {
        return this.request(`/notices/${id}/dismiss`, { method: 'POST' });
    }

    // Support & FAQ System
    getFaqs(params: { contextType?: string; contextId?: string; category?: string; search?: string } = {}) {
        const query = new URLSearchParams();
        if (params.contextType) query.set('contextType', params.contextType);
        if (params.contextId) query.set('contextId', params.contextId);
        if (params.category && params.category !== 'ALL') query.set('category', params.category);
        if (params.search) query.set('search', params.search);
        const qs = query.toString();
        return this.request(`/support/faqs${qs ? `?${qs}` : ''}`);
    }

    getSupportSubjects(params: { contextType?: string; contextId?: string } = {}) {
        const query = new URLSearchParams();
        if (params.contextType) query.set('contextType', params.contextType);
        if (params.contextId) query.set('contextId', params.contextId);
        const qs = query.toString();
        return this.request(`/support/subjects${qs ? `?${qs}` : ''}`);
    }

    submitSupportInquiry(body: {
        name: string;
        email: string;
        subjectId?: string;
        customSubjectTitle?: string;
        contextType?: string;
        contextId?: string;
        message: string;
        faqsConfirmed: boolean;
    }) {
        return this.request('/support/inquire', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    createFaq(body: any) {
        return this.request('/support/admin/faqs', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    updateFaq(id: string, body: any) {
        return this.request(`/support/admin/faqs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    deleteFaq(id: string) {
        return this.request(`/support/admin/faqs/${id}`, {
            method: 'DELETE',
        });
    }

    createSupportSubject(body: any) {
        return this.request('/support/admin/subjects', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    updateSupportSubject(id: string, body: any) {
        return this.request(`/support/admin/subjects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    deleteSupportSubject(id: string) {
        return this.request(`/support/admin/subjects/${id}`, {
            method: 'DELETE',
        });
    }

    getSupportInquiries(params: { contextType?: string; contextId?: string; status?: string } = {}) {
        const query = new URLSearchParams();
        if (params.contextType) query.set('contextType', params.contextType);
        if (params.contextId) query.set('contextId', params.contextId);
        if (params.status) query.set('status', params.status);
        const qs = query.toString();
        return this.request(`/support/admin/inquiries${qs ? `?${qs}` : ''}`);
    }

    // Super Admin & System Management
    getAdminDashboard() {
        return this.request('/admin/dashboard');
    }

    getAdminSettings() {
        return this.request('/admin/settings');
    }

    updateMailgunSettings(body: { apiKey?: string; domain?: string; url?: string; fromEmail?: string; fromName?: string }) {
        return this.request('/admin/settings/mailgun', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    testMailgunSettings(toEmail: string) {
        return this.request('/admin/settings/mailgun/test', {
            method: 'POST',
            body: JSON.stringify({ toEmail }),
        });
    }

    updateSmtpSettings(body: { host?: string; port?: number; user?: string; pass?: string; secure?: boolean; from?: string }) {
        return this.request('/admin/settings/smtp', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    testSmtpSettings(toEmail: string) {
        return this.request('/admin/settings/smtp/test', {
            method: 'POST',
            body: JSON.stringify({ toEmail }),
        });
    }

    updateRateLimitSettings(body: { enabled?: boolean; capacity?: number; refillRatePerSec?: number; blockAnonymousBots?: boolean }) {
        return this.request('/admin/settings/ratelimit', {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    exportDatabase() {
        return this.request('/admin/database/export');
    }

    importDatabase(dumpData: any) {
        return this.request('/admin/database/import', {
            method: 'POST',
            body: JSON.stringify(dumpData),
        });
    }
}

export const api = new ApiClient();


export * from './api/index';
export { api as default } from './api/index';
