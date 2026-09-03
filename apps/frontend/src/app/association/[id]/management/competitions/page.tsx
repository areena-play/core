'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import {
    Trophy,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Home,
    AlertCircle,
    ClipboardCheck,
    RefreshCw,
    CalendarDays,
    MapPin,
    Users,
    ArrowUpRight,
    ShieldCheck,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Modal } from '@/components/ui/Modal';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

type Competition = {
    id: string;
    name: string;
    type: string;
    status: string;
    approvalStatus: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    clubName?: string;
    playerCount?: number;
};

function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CompetitionHubPage() {
    const { user } = useAuth();
    const params = useParams();
    const assocId = params?.id as string;

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) => ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role));

    const [pending, setPending] = useState<Competition[]>([]);
    const [completed, setCompleted] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
    const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [validateComp, setValidateComp] = useState<Competition | null>(null);
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        if (!isAssocAdmin) return;
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAssocAdmin, assocId]);

    async function load() {
        setLoading(true);
        try {
            const qp: Record<string, string> = {};
            if (assocId && assocId !== 'main') qp.associationId = assocId;
            const all = await api.getCompetitions(qp);
            const list: Competition[] = Array.isArray(all) ? all : all?.competitions ?? all?.data ?? [];
            setPending(list.filter((c) => c.approvalStatus === 'PENDING_APPROVAL'));
            setCompleted(list.filter((c) => c.status === 'COMPLETED'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleApproval() {
        if (!selectedComp || !actionType) return;
        setSubmitting(true);
        try {
            await api.approveCompetition(selectedComp.id, {
                status: actionType,
                ...(actionType === 'REJECTED' && rejectReason ? { reason: rejectReason } : {}),
            });
            setSelectedComp(null); setActionType(null); setRejectReason('');
            load();
        } catch (e) { console.error(e); } finally { setSubmitting(false); }
    }

    async function handleValidate() {
        if (!validateComp) return;
        setValidating(true);
        try {
            await api.approveCompetition(validateComp.id, { status: 'RESULTS_VALIDATED' });
            setValidateComp(null);
            load();
        } catch (e) { console.error(e); } finally { setValidating(false); }
    }

    const pendingColumns = useMemo<ColumnDef<Competition>[]>(
        () => [
            {
                id: 'competition',
                accessorKey: 'name',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Competition" />,
                cell: ({ row }) => {
                    const comp = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40">
                                <Trophy className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{comp.name}</p>
                                {comp.location && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {comp.location}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'dates',
                accessorKey: 'startDate',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Dates" />,
                cell: ({ row }) => {
                    const comp = row.original;
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(comp.startDate)}
                            {comp.endDate && comp.endDate !== comp.startDate && <span> to {formatDate(comp.endDate)}</span>}
                        </div>
                    );
                },
            },
            {
                id: 'organiser',
                accessorKey: 'clubName',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Organiser" />,
                cell: ({ row }) => <span className="text-xs text-slate-600 dark:text-slate-400">{row.original.clubName ?? '—'}</span>,
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const comp = row.original;
                    return (
                        <div className="flex items-center justify-end gap-2">
                            <Link
                                href={`/competition/${comp.id}`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors flex items-center gap-1"
                            >
                                View <ArrowUpRight className="h-3 w-3" />
                            </Link>
                            <button
                                onClick={() => { setSelectedComp(comp); setActionType('APPROVED'); }}
                                className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                                <CheckCircle2 className="h-3 w-3" /> Approve
                            </button>
                            <button
                                onClick={() => { setSelectedComp(comp); setActionType('REJECTED'); }}
                                className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-red-100 hover:text-red-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-red-950/60 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                            >
                                <XCircle className="h-3 w-3" /> Reject
                            </button>
                        </div>
                    );
                },
            },
        ],
        []
    );

    const completedColumns = useMemo<ColumnDef<Competition>[]>(
        () => [
            {
                id: 'competition',
                accessorKey: 'name',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Competition" />,
                cell: ({ row }) => {
                    const comp = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/40">
                                <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{comp.name}</p>
                                {comp.location && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {comp.location}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'ended',
                accessorKey: 'endDate',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Ended" />,
                cell: ({ row }) => (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(row.original.endDate)}
                    </div>
                ),
            },
            {
                id: 'participants',
                accessorKey: 'playerCount',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Participants" />,
                cell: ({ row }) => (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                        {row.original.playerCount ?? '—'}
                    </div>
                ),
            },
            {
                id: 'organiser',
                accessorKey: 'clubName',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Organiser" />,
                cell: ({ row }) => <span className="text-xs text-slate-600 dark:text-slate-400">{row.original.clubName ?? '—'}</span>,
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const comp = row.original;
                    return (
                        <div className="flex items-center justify-end gap-2">
                            <Link
                                href={`/competition/${comp.id}/results`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors flex items-center gap-1"
                            >
                                Results <ArrowUpRight className="h-3 w-3" />
                            </Link>
                            <button
                                onClick={() => setValidateComp(comp)}
                                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                                <ShieldCheck className="h-3 w-3" /> Validate
                            </button>
                        </div>
                    );
                },
            },
        ],
        []
    );

    if (!isAssocAdmin) return <AccessDenied />;

    const mgmt = assocId && assocId !== 'main' ? `/association/${assocId}/management` : '/management';

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 shadow-lg">
                            <Trophy className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                                <Link href="/"><Home className="h-3 w-3" /></Link>
                                <ChevronRight className="h-3 w-3" />
                                <Link href={mgmt} className="hover:text-slate-700 dark:hover:text-slate-200">Management</Link>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-slate-700 dark:text-slate-200 font-medium">Tournament Hub</span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tournament Hub</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Approve pending competitions and validate post-tournament results.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-800/40 dark:bg-amber-950/30">
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{pending.length} Awaiting Approval</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 dark:border-purple-800/40 dark:bg-purple-950/30">
                            <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{completed.length} Awaiting Validation</span>
                        </div>
                    </div>
                </div>
                <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-500/5 blur-3xl dark:bg-red-500/10" />
            </div>

            {/* Pending Approval Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pending Approval</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Competitions created by clubs that require your sign-off before they go live.</p>
                    </div>
                    <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                        {pending.length}
                    </span>
                </div>
                <DataTable
                    columns={pendingColumns}
                    data={pending}
                    loading={loading}
                    searchPlaceholder="Search pending competitions or clubs..."
                    emptyMessage="Nothing pending approval."
                    defaultPageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                />
            </div>

            {/* Results Validation Section */}
            <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/60">
                        <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Results Validation</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Completed competitions where results need to be officially confirmed and locked.</p>
                    </div>
                    <span className="ml-auto rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-400">
                        {completed.length}
                    </span>
                </div>
                <DataTable
                    columns={completedColumns}
                    data={completed}
                    loading={loading}
                    searchPlaceholder="Search completed competitions..."
                    emptyMessage="No completed competitions awaiting validation."
                    defaultPageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                />
            </div>

            {/* Approve/Reject Modal */}
            <Modal
                isOpen={Boolean(selectedComp && actionType)}
                onClose={() => { setSelectedComp(null); setActionType(null); setRejectReason(''); }}
                title={actionType === 'APPROVED' ? 'Approve Competition' : 'Reject Competition'}
                subtitle={selectedComp?.name}
                icon={actionType === 'APPROVED' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                size="md"
            >
                <div className="space-y-4">
                    {actionType === 'APPROVED' ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Are you sure you want to approve <strong>{selectedComp?.name}</strong>? Once approved, the competition will be visible to athletes and open for registrations.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Please provide a reason for rejecting <strong>{selectedComp?.name}</strong>. This will be shared with the organizer:
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Explain what needs to be changed..."
                                rows={3}
                                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => { setSelectedComp(null); setActionType(null); }}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleApproval}
                            disabled={submitting}
                            className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors ${
                                actionType === 'APPROVED'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {submitting ? 'Submitting...' : actionType === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Validation Modal */}
            <Modal
                isOpen={Boolean(validateComp)}
                onClose={() => setValidateComp(null)}
                title="Validate Competition Results"
                subtitle={validateComp?.name}
                icon={<ShieldCheck className="h-5 w-5 text-purple-500" />}
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Validating results will lock all match scores for <strong>{validateComp?.name}</strong> and update official athlete ratings and rankings.
                    </p>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>This action cannot be undone. Please ensure all scores have been thoroughly reviewed.</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setValidateComp(null)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleValidate}
                            disabled={validating}
                            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors"
                        >
                            {validating ? 'Validating...' : 'Confirm Validation'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}