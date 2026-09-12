'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18nContext';

export default function ProCancelPage() {
    const { t } = useI18n();

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 text-center shadow-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-neutral-500 mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {t('pro.checkoutCancelledTitle') || 'Checkout Incomplete'}
                </h1>

                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {t('pro.checkoutCancelledDesc') ||
                        'Your payment session was cancelled and no charge was made. You can upgrade anytime.'}
                </p>

                <div className="mt-8 flex flex-col gap-3">
                    <Link
                        href="/pro/pricing"
                        className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all"
                    >
                        {t('pro.backToPricing') || 'Back to Pro Plans'}
                    </Link>
                    <Link
                        href="/profile"
                        className="w-full py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {t('pro.goToProfile') || 'Return to Profile'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
