'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Users,
    Shield,
    Award,
    Trophy,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    ExternalLink,
    Filter,
    Search,
    UserPlus,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';
import { format } from 'date-fns';

export default function ClubRegisteredMembersPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');

    useEffect(() => {
        if (!clubIdentifier) return;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.getClubMembers(clubIdentifier);
                setClub(res.club);
                setMembers(res.members || res.licenses || []);
                if (res.club) {
                    setEntityMeta({
                        id: res.club.id,
                        title: res.club.name,
                        code: res.club.code,
                        badge: 'Club',
                        subtitle: `${res.club.city || 'Switzerland'} • Registered Members`,
                    });
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load club members.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [clubIdentifier, setEntityMeta]);

    const filteredData = useMemo(() => {
        if (statusFilter === 'ALL') return members;
        return members.filter((m) => m.status === statusFilter);
    }, [members, statusFilter]);

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'person',
                accessorFn: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Member / Athlete" />,
                cell: ({ row }) => {
                    const u = row.original.user || {};
                    const personIdentifier = u.licenseId || u.id || row.original.userId;
                    const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'MB';

                    return (
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <Link
                                    href={`/people/${personIdentifier}`}
                                    className="font-bold text-slate-900 dark:text-white hover:text-red-600 transition flex items-center gap-1.5 group"
                                >
                                    <span>
                                        {u.firstName || 'Unknown'} {u.lastName || 'Member'}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-red-600 transition" />
                                </Link>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                                    {u.email || u.licenseId || 'Registered athlete'}
                                </span>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'licenseNumber',
                accessorFn: (row) => row.licenseNumber || row.user?.licenseId || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="License #" />,
                cell: ({ row }) => {
                    const lic = row.original.licenseNumber || row.original.user?.licenseId;
                    return (
                        <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                            {lic || 'PENDING'}
                        </span>
                    );
                },
            },
            {
                id: 'type',
                accessorFn: (row) => row.type,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Category / Type" />,
                cell: ({ row }) => (
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {row.original.type}
                    </span>
                ),
            },
            {
                id: 'eloPoints',
                accessorFn: (row) => row.user?.eloPoints ?? 1200,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Elo Rating" />,
                cell: ({ row }) => {
                    const elo = row.original.user?.eloPoints ?? 1200;
                    return (
                        <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {elo} pts
                            </span>
                        </div>
                    );
                },
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => <DataTableColumnHeader column={column} title="License Status" />,
                cell: ({ row }) => {
                    const isApproved = row.original.status === 'APPROVED';
                    return (
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                isApproved
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/50'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800/50'
                            }`}
                        >
                            {isApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{row.original.status}</span>
                        </span>
                    );
                },
            },
            {
                id: 'validity',
                accessorFn: (row) => (row.validUntil ? new Date(row.validUntil).getTime() : 0),
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Validity" className="justify-end w-full" />
                ),
                cell: ({ row }) => (
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        {row.original.validUntil
                            ? format(new Date(row.original.validUntil), 'MMM yyyy')
                            : 'Active Season'}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Profile</div>,
                cell: ({ row }) => {
                    const u = row.original.user || {};
                    const personIdentifier = u.licenseId || u.id || row.original.userId;
                    return (
                        <div className="flex justify-end">
                            <Link
                                href={`/people/${personIdentifier}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>View</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    );
                },
            },
        ],
        []
    );

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !club) {
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Members Unavailable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {error || `No club found for identifier "${clubIdentifier}".`}
                    </p>
                </div>
                <Link
                    href="/clubs"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                    <span>Back to Clubs Directory</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-red-600" />
                        <span>Club Roster & Registered Members</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        All licensed athletes, players, and registered members under {club.name}.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={`/club/${clubIdentifier}/members-hub`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 text-xs font-bold shadow-xs transition"
                    >
                        <UserPlus className="w-4 h-4 text-red-400" />
                        <span>Manage / Register In Hub</span>
                    </Link>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Members</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{members.length}</div>
                    </div>
                    <Users className="w-8 h-8 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Approved</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {members.filter((m) => m.status === 'APPROVED').length}
                        </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Rating</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {members.length > 0
                                ? Math.round(
                                      members.reduce((acc, m) => acc + (m.user?.eloPoints || 1200), 0) /
                                          members.length
                                  )
                                : 1200}{' '}
                            <span className="text-xs font-normal text-slate-400">pts</span>
                        </div>
                    </div>
                    <Trophy className="w-8 h-8 text-amber-500" />
                </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        statusFilter === 'ALL'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                >
                    All ({members.length})
                </button>
                <button
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        statusFilter === 'APPROVED'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                >
                    Approved ({members.filter((m) => m.status === 'APPROVED').length})
                </button>
                <button
                    onClick={() => setStatusFilter('PENDING')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        statusFilter === 'PENDING'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                >
                    Pending ({members.filter((m) => m.status === 'PENDING').length})
                </button>
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={filteredData}
                searchPlaceholder="Search member name, license number, or type..."
                emptyMessage="No members matching the current filter criteria."
                defaultPageSize={10}
                pageSizeOptions={[10, 25, 50, 100]}
            />
        </div>
    );
}

