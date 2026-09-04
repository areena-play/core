import { HttpClient } from '../client';

export class NoticesApi {
    constructor(private http: HttpClient) {}

    getActiveNotices() {
        return this.http.request('/notices/active');
    }

    getAdminNotices() {
        return this.http.request('/notices');
    }

    createNotice(body: any) {
        return this.http.request('/notices', { method: 'POST', body: JSON.stringify(body) });
    }

    updateNotice(id: string, body: any) {
        return this.http.request(`/notices/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    deleteNotice(id: string) {
        return this.http.request(`/notices/${id}`, { method: 'DELETE' });
    }

    dismissNotice(id: string) {
        return this.http.request(`/notices/${id}/dismiss`, { method: 'POST' });
    }
}

