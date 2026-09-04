'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

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
    const isCashier = roles.some((r) => r.role === 'CASHIER' && r.userId === user?.id);
    const isDirector = roles.some((r) => r.role === 'DIRECTOR' && r.userId === user?.id);

    const canManage = isSuperAdmin || isAssocAdmin || isCashier || isDirector;

    const handleUpdatePayment = async (registrationId: string, status: string, method?: string) => {
        try {
            await api.updateCompetitionPlayerPayment(competitionId, registrationId, { paymentStatus: status, paymentMethod: method });
            setActionMsg({ type: 'success', text: `Payment status set to ${status}.` });
            fetchData();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Payment update failed' });
        }
    };

    const paidCount = players.filter((p) => p.paymentStatus === 'PAID').length;
    const unpaidCount = players.length - paidCount;

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'athlete',
                accessorFn: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Athlete" />,
                cell: ({ row }) => (
                    <span className="font-semibold text-slate-900 dark:text-white">
                        {row.original.user?.firstName} {row.original.user?.lastName}
                    </span>
                ),
            },
            {
                id: 'team',
                accessorFn: (row) => row.teamName || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
                cell: ({ row }) => <span>{row.original.teamName || '–'}</span>,
            },
            {
                id: 'category',
                accessorFn: (row) => row.categoryName || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
                cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.categoryName || '–'}</span>,
            },
            {
                id: 'status',
                accessorFn: (row) => row.paymentStatus || 'UNPAID',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
                cell: ({ row }) => {
                    const isPaid = row.original.paymentStatus === 'PAID';
                    return (
                        <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${
                                isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                            }`}
                        >
                            {row.original.paymentStatus || 'UNPAID'}
                        </span>
                    );
                },
            },
            {
                id: 'method',
                accessorFn: (row) => row.paymentMethod || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
                cell: ({ row }) => <span className="font-mono text-xs text-slate-400">{row.original.paymentMethod || '–'}</span>,
            },
            ...(canManage
                ? [
                      {
                          id: 'actions',
                          header: () => <div className="text-right">Settlement Actions</div>,
                          cell: ({ row }: any) => {
                              const p = row.original;
                              return (
                                  <div className="text-right">
                                      {p.paymentStatus !== 'PAID' ? (
                                          <div className="inline-flex items-center gap-1 justify-end">
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
                                              onClick={() => handleUpdatePayment(p.registrationId, 'UNPAID', undefined)}
                                              className="text-xs text-slate-400 hover:text-rose-500 font-semibold transition"
                                          >
                                              Reset
                                          </button>
                                      )}
                                  </div>
                              );
                          },
                      },
                  ]
                : []),
        ],
        [canManage]
    );

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <Link href={`/competition/${competitionId}`} className="hover:text-red-600 transition flex items-center gap-1">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>{competition?.name || 'Tournament'}</span>
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-slate-700 dark:text-slate-200 font-bold">Cashier Desk</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-red-500" />
                        <span>Cashier & Check-in Desk</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Collect entry fees, mark players as present, and balance on-site check-in registers.
                    </p>
                </div>

                <Link
                    href={`/competition/${competitionId}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                </Link>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{players.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                        #
                    </div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Paid / Checked In</div>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{paidCount}</div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Payment Pending</div>
                        <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{unpaidCount}</div>
                    </div>
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
            </div>

            {/* Action Alert */}
            {actionMsg && (
                <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                        actionMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    }`}
                >
                    {actionMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Interactive DataTable */}
            <DataTable
                columns={columns}
                data={players}
                loading={loading}
                searchPlaceholder="Search athlete name, team, category, or payment status..."
                emptyMessage="No registered athletes found for this competition."
                defaultPageSize={25}
                pageSizeOptions={[10, 25, 50, 100]}
            />
        </div>
    );
}