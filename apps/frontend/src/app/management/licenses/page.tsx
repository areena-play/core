'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Award,
    Plus,
    Filter,
    CheckCircle2,
    Clock,
    XCircle,
    Shield,
    GraduationCap,
    UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

export default function LicensesPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [licenses, setLicenses] = useState<any[]>([]);
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchLicenses = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (typeFilter) params.type = typeFilter;
            if (statusFilter) params.status = statusFilter;

            const data = await api.getLicenses(params);
            setLicenses(data || []);
        } catch (err) {
            console.error('Failed to load licenses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicenses();
    }, [typeFilter, statusFilter]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('common.approve')}d
                    </span>
                );
            case 'PENDING_CLUB':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-amber-400 border border-amber-300 dark:border-amber-800/40">
                        <Clock className="h-3 w-3" />
                        {t('licenses.pendingClub')}
                    </span>
                );
            case 'PENDING_ASSOCIATION':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-blue-400 border border-blue-300 dark:border-blue-800/40">
                        <Clock className="h-3 w-3" />
                        {t('licenses.pendingAssociation')}
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-800 dark:bg-red-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-red-400 border border-red-300 dark:border-red-800/40">
                        <XCircle className="h-3 w-3" />
                        {t('common.reject')}ed
                    </span>
                );
            default:
                return (
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'holder',
                accessorFn: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''} ${row.user?.email || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('licenses.holder')} />,
                cell: ({ row }) => (
                    <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                            {row.original.user?.firstName} {row.original.user?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">{row.original.user?.email}</div>
                    </div>
                ),
            },
            {
                id: 'licenseId',
                accessorFn: (row) => row.user?.licenseId || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('licenses.licenseId')} />,
                cell: ({ row }) => (
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {row.original.user?.licenseId || <span className="text-slate-400 font-normal">Pending</span>}
                    </span>
                ),
            },
            {
                id: 'type',
                accessorFn: (row) => row.type,
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('licenses.type')} />,
                cell: ({ row }) => (
                    <span className="rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {row.original.type?.replace('PLAYER_', '')}
                    </span>
                ),
            },
            {
                id: 'club',
                accessorFn: (row) => row.club?.name || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('common.club')} />,
                cell: ({ row }) => (
                    <span className="text-slate-700 dark:text-slate-300">
                        {row.original.club ? row.original.club.name : <span className="text-slate-400 italic">None (Tournament Card)</span>}
                    </span>
                ),
            },
            {
                id: 'association',
                accessorFn: (row) => row.association?.name || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('common.association')} />,
                cell: ({ row }) => (
                    <span className="text-slate-500 dark:text-slate-400">
                        {row.original.association?.name}
                    </span>
                ),
            },
            {
                id: 'validity',
                accessorFn: (row) => new Date(row.validUntil || 0).getTime(),
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('licenses.validity')} />,
                cell: ({ row }) => (
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {row.original.validFrom ? format(new Date(row.original.validFrom), 'dd.MM.yy') : '—'} -{' '}
                        {row.original.validUntil ? format(new Date(row.original.validUntil), 'dd.MM.yy') : '—'}
                    </span>
                ),
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('common.status')} className="justify-end w-full" />,
                cell: ({ row }) => (
                    <div className="text-right">
                        {getStatusBadge(row.original.status)}
                    </div>
                ),
            },
        ],
        [t]
    );

    const filterSlot = (
        <div className="flex items-center gap-2">
            <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none shadow-xs"
            >
                <option value="">{t('licenses.selectType')}</option>
                <option value="PLAYER_REGULAR">Regular Player (Club-Attached)</option>
                <option value="PLAYER_TCARD">T-Card (Tournament Only)</option>
                <option value="PLAYER_WOMEN">Women's League License</option>
                <option value="COACH">Coach License</option>
                <option value="REFEREE">Referee License</option>
            </select>

            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none shadow-xs"
            >
                <option value="">{t('common.all')} Statuses</option>
                <option value="APPROVED">{t('common.approve')}d</option>
                <option value="PENDING_CLUB">{t('licenses.pendingClub')}</option>
                <option value="PENDING_ASSOCIATION">{t('licenses.pendingAssociation')}</option>
                <option value="REJECTED">{t('common.reject')}ed</option>
            </select>
        </div>
    );

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="h-6 w-6 text-red-500" />
                        <span>{t('licenses.title')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {t('licenses.subtitle')}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/licenses/refresher-courses"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <GraduationCap className="h-4 w-4" />
                        <span>{t('licenses.refresherCourses')}</span>
                    </Link>
                    <Link
                        href="/licenses/apply"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('licenses.applyNew')}</span>
                    </Link>
                </div>
            </div>

            {/* User's License ID Callout if assigned */}
            {user?.licenseId && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 via-white to-red-50 dark:from-red-950/60 dark:via-slate-900 dark:to-slate-950 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 font-mono font-bold text-white text-base">
                            ID
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                                {t('licenses.licenseId')}
                            </div>
                            <div className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-widest">
                                {user.licenseId}
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-right hidden sm:block">
                        {t('licenses.nationalLicense')}
                    </div>
                </div>
            )}

            {/* Licenses Interactive DataTable */}
            <DataTable
                columns={columns}
                data={licenses}
                loading={loading}
                searchPlaceholder="Search licenses by athlete, email, license ID, club..."
                searchSlot={filterSlot}
                emptyMessage="No licenses match your search criteria."
                defaultPageSize={25}
                pageSizeOptions={[10, 25, 50, 100]}
            />
        </div>
    );
}
