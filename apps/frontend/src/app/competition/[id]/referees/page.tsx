'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    UserCheck,
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Shield,
    Plus,
    Award,
    Trophy,
} from 'lucide-react';

export default function CompetitionRefereesPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
            const [comp, r] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setRoles(r || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load referees' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    const refereeRoles = roles.filter((r) => ['REFEREE', 'HEAD_REFEREE'].includes(r.role));

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/competitions" className="hover:underline flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-red-500" />
                    <span>{t('nav.competitions') || 'Competitions'}</span>
                </Link>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/competition/${competitionId}`} className="hover:underline text-slate-700 dark:text-slate-300 font-medium">
                    {competition?.name || 'Tournament'}
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="font-semibold text-slate-900 dark:text-white">Referees & Umpires</span>
            </div>

            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Match Officials
                            </span>
                            <span className="font-mono text-xs text-slate-400">Table Umpires & Chiefs</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <UserCheck className="h-6 w-6 text-red-500" />
                            <span>Referees & Match Officials</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Designated Head Referees, licensed table umpires, and official match adjudicators
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={`/competition/${competitionId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Dashboard</span>
                        </Link>
                        <Link
                            href={`/competition/${competitionId}/access`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Manage In Access Rights</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Referee Roster Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Match Officials ({refereeRoles.length})</h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-3">Official Name</th>
                                <th className="p-3">Email Address</th>
                                <th className="p-3">Designation</th>
                                <th className="p-3">Assigned On</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {refereeRoles.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-xs text-slate-400">
                                        No designated referees assigned yet. Go to Access Rights to appoint Head Referees and Table Umpires.
                                    </td>
                                </tr>
                            ) : (
                                refereeRoles.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                            {r.user?.firstName} {r.user?.lastName}
                                        </td>
                                        <td className="p-3 font-mono text-xs text-slate-500">{r.user?.email}</td>
                                        <td className="p-3">
                                            <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase border ${
                                                r.role === 'HEAD_REFEREE'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                                                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40'
                                            }`}>
                                                {r.role === 'HEAD_REFEREE' ? 'Head Referee (Chief)' : 'Table Umpire'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs text-slate-400">
                                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '–'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
