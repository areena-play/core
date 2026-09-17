'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

declare global {
    interface Window {
        dataLayer?: any[];
        gtag?: (...args: any[]) => void;
        [key: `ga-disable-${string}`]: boolean;
    }
}

const CONSENT_STORAGE_KEY = 'areena_cookie_consent_v1';

export function GoogleAnalytics() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [gaConfig, setGaConfig] = useState<{
        measurementId: string;
        enabled: boolean;
        anonymizeIp: boolean;
    } | null>(null);

    const [hasAnalyticsConsent, setHasAnalyticsConsent] = useState(false);
    const scriptInjectedRef = useRef(false);

    // 1. Fetch public system configuration for Google Analytics
    useEffect(() => {
        let mounted = true;
        async function fetchConfig() {
            try {
                const pubConfig: any = await api.getPublicConfig();
                if (mounted && pubConfig?.googleAnalytics) {
                    setGaConfig(pubConfig.googleAnalytics);
                }
            } catch (e) {
                console.warn('[GoogleAnalytics] Could not load public config:', e);
            }
        }
        fetchConfig();
        return () => {
            mounted = false;
        };
    }, []);

    // 2. Read and listen to user's cookie consent
    useEffect(() => {
        const checkConsent = () => {
            try {
                const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setHasAnalyticsConsent(Boolean(parsed.analytics));
                    return;
                }
            } catch (e) {}
            // Default to no consent until explicitly granted
            setHasAnalyticsConsent(false);
        };

        checkConsent();

        const handleConsentUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && typeof customEvent.detail.analytics === 'boolean') {
                setHasAnalyticsConsent(customEvent.detail.analytics);
            } else {
                checkConsent();
            }
        };

        window.addEventListener('areena:cookie-consent-updated', handleConsentUpdate);
        window.addEventListener('storage', checkConsent);

        return () => {
            window.removeEventListener('areena:cookie-consent-updated', handleConsentUpdate);
            window.removeEventListener('storage', checkConsent);
        };
    }, []);

    // 3. Inject or disable Google Analytics based on consent & configuration
    useEffect(() => {
        if (!gaConfig || !gaConfig.enabled || !gaConfig.measurementId) {
            return;
        }

        const mid = gaConfig.measurementId;

        if (hasAnalyticsConsent) {
            // User granted consent: Enable tracking
            window[`ga-disable-${mid}`] = false;

            if (!scriptInjectedRef.current) {
                window.dataLayer = window.dataLayer || [];
                function gtag(...args: any[]) {
                    window.dataLayer?.push(args);
                }
                window.gtag = gtag;

                gtag('js', new Date());
                gtag('consent', 'default', {
                    analytics_storage: 'granted',
                });
                gtag('config', mid, {
                    anonymize_ip: gaConfig.anonymizeIp,
                    send_page_view: false, // Page views are tracked explicitly on route transitions
                });

                const script = document.createElement('script');
                script.id = 'areena-ga-tag';
                script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(mid)}`;
                script.async = true;
                document.head.appendChild(script);

                scriptInjectedRef.current = true;
            } else if (window.gtag) {
                window.gtag('consent', 'update', {
                    analytics_storage: 'granted',
                });
            }
        } else {
            // User did NOT grant consent (or revoked it): strictly block tracking
            window[`ga-disable-${mid}`] = true;

            if (window.gtag) {
                window.gtag('consent', 'update', {
                    analytics_storage: 'denied',
                });
            }
        }
    }, [gaConfig, hasAnalyticsConsent]);

    // 4. Track route / page transitions when consented
    useEffect(() => {
        if (!hasAnalyticsConsent || !gaConfig || !gaConfig.enabled || !gaConfig.measurementId) {
            return;
        }

        if (window.gtag && scriptInjectedRef.current) {
            const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
            window.gtag('event', 'page_view', {
                page_path: url,
                page_location: window.location.href,
                page_title: document.title,
            });
        }
    }, [pathname, searchParams, hasAnalyticsConsent, gaConfig]);

    return null;
}

