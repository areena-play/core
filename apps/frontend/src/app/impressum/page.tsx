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
    Code2,
    History,
    Layers,
    Server,
    Shield,
    Database,
    Cpu,
    BookOpen,
} from 'lucide-react';

export default function ImpressumPage() {
    const { t } = useI18n();
    const { resolvedTheme } = useTheme();
    const { mainAssoc } = useMainView();
    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    const techStack = [
        { category: 'Frontend Core', tech: 'Next.js 14 (App Router), React 18, TypeScript 5.8' },
        { category: 'Styling & UI', tech: 'Tailwind CSS 3.4, Lucide Icons, clsx, tailwind-merge' },
        { category: 'Backend Engine', tech: 'Node.js, Express 4.21, TypeScript 5.8' },
        { category: 'ORM & Database', tech: 'Prisma ORM 5.22, PostgreSQL with multi-schema folder support' },
        { category: 'Caching & Queue', tech: 'Redis, ioredis 5.6 (Ingress rate-limiting & session guards)' },
        { category: 'Security & Auth', tech: 'JWT (jsonwebtoken 9.0), bcryptjs 2.4, OAuth2 Client Credentials' },
        { category: 'Storage & S3', tech: 'AWS S3 SDK (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner)' },
        { category: 'Communications', tech: 'Mailgun REST API (mailgun.js 14), Nodemailer 9 (SMTP Relay)' },
        { category: 'Schema Validation', tech: 'Zod 3.24 (shared validation library across apps)' },
        { category: 'Real-Time Sync', tech: 'WebSocket (ws server for live fixture scores & tickers)' },
    ];

    const changelog = [
        {
            version: 'v1.4.0',
            date: 'September 2026',
            badge: 'Current Release',
            highlight: 'Tournament Hub & Database Management',
            changes: [
                'Added Association Tournament Hub (/management/competitions) for approving created tournaments and validating finished results.',
                'Implemented Super Admin full database JSON dump export and restore import functionality with comprehensive transactional safety.',
                'Created comprehensive multi-role User Manual (/manual) for athletes, referees, club admins, association managers, and super administrators.',
                'Enhanced Impressum with complete software libraries inventory and minor version update history.',
                'Fixed demo seed database clean-up preventing duplicate records and improved Support & FAQs context filtering.',
            ],
        },
        {
            version: 'v1.3.0',
            date: 'August 2026',
            badge: 'Feature Update',
            highlight: 'Sports Locations & Table Unit Reservations',
            changes: [
                'Added Sports Locations module with venue tables, courts, and capacity management.',
                'Implemented Table / Unit Reservation Matrix and automated tournament competition blocks.',
                'Introduced Elo rating calculator and Swiss classification level table (D1 to A20).',
                'Added association-level custom license ID templating engine.',
            ],
        },
        {
            version: 'v1.2.0',
            date: 'July 2026',
            badge: 'Feature Update',
            highlight: 'Competition Operating System & Scoresheets',
            changes: [
                'Redesigned Competition Dashboard and 12-module tournament desk workspace.',
                'Added live set-by-set match scoresheet interface with automatic point validation.',
                'Implemented speaker announcements queue, test chime sound, and cashier desk financial settlement.',
                'Standardized URL scheme to clean /competition/[id] routing across all modules.',
            ],
        },
        {
            version: 'v1.1.0',
            date: 'June 2026',
            badge: 'Feature Update',
            highlight: 'Licensing Hub & Bexio Invoicing',
            changes: [
                'Built Universal Licensing Hub with player passports and digital QR license passes.',
                'Added Refresher Courses tracking for referees and coaches with automatic validity extension.',
                'Introduced Financing Hub with Swiss QR-Bill generation and Bexio cloud accounting integration.',
                'Created Admin Notice Broadcasting system with modal banners and acknowledgment tracking.',
            ],
        },
        {
            version: 'v1.0.0',
            date: 'May 2026',
            badge: 'Initial Release',
            highlight: 'AREENA Core Platform Launch',
            changes: [
                'Initial release of AREENA Sports Platform with DAG multi-parent association hierarchy.',
                'Super Administrator system health metrics and security audit log explorer.',
                'Multi-tenant authentication, role-based access control (RBAC), and multilingual UI (EN, DE, FR, IT).',
            ],
        },
    ];

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
                <div className="flex items-center gap-4 text-xs font-semibold">
                    <Link
                        href="/manual"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>User Manual</span>
                    </Link>
                    <Link
                        href="/data-protection"
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline transition"
                    >
                        <span>{t('nav.dataProtection')}</span>
                        <ExternalLink className="h-3 w-3" />
                    </Link>
                </div>
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

            {/* Software & Open Source Libraries Inventory */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                        <Code2 className="h-4 w-4 text-red-500" />
                        <span>Software Stack & Open Source Libraries</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">
                        AREENA Stack v{process.env.NEXT_PUBLIC_APP_VERSION}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {techStack.map((item, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 p-3 space-y-1"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                                {item.category}
                            </div>
                            <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {item.tech}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Release Changelog */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                        <History className="h-4 w-4 text-red-500" />
                        <span>Changelog & Minor Version Updates</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        Current: v{process.env.NEXT_PUBLIC_APP_VERSION}
                    </span>
                </div>

                <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800/60">
                    {changelog.map((entry, idx) => (
                        <div key={idx} className={idx === 0 ? 'space-y-3' : 'pt-6 space-y-3'}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                                        {entry.version}
                                    </span>
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                        • {entry.highlight}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400">
                                        {entry.date}
                                    </span>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            idx === 0
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        {entry.badge}
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                {entry.changes.map((change, cIdx) => (
                                    <li key={cIdx} className="flex items-start gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
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
                    <span>{t('impressumDoc.coreInfo', { version: process.env.NEXT_PUBLIC_APP_VERSION })}</span>
                    <span>{t('impressumDoc.lastUpdated')}</span>
                </div>
            </div>
        </div>
    );
}
