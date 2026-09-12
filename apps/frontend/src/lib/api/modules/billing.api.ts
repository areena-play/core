import { HttpClient } from '../client';
import {
    CreateCheckoutSessionRequest,
    CheckoutSessionResponse,
    CustomerPortalResponse,
    SubscriptionDetailsResponse,
} from '@areena/shared';

export class BillingApi {
    constructor(private http: HttpClient) {}

    /**
     * Create a Stripe Checkout Session to upgrade to Pro
     */
    createCheckoutSession(body: CreateCheckoutSessionRequest) {
        return this.http.request<CheckoutSessionResponse>('/billing/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    /**
     * Create a Stripe Customer Portal Session to manage billing & invoices
     */
    createPortalSession(returnUrl?: string) {
        return this.http.request<CustomerPortalResponse>('/billing/create-portal-session', {
            method: 'POST',
            body: JSON.stringify({ returnUrl }),
        });
    }

    /**
     * Fetch the user's current subscription status
     */
    getSubscription() {
        return this.http.request<SubscriptionDetailsResponse>('/billing/subscription');
    }
}

