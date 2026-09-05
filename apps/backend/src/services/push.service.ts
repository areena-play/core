import webpush from 'web-push';
import { prisma } from '../config/prisma';

// Ensure VAPID keys exist or generate a default persistent pair
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@areena.ch';

if (!vapidPublicKey || !vapidPrivateKey) {
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    console.log('[WebPush] Generated in-memory VAPID keys for development.');
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
}

export class PushService {
    static getPublicKey(): string {
        return vapidPublicKey;
    }

    static async subscribeUser(
        userId: string | null,
        subscription: {
            endpoint: string;
            keys: {
                p256dh: string;
                auth: string;
            };
        },
        userAgent?: string
    ) {
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            throw new Error('Invalid push subscription payload');
        }

        return (prisma as any).pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            create: {
                userId: userId || null,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent: userAgent || null,
            },
            update: {
                userId: userId || undefined,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent: userAgent || undefined,
            },
        });
    }

    static async unsubscribeUser(endpoint: string) {
        if (!endpoint) return;
        return (prisma as any).pushSubscription.deleteMany({
            where: { endpoint },
        });
    }

    static async sendToSubscription(
        subscription: { endpoint: string; p256dh: string; auth: string },
        payload: PushPayload
    ) {
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
            },
        };

        const stringifiedPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/',
            icon: payload.icon || '/icon.svg',
            badge: payload.badge || '/icon.svg',
            tag: payload.tag || 'areena-alert',
            data: payload.data || {},
        });

        try {
            await webpush.sendNotification(pushSubscription, stringifiedPayload);
            return true;
        } catch (err: any) {
            // If subscription has expired or unsubscribed on browser side, remove it
            if (err.statusCode === 404 || err.statusCode === 410) {
                console.log(`[WebPush] Removing expired subscription: ${subscription.endpoint.slice(0, 30)}...`);
                await (prisma as any).pushSubscription.deleteMany({
                    where: { endpoint: subscription.endpoint },
                }).catch(() => {});
            } else {
                console.error('[WebPush] Error sending notification:', err.message || err);
            }
            return false;
        }
    }

    static async sendToUser(userId: string, payload: PushPayload) {
        const subs = await (prisma as any).pushSubscription.findMany({
            where: { userId },
        });

        if (!subs || subs.length === 0) {
            return { sent: 0, total: 0 };
        }

        let sentCount = 0;
        await Promise.all(
            subs.map(async (sub: any) => {
                const ok = await this.sendToSubscription(sub, payload);
                if (ok) sentCount++;
            })
        );

        return { sent: sentCount, total: subs.length };
    }

    static async sendMatchCall(
        userId: string,
        matchInfo: {
            matchId: string;
            opponentName: string;
            table: string;
            category: string;
            stage?: string;
        }
    ) {
        return this.sendToUser(userId, {
            title: `🏓 Table ${matchInfo.table} Call!`,
            body: `Your match vs. ${matchInfo.opponentName} (${matchInfo.category}) has been called to ${matchInfo.table}. Proceed now!`,
            url: `/competitions?matchId=${matchInfo.matchId}&table=${encodeURIComponent(matchInfo.table)}`,
            tag: `match-call-${matchInfo.matchId}`,
            data: {
                matchId: matchInfo.matchId,
                table: matchInfo.table,
            },
        });
    }

    static async broadcastToAll(payload: PushPayload) {
        const allSubs = await (prisma as any).pushSubscription.findMany();
        let sent = 0;
        await Promise.all(
            allSubs.map(async (sub: any) => {
                const ok = await this.sendToSubscription(sub, payload);
                if (ok) sent++;
            })
        );
        return { sent, total: allSubs.length };
    }
}
