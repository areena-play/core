'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Shield,
    ChevronLeft,
    Download,
    RefreshCw,
    CheckCircle2,
    Lock,
    Play,
    Archive,
    History,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CompetitionActionsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchData = async () => {
        try {
            const [comp, act] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionActions(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setActions(act || []);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to load actions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    const handleDownloadBackup = async () => {
        try {
            const res = await api.backupCompetition(competitionId);
            const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `competition-backup-${competition?.slug || competitionId}-${new Date().toISOString().substring(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setSuccessMessage('Snapshot backup downloaded successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to generate backup');
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

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
                            <Shield className="h-7 w-7 text-zinc-400" />
                            Actions, Lifecycle & Snapshot Backups
                        </h1>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Snapshot Backup Card */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Download className="h-4 w-4 text-orange-400" />
                        Full State JSON Snapshot Backup
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Export an immutable snapshot of all categories, registered teams, fixtures, matches, scores, assigned personnel, and standings.
                    </p>
                    <button
                        onClick={handleDownloadBackup}
                        className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500"
                    >
                        <Download className="h-4 w-4" /> Download Snapshot JSON
                    </button>
                </div>

                {/* Audit Trail Log */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <History className="h-4 w-4 text-blue-400" />
                        Recent Operations Audit Trail
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {actions.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-6 text-center">No audit trail entries recorded yet.</p>
                        ) : (
                            actions.map((act) => (
                                <div key={act.id} className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs">
                                    <div className="flex items-center justify-between font-semibold text-white">
                                        <span>{act.action}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                            {format(new Date(act.createdAt), 'dd.MM HH:mm')}
                                        </span>
                                    </div>
                                    <p className="text-zinc-400 text-[11px] mt-1">{act.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
