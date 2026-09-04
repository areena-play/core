import { HttpClient } from '../client';

export class CalendarApi {
    constructor(private http: HttpClient) {}

    getCalendarEvents(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.http.request(`/calendar${qs ? `?${qs}` : ''}`);
    }

    createCalendarEvent(body: any) {
        return this.http.request('/calendar', { method: 'POST', body: JSON.stringify(body) });
    }
}

