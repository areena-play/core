import { HttpClient } from '../client';

export class MessagesApi {
    constructor(private http: HttpClient) {}

    sendBroadcast(body: any) {
        return this.http.request('/messages/broadcast', { method: 'POST', body: JSON.stringify(body) });
    }

    getMessages() {
        return this.http.request('/messages');
    }
}

