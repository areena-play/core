import { HttpClient } from '../client';

export interface PushSubscriptionPayload {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export class PushApi {
    constructor(private http: HttpClient) {}

    getPublicKey(): Promise<{ publicKey: string }> {
        return this.http.request('/push/public-key');
    }

    subscribe(payload: PushSubscriptionPayload): Promise<{ success: boolean; id?: string }> {
        return this.http.request('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    unsubscribe(endpoint: string): Promise<{ success: boolean }> {
        return this.http.request('/push/unsubscribe', {
            method: 'POST',
            body: JSON.stringify({ endpoint }),
        });
    }

    sendTestNotification(payload?: Partial<PushSubscriptionPayload>): Promise<{ success: boolean }> {
        return this.http.request('/push/test', {
            method: 'POST',
            body: JSON.stringify(payload || {}),
        });
    }
}
