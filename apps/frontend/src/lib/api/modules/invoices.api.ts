import { HttpClient } from '../client';

export class InvoicesApi {
    constructor(private http: HttpClient) {}

    getInvoices(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/invoices${qs ? `?${qs}` : ''}`);
    }

    getInvoiceStats(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/invoices/stats${qs ? `?${qs}` : ''}`);
    }

    getInvoice(id: string) {
        return this.http.request(`/invoices/${id}`);
    }

    createInvoice(body: any) {
        return this.http.request('/invoices', { method: 'POST', body: JSON.stringify(body) });
    }

    updateInvoice(id: string, body: any) {
        return this.http.request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    sendInvoice(id: string) {
        return this.http.request(`/invoices/${id}/send`, { method: 'POST' });
    }

    markInvoicePaid(id: string) {
        return this.http.request(`/invoices/${id}/pay`, { method: 'POST' });
    }

    deleteInvoice(id: string) {
        return this.http.request(`/invoices/${id}`, { method: 'DELETE' });
    }

    syncInvoiceBexio(id: string) {
        return this.http.request(`/invoices/${id}/sync-bexio`, { method: 'POST' });
    }

    getInvoiceQrBill(id: string) {
        return this.http.request(`/invoices/${id}/qr-bill`);
    }

    getBexioConfig(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/invoices/bexio/config${qs ? `?${qs}` : ''}`);
    }

    updateBexioConfig(body: any) {
        return this.http.request('/invoices/bexio/config', { method: 'PUT', body: JSON.stringify(body) });
    }
}

