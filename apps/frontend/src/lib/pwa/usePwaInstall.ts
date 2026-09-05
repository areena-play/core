'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if already running as standalone PWA
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsInstalled(isStandalone);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsSupported(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Register Service Worker
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[PWA] Service Worker registered with scope:', registration.scope);
                })
                .catch((err) => {
                    console.warn('[PWA] Service Worker registration failed:', err);
                });
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async (): Promise<boolean> => {
        if (!deferredPrompt) {
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                setIsInstalled(true);
                setDeferredPrompt(null);
                return true;
            }
            return false;
        } catch (err) {
            console.error('[PWA] Install prompt error:', err);
            return false;
        }
    };

    return {
        isInstallable: Boolean(deferredPrompt),
        isInstalled,
        isSupported,
        installApp,
    };
}

