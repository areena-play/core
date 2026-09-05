'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { triggerHaptic } from './useHaptics';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check initial push support & status
    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window
        ) {
            setIsSupported(true);
            setPermission(Notification.permission);

            navigator.serviceWorker.ready.then((reg) => {
                reg.pushManager.getSubscription().then((sub) => {
                    setIsSubscribed(!!sub);
                });
            });
        }
    }, []);

    // Subscribe to push notifications
    const subscribe = useCallback(async () => {
        if (!isSupported) {
            setError('Push notifications are not supported by this browser.');
            return false;
        }

        setLoading(true);
        setError(null);
        triggerHaptic('medium');

        try {
            // 1. Request notification permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                setError('Notification permission was denied or dismissed.');
                triggerHaptic('warning');
                return false;
            }

            // 2. Fetch VAPID public key from backend
            const { publicKey } = await api.push.getPublicKey();
            if (!publicKey) {
                throw new Error('Could not retrieve VAPID key from server.');
            }

            // 3. Register push subscription with browser service worker
            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();

            if (!sub) {
                const applicationServerKey = urlBase64ToUint8Array(publicKey);
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey,
                });
            }

            const subJson = sub.toJSON();
            if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
                throw new Error('Malformed subscription object from browser.');
            }

            // 4. Send subscription to AREENA backend
            await api.push.subscribe({
                endpoint: subJson.endpoint,
                keys: {
                    p256dh: subJson.keys.p256dh,
                    auth: subJson.keys.auth,
                },
            });

            setIsSubscribed(true);
            triggerHaptic('success');
            return true;
        } catch (err: any) {
            console.error('[Push] Subscribe error:', err);
            setError(err.message || 'Failed to subscribe to push notifications.');
            triggerHaptic('warning');
            return false;
        } finally {
            setLoading(false);
        }
    }, [isSupported]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async () => {
        if (!isSupported) return;

        setLoading(true);
        setError(null);
        triggerHaptic('light');

        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();

            if (sub) {
                const endpoint = sub.endpoint;
                await sub.unsubscribe();
                await api.push.unsubscribe(endpoint).catch(() => {});
            }

            setIsSubscribed(false);
            triggerHaptic('success');
            return true;
        } catch (err: any) {
            console.error('[Push] Unsubscribe error:', err);
            setError(err.message || 'Failed to unsubscribe.');
            return false;
        } finally {
            setLoading(false);
        }
    }, [isSupported]);

    // Trigger an instant test notification
    const sendTestNotification = useCallback(async () => {
        if (!isSupported) return;
        setLoading(true);
        triggerHaptic('medium');

        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            const subJson = sub?.toJSON();

            await api.push.sendTestNotification(
                subJson?.endpoint && subJson?.keys?.p256dh && subJson?.keys?.auth
                    ? {
                          endpoint: subJson.endpoint,
                          keys: {
                              p256dh: subJson.keys.p256dh,
                              auth: subJson.keys.auth,
                          },
                      }
                    : undefined
            );
            triggerHaptic('success');
            return true;
        } catch (err: any) {
            console.error('[Push] Test notification error:', err);
            setError(err.message || 'Failed to send test push notification.');
            triggerHaptic('warning');
            return false;
        } finally {
            setLoading(false);
        }
    }, [isSupported]);

    return {
        isSupported,
        permission,
        isSubscribed,
        loading,
        error,
        subscribe,
        unsubscribe,
        sendTestNotification,
    };
}
