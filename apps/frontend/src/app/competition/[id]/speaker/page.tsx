'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useWebSocket } from '@/lib/useWebSocket';
import {
    Mic,
    ChevronLeft,
    Volume2,
    Plus,
    CheckCircle2,
    Trash2,
    Play,
    AlertCircle,
    BellRing,
} from 'lucide-react';
import { format } from 'date-fns';

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
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [calloutForm, setCalloutForm] = useState({
        title: '',
        message: '',
        type: 'MATCH_CALL',
        unitName: 'Table 1',
    });

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
            setErrorMessage(err.message || 'Failed to load speaker console');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    useWebSocket((event) => {
        if (event.channel === 'areena:speaker') {
            fetchData();
        }
    });

    const isAssocAdmin = user?.associationRoles?.some(
        (r) => r.role === 'ADMIN' && r.associationId === competition?.associationId
    );
    const canSpeak =
        isSuperAdmin ||
        isAssocAdmin ||
        roles.some((r) => r.userId === user?.id && ['ADMIN', 'SPEAKER', 'HEAD_REFEREE'].includes(r.role));

    const handleCreateCallout = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createCompetitionSpeakerCallout(competitionId, calloutForm);
            setSuccessMessage('Announcement broadcasted to callout queue.');
            setCalloutForm({ title: '', message: '', type: 'MATCH_CALL', unitName: 'Table 1' });
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to trigger callout');
        }
    };

    const handleDismissCallout = async (calloutId: string) => {
        try {
            await api.updateCompetitionSpeakerCallout(competitionId, calloutId, { status: 'DISMISSED' });
            fetchData();
        } catch (err) {
            console.error('Failed to dismiss callout:', err);
        }
    };

    const playChime = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } catch (e) {
            console.error('AudioContext error:', e);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const activeCallouts = callouts.filter((c) => c.status !== 'DISMISSED');

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
                            <Mic className="h-7 w-7 text-indigo-400" />
                            Speaker & Audio Announcer Console
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={playChime}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
                    >
                        <Volume2 className="h-4 w-4" /> Play Audio Chime
                    </button>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Announcement Trigger Form */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-orange-400" />
                        Trigger New Live Announcement
                    </h3>

                    <form onSubmit={handleCreateCallout} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                Callout Title
                            </label>
                            <input
                                type="text"
                                value={calloutForm.title}
                                onChange={(e) => setCalloutForm({ ...calloutForm, title: e.target.value })}
                                placeholder="e.g. Next Match on Table 3"
                                required
                                disabled={!canSpeak}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                    Type
                                </label>
                                <select
                                    value={calloutForm.type}
                                    onChange={(e) => setCalloutForm({ ...calloutForm, type: e.target.value })}
                                    disabled={!canSpeak}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white"
                                >
                                    <option value="MATCH_CALL">Match Call</option>
                                    <option value="PLAYER_SUMMON">Missing Player</option>
                                    <option value="GENERAL_ANNOUNCEMENT">General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                    Court / Table
                                </label>
                                <input
                                    type="text"
                                    value={calloutForm.unitName}
                                    onChange={(e) => setCalloutForm({ ...calloutForm, unitName: e.target.value })}
                                    disabled={!canSpeak}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                Spoken Message
                            </label>
                            <textarea
                                rows={3}
                                value={calloutForm.message}
                                onChange={(e) => setCalloutForm({ ...calloutForm, message: e.target.value })}
                                placeholder="Table 3: Dominic Sonderegger vs Open Challenger. Please report to the table umpire."
                                required
                                disabled={!canSpeak}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!canSpeak}
                            className="w-full rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500 disabled:opacity-50"
                        >
                            Broadcast Announcement
                        </button>
                    </form>
                </div>

                {/* Active Callout Queue */}
                <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white">Live Callout Queue</h3>
                            <p className="text-xs text-zinc-400">Announcements displayed on venue monitors and speaker desk</p>
                        </div>
                        <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-400">
                            {activeCallouts.length} in Queue
                        </span>
                    </div>

                    <div className="space-y-3 pt-2">
                        {activeCallouts.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-12 text-center">
                                No active announcements in the speaker queue.
                            </p>
                        ) : (
                            activeCallouts.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-start justify-between gap-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">{c.title}</span>
                                            {c.unitName && (
                                                <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                                                    {c.unitName}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-300 leading-relaxed">{c.message}</p>
                                        <span className="text-[10px] text-zinc-500 block pt-1">
                                            Broadcasted: {format(new Date(c.createdAt), 'HH:mm:ss')}
                                        </span>
                                    </div>

                                    {canSpeak && (
                                        <button
                                            onClick={() => handleDismissCallout(c.id)}
                                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                                        >
                                            Done
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
