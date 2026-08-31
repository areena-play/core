'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useWebSocket } from '@/lib/useWebSocket';
import {
    Zap,
    ChevronLeft,
    CheckCircle2,
    Calendar,
    Radio,
    Play,
    Edit3,
    ArrowRight,
    Table as TableIcon,
} from 'lucide-react';

export default function CompetitionResultsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    const fetchData = async () => {
        try {
            const comp = await api.getCompetition(competitionId);
            setCompetition(comp);
        } catch (err) {
            console.error('Failed to load competition fixtures:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    useWebSocket((event) => {
        if (event.channel === 'areena:scores') {
            fetchData();
        }
    });

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const categories = competition?.categories || [];
    const allEncounters = categories.flatMap((c: any) =>
        (c.encounters || []).map((e: any) => ({ ...e, categoryName: c.name }))
    );

    const filtered = allEncounters.filter((e: any) => {
        if (activeFilter === 'LIVE') return e.status === 'LIVE';
        if (activeFilter === 'SCHEDULED') return e.status === 'SCHEDULED';
        if (activeFilter === 'FINISHED') return e.status === 'FINISHED';
        return true;
    });

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
                            <Zap className="h-7 w-7 text-amber-400" />
                            Live Result Entering & Scorekeeper Desk
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveFilter('ALL')}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                            activeFilter === 'ALL' ? 'bg-orange-600 text-white' : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                        }`}
                    >
                        All ({allEncounters.length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('LIVE')}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                            activeFilter === 'LIVE' ? 'bg-emerald-600 text-white animate-pulse' : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                        }`}
                    >
                        Live ({allEncounters.filter((e: any) => e.status === 'LIVE').length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('SCHEDULED')}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                            activeFilter === 'SCHEDULED' ? 'bg-orange-600 text-white' : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                        }`}
                    >
                        Scheduled
                    </button>
                    <button
                        onClick={() => setActiveFilter('FINISHED')}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                            activeFilter === 'FINISHED' ? 'bg-orange-600 text-white' : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                        }`}
                    >
                        Finished
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-center text-zinc-500">
                        No matches found in this status filter.
                    </div>
                ) : (
                    filtered.map((enc: any) => (
                        <div
                            key={enc.id}
                            className={`rounded-2xl border p-5 transition space-y-4 ${
                                enc.status === 'LIVE'
                                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-zinc-900'
                                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                            }`}
                        >
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-orange-400">{enc.categoryName}</span>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    enc.status === 'LIVE'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                                        : enc.status === 'FINISHED'
                                        ? 'bg-zinc-800 text-zinc-400'
                                        : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                    {enc.status}
                                </span>
                            </div>

                            <div className="space-y-2 py-1">
                                <div className="flex items-center justify-between font-bold text-white text-base">
                                    <span>{enc.homeTeam?.name || 'Home Team'}</span>
                                    <span className="font-mono text-orange-400">{enc.homeScore}</span>
                                </div>
                                <div className="flex items-center justify-between font-bold text-white text-base">
                                    <span>{enc.awayTeam?.name || 'Away Team'}</span>
                                    <span className="font-mono text-orange-400">{enc.awayScore}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs">
                                <span className="text-zinc-500 flex items-center gap-1">
                                    <TableIcon className="h-3.5 w-3.5" />
                                    {enc.location || 'Table TBD'}
                                </span>
                                <Link
                                    href={`/competition/${competitionId}/encounter/${enc.id}`}
                                    className="flex items-center gap-1 rounded-lg bg-orange-600/20 border border-orange-500/30 px-3 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-600 hover:text-white transition"
                                >
                                    <Edit3 className="h-3.5 w-3.5" /> Enter Scoresheet
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
