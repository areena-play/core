'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Users,
    ChevronLeft,
    Search,
    CheckCircle2,
    Clock,
    DollarSign,
    Shield,
    Flame,
    UserCheck,
} from 'lucide-react';

export default function CompetitionPlayersPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchData = async () => {
        try {
            const [comp, p, r] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionPlayers(competitionId).catch(() => []),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setPlayers(p || []);
            setRoles(r || []);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to load players');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    const isAssocAdmin = user?.associationRoles?.some(
        (r) => r.role === 'ADMIN' && r.associationId === competition?.associationId
    );
    const canCheckin =
        isSuperAdmin ||
        isAssocAdmin ||
        roles.some((r) => r.userId === user?.id && ['ADMIN', 'ENTER_RESULTS', 'HEAD_REFEREE', 'CASHIER'].includes(r.role));

    const handleToggleCheckin = async (player: any) => {
        try {
            await api.checkinCompetitionPlayer(competitionId, player.registrationId, {
                isCheckedIn: !player.isCheckedIn,
            });
            setSuccessMessage(`Updated check-in status for ${player.teamName || 'Athlete'}.`);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 2500);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update check-in');
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const filtered = players.filter((p) =>
        (p.teamName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.categoryName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.licenseId || '').toLowerCase().includes(search.toLowerCase())
    );

    const checkedInCount = players.filter((p) => p.isCheckedIn).length;

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
                            <Users className="h-7 w-7 text-emerald-400" />
                            Registered Players Roster
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                        {checkedInCount} / {players.length} Checked In
                    </span>
                </div>
            </div>

            {successMessage && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-400">
                    {errorMessage}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
                <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search by player, category, license..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                        />
                    </div>
                    <span className="text-xs text-zinc-400">
                        Showing {filtered.length} of {players.length} registered athletes
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                        <thead className="border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="px-6 py-4">Athlete / Team</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">License & ELO</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4 text-right">Check-In Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        No registered athletes found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => (
                                    <tr key={p.registrationId} className="hover:bg-zinc-800/40 transition">
                                        <td className="px-6 py-4 font-semibold text-white">
                                            {p.teamName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                                                {p.categoryName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="font-mono text-zinc-400">{p.licenseId || 'No License'}</div>
                                            <div className="flex items-center gap-1 text-orange-400 font-bold mt-0.5">
                                                <Flame className="h-3 w-3" /> {p.eloPoints || 1000} pts
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                                p.paymentStatus === 'PAID'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                            }`}>
                                                {p.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleToggleCheckin(p)}
                                                disabled={!canCheckin}
                                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                                    p.isCheckedIn
                                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500'
                                                        : 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                                                } disabled:opacity-50`}
                                            >
                                                <UserCheck className="h-3.5 w-3.5" />
                                                {p.isCheckedIn ? 'Checked In' : 'Check In'}
                                            </button>
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
