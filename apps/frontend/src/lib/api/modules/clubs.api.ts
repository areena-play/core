import { HttpClient } from '../client';

export class ClubsApi {
    constructor(private http: HttpClient) {}

    getClubs() {
        return this.http.request('/clubs');
    }

    getClub(id: string) {
        return this.http.request(`/clubs/${id}`);
    }

    createClub(body: any) {
        return this.http.request('/clubs', { method: 'POST', body: JSON.stringify(body) });
    }
}

