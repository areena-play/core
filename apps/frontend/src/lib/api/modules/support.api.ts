import { HttpClient } from '../client';

export class SupportApi {
    constructor(private http: HttpClient) {}

    getFaqs(params: { contextType?: string; contextId?: string; category?: string; search?: string } = {}) {
        const query = new URLSearchParams();
        if (params.contextType) query.set('contextType', params.contextType);
        if (params.contextId) query.set('contextId', params.contextId);
        if (params.category && params.category !== 'ALL') query.set('category', params.category);
        if (params.search) query.set('search', params.search);
        const qs = query.toString();
        return this.http.request(`/support/faqs${qs ? `?${qs}` : ''}`);
    }

    getSupportSubjects(params: { contextType?: string; contextId?: string } = {}) {
        const query = new URLSearchParams();
        if (params.contextType) query.set('contextType', params.contextType);
        if (params.contextId) query.set('contextId', params.contextId);
        const qs = query.toString();
        return this.http.request(`/support/subjects${qs ? `?${qs}` : ''}`);
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
        return this.http.request('/support/inquire', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    createFaq(body: any) {
        return this.http.request('/support/admin/faqs', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    updateFaq(id: string, body: any) {
        return this.http.request(`/support/admin/faqs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    deleteFaq(id: string) {
        return this.http.request(`/support/admin/faqs/${id}`, {
            method: 'DELETE',
        });
    }

    createSupportSubject(body: any) {
        return this.http.request('/support/admin/subjects', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    updateSupportSubject(id: string, body: any) {
        return this.http.request(`/support/admin/subjects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    deleteSupportSubject(id: string) {
        return this.http.request(`/support/admin/subjects/${id}`, {
            method: 'DELETE',
        });
    }

    getSupportInquiries(params: { contextType?: string; contextId?: string; status?: string } = {}) {
        const query = new URLSearchParams();
        if (params.contextType) query.set('contextType', params.contextType);
        if (params.contextId) query.set('contextId', params.contextId);
        if (params.status) query.set('status', params.status);
        const qs = query.toString();
        return this.http.request(`/support/admin/inquiries${qs ? `?${qs}` : ''}`);
    }
}

