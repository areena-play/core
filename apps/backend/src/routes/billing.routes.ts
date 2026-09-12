import { Router, Response, Request } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { StripeService } from '../services/stripe.service';
import { prisma } from '../config/prisma';

export const billingRouter = Router();

/**
 * POST /billing/create-checkout-session
 * Creates a Stripe Checkout Session for upgrading to Areena Pro
 */
billingRouter.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.user!.id;
        const { interval = 'MONTHLY', successUrl, cancelUrl } = req.body;

        if (interval !== 'MONTHLY' && interval !== 'YEARLY') {
            return res.status(400).json({ error: 'Invalid interval. Must be MONTHLY or YEARLY.' });
        }

        const clientOrigin = (req.headers.origin || req.headers.referer) as string | undefined;

        const result = await StripeService.createProCheckoutSession(
            userId,
            interval,
            successUrl,
            cancelUrl,
            clientOrigin
        );

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /billing/create-portal-session
 * Creates a Stripe Customer Portal session to manage card, invoices, or cancellation
 */
billingRouter.post('/create-portal-session', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.user!.id;
        const { returnUrl } = req.body;
        const clientOrigin = (req.headers.origin || req.headers.referer) as string | undefined;

        const result = await StripeService.createCustomerPortalSession(
            userId,
            returnUrl,
            clientOrigin
        );

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /billing/subscription
 * Retrieves current active subscription details for the authenticated user
 */
billingRouter.get('/subscription', authenticateToken, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true,
                subscriptionStatus: true,
                subscriptionPlan: true,
                subscriptionCurrentPeriodEnd: true,
                subscriptionCancelAtPeriodEnd: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPro =
            user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING';

        res.json({
            isPro,
            status: user.subscriptionStatus,
            plan: user.subscriptionPlan,
            currentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString() || null,
            cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
            customerId: user.stripeCustomerId,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /billing/webhook
 * Handles incoming Stripe Webhooks
 */
billingRouter.post('/webhook', async (req: Request, res: Response, next) => {
    try {
        const signature = req.headers['stripe-signature'];
        if (!signature || typeof signature !== 'string') {
            return res.status(400).json({ error: 'Missing stripe-signature header' });
        }

        const rawBody = (req as any).rawBody || req.body;
        const event = await StripeService.constructWebhookEvent(rawBody, signature);

        const result = await StripeService.handleWebhookEvent(event);
        res.json({ received: true, ...result });
    } catch (err: any) {
        console.error('[Stripe Webhook Error]', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

export default billingRouter;

