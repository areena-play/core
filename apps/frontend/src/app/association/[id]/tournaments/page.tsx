'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Trophy,
    Calendar,
    MapPin,
    Shield,
    ChevronRight,
    ChevronLeft,
    Plus,
    Search,
} from 'lucide-react';
import { format } from 'date-fns';

export default function AssociationTournamentsPage() {
    const params = useParams();
    const assocId = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [association, setAssociation] = useState<any>(null);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchTournaments = async () => {
        try {
            const assocData = await api.getAssociations();
            const found = assocData.associations?.find((a: any) => a.id === assocId);
            if (found) {
                setAssociation(found);
                setEntityMeta({
                    id: found.id,
                    title: `${found.name} Tournaments`,
                    code: found.code,
                    badge: found.level,
                    subtitle: `Championships & Leagues under ${found.name}`,
                });
            }

            const compsData = await api.getCompetitions({ associationId: assocId });
            setCompetitions(compsData || []);
        } catch (err) {
            console.error('Failed to load association tournaments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (assocId) {
            fetchTournaments();
        }
        return () => {
            setEntityMeta(null);
        };
    }, [assocId]);

    const filteredComps = competitions.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
    );

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Back link */}
            <Link
                href={`/association/${assocId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to {association?.name || 'Association'}</span>
            </Link>

            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-red-500" />
                        <span>{association?.name} Tournaments</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Regional championships, league divisions, and open tournament events.
                    </p>
                </div>
            </div>

            {/* Filter */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder={t('common.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white placeholder-slate-400 focus:border-red-500 focus:outline-none"
                />
            </div>

            {/* Tournaments Grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredComps.map((comp) => (
                    <div
                        key={comp.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 transition group shadow-xs"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span
                                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        comp.type === 'LEAGUE'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-950 text-red-400 border border-red-300 dark:border-red-800/50'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 text-blue-400 border border-blue-300 dark:border-blue-800/50'
                                    }`}
                                >
                                    {comp.type}
                                </span>
                                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                    {comp.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition line-clamp-1">
                                    {comp.name}
                                </h3>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {comp.description || 'Championship competition organized by the federation.'}
                                </p>
                            </div>

                            <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        {format(new Date(comp.startDate), 'MMM yyyy')} -{' '}
                                        {format(new Date(comp.endDate), 'MMM yyyy')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {comp.categories?.length || 0} Categories
                            </span>
                            <Link
                                href={`/tournament/${comp.id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                            >
                                <span>View Tournament</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

