'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18nContext';
import { useTheme } from '@/lib/themeContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    ChevronLeft,
    Mail,
    Globe,
    Building2,
    CheckCircle2,
    FileText,
    ExternalLink,
    Sparkles,
} from 'lucide-react';

export default function ImpressumPage() {
    const { t } = useI18n();
    const { resolvedTheme } = useTheme();
    const { mainAssoc } = useMainView();
    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
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
                    href="/data-protection"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition"
                >
                    <span>{t('nav.dataProtection')}</span>
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

                    <span className="rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-3 py-1 text-xs font-bold uppercase tracking-wider self-start sm:self-auto">
                        {t('impressumDoc.badge')}
                    </span>
                </div>

                <div className="pt-2">
                    <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-800">
                            <Image
                                src="/icon.svg"
                                alt="AREENA Favicon"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {t('impressumDoc.title')}
                        </h1>
                    </div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-1">
                        {t('impressumDoc.subtitle')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
                        {t('impressumDoc.description')}
                    </p>
                </div>
            </div>

            {/* Legal Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Platform Operator Information */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                        <Building2 className="h-4 w-4 text-red-500" />
                        <span>{t('impressumDoc.operatorTitle')}</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                            {mainAssoc?.name || 'AREENA Platform Operator'}
                        </div>
                        <p>{t('impressumDoc.administration')}</p>
                        <p>{t('impressumDoc.governance')}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-red-500" />
                            <span>info@areena.app • privacy@areena.app</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            <span>www.areena.app</span>
                        </div>
                    </div>
                </div>

                {/* Technical Architecture & Engine */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                        <Sparkles className="h-4 w-4 text-red-500" />
                        <span>{t('impressumDoc.architectureTitle')}</span>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('impressumDoc.dagFeature')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('impressumDoc.tournamentFeature')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{t('impressumDoc.licensingFeature')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright & Disclaimer Section */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span>{t('impressumDoc.copyrightTitle')}</span>
                </div>

                <p>
                    © {new Date().getFullYear()} {t('impressumDoc.copyrightText')}
                </p>

                <p>{t('impressumDoc.trademarkText')}</p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                    <span>{t('impressumDoc.coreInfo')}</span>
                    <span>{t('impressumDoc.lastUpdated')}</span>
                </div>
            </div>
        </div>
    );
}
