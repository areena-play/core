'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    DollarSign,
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    CreditCard,
    AlertCircle,
    Search,
    Banknote,
    QrCode,
    Trophy,
} from 'lucide-react';

import { AccessDenied } from '@/components/auth/AccessDenied';

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
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
            setActionMsg({ type: 'error', text: err.message || 'Failed to load cashier data' });
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
    const canManage = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && ['ADMIN', 'CASHIER'].includes(r.role));

    const handleUpdatePayment = async (regId: string, status: string, method?: string) => {
        try {
            await api.updateCompetitionPlayerPayment(competitionId, regId, {
                paymentStatus: status,
                paidAmount: status === 'PAID' ? competition?.entryFee || 20 : 0,
                paymentMethod: method || 'CASH',
            });
            fetchData();
            setActionMsg({ type: 'success', text: 'Payment settlement recorded successfully.' });
            setTimeout(() => setActionMsg(null), 2500);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to update payment' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!canManage) {
        return (
            <AccessDenied
                title="Cashier Desk Restricted"
                description="The entry fee ledger and tournament cashier desk is restricted to tournament directors and financial cashiers."
                requiredRole="Tournament Cashier / Administrator"
                returnHref={`/competition/${competitionId}`}
            />
        );
    }

    const totalCollected = players.filter((p) => p.paymentStatus === 'PAID').reduce((acc, p) => acc + (p.paidAmount || competition?.entryFee || 20), 0);
    const unpaidCount = players.filter((p) => p.paymentStatus !== 'PAID').length;

    const filtered = players.filter((p) => {
        const name = `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.toLowerCase();
        const team = (p.teamName || '').toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || team.includes(q);
    });

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
                <span className="font-semibold text-slate-900 dark:text-white">Cashier Desk & Financial Ledger</span>
            </div>

            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50">
                                Financial Ledger
                            </span>
                            <span className="font-mono text-xs text-slate-400">CHF {competition?.entryFee || 0} Standard Fee</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-emerald-500" />
                            <span>Cashier Desk & Entry Fee Ledger</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Collect player entry fees via Cash, TWINT, and Card, and track tournament revenues
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

            {/* Financial KPI Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Collected</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        CHF {totalCollected}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Paid Athletes</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {players.length - unpaidCount} <span className="text-xs text-slate-400 font-normal">/ {players.length}</span>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding (Unpaid)</span>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {unpaidCount}
                    </div>
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

            {/* Cashier Table Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search athlete or team..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-red-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-3">Athlete</th>
                                <th className="p-3">Team</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Method</th>
                                {canManage && <th className="p-3 text-right">Settlement Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                                        No registered athletes found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => (
                                    <tr key={p.registrationId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                            {p.user?.firstName} {p.user?.lastName}
                                        </td>
                                        <td className="p-3">{p.teamName || '–'}</td>
                                        <td className="p-3 text-xs text-slate-500">{p.categoryName || '–'}</td>
                                        <td className="p-3">
                                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${
                                                p.paymentStatus === 'PAID'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                                            }`}>
                                                {p.paymentStatus || 'UNPAID'}
                                            </span>
                                        </td>
                                        <td className="p-3 font-mono text-xs text-slate-400">
                                            {p.paymentMethod || '–'}
                                        </td>
                                        {canManage && (
                                            <td className="p-3 text-right">
                                                {p.paymentStatus !== 'PAID' ? (
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePayment(p.registrationId, 'PAID', 'CASH')}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                                                        >
                                                            Cash
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePayment(p.registrationId, 'PAID', 'TWINT')}
                                                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                                                        >
                                                            TWINT
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePayment(p.registrationId, 'UNPAID')}
                                                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
                                                    >
                                                        Mark Unpaid
                                                    </button>
                                                )}
                                            </td>
                                        )}
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
