'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    DollarSign,
    ChevronLeft,
    Search,
    CheckCircle2,
    Receipt,
    CreditCard,
    Smartphone,
    Banknote,
    FileText,
} from 'lucide-react';

export default function CompetitionCashierPage() {
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
            setErrorMessage(err.message || 'Failed to load cashier ledger');
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
    const canManageCash =
        isSuperAdmin ||
        isAssocAdmin ||
        roles.some((r) => r.userId === user?.id && ['ADMIN', 'CASHIER'].includes(r.role));

    const handleRecordPayment = async (player: any, method: string) => {
        const fee = competition?.entryFee || 0;
        try {
            await api.updateCompetitionPlayerPayment(competitionId, player.registrationId, {
                paymentStatus: 'PAID',
                paidAmount: fee,
                paymentMethod: method,
            });
            setSuccessMessage(`Recorded payment of CHF ${fee.toFixed(2)} via ${method} for ${player.teamName}.`);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Payment recording failed');
        }
    };

    const handleMarkExempt = async (player: any) => {
        try {
            await api.updateCompetitionPlayerPayment(competitionId, player.registrationId, {
                paymentStatus: 'EXEMPT',
                paidAmount: 0,
                paymentMethod: 'FEE_EXEMPT',
            });
            setSuccessMessage(`Marked ${player.teamName} as fee exempt.`);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Action failed');
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const feePerPlayer = competition?.entryFee || 0;
    const paidPlayers = players.filter((p) => p.paymentStatus === 'PAID');
    const unpaidPlayers = players.filter((p) => p.paymentStatus === 'UNPAID');
    const totalCollected = paidPlayers.reduce((acc, p) => acc + (p.paidAmount || feePerPlayer), 0);
    const totalExpected = players.length * feePerPlayer;

    const filtered = players.filter((p) =>
        (p.teamName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.categoryName || '').toLowerCase().includes(search.toLowerCase())
    );

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
                            <DollarSign className="h-7 w-7 text-green-400" />
                            Cashier Desk & Entry Fees Ledger
                        </h1>
                    </div>
                </div>
            </div>

            {/* Financial Overview KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Total Collected</div>
                    <div className="mt-2 text-2xl font-extrabold text-emerald-400">
                        CHF {totalCollected.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{paidPlayers.length} athletes paid</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Total Expected</div>
                    <div className="mt-2 text-2xl font-extrabold text-white">
                        CHF {totalExpected.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">CHF {feePerPlayer.toFixed(2)} per registration</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Outstanding</div>
                    <div className="mt-2 text-2xl font-extrabold text-amber-400">
                        CHF {(unpaidPlayers.length * feePerPlayer).toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{unpaidPlayers.length} unpaid entries</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="text-xs font-semibold uppercase text-zinc-400">Payment Methods</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                        <span className="flex items-center gap-1 text-emerald-400"><Banknote className="h-3.5 w-3.5" /> Cash</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-blue-400"><Smartphone className="h-3.5 w-3.5" /> Twint</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-purple-400"><CreditCard className="h-3.5 w-3.5" /> Card</span>
                    </div>
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
                            placeholder="Search registered player/team..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                        />
                    </div>
                    <span className="text-xs text-zinc-400">
                        {paidPlayers.length} of {players.length} settled
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                        <thead className="border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="px-6 py-4">Athlete / Team</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Fee Due</th>
                                <th className="px-6 py-4">Status & Method</th>
                                <th className="px-6 py-4 text-right">Collect Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        No registered athletes found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => (
                                    <tr key={p.registrationId} className="hover:bg-zinc-800/40 transition">
                                        <td className="px-6 py-4 font-semibold text-white">
                                            {p.teamName}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-400">
                                            {p.categoryName}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            CHF {feePerPlayer.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                                p.paymentStatus === 'PAID'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                            }`}>
                                                {p.paymentStatus}
                                                {p.paymentMethod && <span className="text-[10px] opacity-75">({p.paymentMethod})</span>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {p.paymentStatus === 'PAID' ? (
                                                <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                                    <CheckCircle2 className="h-4 w-4" /> Settled
                                                </span>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleRecordPayment(p, 'CASH')}
                                                        disabled={!canManageCash}
                                                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                                    >
                                                        Cash
                                                    </button>
                                                    <button
                                                        onClick={() => handleRecordPayment(p, 'TWINT')}
                                                        disabled={!canManageCash}
                                                        className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                                                    >
                                                        TWINT
                                                    </button>
                                                    <button
                                                        onClick={() => handleRecordPayment(p, 'CARD')}
                                                        disabled={!canManageCash}
                                                        className="rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50"
                                                    >
                                                        Card
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkExempt(p)}
                                                        disabled={!canManageCash}
                                                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white"
                                                    >
                                                        Exempt
                                                    </button>
                                                </div>
                                            )}
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
