'use client';

import React from 'react';
import Link from 'next/link';
import {
    Calculator,
    Table as TableIcon,
    Code2,
    HelpCircle,
    BookOpen,
    ArrowRight,
    Award,
    SlidersHorizontal,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';

interface UtilitiesOverviewViewProps {
    scopedAssociationId?: string;
}

export function UtilitiesOverviewView({ scopedAssociationId }: UtilitiesOverviewViewProps) {
    const { t } = useI18n();
    const prefix = scopedAssociationId ? `/association/${scopedAssociationId}` : '';

    const utilityCards = [
        {
            id: 'elo-calculator',
            title: t('nav.eloCalculator') || 'Elo Rating Calculator',
            badge: 'Algorithm Simulation',
            badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
            icon: Calculator,
            iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
            description: 'Simulate official rating points exchanges between athletes using the Swiss / FIDE table tennis Elo model with custom K-factor weights.',
            href: `${prefix}/utilities/elo-calculator`,
            actionLabel: 'Launch Calculator',
            featured: true,
        },
        {
            id: 'level-table',
            title: t('nav.levelTable') || 'Official Rank & Level Matrix',
            badge: 'STT Classification',
            badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
            icon: TableIcon,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            description: 'Explore national classification tiers from A20 (National Elite) to R (Beginners), rating thresholds, and interclub division eligibility rules.',
            href: `${prefix}/utilities/level-table`,
            actionLabel: 'View Level Matrix',
            featured: true,
        },
        {
            id: 'developer-api',
            title: t('nav.developerApi') || 'Developer API & Integration',
            badge: 'Open REST & WebSocket',
            badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
            icon: Code2,
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            description: 'Access complete RESTendpoints, WebSocket live event streams, OpenAPI schemas, and Bearer token auth documentation for third-party tools.',
            href: '/developers',
            actionLabel: 'Explore API Docs',
            featured: false,
        },
        {
            id: 'support',
            title: t('nav.support') || 'Support & Federation Helpdesk',
            badge: 'Member Services',
            badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
            icon: HelpCircle,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            description: 'Get in touch with sports federation officials, report scoring issues, request license revisions, or browse tournament organizer FAQs.',
            href: `${prefix}/support`,
            actionLabel: 'Contact Support',
            featured: false,
        },
        {
            id: 'user-manual',
            title: t('nav.userManual') || 'Platform User Manual',
            badge: 'Guides & Walkthroughs',
            badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
            icon: BookOpen,
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
            description: 'Comprehensive step-by-step guides for tournament directors, referees, club administrators, and athletes.',
            href: '/manual',
            actionLabel: 'Read Cocumentation',
            featured: false,
        },
    ];

    return (
        <div className="space-y-8 pb-16 max-w-7l mx-auto">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md-flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1 text-[11px] font-bold uppercase border border-red-500/20">
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Federation Toolset</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Platform Utilities & Calculation Tools
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Official rating simulation engines, ranking classification matrix, developer APIs, documentation, and federation support services.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href={`${prefix}/utilities/elo-calculator`}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition"
                        >
                            <Calculator className="h-4 w-4" />
                            <span>Elo Calculator</span>
                        </Link>
                        <Link
                            href={`${prefix}/utilities/level-table`}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <TableIcon className="h-4 w-4" />
                            <span>Rank Matrix</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Utilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {utilityCards.map((card) => {
                    const CardIcon = card.icon;
                    return (
                        <div
                            key={card.id}
                            className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} shadow-inner`}>
                                        <CardIcon className="h-6 w-6" />
                                    </div>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${card.badgeColor}`}>
                                        {card.badge}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                        {card.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                <Link
                                    href={card.href}
                                    className="inline-flex w-full items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:bg-red-600 group-hover:text-white transition"
                                >
                                    <span>{card.actionLabel}</span>
                                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Reference Box */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/90 dark:to-slate-950 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                Swiss Table Tennis Federation (STT) Rating Formula
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Official rating computation uses standard logistic distribution with K-factors: K=32 (Juniors/Standard), K=24 (Active leagues), K=16 (Elite tournaments).
                            </p>
                        </div>
                    </div>

                    <Link
                        href={`${prefix}/utilities/elo-calculator`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline whitespace-nowrap"
                    >
                        <span>Simulate Match Delta</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}