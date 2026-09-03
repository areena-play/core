'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    BarChart3,
    ArrowLeft,
    Layers,
    Users,
    Flame,
} from 'lucide-react';

export default function CompetitionStatisticsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [stats, setStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [comp, st] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionStatistics(competitionId).catch(() => null),
            ]);
            setCompetition(comp);
            setStats(st);
        } catch (err: any) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Analytics & Metrics
                            </span>
                            <span className="font-mono text-xs text-slate-400">Live Progress</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-red-500" />
                            <span>Real-Time Competition Analytics</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Division distribution, participation rate, match completion rate, and performance metrics
                        </p>
                    </div>

                    <Link
                        href={`/competition/${competitionId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Dashboard</span>
                    </Link>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Categories</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {stats?.totalCategories ?? competition?.categories?.length ?? 0}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Teams</span>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {stats?.totalTeams ?? 0}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Players</span>
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">
                        {stats?.totalPlayers ?? 0}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Encounters</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {stats?.totalEncounters ?? 0}
                    </div>
                </div>
            </div>
        </div>
    );
}
