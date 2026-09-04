import { HttpClient, API_BASE } from '../client';

export class AuditApi {
    constructor(private http: HttpClient) {}

    getAuditLogs(params: Record<string, string | number> = {}) {
        const strParams: Record<string, string> = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') strParams[k] = String(v);
        });
        const qs = new URLSearchParams(strParams).toString();
        return this.http.request(`/audit-logs${qs ? `?${qs}` : ''}`);
    }

    getAuditStats(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/audit-logs/stats${qs ? `?${qs}` : ''}`);
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

