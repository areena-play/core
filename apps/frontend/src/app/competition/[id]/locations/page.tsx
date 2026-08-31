'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    MapPin,
    ChevronLeft,
    Building2,
    Table as TableIcon,
    Calendar,
    CheckCircle2,
    Clock,
    Plus,
} from 'lucide-react';

export default function CompetitionLocationsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [comp, locs] = await Promise.all([
                api.getCompetition(competitionId),
                api.getLocations().catch(() => ({ locations: [] })),
            ]);
            setCompetition(comp);
            setLocations(locs.locations || (Array.isArray(locs) ? locs : []));
        } catch (err) {
            console.error('Failed to load locations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const assignedLocations = competition?.locations || [];

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
                            <MapPin className="h-7 w-7 text-rose-400" />
                            Locations & Playing Units
                        </h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                        <h3 className="text-lg font-bold text-white mb-2">Venue & Assigned Hall</h3>
                        <p className="text-xs text-zinc-400 mb-6">
                            Location details, playing units/courts and tournament facility allocation.
                        </p>

                        <div className="rounded-xl border border-zinc-800 bg-black/40 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-white">
                                            {competition?.location || 'Primary Competition Hall'}
                                        </h4>
                                        <p className="text-xs text-zinc-400">
                                            Assigned via Association: {competition?.association?.name}
                                        </p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
                                    Active Venue
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-white">Playing Table & Court Allocation</h3>
                                <p className="text-xs text-zinc-400">Courts reserved for this competition</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-center space-y-2 hover:border-orange-500/40 transition"
                                >
                                    <TableIcon className="h-6 w-6 text-orange-400 mx-auto" />
                                    <div className="text-sm font-bold text-white">Table {i + 1}</div>
                                    <span className="inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                        Available
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                        <h3 className="text-base font-bold text-white">Venue Information</h3>
                        <div className="space-y-3 text-xs text-zinc-300">
                            <div>
                                <span className="text-zinc-500 block">Address:</span>
                                <span className="font-medium text-white">{competition?.location || 'Not configured'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500 block">Duration:</span>
                                <span className="font-medium text-white">
                                    {competition?.startDate && new Date(competition.startDate).toLocaleDateString()} –{' '}
                                    {competition?.endDate && new Date(competition.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
