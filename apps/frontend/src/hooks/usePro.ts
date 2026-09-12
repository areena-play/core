'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';

export function usePro() {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isPro =
        user?.subscriptionStatus === 'ACTIVE' ||
        user?.subscriptionStatus === 'TRIALING' ||
        user?.isPro === true;

    const status = user?.subscriptionStatus || 'INACTIVE';
    const plan = user?.subscriptionPlan || null;
    const periodEnd = user?.subscriptionCurrentPeriodEnd || null;
    const cancelAtPeriodEnd = user?.subscriptionCancelAtPeriodEnd || false;

    const upgrade = async (interval: 'MONTHLY' | 'YEARLY' = 'MONTHLY') => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.billing.createCheckoutSession({ interval });
            if (res.url) {
                if (res.isMock) {
                    await refreshUser();
                }
                window.location.href = res.url;
            } else {
                throw new Error('Unable to create checkout session');
            }
        } catch (err: any) {
            console.error('[usePro] Upgrade failed:', err);
            setError(err?.message || 'Failed to start upgrade checkout.');
            setLoading(false);
        }
    };

    const openPortal = async (returnUrl?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.billing.createPortalSession(returnUrl);
            if (res.url) {
                window.location.href = res.url;
            } else {
                throw new Error('Unable to open billing portal');
            }
        } catch (err: any) {
            console.error('[usePro] Portal failed:', err);
            setError(err?.message || 'Failed to open billing portal.');
            setLoading(false);
        }
    };

    return {
        isPro,
        status,
        plan,
        periodEnd,
        cancelAtPeriodEnd,
        loading,
        error,
        upgrade,
        openPortal,
        refreshSubscription: refreshUser,
    };
}

