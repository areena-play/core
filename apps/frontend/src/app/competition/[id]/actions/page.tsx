'use client';

import React, { useEffect, useState } from 'react';
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

    const handleBackup = async () => {
        try {
            const data = await api.backupCompetition(competitionId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${competition?.slug || 'competition'}-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setActionMsg({ type: 'success', text: 'Snapshot database backup exported successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Backup failed' });
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
                title="Tournament Actions Restricted"
                description="Exporting backups and managing administrative actions is restricted to authorized competition managers."
                requiredRole="Competition Administrator"
                returnHref={`/competition/${competitionId}`}
            />
        );
    }

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
                <span className="font-semibold text-slate-900 dark:text-white">Actions & Backups</span>
            </div>

            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Operations & Audit
                            </span>
                            <span className="font-mono text-xs text-slate-400">{actionsLog.length} Recorded Operations</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="h-6 w-6 text-red-500" />
                            <span>Actions Log & Snapshot Backups</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Download complete JSON tournament backups and inspect operational audit logs
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={`/competition/${competitionId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Dashboard</span>
                        </Link>
                        {canManage && (
                            <button
                                type="button"
                                onClick={handleBackup}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition"
                            >
                                <Download className="h-4 w-4" />
                                <span>Export JSON Backup</span>
                            </button>
                        )}
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

            {/* Audit Log Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-red-500" />
                    <span>Audit Trail Log</span>
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-3">Action</th>
                                <th className="p-3">Executed By</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {actionsLog.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-xs text-slate-400">
                                        No actions recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                actionsLog.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                        <td className="p-3 font-bold text-red-600 dark:text-red-400 font-mono text-xs">
                                            {log.action}
                                        </td>
                                        <td className="p-3">{log.userName || log.userEmail || 'System'}</td>
                                        <td className="p-3 text-xs text-slate-500">{log.description || '–'}</td>
                                        <td className="p-3 text-xs text-slate-400 font-mono">
                                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : '–'}
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
