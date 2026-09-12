'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePro } from '@/hooks/usePro';
import { ProBadge } from './ProBadge';
import { useI18n } from '@/lib/i18nContext';

interface ProGateProps {
    children: ReactNode;
    fallback?: ReactNode;
    featureName?: string;
    description?: string;
    compact?: boolean;
}

export const ProGate: React.FC<ProGateProps> = ({
    children,
    fallback,
    featureName,
    description,
    compact = false,
}) => {
    const { isPro } = usePro();
    const { t } = useI18n();

    if (isPro) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (compact) {
        return (
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl">
                <div className="flex items-center gap-2.5">
                    <ProBadge size="sm" />
                    <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                        {featureName ? `${featureName} is an Areena Pro feature` : t('pro.exclusiveFeature') || 'Areena Pro Feature'}
                    </span>
                </div>
                <Link
                    href="/pro/pricing"
                    className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-sm"
                >
                    {t('pro.unlockPro') || 'Unlock Pro'}
                </Link>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/60 dark:from-amber-950/20 dark:via-neutral-900 dark:to-orange-950/10 p-6 md:p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-md shadow-amber-500/20 mb-4">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 mb-2">
                <ProBadge size="sm" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    {t('pro.premiumContent') || 'Premium Feature'}
                </span>
            </div>

            <h3 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {featureName || t('pro.unlockTitle') || 'Unlock with Areena Pro'}
            </h3>

            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                {description ||
                    t('pro.unlockDescription') ||
                    'Get deep performance insights, head-to-head matchup statistics, rating forecasts, and priority tournament perks.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                    href="/pro/pricing"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm shadow-md hover:from-amber-600 hover:to-orange-700 transition-all transform hover:-translate-y-0.5"
                >
                    <span>{t('pro.seePlans') || 'Explore Pro Plans'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </Link>
            </div>
        </div>
    );
};

export default ProGate;
