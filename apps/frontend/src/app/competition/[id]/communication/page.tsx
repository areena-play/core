'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    MessageSquare,
    ChevronRight,
    ArrowLeft,
    Send,
    CheckCircle2,
    AlertCircle,
    Mail,
    Users,
    Trophy,
} from 'lucide-react';

export default function CompetitionCommunicationPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [recipientGroup, setRecipientGroup] = useState('ALL_PARTICIPANTS');
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
            const [comp, r] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setRoles(r || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load tournament data' });
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
    const canManage = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && r.role === 'ADMIN');

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            // Simulated broadcast
            await new Promise((r) => setTimeout(r, 600));
            setActionMsg({ type: 'success', text: 'Broadcast message dispatched to participants.' });
            setSubject('');
            setMessage('');
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to dispatch broadcast' });
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
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
                <span className="font-semibold text-slate-900 dark:text-white">Communication & Broadcasts</span>
            </div>

            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Broadcast Hub
                            </span>
                            <span className="font-mono text-xs text-slate-400">Email & Alerts</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="h-6 w-6 text-red-500" />
                            <span>Communication & Participant Broadcasts</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Broadcast announcements, fixture changes, and email alerts to team captains and registered athletes
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

            {/* Broadcast Form Card */}
            <form onSubmit={handleSendBroadcast} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-red-500" />
                    <span>Compose Broadcast Message</span>
                </h3>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Recipient Audience</label>
                    <select
                        value={recipientGroup}
                        onChange={(e) => setRecipientGroup(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                    >
                        <option value="ALL_PARTICIPANTS">All Registered Athletes & Captains</option>
                        <option value="TEAM_CAPTAINS">Team Captains Only</option>
                        <option value="REFEREES">Designated Match Referees</option>
                        <option value="UNPAID_ATHLETES">Athletes with Pending Payment</option>
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Schedule Update: Group Stage starting at 10:00 AM"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Message Content</label>
                    <textarea
                        rows={5}
                        required
                        placeholder="Write your announcement..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                    />
                </div>

                {canManage && (
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={sending}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            <span>{sending ? 'Dispatching...' : 'Send Broadcast'}</span>
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
