'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { usePro } from '@/hooks/usePro';
import { ProBadge } from '@/components/common/ProBadge';
import { useI18n } from '@/lib/i18nContext';

export default function ProPricingPage() {
    const { user } = useAuth();
    const { isPro, plan, periodEnd, openPortal, upgrade, loading } = usePro();
    const router = useRouter();
    const { t } = useI18n();

    const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');

    const handleAction = async (targetInterval: 'MONTHLY' | 'YEARLY') => {
        if (!user) {
            router.push('/auth/login?redirect=/pro/pricing');
            return;
        }

        if (isPro) {
            await openPortal();
            return;
        }

        await upgrade(targetInterval);
    };

    const features = [
        {
            title: t('pro.features.analyticsTitle') || 'Advanced Rating & Elo Forecasts',
            description:
                t('pro.features.analyticsDesc') ||
                'Track expected rating gains before matches, volatility indexes, and long-term skill trajectories.',
            icon: '📈',
        },
        {
            title: t('pro.features.h2hTitle') || 'Deep Head-to-Head (H2H) Explorer',
            description:
                t('pro.features.h2hDesc') ||
                'Analyze historical matchup statistics, win probability calculations, and set-by-set trends against any player.',
            icon: '⚔️',
        },
        {
            title: t('pro.features.insightsTitle') || 'Form Index & Performance Breakdown',
            description:
                t('pro.features.insightsDesc') ||
                'Detailed breakdown of home vs. away form, clutch 5th-set win rates, and opponent tier distribution.',
            icon: '🎯',
        },
        {
            title: t('pro.features.alertsTitle') || 'Tournament Priority Alerts',
            description:
                t('pro.features.alertsDesc') ||
                'Get instant push & email notifications as soon as high-demand tournament entries open.',
            icon: '⚡',
        },
        {
            title: t('pro.features.adFreeTitle') || 'Clean, Ad-Free Platform',
            description:
                t('pro.features.adFreeDesc') ||
                'Enjoy a fast, distraction-free competition browsing experience across all devices.',
            icon: '✨',
        },
        {
            title: t('pro.features.badgeTitle') || 'Official Pro Profile Badge',
            description:
                t('pro.features.badgeDesc') ||
                'Stand out on rankings, club rosters, and tournament brackets with the gold Pro insignia.',
            icon: '⭐',
        },
    ];

    const faqs = [
        {
            q: t('pro.faqs.cancelQ') || 'Can I cancel anytime?',
            a:
                t('pro.faqs.cancelA') ||
                'Yes, absolutely. You can cancel your subscription at any time with one click from your profile or the billing portal. You will retain Pro access until the end of your billing cycle.',
        },
        {
            q: t('pro.faqs.paymentsQ') || 'Which payment methods are supported?',
            a:
                t('pro.faqs.paymentsA') ||
                'We support all major Swiss and international payment methods via Stripe: TWINT, Visa, Mastercard, American Express, Apple Pay, and Google Pay.',
        },
        {
            q: t('pro.faqs.receiptsQ') || 'How do I get invoices and receipts?',
            a:
                t('pro.faqs.receiptsA') ||
                'Invoices and PDF VAT receipts are automatically sent to your email and accessible anytime in the Stripe Customer Portal.',
        },
    ];

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 mb-4">
                        <ProBadge size="sm" />
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            {t('pro.membershipTier') || 'Elevate Your Game'}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
                        {t('pro.heroTitle') || 'Unlock the Ultimate Competitive Edge'}
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                        {t('pro.heroSubtitle') ||
                            'Deep analytics, matchup simulations, rating forecasting, and pro tools designed for dedicated athletes.'}
                    </p>

                    {/* Billing Interval Toggle */}
                    {!isPro && (
                        <div className="mt-8 flex justify-center">
                            <div className="relative flex items-center p-1 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-2xl shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setInterval('MONTHLY')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                                        interval === 'MONTHLY'
                                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                                    }`}
                                >
                                    {t('pro.monthly') || 'Monthly'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInterval('YEARLY')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
                                        interval === 'YEARLY'
                                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                                    }`}
                                >
                                    <span>{t('pro.yearly') || 'Annual'}</span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full uppercase tracking-wider">
                                        {t('pro.save25') || 'Save 25%'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Plan Cards */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Tier */}
                    <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 flex flex-col justify-between shadow-sm">
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                {t('pro.freePlan') || 'Areena Free'}
                            </h3>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                {t('pro.freePlanDesc') || 'Core features for casual players and club members.'}
                            </p>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-4xl font-black text-neutral-900 dark:text-white">CHF 0</span>
                                <span className="text-sm font-medium text-neutral-500">/ forever</span>
                            </div>

                            <ul className="mt-8 space-y-3.5 text-sm text-neutral-600 dark:text-neutral-300">
                                <li className="flex items-center gap-3">
                                    <span className="text-emerald-500">✓</span> Official license & club registration
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="text-emerald-500">✓</span> Current Elo rating & national rank
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="text-emerald-500">✓</span> Standard tournament registration
                                </li>
                                <li className="flex items-center gap-3 text-neutral-400 line-through">
                                    <span>✕</span> Deep H2H matchup explorer
                                </li>
                                <li className="flex items-center gap-3 text-neutral-400 line-through">
                                    <span>✕</span> Rating forecasts & volatility tracking
                                </li>
                            </ul>
                        </div>

                        <div className="mt-8">
                            <button
                                disabled
                                className="w-full py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-semibold text-sm cursor-default"
                            >
                                {user && !isPro ? t('pro.currentPlan') || 'Current Plan' : t('pro.included') || 'Included'}
                            </button>
                        </div>
                    </div>

                    {/* Pro Tier */}
                    <div className="relative rounded-3xl border-2 border-amber-500/80 bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-950/30 dark:via-neutral-900 dark:to-neutral-900 p-8 flex flex-col justify-between shadow-xl ring-4 ring-amber-500/10">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold uppercase tracking-wider shadow-md">
                            {t('pro.recommended') || 'Most Popular'}
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <span>Areena Pro</span>
                                    <ProBadge size="sm" />
                                </h3>
                            </div>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                {t('pro.proPlanDesc') || 'Full competitive analytics toolkit and priority benefits.'}
                            </p>

                            <div className="mt-6 flex items-baseline gap-1.5">
                                <span className="text-4xl sm:text-5xl font-black text-neutral-900 dark:text-white">
                                    {interval === 'YEARLY' ? 'CHF 89' : 'CHF 9.90'}
                                </span>
                                <span className="text-sm font-medium text-neutral-500">
                                    {interval === 'YEARLY' ? '/ year (CHF 7.42/mo)' : '/ month'}
                                </span>
                            </div>

                            <ul className="mt-8 space-y-3.5 text-sm text-neutral-800 dark:text-neutral-200">
                                <li className="flex items-center gap-3 font-medium">
                                    <span className="text-amber-500">✓</span> Everything in Free
                                </li>
                                <li className="flex items-center gap-3 font-medium">
                                    <span className="text-amber-500">✓</span> Deep Head-to-Head (H2H) Explorer
                                </li>
                                <li className="flex items-center gap-3 font-medium">
                                    <span className="text-amber-500">✓</span> Elo gain/loss forecasting before matches
                                </li>
                                <li className="flex items-center gap-3 font-medium">
                                    <span className="text-amber-500">✓</span> Performance breakdown (clutch, venue, form)
                                </li>
                                <li className="flex items-center gap-3 font-medium">
                                    <span className="text-amber-500">✓</span> Tournament entry priority alerts
                                </li>
                                <li className="flex items-center gap-3 font-medium">
                                    <span className="text-amber-500">✓</span> Official Gold Pro Badge
                                </li>
                                <li className="flex items-center gap-3 font-medium">
                                    <span className="text-amber-500">✓</span> TWINT, Card, Apple Pay supported
                                </li>
                            </ul>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={() => handleAction(interval)}
                                disabled={loading}
                                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                            >
                                {loading
                                    ? t('common.loading') || 'Loading...'
                                    : isPro
                                    ? t('pro.manageSubscription') || 'Manage Pro Subscription'
                                    : t('pro.upgradeNow') || `Upgrade to Pro (${interval === 'YEARLY' ? 'CHF 89/yr' : 'CHF 9.90/mo'})`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="mt-20">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center text-neutral-900 dark:text-white">
                        {t('pro.whyProTitle') || 'Engineered for Serious Competitors'}
                    </h2>
                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm"
                            >
                                <div className="text-3xl mb-3">{f.icon}</div>
                                <h4 className="font-bold text-base text-neutral-900 dark:text-white">{f.title}</h4>
                                <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div className="mt-20 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center text-neutral-900 dark:text-white mb-8">
                        {t('pro.faqTitle') || 'Frequently Asked Questions'}
                    </h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm"
                            >
                                <h4 className="font-semibold text-neutral-900 dark:text-white">{faq.q}</h4>
                                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
