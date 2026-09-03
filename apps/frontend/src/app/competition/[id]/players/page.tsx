'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Users,
    ChevronLeft,
    CheckCircle2,
    Clock,
    DollarSign,
    Shield,
    Flame,
    UserCheck,
    Trophy,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

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
        roles.some((r) => r.userId === user?.id && ['REFEREE', 'DIRECTOR', 'CASHIER'].includes(r.role));

    const handleToggleCheckin = async (player: any) => {
        if (!canCheckin) return;
        try {
            const nextStatus = !player.isCheckedIn;
            await api.checkinCompetitionPlayer(competitionId, player.registrationId, { isCheckedIn: nextStatus });
            setSuccessMessage(`${player.teamName} check-in status updated.`);
            setPlayers((prev) =>
                prev.map((p) => (p.registrationId === player.registrationId ? { ...p, isCheckedIn: nextStatus } : p))
            );
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update check-in status');
            setTimeout(() => setErrorMessage(''), 4000);
        }
    };

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'athlete',
                accessorFn: (row) => `${row.teamName || ''} ${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Athlete / Team" />,
                cell: ({ row }) => (
                    <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{row.original.teamName}</div>
                        {row.original.user && (
                            <div className="text-[11px] text-slate-500">
                                {row.original.user.firstName} {row.original.user.lastName}
                            </div>
                        )}
                    </div>
                ),
            },
            {
                id: 'category',
                accessorFn: (row) => row.categoryName || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
                cell: ({ row }) => (
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {row.original.categoryName || '–'}
                    </span>
                ),
            },
            {
                id: 'eloPoints',
                accessorFn: (row) => row.eloPoints || 1000,
                header: ({ column }) => <DataTableColumnHeader column={column} title="License & ELO" />,
                cell: ({ row }) => (
                    <div className="text-xs">
                        <div className="font-mono text-slate-500 dark:text-slate-400 font-semibold">{row.original.licenseId || 'No License'}</div>
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold mt-0.5">
                            <Flame className="h-3 w-3" /> {row.original.eloPoints || 1000} pts
                        </div>
                    </div>
                ),
            },
            {
                id: 'paymentStatus',
                accessorFn: (row) => row.paymentStatus || 'UNPAID',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Payment" />,
                cell: ({ row }) => {
                    const isPaid = row.original.paymentStatus === 'PAID';
                    return (
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                isPaid
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}
                        >
                            {row.original.paymentStatus || 'UNPAID'}
                        </span>
                    );
                },
            },
            {
                id: 'isCheckedIn',
                accessorFn: (row) => Boolean(row.isCheckedIn),
                header: ({ column }) => <DataTableColumnHeader column={column} title="Check-In Status" className="justify-end w-full" />,
                cell: ({ row }) => {
                    const p = row.original;
                    return (
                        <div className="text-right">
                            <button
                                onClick={() => handleToggleCheckin(p)}
                                disabled={!canCheckin}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                                    p.isCheckedIn
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400'
                                } ${!canCheckin ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {p.isCheckedIn ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Checked In
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-3.5 w-3.5" /> Not Present
                                    </>
                                )}
                            </button>
                        </div>
                    );
                },
            },
        ],
        [canCheckin]
    );

    return (
        <div className="space-y-6 max-w-6xl pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Link
                        href={`/competition/${competitionId}`}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 mb-2 font-semibold"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Back to Dashboard</span>
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="h-6 w-6 text-red-500" />
                        <span>Players Roster & Check-In</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Live match desk presence tracking and payment status for {competition?.name || 'this competition'}.
                    </p>
                </div>
            </div>

            {/* Notification messages */}
            {successMessage && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{successMessage}</span>
                </div>
            )}
            {errorMessage && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {errorMessage}
                </div>
            )}

            {/* Interactive DataTable */}
            <DataTable
                columns={columns}
                data={players}
                loading={loading}
                searchPlaceholder="Search athlete, team, category, license..."
                emptyMessage="No registered athletes found matching your search."
                defaultPageSize={25}
                pageSizeOptions={[10, 25, 50, 100]}
            />
        </div>
    );
}