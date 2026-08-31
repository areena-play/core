'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Megaphone,
    ChevronLeft,
    Send,
    Mail,
    Users,
    CheckCircle2,
} from 'lucide-react';

export default function CompetitionCommunicationPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState('ALL');
    const [sending, setSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        api.getCompetition(competitionId)
            .then(setCompetition)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [competitionId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.sendBroadcast({
                competitionId,
                subject,
                body: message,
                channel: 'EMAIL',
                targetFilter: { group: target },
            });
            setSuccessMessage('Broadcast message dispatched successfully.');
            setSubject('');
            setMessage('');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to dispatch broadcast');
        } finally {
            setSending(false);
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
                            <Megaphone className="h-7 w-7 text-amber-400" />
                            Participant Communication & Broadcasts
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

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 max-w-2xl">
                <h3 className="text-base font-bold text-white mb-1">Compose Tournament Broadcast</h3>
                <p className="text-xs text-zinc-400 mb-6">
                    Send official email announcements or schedule updates to captains and athletes.
                </p>

                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                            Target Recipients
                        </label>
                        <select
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white"
                        >
                            <option value="ALL">All Registered Players & Captains</option>
                            <option value="CAPTAINS">Team Captains Only</option>
                            <option value="REFEREES">Referees & Umpires</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Schedule Update / Hall Opening Times"
                            required
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                            Message Body
                        </label>
                        <textarea
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write message..."
                            required
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500 disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" /> {sending ? 'Dispatching...' : 'Send Broadcast'}
                    </button>
                </form>
            </div>
        </div>
    );
}
