'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Mic,
    ArrowLeft,
    Plus,
    Volume2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Bell,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AccessDenied } from '@/components/auth/AccessDenied';

export default function CompetitionSpeakerPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [callouts, setCallouts] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newCallout, setNewCallout] = useState({ title: '', message: '', type: 'MATCH_CALL', unitName: '' });
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
            const [comp, c, r] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionSpeakerCallouts(competitionId).catch(() => []),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setCallouts(c || []);
            setRoles(r || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load speaker console' });
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
    const canManage = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && ['ADMIN', 'CALLOUTS'].includes(r.role));

    const playChime = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.setValueAtTime(880.0, now + 0.2); // A5

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(440.0, now);
            osc2.frequency.setValueAtTime(659.25, now + 0.2);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.8);
            osc2.stop(now + 0.8);
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    };

    const handleCreateCallout = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createCompetitionSpeakerCallout(competitionId, newCallout);
            playChime();
            setShowModal(false);
            setNewCallout({ title: '', message: '', type: 'MATCH_CALL', unitName: '' });
            setActionMsg({ type: 'success', text: 'Callout broadcasted over speaker console.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to create callout' });
        }
    };

    const handleDismissCallout = async (calloutId: string) => {
        try {
            await api.updateCompetitionSpeakerCallout(competitionId, calloutId, { status: 'DISMISSED' });
            setActionMsg({ type: 'success', text: 'Callout dismissed.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 2500);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to dismiss callout' });
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
                title="Speaker Console Restricted"
                description="The live match callout and tournament loudspeaker console is restricted to tournament directors, announcers, and administrators."
                requiredRole="Tournament Announcer / Administrator"
                returnHref={`/competition/${competitionId}`}
            />
        );
    }

    const activeCallouts = callouts.filter((c) => c.status === 'ACTIVE');
    const dismissedCallouts = callouts.filter((c) => c.status === 'DISMISSED');

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Audio Broadcasts
                            </span>
                            <span className="font-mono text-xs text-slate-400">{activeCallouts.length} Active Callouts</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Mic className="h-6 w-6 text-red-500" />
                            <span>Speaker Console & Match Callouts</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Venue speaker announcer desk, audio chime synthesizer, missing player summons, and queue
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={playChime}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <Volume2 className="h-3.5 w-3.5 text-purple-500" />
                            <span>Test Chime</span>
                        </button>
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
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>New Callout</span>
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

            {/* Active Callouts Queue */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                        <span>Active Callouts Queue ({activeCallouts.length})</span>
                    </h3>
                </div>

                <div className="space-y-3">
                    {activeCallouts.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            No active speaker announcements in queue.
                        </div>
                    ) : (
                        activeCallouts.map((c) => (
                            <div
                                key={c.id}
                                className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-500/5 dark:bg-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-red-600 text-white">
                                            {c.type}
                                        </span>
                                        {c.unitName && (
                                            <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                                                [{c.unitName}]
                                            </span>
                                        )}
                                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{c.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">{c.message}</p>
                                </div>

                                {canManage && (
                                    <button
                                        type="button"
                                        onClick={() => handleDismissCallout(c.id)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 transition"
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Callout Creation Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Broadcast Announcement"
                subtitle="Live arena speaker callout and chime notification"
                icon={<Volume2 className="h-5 w-5 text-red-500" />}
                size="md"
            >
                <form onSubmit={handleCreateCallout} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Callout Type</label>
                        <select
                            value={newCallout.type}
                            onChange={(e) => setNewCallout({ ...newCallout, type: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        >
                            <option value="MATCH_CALL">MATCH CALL (Athletes to table)</option>
                            <option value="MISSING_PLAYER">MISSING PLAYER SUMMONS</option>
                            <option value="GENERAL_ANNOUNCEMENT">GENERAL ANNOUNCEMENT</option>
                            <option value="CEREMONY">AWARD CEREMONY</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Unit / Table (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Table 4, Court 2"
                            value={newCallout.unitName}
                            onChange={(e) => setNewCallout({ ...newCallout, unitName: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Announcement Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Round of 16 Match 4"
                            value={newCallout.title}
                            onChange={(e) => setNewCallout({ ...newCallout, title: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Detailed Message</label>
                        <textarea
                            rows={3}
                            required
                            placeholder="e.g. Müller vs Schneider please report immediately to Table 4"
                            value={newCallout.message}
                            onChange={(e) => setNewCallout({ ...newCallout, message: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs"
                        >
                            Broadcast & Play Chime
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
