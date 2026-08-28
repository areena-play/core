'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18nContext';
import { useTheme } from '@/lib/themeContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Shield,
    ChevronLeft,
    Sparkles,
    Mail,
    Phone,
    MapPin,
    Globe,
    Building2,
    CheckCircle2,
    FileText,
    ExternalLink,
} from 'lucide-react';

export default function ImpressumPage() {
    const { t } = useI18n();
    const { resolvedTheme } = useTheme();
    const { mainAssoc } = useMainView();
    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {/* Back Button */}
            <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
                <ChevronLeft className="h-4 w-4" />
                <span>{t('common.back')}</span>
            </Link>

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
                        Official Impressum & Legal Notice
                    </span>
                </div>

                <div className="pt-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        AREENA
                    </h1>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-0.5">
                        Advanced Resource and Event Engine for Next-gen Associations
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
                        AREENA is a modern, unified management and live tournament operating platform built for national sports federations, regional sub-associations, affiliated sports clubs, and licensed athletes.
                    </p>
                </div>
            </div>

            {/* Legal Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Platform Operator Information */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                        <Building2 className="h-4 w-4 text-red-500" />
                        <span>Platform Operator & Publisher</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                            {mainAssoc?.name || 'AREENA Platform Operator'}
                        </div>
                        <p>Sports Federation Administration & Digital Operations</p>
                        <p>National Sports Governance</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-red-500" />
                            <span>info@areena.app</span>
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
                        <span>Engine Architecture & Scope</span>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>DAG Hierarchy:</strong> Multi-parent association and regional DAG rule inheritance.
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Tournament Operating System:</strong> Automated group generation, Davis Cup scoring, and real-time live tickers.
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Universal Licensing:</strong> Player passes, refresher course tracking, and verified approvals queue.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright & Disclaimer Section */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span>Copyright & Legal Disclaimer</span>
                </div>

                <p>
                    © {new Date().getFullYear()} AREENA (Advanced Resource and Event Engine for Next-gen Associations). All rights reserved.
                </p>

                <p>
                    All trademarks, federation logos, and competition brand assets displayed within this system are the property of their respective sports federations and member clubs. Unauthorized reproduction or dissemination of data without authorization is prohibited.
                </p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                    <span>AREENA Core v1.0 • Multilingual Sports Governance</span>
                    <span>Last Updated: August 2026</span>
                </div>
            </div>
        </div>
    );
}

