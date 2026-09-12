import Stripe from 'stripe';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { SystemService } from './system.service';
import { AuditService } from './audit.service';
import { AuditCategory } from '@areena/shared';

export class StripeService {
    private static cachedClient: { key: string; client: Stripe } | null = null;

    /**
     * Get active Stripe client initialized with current DB or env secret key
     */
    static async getClient(): Promise<Stripe | null> {
        const stripeConfig = await SystemService.getStripeConfig();
        if (!stripeConfig.secretKey) {
            return null;
        }

        if (this.cachedClient && this.cachedClient.key === stripeConfig.secretKey) {
            return this.cachedClient.client;
        }

        const client = new Stripe(stripeConfig.secretKey, {
            apiVersion: '2024-11-20.acacia' as any,
            typescript: true,
        });

        this.cachedClient = { key: stripeConfig.secretKey, client };
        return client;
    }

    /**
     * Check if live/test Stripe API is active
     */
    static async isConfigured(): Promise<boolean> {
        const stripeConfig = await SystemService.getStripeConfig();
        return stripeConfig.isConfigured;
    }

    /**
     * Get or create a Stripe Customer for an Areena user
     */
    static async getOrCreateCustomer(userId: string): Promise<string> {
        const user = await prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });

        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const stripe = await this.getClient();
        if (!stripe) {
            const mockCustomerId = `cus_mock_${user.id.substring(0, 8)}`;
            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: mockCustomerId },
            });
            return mockCustomerId;
        }

        const customer = await stripe.customers.create({
            email: user.email || undefined,
            name: `${user.firstName} ${user.lastName}`.trim(),
            metadata: {
                userId: user.id,
                platform: 'Areena',
            },
        });

        await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customer.id },
        });

        return customer.id;
    }

    /**
     * Create a Stripe Checkout Session for upgrading to Areena Pro
     */
    static async createProCheckoutSession(
        userId: string,
        interval: 'MONTHLY' | 'YEARLY',
        customSuccessUrl?: string,
        customCancelUrl?: string,
        clientOrigin?: string
    ): Promise<{ url: string; sessionId?: string; isMock?: boolean }> {
        const user = await prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });

        const baseUrl = clientOrigin || config.appBaseUrl || 'http://localhost:3000';
        const successUrl =
            customSuccessUrl || `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = customCancelUrl || `${baseUrl}/pro/pricing`;

        const stripe = await this.getClient();
        const stripeConfig = await SystemService.getStripeConfig();

        if (!stripe) {
            // Mock simulation mode when no Stripe secret key is configured in System Admin Settings
            console.warn('[StripeService] Stripe not configured in Admin Settings. Simulating instant Pro activation for dev/demo.');
            
            const simulatedExpiry = new Date();
            if (interval === 'YEARLY') {
                simulatedExpiry.setFullYear(simulatedExpiry.getFullYear() + 1);
            } else {
                simulatedExpiry.setMonth(simulatedExpiry.getMonth() + 1);
            }

            await prisma.user.update({
                where: { id: userId },
                data: {
                    stripeCustomerId: user.stripeCustomerId || `cus_sim_${user.id.substring(0, 8)}`,
                    stripeSubscriptionId: `sub_sim_${Date.now()}`,
                    subscriptionStatus: 'ACTIVE',
                    subscriptionPlan: interval === 'YEARLY' ? 'PRO_YEARLY' : 'PRO_MONTHLY',
                    subscriptionCurrentPeriodEnd: simulatedExpiry,
                    subscriptionCancelAtPeriodEnd: false,
                },
            });

            await AuditService.record({
                userId: user.id,
                userEmail: user.email ?? undefined,
                userName: `${user.firstName} ${user.lastName}`,
                action: 'SUBSCRIPTION_CREATED',
                category: AuditCategory.FINANCE,
                entityType: 'User',
                entityId: user.id,
                description: `Simulated Areena Pro (${interval}) subscription activated for ${user.firstName} ${user.lastName}`,
                status: 'SUCCESS',
                metadata: { interval, isMock: true },
            });

            return {
                url: `${baseUrl}/pro/success?mock=true&interval=${interval}`,
                isMock: true,
            };
        }

        const customerId = await this.getOrCreateCustomer(userId);

        // Determine configured price ID or dynamic line item
        const configuredPriceId =
            interval === 'YEARLY'
                ? stripeConfig.proYearlyPriceId
                : stripeConfig.proMonthlyPriceId;

        let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

        if (configuredPriceId) {
            lineItems = [{ price: configuredPriceId, quantity: 1 }];
        } else {
            // Dynamic recurring price data if predefined Price IDs are not configured
            const unitAmount = interval === 'YEARLY' ? 8900 : 990; // 89.00 CHF / year or 9.90 CHF / month
            lineItems = [
                {
                    price_data: {
                        currency: 'chf',
                        product_data: {
                            name: `Areena Pro (${interval === 'YEARLY' ? 'Annual' : 'Monthly'})`,
                            description: 'Full access to advanced rating forecasts, player analytics, and head-to-head stats.',
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: interval === 'YEARLY' ? 'year' : 'month',
                        },
                    },
                    quantity: 1,
                },
            ];
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card', 'twint'],
            line_items: lineItems,
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: {
                userId: user.id,
                interval,
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                    interval,
                },
            },
        });

        return {
            url: session.url || '',
            sessionId: session.id,
        };
    }

    /**
     * Create a Stripe Customer Portal session to manage billing, invoices, and cancellation
     */
    static async createCustomerPortalSession(
        userId: string,
        customReturnUrl?: string,
        clientOrigin?: string
    ): Promise<{ url: string; isMock?: boolean }> {
        const baseUrl = clientOrigin || config.appBaseUrl || 'http://localhost:3000';
        const returnUrl = customReturnUrl || `${baseUrl}/profile`;

        const stripe = await this.getClient();
        if (!stripe) {
            return {
                url: returnUrl,
                isMock: true,
            };
        }

        const customerId = await this.getOrCreateCustomer(userId);

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return {
            url: portalSession.url,
        };
    }

    /**
     * Verify and parse Stripe Webhook event from raw buffer
     */
    static async constructWebhookEvent(payload: Buffer | string, signature: string): Promise<Stripe.Event> {
        const stripe = await this.getClient();
        if (!stripe) {
            throw new Error('Stripe client not initialized with secret key.');
        }

        const stripeConfig = await SystemService.getStripeConfig();
        if (!stripeConfig.webhookSecret) {
            throw new Error('Stripe webhook secret is not configured in Admin Settings or .env.');
        }

        return stripe.webhooks.constructEvent(
            payload,
            signature,
            stripeConfig.webhookSecret
        );
    }

    /**
     * Process Stripe webhook event and synchronize user subscription status
     */
    static async handleWebhookEvent(event: Stripe.Event): Promise<{ handled: boolean; eventType: string }> {
        const eventType = event.type;
        const stripe = await this.getClient();

        switch (eventType) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription') {
                    const userId = session.metadata?.userId;
                    const subscriptionId = session.subscription as string;
                    const interval = session.metadata?.interval;

                    if (userId && subscriptionId && stripe) {
                        const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);
                        const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

                        await prisma.user.update({
                            where: { id: userId },
                            data: {
                                stripeSubscriptionId: subscription.id,
                                subscriptionStatus: 'ACTIVE',
                                subscriptionPlan: interval === 'YEARLY' ? 'PRO_YEARLY' : 'PRO_MONTHLY',
                                subscriptionCurrentPeriodEnd: periodEnd,
                                subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                            },
                        });

                        const user = await prisma.user.findUnique({ where: { id: userId } });
                        if (user) {
                            await AuditService.record({
                                userId: user.id,
                                userEmail: user.email ?? undefined,
                                userName: `${user.firstName} ${user.lastName}`,
                                action: 'SUBSCRIPTION_ACTIVATED',
                                category: AuditCategory.FINANCE,
                                entityType: 'User',
                                entityId: user.id,
                                description: `Areena Pro activated via Stripe Checkout (${interval || 'Standard'})`,
                                status: 'SUCCESS',
                                metadata: { subscriptionId: subscription.id },
                            });
                        }
                    }
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as any;
                const statusMap: Record<string, any> = {
                    active: 'ACTIVE',
                    trialing: 'TRIALING',
                    past_due: 'PAST_DUE',
                    canceled: 'CANCELED',
                    unpaid: 'PAST_DUE',
                    incomplete: 'INACTIVE',
                    incomplete_expired: 'INACTIVE',
                };

                const mappedStatus = statusMap[subscription.status] || 'INACTIVE';
                const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

                await prisma.user.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        subscriptionStatus: mappedStatus,
                        subscriptionCurrentPeriodEnd: periodEnd,
                        subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                    },
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;

                await prisma.user.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        subscriptionStatus: 'CANCELED',
                        subscriptionCancelAtPeriodEnd: false,
                    },
                });
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription || invoice.lines?.data?.[0]?.subscription;
                if (subscriptionId) {
                    const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
                    await prisma.user.updateMany({
                        where: { stripeSubscriptionId: subId },
                        data: {
                            subscriptionStatus: 'PAST_DUE',
                        },
                    });
                }
                break;
            }

            default:
                break;
        }

        return { handled: true, eventType };
    }
}
