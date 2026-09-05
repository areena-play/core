import express, { Response } from 'express';
import { PushService } from '../services/push.service';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /push/public-key - Get VAPID public key for frontend subscription
router.get('/public-key', (req, res) => {
    const publicKey = PushService.getPublicKey();
    res.json({ publicKey });
});

// POST /push/subscribe - Register or update a device push subscription
router.post('/subscribe', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ error: 'Missing push subscription credentials' });
        }

        const userId = req.user?.id || null;
        const userAgent = (req.headers['user-agent'] as string) || undefined;

        const record = await PushService.subscribeUser(
            userId,
            { endpoint, keys },
            userAgent
        );

        res.json({ success: true, id: record.id });
    } catch (err) {
        next(err);
    }
});

// POST /push/unsubscribe - Unregister a device push subscription
router.post('/unsubscribe', async (req, res, next) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            return res.status(400).json({ error: 'Missing endpoint' });
        }

        await PushService.unsubscribeUser(endpoint);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// POST /push/test - Trigger an immediate test notification to the user
router.post('/test', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
        const { endpoint, keys } = req.body;

        if (endpoint && keys?.p256dh && keys?.auth) {
            // Direct test to the provided subscription
            const ok = await PushService.sendToSubscription(
                { endpoint, p256dh: keys.p256dh, auth: keys.auth },
                {
                    title: 'AREENA Live Match Alert 🏓',
                    body: 'Push notifications are active! You will receive table calls and score updates instantly.',
                    url: '/competitions',
                    tag: 'test-notification',
                }
            );
            return res.json({ success: ok });
        }

        if (req.user?.id) {
            const result = await PushService.sendToUser(req.user.id, {
                title: 'AREENA Live Match Alert 🏓',
                body: 'Push notifications are active for your account!',
                url: '/competitions',
                tag: 'test-notification',
            });
            return res.json({ success: true, result });
        }

        res.status(400).json({ error: 'Must provide subscription keys or be logged in' });
    } catch (err) {
        next(err);
    }
});

export default router;
