'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    BarChart3,
    ChevronLeft,
    Trophy,
    Activity,
    Users,
    Building2,
    CheckCircle2,
} from 'lucide-react';

export default function CompetitionStatisticsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [stats, setStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.getCompetition(competitionId),
            api.getCompetitionStatistics(competitionId).catch(() => null),
        ])
            .then(([comp, s]) => {
                setCompetition(comp);
                setStats(s);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [competitionId]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/competition/${competitionId}`}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:border-zinc-700 hover:text-white transition"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-wider">
                            <span>Competition Workspace</span>
                            <span>•</span>
                            <span>{competition?.name}</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl flex items-center gap-2.5 mt-0.5">
                            <BarChart3 className="h-7 w-7 text-fuchsia-400" />
                            Competition Analytics & Statistics
                        </h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Total Categories</div>
                    <div className="mt-2 text-3xl font-extrabold text-white">
                        {stats?.totalCategories || competition?.categories?.length || 0}
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Registered Teams</div>
                    <div className="mt-2 text-3xl font-extrabold text-emerald-400">
                        {stats?.totalTeams || 0}
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Total Encounters</div>
                    <div className="mt-2 text-3xl font-extrabold text-blue-400">
                        {stats?.totalEncounters || 0}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                        {stats?.completedEncounters || 0} finished
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Completion Rate</div>
                    <div className="mt-2 text-3xl font-extrabold text-orange-400">
                        {stats?.completionPercentage || 0}%
                    </div>
                </div>
            </div>
        </div>
    );
}
