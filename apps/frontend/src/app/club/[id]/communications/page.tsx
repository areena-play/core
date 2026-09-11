'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import {
    MessageSquare,
    Shield,
    Mail,
    Send,
    Users,
    Clock,
    CheckCircle2,
    Search,
    ChevronRight,
    Plus,
    X,
    Sparkles,
    Megaphone,
    Radio,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ClubCommunicationsHubPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [communications, setCommunications] = useState<any[]>([]);
    const [unauthorized, setUnauthorized] = useState(false);
    const [error, setError] = useState('');

    // Modal / Compose Form
    const [composeModalOpen, setComposeModalOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [form, setForm] = useState({
        subject: '',
        body: '',
        targetGroup: 'ALL_MEMBERS',
        channel: 'EMAIL',
    });
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError('');
        setUnauthorized(false);
        try {
            const res = await api.getClubCommunications(clubIdentifier);
            setClub(res.club);
            setCommunications(res.communications || []);

            if (res.club) {
                setEntityMeta({
                    id: res.club.id,
                    title: res.club.name,
                    code: res.club.code,
                    badge: 'Club',
                    subtitle: `${res.club.city || 'Switzerland'} • Communication Hub`,
                });
            }
        } catch (err: any) {
            if (err?.status === 403 || err?.message?.toLowerCase().includes('denied') || err?.message?.toLowerCase().includes('forbidden')) {
                setUnauthorized(true);
            } else {
                setError(err.message || 'Failed to load club communications hub.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clubIdentifier || authLoading) return;
        loadData();
    }, [clubIdentifier, authLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.body.trim()) {
            setMsg({ type: 'error', text: 'Please complete all required fields.' });
            return;
        }

        setSending(true);
        setMsg(null);
        try {
            await api.sendClubCommunication(clubIdentifier, {
                subject: form.subject,
                body: form.body,
                targetGroup: form.targetGroup,
                channel: form.channel,
            });
            setMsg({ type: 'success', text: 'Broadcast notice published and queued for distribution!' });
            setTimeout(() => {
                setComposeModalOpen(false);
                setForm({
                    subject: '',
                    body: '',
                    targetGroup: 'ALL_MEMBERS',
                    channel: 'EMAIL',
                });
                setMsg(null);
                loadData();
            }, 1200);
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message || 'Failed to send communication.' });
        } finally {
            setSending(false);
        }
    };

    if (unauthorized) {
        return (
            <AccessDenied
                title="Club Officials Access Required"
                description="This communication hub is restricted to authorized Club Officials (Presidents, Secretaries, Coaches) and Platform Administrators."
                requiredRole="Club Official / Administrator"
                returnHref={`/club/${clubIdentifier}`}
            />
        );
    }

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
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Communication Hub Unavailable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {error || `No club found for identifier "${clubIdentifier}".`}
                    </p>
                </div>
                <Link
                    href={`/club/${clubIdentifier}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                    <span>Return to Club</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Link href={`/club/${clubIdentifier}`} className="hover:text-red-600 transition">
                            {club.name}
                        </Link>
                        <span>/</span>
                        <span className="text-slate-900 dark:text-white">Communication Hub</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-red-600" />
                        <span>Club Communications & Broadcasts</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Send targeted email bulletins, newsletters, and announcements to members of {club.name}.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setMsg(null);
                            setComposeModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Compose New Broadcast</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Dispatched</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{communications.length}</div>
                    </div>
                    <Radio className="w-8 h-8 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Channel</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">Email & Notifications</div>
                    </div>
                    <Mail className="w-8 h-8 text-blue-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Default Scope</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white">All Club Members</div>
                    </div>
                    <Users className="w-8 h-8 text-amber-500" />
                </div>
            </div>

            {/* Communication Feed / History */}
            <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-600" />
                    <span>Dispatched Broadcast History</span>
                </h2>

                {communications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30">
                        <Megaphone className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <h3 className="font-bold text-slate-900 dark:text-white">No Communications Sent Yet</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Click &quot;Compose New Broadcast&quot; above to issue your first club announcement.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {communications.map((comm) => (
                            <div
                                key={comm.id}
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-md bg-red-100 dark:bg-red-950/70 border border-red-200 dark:border-red-900/50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">
                                                {comm.targetGroup || 'ALL_MEMBERS'}
                                            </span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {comm.createdAt ? format(new Date(comm.createdAt), 'PPP • HH:mm') : 'Recently'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            {comm.subject}
                                        </h3>
                                    </div>

                                    <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-bold uppercase shrink-0">
                                        {comm.status || 'SENT'}
                                    </span>
                                </div>

                                <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    {comm.body}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Compose Broadcast Modal */}
            {composeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-red-600" />
                                <span>Compose Broadcast Notice</span>
                            </h3>
                            <button
                                onClick={() => setComposeModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {msg && (
                            <div
                                className={`rounded-xl p-3 text-xs font-bold ${
                                    msg.type === 'success'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                }`}
                            >
                                {msg.text}
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Subject / Announcement Title *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    placeholder="e.g. Club General Assembly 2026 / Season Schedule"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 dark:text-slate-300">Audience Scope *</label>
                                    <select
                                        value={form.targetGroup}
                                        onChange={(e) => setForm({ ...form, targetGroup: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="ALL_MEMBERS">All Club Members</option>
                                        <option value="LICENSED_ATHLETES">Licensed Athletes Only</option>
                                        <option value="COACHES_OFFICIALS">Coaches & Officials</option>
                                        <option value="JUNIOR_PLAYERS">Junior Players</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 dark:text-slate-300">Channel *</label>
                                    <select
                                        value={form.channel}
                                        onChange={(e) => setForm({ ...form, channel: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="EMAIL">Email & Notification</option>
                                        <option value="IN_APP">In-App Notification Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Message Body *</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={form.body}
                                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                                    placeholder="Write your broadcast communication here..."
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 font-sans"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setComposeModalOpen(false)}
                                    className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-300 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 font-bold text-white shadow-xs transition flex items-center gap-1.5"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{sending ? 'Broadcasting...' : 'Broadcast Message'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

