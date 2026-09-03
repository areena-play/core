'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    MapPin,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Building2,
    LayoutGrid,
} from 'lucide-react';

export default function CompetitionLocationsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
            const [comp, locs] = await Promise.all([
                api.getCompetition(competitionId),
                api.getLocations ? api.getLocations().catch(() => []) : Promise.resolve([]),
            ]);
            setCompetition(comp);
            setLocations(Array.isArray(locs) ? locs : locs?.locations || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load locations' });
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
                                Venue Facilities
                            </span>
                            <span className="font-mono text-xs text-slate-400">Courts & Table Units</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <MapPin className="h-6 w-6 text-red-500" />
                            <span>Locations & Table Allocation</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Tournament facility venues, court maps, and active playing table assignment
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

            {/* Feedback Banner */}
            {actionMsg && (
                <div
                    className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 border ${
                        actionMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    }`}
                >
                    {actionMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Active Venue Detail Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-red-500" />
                        <span>Designated Venue Facility</span>
                    </h3>
                    <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-bold border border-emerald-200 dark:border-emerald-800/40">
                        Active Location
                    </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                        {competition?.location || 'Main Sports Hall (Sporthalle)'}
                    </div>
                    <p className="text-xs text-slate-500">
                        Associated with {competition?.association?.name || 'Table Tennis Federation'} • 12 Active Tables configured
                    </p>
                </div>
            </div>

            {/* Table / Court Layout Grid Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-red-500" />
                        <span>Playing Tables & Unit Grid</span>
                    </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((tableNum) => (
                        <div
                            key={tableNum}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-500/50 transition shadow-xs text-center space-y-1.5 group"
                        >
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Unit</span>
                            <div className="text-xl font-black text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">
                                #{tableNum}
                            </div>
                            <span className="inline-block rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
                                Available
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
