'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { ProBadge } from '@/components/common/ProBadge';
import { useI18n } from '@/lib/i18nContext';

export default function ProSuccessPage() {
    const { refreshUser } = useAuth();
    const { t } = useI18n();

    useEffect(() => {
        // Refresh authenticated user state to immediately pull latest subscriptionStatus
        refreshUser();
    }, []);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 text-center shadow-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <div className="inline-flex items-center gap-2 mb-2">
                    <ProBadge size="md" />
                </div>

                <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {t('pro.welcomeTitle') || 'Welcome to Areena Pro!'}
                </h1>

                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {t('pro.welcomeDesc') ||
                        'Your subscription is active. All premium analytics, head-to-head explorer tools, and rating forecasting features are now unlocked.'}
                </p>

                <div className="mt-8 flex flex-col gap-3">
                    <Link
                        href="/profile"
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-md transition-all"
                    >
                        {t('pro.goToProfile') || 'Go to My Profile'}
                    </Link>
                    <Link
                        href="/ratings"
                        className="w-full py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {t('pro.exploreRatings') || 'Explore Ratings & Rankings'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
