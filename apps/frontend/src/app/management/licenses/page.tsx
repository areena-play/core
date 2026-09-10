'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
    CheckSquare,
    AlertCircle,
    ChevronRight,
    Search,
    Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

function LicensingHubContent() {
    const { user } = useAuth();
    const { t } = useI18n();
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = searchParams.get('tab') === 'approvals' ? 'approvals' : 'directory';

    const [licenses, setLicenses] = useState<any[]>([]);
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);

    const [processingLicenseId, setProcessingLicenseId] = useState<string | null>(null);
    const [rejectModalLicense, setRejectModalLicense] = useState<any | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    const pendingLicenses = useMemo(() => {
        const allPending = licenses.filter(
            (l) => l.status === 'PENDING_CLUB' || l.status === 'PENDING_ASSOCIATION',
        );
        if (approvalStatusFilter === 'PENDING_CLUB') {
            return allPending.filter((l) => l.status === 'PENDING_CLUB');
        }
        if (approvalStatusFilter === 'PENDING_ASSOCIATION') {
            return allPending.filter((l) => l.status === 'PENDING_ASSOCIATION');
        }
        return allPending;
    }, [licenses, approvalStatusFilter]);

    const totalPendingCount = useMemo(() => {
        return licenses.filter(
            (l) => l.status === 'PENDING_CLUB' || l.status === 'PENDING_ASSOCIATION',
        ).length;
    }, [licenses]);

    const handleTabChange = (tab: 'directory' | 'approvals') => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === 'approvals') {
            params.set('tab', 'approvals');
        } else {
            params.delete('tab');
        }
        router.replace(`/management/licenses${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const handleApproveLicense = async (licenseId: string) => {
        setProcessingLicenseId(licenseId);
        try {
            await api.approveLicense(licenseId, { approved: true });
            setActionMsg({ type: 'success', text: 'License application approved successfully!' });
            setTimeout(() => setActionMsg(null), 4000);
            await fetchLicenses();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to approve license' });
        } finally {
            setProcessingLicenseId(null);
        }
    };

    const handleRejectLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectModalLicense) return;
        setProcessingLicenseId(rejectModalLicense.id);
        try {
            await api.approveLicense(rejectModalLicense.id, {
                approved: false,
                rejectionReason: rejectReason,
            });
            setRejectModalLicense(null);
            setRejectReason('');
            setActionMsg({ type: 'success', text: 'License application rejected.' });
            setTimeout(() => setActionMsg(null), 4000);
            await fetchLicenses();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to reject license' });
        } finally {
            setProcessingLicenseId(null);
        }
    };

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
                    <div className="flex items-center justify-end gap-2">
                        {getStatusBadge(row.original.status)}
                        {(row.original.status === 'PENDING_CLUB' || row.original.status === 'PENDING_ASSOCIATION') && (
                            <button
                                onClick={() => handleTabChange('approvals')}
                                className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline ml-1"
                            >
                                Review
                            </button>
                        )}
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
        <div className="space-y-6 pb-16">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Award className="h-6 w-6 text-red-500" />
                        <span>{t('nav.licensingHub', undefined, 'Licensing & Credential Hub')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Review pending approvals, monitor player & official licenses, and oversee refresher course certifications.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/management/licenses/refresher-courses"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-xs"
                    >
                        <GraduationCap className="h-4 w-4" />
                        <span>{t('licenses.refresherCourses')}</span>
                    </Link>
                    <Link
                        href="/profile?tab=licenses&apply=true"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-xs"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('licenses.applyNew')}</span>
                    </Link>
                </div>
            </div>

            {/* User's License ID Callout if assigned */}
            {user?.licenseId && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 via-white to-red-50 dark:from-red-950/60 dark:via-slate-900 dark:to-slate-950 p-4 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 font-mono font-bold text-white text-base shadow-xs">
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

            {/* Action Feedback Alert */}
            {actionMsg && (
                <div
                    className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-xs transition ${
                        actionMsg.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                    }`}
                >
                    {actionMsg.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Navigation Tabs (Approvals Queue vs All Licenses Directory) */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleTabChange('approvals')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeTab === 'approvals'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <CheckSquare className="h-4 w-4" />
                        <span>{t('licenses.approvalsQueue', undefined, 'Approvals Queue')}</span>
                        {totalPendingCount > 0 && (
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                    activeTab === 'approvals'
                                        ? 'bg-white text-red-600'
                                        : 'bg-red-600 text-white'
                                }`}
                            >
                                {totalPendingCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('directory')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeTab === 'directory'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        <span>All Licenses Directory</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                activeTab === 'directory'
                                    ? 'bg-red-800 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            {licenses.length}
                        </span>
                    </button>
                </div>

                {activeTab === 'approvals' && (
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setApprovalStatusFilter('ALL')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                approvalStatusFilter === 'ALL'
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            All ({licenses.filter((l) => l.status === 'PENDING_CLUB' || l.status === 'PENDING_ASSOCIATION').length})
                        </button>
                        <button
                            onClick={() => setApprovalStatusFilter('PENDING_CLUB')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                approvalStatusFilter === 'PENDING_CLUB'
                                    ? 'bg-amber-600 text-white'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Club Stage ({licenses.filter((l) => l.status === 'PENDING_CLUB').length})
                        </button>
                        <button
                            onClick={() => setApprovalStatusFilter('PENDING_ASSOCIATION')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                approvalStatusFilter === 'PENDING_ASSOCIATION'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Association Stage ({licenses.filter((l) => l.status === 'PENDING_ASSOCIATION').length})
                        </button>
                    </div>
                )}
            </div>

            {/* TAB 1: Approvals Queue */}
            {activeTab === 'approvals' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                            ))}
                        </div>
                    ) : pendingLicenses.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 p-12 text-center text-slate-500 dark:text-slate-400 space-y-3 shadow-xs">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">All Clear!</h3>
                            <p className="text-xs max-w-md mx-auto text-slate-500 dark:text-slate-400">
                                There are no pending license applications requiring your administrative review at this time.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                            {pendingLicenses.map((lic) => (
                                <div
                                    key={lic.id}
                                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs"
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                                    lic.status === 'PENDING_CLUB'
                                                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border-amber-300 dark:border-amber-800/40'
                                                        : 'bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 border-blue-300 dark:border-blue-800/40'
                                                }`}
                                            >
                                                <Clock className="inline h-3 w-3 mr-1" />
                                                {lic.status === 'PENDING_CLUB'
                                                    ? t('licenses.pendingClub', undefined, 'Pending Club Approval')
                                                    : t('licenses.pendingAssociation', undefined, 'Pending Association Approval')}
                                            </span>
                                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {lic.type}
                                            </span>
                                            {lic.user?.licenseId && (
                                                <span className="rounded-full bg-red-50 dark:bg-red-950/60 px-2.5 py-0.5 text-[10px] font-mono font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                                                    LIC #{lic.user.licenseId}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 font-black text-white text-sm shrink-0 shadow-xs">
                                                {lic.user?.firstName?.[0] || 'U'}
                                                {lic.user?.lastName?.[0] || 'A'}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {lic.user?.firstName} {lic.user?.lastName}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                    {lic.user?.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                            <span>
                                                <strong>{t('common.association')}:</strong> {lic.association?.name || '—'}
                                            </span>
                                            {lic.club && (
                                                <span>
                                                    <strong>{t('common.club')}:</strong> {lic.club.name}
                                                </span>
                                            )}
                                            {lic.season && (
                                                <span>
                                                    <strong>Season:</strong> {lic.season.name}
                                                </span>
                                            )}
                                            <span>
                                                <strong>Submitted:</strong> {format(new Date(lic.createdAt), 'PPP')}
                                            </span>
                                        </div>
                                        {lic.notes && (
                                            <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Remarks:</span> {lic.notes}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 sm:self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRejectModalLicense(lic);
                                                setRejectReason('');
                                            }}
                                            disabled={processingLicenseId === lic.id}
                                            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                                        >
                                            {t('common.reject')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleApproveLicense(lic.id)}
                                            disabled={processingLicenseId === lic.id}
                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {processingLicenseId === lic.id ? (
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            ) : (
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            )}
                                            <span>{processingLicenseId === lic.id ? t('common.saving') : t('common.approve')}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: All Licenses Interactive DataTable */}
            {activeTab === 'directory' && (
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
            )}

            {/* Rejection Modal */}
            <Modal
                isOpen={Boolean(rejectModalLicense)}
                onClose={() => setRejectModalLicense(null)}
                title={`${t('common.reject')} License Application`}
                subtitle={
                    rejectModalLicense
                        ? `Rejecting ${rejectModalLicense.type} request for ${rejectModalLicense.user?.firstName} ${rejectModalLicense.user?.lastName}`
                        : ''
                }
                size="md"
            >
                <form onSubmit={handleRejectLicense} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for Rejection
                        </label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Explain why this license request is being rejected..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setRejectModalLicense(null)}
                            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={processingLicenseId === rejectModalLicense?.id}
                            className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50"
                        >
                            {processingLicenseId === rejectModalLicense?.id ? t('common.saving') : t('common.reject')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default function LicensesPage() {
    return (
        <Suspense fallback={null}>
            <LicensingHubContent />
        </Suspense>
    );
}

