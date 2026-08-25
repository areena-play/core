'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
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

export default function DashboardPage() {
    const { user } = useAuth();
    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [licenses, setLicenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [assocRes, clubsRes, compRes, calRes, licRes] = await Promise.allSettled([
                    api.getAssociations(),
                    api.getClubs(),
                    api.getCompetitions(),
                    api.getCalendarEvents(),
                    api.getLicenses(),
                ]);

                if (assocRes.status === 'fulfilled') setAssociations(assocRes.value.associations || []);
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
        <div className="space-y-8 pb-12">
            {/* Hero Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-r from-red-100 via-white to-red-50 p-6 md:p-8 shadow-sm dark:border-red-900/40 dark:bg-gradient-to-r dark:from-red-950/80 dark:via-slate-900 dark:to-slate-950 dark:shadow-xl transition-colors duration-200">
                <div className="relative z-10 max-w-3xl space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-600/10 dark:bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Unified Sports Association Management</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                        Welcome to <span className="text-red-600 dark:text-red-500">AREENA</span>
                    </h1>
                    <p className="text-sm md:text-base text-slate-600 dark:text-slate-300">
                        Managing hierarchical sports associations, multi-tier player and official licenses, Davis-Cup
                        style league encounters, tournaments, and real-time live scoring.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Link
                            href="/competitions"
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-700 transition"
                        >
                            <Trophy className="h-4 w-4" />
                            View Competitions
                        </Link>
                        <Link
                            href="/licenses/apply"
                            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
                        >
                            <Award className="h-4 w-4" />
                            Apply for License
                        </Link>
                    </div>
                </div>
            </div>

            {/* KPI Stats Overview */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Associations
                        </span>
                        <Network className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                        {associations.length || 4}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">National & Regional DAG Tree</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Affiliated Clubs
                        </span>
                        <Shield className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{clubs.length || 3}</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registered Sports Clubs</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Active Licenses
                        </span>
                        <Award className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{licenses.length || 5}</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Players, Coaches & Referees</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Competitions
                        </span>
                        <Trophy className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                        {competitions.length || 2}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Leagues & Open Tournaments</p>
                </div>
            </div>

            {/* Main Grid: Competitions & Upcoming Calendar */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left 2 Cols: Active Competitions & Davis-cup Leagues */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                            <Trophy className="h-5 w-5 text-red-500" />
                            Featured Leagues & Competitions
                        </h2>
                        <Link
                            href="/competitions"
                            className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                        >
                            View All <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {competitions.map((comp) => (
                            <div
                                key={comp.id}
                                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 transition shadow-sm"
                            >
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
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
                                        <h3 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                            {comp.name}
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                                            {comp.description ||
                                                'Official championship with group rounds and playoff encounters.'}
                                        </p>
                                    </div>

                                    <Link
                                        href={`/competitions/${comp.id}`}
                                        className="inline-flex items-center gap-1.5 self-start rounded-lg bg-slate-100 text-slate-800 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-600 dark:hover:text-white px-3.5 py-2 text-xs font-semibold transition sm:self-center shadow-sm"
                                    >
                                        <span>Standings & Encounters</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Association DAG Hierarchy Card */}
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-950 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Network className="h-4 w-4 text-red-500" />
                                    Association Hierarchy & Rule Overrides
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    National rules overrule regional sub-association rules. Sub-associations can belong
                                    to multiple parent federations.
                                </p>
                            </div>
                            <Link
                                href="/associations"
                                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                                Inspect DAG
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Col: Master Calendar Events */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                            <Calendar className="h-5 w-5 text-red-500" />
                            Federation Events
                        </h2>
                        <Link
                            href="/calendar"
                            className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                        >
                            Full Calendar <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {calendarEvents.slice(0, 5).map((evt) => (
                            <div
                                key={evt.id}
                                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                        {evt.eventType.replace('_', ' ')}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                        {new Date(evt.startDate).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </span>
                                </div>
                                <h4 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                    {evt.title}
                                </h4>
                                {evt.location && (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        📍 {evt.location}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* License ID Engine Settings Card */}
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 p-4 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-red-500" />
                            Configurable License Engine
                        </h4>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            National pattern:{' '}
                            <code className="text-red-600 dark:text-red-400 bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded font-mono">
                                {nationalAssoc?.licenseIdTemplate || '{regionDigit}{year2}{counter3}'}
                            </code>
                        </p>
                        <div className="mt-3">
                            <Link
                                href="/associations/settings"
                                className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
                            >
                                Configure License Template →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
