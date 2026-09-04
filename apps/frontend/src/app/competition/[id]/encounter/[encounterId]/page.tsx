'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Flame,
    ArrowLeft,
    Save,
    CheckCircle2,
    AlertCircle,
    Calendar,
    MapPin,
    Shield,
} from 'lucide-react';

export default function EncounterScoresheetPage() {
    const params = useParams();
    const router = useRouter();
    const competitionId = params.id as string;
    const encounterId = params.encounterId as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [encounter, setEncounter] = useState<any | null>(null);
    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
    const [sets, setSets] = useState<Array<{ home: number; away: number }>>([{ home: 0, away: 0 }]);
    const [isFinished, setIsFinished] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
            const [enc, comp, r] = await Promise.all([
                api.getEncounter(encounterId),
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setEncounter(enc);
            setCompetition(comp);
            setRoles(r || []);
            if (enc.matches && enc.matches.length > 0 && !selectedMatch) {
                setSelectedMatch(enc.matches[0]);
                setSets(enc.matches[0].sets?.length > 0 ? enc.matches[0].sets : [{ home: 0, away: 0 }]);
                setIsFinished(enc.matches[0].status === 'FINISHED');
            }
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load encounter' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [encounterId, competitionId]);

    const isAssocAdmin = user?.associationRoles?.some(
        (r) => r.role === 'ADMIN' && r.associationId === competition?.associationId
    );
    const canScore = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && ['ADMIN', 'ENTERING_RESULTS', 'REFEREE', 'HEAD_REFEREE'].includes(r.role));

    const handleSelectMatch = (m: any) => {
        setSelectedMatch(m);
        setSets(m.sets?.length > 0 ? m.sets : [{ home: 0, away: 0 }]);
        setIsFinished(m.status === 'FINISHED');
    };

    const handleSaveScore = async () => {
        if (!selectedMatch) return;
        setSaving(true);
        try {
            await api.updateMatchScore(selectedMatch.id, { sets, isFinished });
            setActionMsg({ type: 'success', text: 'Match score recorded successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to update score' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!encounter) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-8 text-center text-slate-700 dark:text-slate-300">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
                <h2 className="text-xl font-bold">Encounter Not Found</h2>
                <Link href={`/competition/${competitionId}/results`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm">
                    Back to Results
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                {encounter.category?.name || 'Division'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">Round {encounter.round || 1}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <span>{encounter.homeTeam?.name || 'TBD'}</span>
                            <span className="font-mono text-red-600 dark:text-red-400">{encounter.homeScore ?? 0} : {encounter.awayScore ?? 0}</span>
                            <span>{encounter.awayTeam?.name || 'TBD'}</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3">
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-rose-500" /> {encounter.location || 'Main Arena'}</span>
                            <span className="flex items-center gap-1" suppressHydrationWarning><Calendar className="h-3.5 w-3.5 text-blue-500" /> {encounter.scheduledAt ? new Date(encounter.scheduledAt).toLocaleString() : 'Scheduled'}</span>
                        </p>
                    </div>

                    <Link
                        href={`/competition/${competitionId}/results`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>All Results</span>
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

            {/* Matches & Score Entry Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Match List in this Encounter */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Individual Matches ({encounter.matches?.length || 0})</h3>

                    <div className="space-y-2">
                        {(!encounter.matches || encounter.matches.length === 0) ? (
                            <div className="p-4 text-center text-xs text-slate-400">No individual matches created for this encounter.</div>
                        ) : (
                            encounter.matches.map((m: any, idx: number) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelectMatch(m)}
                                    className={`w-full text-left p-3 rounded-xl border transition ${
                                        selectedMatch?.id === m.id
                                            ? 'border-red-500 bg-red-500/10 shadow-xs'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                        <span>Match #{idx + 1}</span>
                                        <span className="font-bold uppercase text-[10px] text-red-600 dark:text-red-400">{m.status}</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        {m.homePlayer1 ? `${m.homePlayer1.firstName} ${m.homePlayer1.lastName}` : 'TBD'} vs{' '}
                                        {m.awayPlayer1 ? `${m.awayPlayer1.firstName} ${m.awayPlayer1.lastName}` : 'TBD'}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Score Input Card */}
                {selectedMatch && (
                    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Flame className="h-4 w-4 text-red-500" />
                                <span>Table Scoresheet: {selectedMatch.homePlayer1?.lastName || 'Home'} vs {selectedMatch.awayPlayer1?.lastName || 'Away'}</span>
                            </h3>
                        </div>

                        {/* Set by set inputs */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Set Scores (Points)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {sets.map((s, idx) => (
                                    <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                                        <div className="text-[11px] font-bold text-slate-500 text-center">Set {idx + 1}</div>
                                        <div className="flex items-center justify-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                disabled={!canScore}
                                                value={s.home}
                                                onChange={(e) => {
                                                    const updated = [...sets];
                                                    updated[idx].home = Number(e.target.value);
                                                    setSets(updated);
                                                }}
                                                className="w-14 text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 font-mono font-bold text-sm text-slate-900 dark:text-white"
                                            />
                                            <span className="text-slate-400 font-bold">:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                disabled={!canScore}
                                                value={s.away}
                                                onChange={(e) => {
                                                    const updated = [...sets];
                                                    updated[idx].away = Number(e.target.value);
                                                    setSets(updated);
                                                }}
                                                className="w-14 text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 font-mono font-bold text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {canScore && (
                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setSets([...sets, { home: 0, away: 0 }])}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        + Add Set
                                    </button>
                                    {sets.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setSets(sets.slice(0, -1))}
                                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                        >
                                            Remove Last Set
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Match Finish Toggle */}
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    disabled={!canScore}
                                    checked={isFinished}
                                    onChange={(e) => setIsFinished(e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Mark Match as Completed</span>
                                    <span className="text-[11px] text-slate-500">Computes winner and updates ELO points (if competition counts for ELO).</span>
                                </div>
                            </label>
                        </div>

                        {canScore && (
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={handleSaveScore}
                                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" />
                                    <span>{saving ? 'Saving...' : 'Submit Scoresheet'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
