'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Trophy,
    Award,
    Users,
    Calendar,
    Shield,
    ArrowRight,
    Flame,
    CheckCircle2,
    ChevronRight,
    Sparkles,
    Network,
} from 'lucide-react';
import { LiveTicker } from '@/components/layout/LiveTicker';

export default function DashboardPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const { associations } = useMainView();
    const [clubs, setClubs] = useState<any[]>([]);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [licenses, setLicenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [clubsRes, compRes, calRes, licRes] = await Promise.allSettled([
                    api.getClubs(),
                    api.getCompetitions(),
                    api.getCalendarEvents(),
                    api.getLicenses(),
                ]);

                if (clubsRes.status === 'fulfilled') setClubs(clubsRes.value || []);
                if (compRes.status === 'fulfilled') setCompetitions(compRes.value || []);
                if (calRes.status === 'fulfilled') setCalendarEvents(calRes.value || []);
                if (licRes.status === 'fulfilled') setLicenses(licRes.value || []);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const nationalAssoc = associations.find((a) => a.isTopLevel) || associations[0];

    return (
        <div className="space-y-6 md:space-y-8 pb-12">
            {/* Live Scoring Ticker Bar (Association Overview Only) */}
            <LiveTicker />

            {/* Hero Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-r from-red-100 via-white to-red-50 p-5 sm:p-6 md:p-8 shadow-sm dark:border-red-900/40 dark:bg-gradient-to-r dark:from-red-950/80 dark:via-slate-900 dark:to-slate-950 dark:shadow-xl transition-colors duration-200">
                <div className="relative z-10 max-w-3xl space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-600/10 dark:bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{t('nav.sportsManagement')}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                        {t('dashboard.welcomeTitle')}
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300">
                        {t('dashboard.welcomeSubtitle')}
                    </p>
                    <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-2">
                        <Link
                            href="/competitions"
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow hover:bg-red-700 transition"
                        >
                            <Trophy className="h-4 w-4" />
                            <span>{t('nav.competitions')}</span>
                        </Link>
                        <Link
                            href="/licenses/apply"
                            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
                        >
                            <Award className="h-4 w-4" />
                            <span>{t('licenses.applyNew')}</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* KPI Stats Overview */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            {t('nav.associations')}
                        </span>
                        <Network className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    </div>
                    <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white min-h-[32px] flex items-center">
                        {loading ? '' : associations.length}
                    </div>
                    <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {t('associations.title')}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            {t('dashboard.kpiClubs')}
                        </span>
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                    </div>
                    <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white min-h-[32px] flex items-center">
                        {loading ? '' : clubs.length}
                    </div>
                    <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {t('associations.affiliatedClubs')}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            {t('dashboard.kpiLicenses')}
                        </span>
                        <Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                    </div>
                    <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white min-h-[32px] flex items-center">
                        {loading ? '' : licenses.length}
                    </div>
                    <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {t('licenses.subtitle')}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            {t('dashboard.kpiCompetitions')}
                        </span>
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
                    </div>
                    <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white min-h-[32px] flex items-center">
                        {loading ? '' : competitions.length}
                    </div>
                    <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {t('competitions.subtitle')}
                    </p>
                </div>
            </div>

            {/* Main Grid: Competitions & Upcoming Calendar */}
            <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
                {/* Left 2 Cols: Active Competitions */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                            <Trophy className="h-5 w-5 text-red-500" />
                            <span>{t('competitions.title')}</span>
                        </h2>
                        <Link
                            href="/competitions"
                            className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                        >
                            <span>{t('common.viewAll')}</span> <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                        {loading ? null : competitions.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                                No active competitions found.
                            </div>
                        ) : (
                            competitions.map((comp) => (
                                <div
                                    key={comp.id}
                                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 transition shadow-sm"
                                >
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                        comp.type === 'LEAGUE'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-400 border border-red-300 dark:border-red-800/40'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-300 dark:border-blue-800/40'
                                                    }`}
                                                >
                                                    {comp.type}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {comp.association?.name || 'National Federation'}
                                                </span>
                                            </div>
                                            <h3 className="mt-1.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                                {comp.name}
                                            </h3>
                                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                                                {comp.description || ''}
                                            </p>
                                        </div>

                                        <Link
                                            href={`/competition/${comp.id}`}
                                            className="inline-flex items-center gap-1.5 self-start rounded-lg bg-slate-100 text-slate-800 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-600 dark:hover:text-white px-3.5 py-2 text-xs font-semibold transition sm:self-center shadow-sm"
                                        >
                                            <span>{t('competitions.standings')}</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Quick Association DAG Hierarchy Card */}
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-950 p-4 sm:p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                                    <Network className="h-4 w-4 text-red-500" />
                                    <span>{t('associations.title')}</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {t('associations.subtitle')}
                                </p>
                            </div>
                            <Link
                                href="/associations"
                                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 self-start sm:self-auto"
                            >
                                {t('common.details')}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Col: Master Calendar Events */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                            <Calendar className="h-5 w-5 text-red-500" />
                            <span>{t('calendar.title')}</span>
                        </h2>
                        <Link
                            href="/calendar"
                            className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                        >
                            <span>{t('common.viewAll')}</span> <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3">
                        {loading ? null : calendarEvents.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                                {t('calendar.noEvents') || 'No upcoming events scheduled.'}
                            </div>
                        ) : (
                            calendarEvents.slice(0, 5).map((evt) => (
                                <div
                                    key={evt.id}
                                    className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                            {evt.eventType?.replace('_', ' ')}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                            {evt.startDate && new Date(evt.startDate).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    <h4 className="mt-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                        {evt.title}
                                    </h4>
                                    {evt.location && (
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            📍 {evt.location}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* License ID Engine Settings Card */}
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 p-4 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-red-500" />
                            <span>{t('associations.settingsTitle')}</span>
                        </h4>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {t('associations.licenseTemplate')}:{' '}
                            <code className="text-red-600 dark:text-red-400 bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-mono">
                                {nationalAssoc?.licenseIdTemplate || '{regionDigit}{year2}{counter3}'}
                            </code>
                        </p>
                        <div className="mt-3">
                            <Link
                                href="/associations/settings"
                                className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
                            >
                                {t('associations.settingsTitle')} →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
