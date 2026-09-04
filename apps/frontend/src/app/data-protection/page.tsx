'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18nContext';
import { useTheme } from '@/lib/themeContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    ShieldCheck,
    ChevronLeft,
    Sparkles,
    Mail,
    Lock,
    Eye,
    Database,
    Users,
    KeyRound,
    FileCheck,
    Server,
    Cookie,
    CheckCircle2,
    Building2,
    Scale,
    ExternalLink,
} from 'lucide-react';

export default function DataProtectionPage() {
    const { t } = useI18n();
    const { resolvedTheme } = useTheme();
    const { mainAssoc } = useMainView();
    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    return (
        <div className="w-full space-y-8 pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{t('common.back')}</span>
                </Link>
                <Link
                    href="/impressum"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline transition"
                >
                    <span>{t('nav.impressum')}</span>
                    <ExternalLink className="h-3 w-3" />
                </Link>
            </div>

            {/* Header Brand Hero */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-8 shadow-sm dark:shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative h-10 w-36 sm:h-12 sm:w-44">
                        <Image
                            key={logoSrc}
                            src={logoSrc}
                            alt="AREENA Logo"
                            fill
                            priority
                            className="object-contain"
                        />
                    </div>

                    <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 text-xs font-bold uppercase tracking-wider self-start sm:self-auto flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        {t('privacyDoc.badge')}
                    </span>
                </div>

                <div className="pt-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {t('privacyDoc.title')}
                    </h1>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {t('privacyDoc.subtitle')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
                        {t('privacyDoc.description')}
                    </p>
                </div>
            </div>

            {/* Section 1: Data Controller */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Building2 className="h-4 w-4 text-red-500" />
                    <span>{t('privacyDoc.section1Title')}</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p>{t('privacyDoc.section1Text')}</p>
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1 font-mono text-[11px]">
                        <div className="font-bold text-slate-900 dark:text-white font-sans text-xs">
                            {mainAssoc?.name || 'AREENA Platform Operator'}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 font-sans">
                            {t('privacyDoc.federationRole')}
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 text-red-600 dark:text-red-400 font-sans font-medium">
                            <Mail className="h-3.5 w-3.5" />
                            <span>privacy@areena.app • info@areena.app</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Categories of Data Collected */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Database className="h-4 w-4 text-red-500" />
                    <span>{t('privacyDoc.section2Title')}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span>{t('privacyDoc.catAuthTitle')}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('privacyDoc.catAuthDesc')}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-emerald-500" />
                            <span>{t('privacyDoc.catLicensingTitle')}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('privacyDoc.catLicensingDesc')}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span>{t('privacyDoc.catMatchesTitle')}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('privacyDoc.catMatchesDesc')}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-purple-500" />
                            <span>{t('privacyDoc.catGovernanceTitle')}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('privacyDoc.catGovernanceDesc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Section 3: Legal Basis & Retention */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-3 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                        <Scale className="h-4 w-4 text-red-500" />
                        <span>{t('privacyDoc.section3Title')}</span>
                    </div>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('privacyDoc.basisContract')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('privacyDoc.basisLegitimate')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('privacyDoc.basisConsent')}</span>
                        </li>
                    </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-3 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                        <Server className="h-4 w-4 text-red-500" />
                        <span>{t('privacyDoc.section4Title')}</span>
                    </div>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                        <li className="flex items-start gap-2">
                            <Lock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('privacyDoc.secTransit')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Lock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('privacyDoc.secControls')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Lock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('privacyDoc.secHosting')}</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Section 5: Cookies & Local Storage */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Cookie className="h-4 w-4 text-red-500" />
                    <span>{t('privacyDoc.section5Title')}</span>
                </div>

                <p>{t('privacyDoc.section5Desc')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">areena_token</div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {t('privacyDoc.tokenDesc')}
                        </p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">areena_theme</div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {t('privacyDoc.themeDesc')}
                        </p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">areena_locale</div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {t('privacyDoc.localeDesc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Section 6: User Rights */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Eye className="h-4 w-4 text-red-500" />
                    <span>{t('privacyDoc.section6Title')}</span>
                </div>

                <p>{t('privacyDoc.section6Desc')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{t('privacyDoc.rightAccess')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{t('privacyDoc.rightRect')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{t('privacyDoc.rightErasure')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{t('privacyDoc.rightPortability')}</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500 text-xs">
                    {t('privacyDoc.contactPrompt')}{' '}
                    <a href="mailto:privacy@areena.app" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
                        privacy@areena.app
                    </a>{' '}
                    {t('privacyDoc.contactPromptOr')}
                </div>
            </div>

            {/* Footer Metadata */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-red-500" />
                    <span>{t('privacyDoc.footerStandard', { version: process.env.NEXT_PUBLIC_APP_VERSION })}</span>
                </div>
                <span>{t('privacyDoc.lastUpdated')}</span>
            </div>
        </div>
    );
}
