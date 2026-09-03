'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Activity,
    ChevronRight,
    ArrowLeft,
    Download,
    CheckCircle2,
    AlertCircle,
    Shield,
    FileCode,
    Trophy,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

export default function CompetitionActionsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [actionsLog, setActionsLog] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
            const [comp, act, r] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionActions(competitionId).catch(() => []),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setActionsLog(act || []);
            setRoles(r || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load actions log' });
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
    const canManage = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && ['ADMIN', 'CAN_CREATE_BACKUPS'].includes(r.role));

    const handleCreateBackup = async () => {
        try {
            const data = await api.backupCompetition(competitionId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `competition-${competitionId}-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setActionMsg({ type: 'success', text: 'Backup snapshot downloaded successfully.' });
            fetchData();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Backup failed' });
        }
    };

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'action',
                accessorFn: (row) => row.action,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
                cell: ({ row }) => (
                    <span className="font-bold text-red-600 dark:text-red-400 font-mono text-xs">
                        {row.original.action}
                    </span>
                ),
            },
            {
                id: 'executor',
                accessorFn: (row) => row.userName || row.userEmail || 'System',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Executed By" />,
                cell: ({ row }) => (
                    <span className="font-medium text-slate-900 dark:text-white">
                        {row.original.userName || row.original.userEmail || 'System'}
                    </span>
                ),
            },
            {
                id: 'description',
                accessorFn: (row) => row.description || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
                cell: ({ row }) => (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {row.original.description || '–'}
                    </span>
                ),
            },
            {
                id: 'timestamp',
                accessorFn: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
                header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
                cell: ({ row }) => (
                    <span className="text-xs text-slate-400 font-mono">
                        {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '–'}
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <div className="space-y-6 max-w-6xl pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <Link href={`/competition/${competitionId}`} className="hover:text-red-600 transition flex items-center gap-1">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>{competition?.name || 'Tournament'}</span>
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-slate-700 dark:text-slate-200 font-bold">Actions & History</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-6 w-6 text-red-500" />
                        <span>System Actions & Audit Trail</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Historical audit logs and disaster recovery snapshots for {competition?.name || 'this competition'}.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={`/competition/${competitionId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Dashboard</span>
                    </Link>
                    {canManage && (
                        <button
                            type="button"
                            onClick={handleCreateBackup}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow"
                        >
                            <Download className="h-4 w-4" />
                            <span>Export Backup JSON</span>
                        </button>
                    )}
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
                data={actionsLog}
                loading={loading}
                searchPlaceholder="Search audit actions, user, description..."
                emptyMessage="No actions recorded yet."
                defaultPageSize={10}
                pageSizeOptions={[5, 10, 25, 50]}
            />
        </div>
    );
}