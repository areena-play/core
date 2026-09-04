import { HttpClient } from '../client';

export class SystemApi {
    constructor(private http: HttpClient) {}

    getPublicConfig() {
        return this.http.request('/config/public');
    }

    getSetupStatus() {
        return this.http.request('/setup/status');
    }

    initializeSetup(body: any) {
        return this.http.request('/setup/initialize', { method: 'POST', body: JSON.stringify(body) });
    }
}

