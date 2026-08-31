'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    ShieldCheck,
    ChevronLeft,
    Users,
    Award,
    Plus,
    CheckCircle2,
    Shield,
} from 'lucide-react';

export default function CompetitionRefereesPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [comp, r] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setRoles(r || []);
        } catch (err) {
            console.error('Failed to load referees:', err);
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

    const headReferees = roles.filter((r) => r.role === 'HEAD_REFEREE');
    const tableReferees = roles.filter((r) => r.role === 'REFEREE');

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
                            <ShieldCheck className="h-7 w-7 text-purple-400" />
                            Referees & Umpires
                        </h1>
                    </div>
                </div>
                <Link
                    href={`/competition/${competitionId}/access`}
                    className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500"
                >
                    <Plus className="h-4 w-4" /> Assign Referee Duties
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                <Award className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Head Referee / Tournament Director</h3>
                                <p className="text-xs text-zinc-400">Final authority on rules, disputes & appeals</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-400">
                            {headReferees.length} Assigned
                        </span>
                    </div>

                    <div className="space-y-2 pt-2">
                        {headReferees.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-4 text-center">No Head Referee assigned yet.</p>
                        ) : (
                            headReferees.map((r) => (
                                <div key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 p-3">
                                    <span className="text-sm font-semibold text-white">
                                        {r.user?.firstName} {r.user?.lastName}
                                    </span>
                                    <span className="text-xs text-zinc-400">{r.user?.email}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Table Umpires & Match Referees</h3>
                                <p className="text-xs text-zinc-400">Match scorekeeping and table supervision</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-400">
                            {tableReferees.length} Assigned
                        </span>
                    </div>

                    <div className="space-y-2 pt-2">
                        {tableReferees.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-4 text-center">No Table Referees assigned yet.</p>
                        ) : (
                            tableReferees.map((r) => (
                                <div key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 p-3">
                                    <span className="text-sm font-semibold text-white">
                                        {r.user?.firstName} {r.user?.lastName}
                                    </span>
                                    <span className="text-xs text-zinc-400">{r.user?.email}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
