'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Layers,
    ArrowLeft,
    Plus,
    Users,
    Trophy,
    Flame,
    Check,
    CheckCircle2,
    AlertCircle,
    Calendar,
    MapPin,
    Shield,
    ChevronRight,
    Sparkles,
    Shuffle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useMainView } from '@/lib/mainViewContext';
import { findCategoryBySlug, getCategorySlug } from '@/lib/slug';

export default function DedicatedCategoryPage() {
    const params = useParams();
    const router = useRouter();
    const competitionId = params?.id as string;
    const slug = params?.slug as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showAddTeamModal, setShowAddTeamModal] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', clubId: '', playerUserIds: [] as string[] });
    const [groupCount, setGroupCount] = useState(2);
    const [generatingGroups, setGeneratingGroups] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { setEntityMeta } = useMainView();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [comp, r, c, u] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
                api.getClubs().catch(() => ({ clubs: [] })),
                api.getUsers ? api.getUsers().catch(() => []) : Promise.resolve([]),
            ]);
            setCompetition(comp);
            setRoles(r || []);
            setClubs(Array.isArray(c) ? c : c?.clubs || []);
            setUsersList(Array.isArray(u) ? u : u?.users || []);
            setEntityMeta({
                id: comp.id,
                title: comp.name,
                code: comp.seriesSlug || comp.slug || 'COMP',
                badge: comp.type,
                subtitle: `${comp.type} • ${comp.association?.name || 'Federation'}`,
                categories: comp.categories || [],
            });
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load category data' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (competitionId) {
            fetchData();
        }
    }, [competitionId]);

    const activeCategory = findCategoryBySlug(competition?.categories, slug);

    const isAssocAdmin = user?.associationRoles?.some(
        (r) => r.role === 'ADMIN' && r.associationId === competition?.associationId
    );
    const canManage = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && r.role === 'ADMIN');

    const handleRegisterTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCategory) return;
        try {
            await api.createCategoryTeam(activeCategory.id, newTeam);
            setShowAddTeamModal(false);
            setNewTeam({ name: '', clubId: '', playerUserIds: [] });
            setActionMsg({ type: 'success', text: 'Team registered successfully into division.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to register team' });
        }
    };

    const handleGenerateGroups = async () => {
        if (!activeCategory) return;
        setGeneratingGroups(true);
        try {
            await api.generateCategoryGroups(activeCategory.id, { groupCount });
            setActionMsg({ type: 'success', text: 'Round-robin groups and match fixtures generated successfully!' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3500);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to generate groups' });
        } finally {
            setGeneratingGroups(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!activeCategory) {
        return (
            <div className="space-y-6 pb-16">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-8 text-center text-slate-700 dark:text-slate-300 space-y-4">
                    <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
                    <div>
                        <h2 className="text-xl font-bold">Category Division Not Found</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            The category &ldquo;{slug}&rdquo; does not exist in this tournament or may have been deleted.
                        </p>
                    </div>
                    <Link
                        href={`/competition/${competitionId}/categories`}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Categories Overview</span>
                    </Link>
                </div>
            </div>
        );
    }

    const genderBadge =
        activeCategory.genderRestriction === 'MALE_ONLY'
            ? { label: 'Men Only', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' }
            : activeCategory.genderRestriction === 'FEMALE_ONLY'
              ? { label: 'Women Only', bg: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400 border-pink-200 dark:border-pink-800/50' }
              : activeCategory.genderRestriction === 'MIXED'
                ? { label: 'Mixed', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' }
                : { label: 'Open / Any', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };

    const teamSizeLabel =
        activeCategory.teamSize === 1
            ? 'Singles (1v1)'
            : activeCategory.teamSize === 2
              ? 'Doubles (2v2)'
              : `Team (${activeCategory.teamSize} Players)`;

    const teams = activeCategory.teams || [];
    const groups = activeCategory.groups || [];
    const encounters = activeCategory.encounters || [];

    const finishedEncounters = encounters.filter((e: any) => e.status === 'FINISHED').length;
    const liveEncounters = encounters.filter((e: any) => e.status === 'LIVE').length;

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href={`/competition/${competitionId}`} className="hover:text-red-600 transition">
                    Dashboard
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={`/competition/${competitionId}/categories`} className="hover:text-red-600 transition">
                    Categories Overview
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-slate-900 dark:text-white truncate">{activeCategory.name}</span>
            </div>

            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                {teamSizeLabel}
                            </span>
                            <span className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase border ${genderBadge.bg}`}>
                                {genderBadge.label}
                            </span>
                            {(activeCategory.minElo || activeCategory.maxElo) && (
                                <span className="rounded px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    {activeCategory.minElo && activeCategory.maxElo
                                        ? `${activeCategory.minElo} – ${activeCategory.maxElo} ELO`
                                        : activeCategory.maxElo
                                          ? `≤ ${activeCategory.maxElo} ELO`
                                          : `≥ ${activeCategory.minElo} ELO`}
                                </span>
                            )}
                            <span className="rounded px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {activeCategory.roundsPerGroup > 1 ? `${activeCategory.roundsPerGroup} Rounds / Pool` : 'Single Round-Robin'}
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Layers className="h-7 w-7 text-red-500 shrink-0" />
                            <span>{activeCategory.name}</span>
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Tournament category division roster, round-robin pools, and match schedule
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                            href={`/competition/${competitionId}/categories`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>All Categories</span>
                        </Link>
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setShowAddTeamModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Register Team</span>
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

            {/* Category KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Teams</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {teams.length}
                    </div>
                    <p className="text-[11px] text-slate-500">Participant entries in division</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Round-Robin Pools</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Trophy className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {groups.length}
                    </div>
                    <p className="text-[11px] text-slate-500">{groups.length > 0 ? `${groups.length} active groups` : 'Draw pending'}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category Fixtures</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <Flame className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {encounters.length}
                    </div>
                    <p className="text-[11px] text-slate-500">{finishedEncounters} completed / {encounters.length - finishedEncounters} remaining</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Live Matches</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                            <Flame className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {liveEncounters}
                    </div>
                    <p className="text-[11px] text-slate-500">Currently in progress</p>
                </div>
            </div>

            {/* Main Content Layout: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Registered Teams Roster (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Registered Teams ({teams.length})
                                    </h2>
                                    <p className="text-[11px] text-slate-500">Participants in this division</p>
                                </div>
                            </div>
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() => setShowAddTeamModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 px-3 py-1.5 text-xs font-bold transition"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Team</span>
                                </button>
                            )}
                        </div>

                        {teams.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                                <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
                                <p className="font-semibold text-slate-600 dark:text-slate-400">No teams registered yet</p>
                                <p className="text-[11px] text-slate-500">
                                    Click &ldquo;Register Team&rdquo; to add players or club squads to this division.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                                {teams.map((t: any, idx: number) => (
                                    <div
                                        key={t.id || idx}
                                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                {t.name}
                                            </span>
                                            <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                {t.club?.code || 'IND'}
                                            </span>
                                        </div>
                                        {t.members && t.members.length > 0 && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                                                {t.members.map((m: any, mIdx: number) => (
                                                    <span
                                                        key={m.id || mIdx}
                                                        className="inline-flex items-center rounded-md bg-white dark:bg-slate-800 px-2 py-0.5 border border-slate-200 dark:border-slate-700/60"
                                                    >
                                                        {m.user?.firstName || ''} {m.user?.lastName || ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Draw Generator, Groups & Fixtures (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Draw / Group Generator Console */}
                    {canManage && (
                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                                        <Shuffle className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Draw & Pool Generator
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            Evenly distribute registered teams into round-robin pools
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                                <div className="w-full sm:w-2/3">
                                    <select
                                        value={groupCount}
                                        onChange={(e) => setGroupCount(Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-red-500"
                                    >
                                        <option value={1}>1 Pool (Single Round-Robin Group)</option>
                                        <option value={2}>2 Pools (Group A & Group B)</option>
                                        <option value={4}>4 Pools (Group A, B, C, D)</option>
                                        <option value={8}>8 Pools (A through H)</option>
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    disabled={generatingGroups || teams.length < 2}
                                    onClick={handleGenerateGroups}
                                    className="w-full sm:w-1/3 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition"
                                >
                                    {generatingGroups ? 'Generating Draw...' : 'Generate Draw'}
                                </button>
                            </div>
                            {teams.length < 2 && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                    Requires at least 2 registered teams to generate round-robin groups.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Fixtures & Encounters */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                    <Trophy className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Match Encounters & Fixtures ({encounters.length})
                                    </h3>
                                    <p className="text-[11px] text-slate-500">Round-robin match fixtures and scoring sheets</p>
                                </div>
                            </div>
                        </div>

                        {encounters.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                                <Trophy className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
                                <p className="font-semibold text-slate-600 dark:text-slate-400">No encounters generated yet</p>
                                <p className="text-[11px] text-slate-500">
                                    Register teams and trigger the Draw Generator above to create match fixtures.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                                {encounters.map((enc: any) => (
                                    <Link
                                        key={enc.id}
                                        href={`/competition/${competitionId}/encounter/${enc.id}`}
                                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-red-500/50 hover:shadow-xs transition space-y-2.5 block group"
                                    >
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-mono text-slate-500">
                                                Round {enc.round || 1} • {enc.location || 'Main Hall'}
                                            </span>
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                                    enc.status === 'LIVE'
                                                        ? 'bg-red-500 text-white animate-pulse'
                                                        : enc.status === 'FINISHED'
                                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                {enc.status}
                                            </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                            <span className="truncate max-w-[100px]">{enc.homeTeam?.name || 'TBD'}</span>
                                            <span className="font-mono text-sm px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700">
                                                {enc.homeScore ?? 0} : {enc.awayScore ?? 0}
                                            </span>
                                            <span className="truncate max-w-[100px] text-right">{enc.awayTeam?.name || 'TBD'}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Register Team Modal */}
            <Modal
                isOpen={showAddTeamModal}
                onClose={() => setShowAddTeamModal(false)}
                title="Register Team in Category"
                subtitle={`Assign team to ${activeCategory.name}`}
                icon={<Users className="h-5 w-5 text-red-500" />}
                size="md"
            >
                <form onSubmit={handleRegisterTeam} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Team / Participant Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Zurich Alpha or Player Full Name"
                            value={newTeam.name}
                            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Club Affiliation
                        </label>
                        <select
                            value={newTeam.clubId}
                            onChange={(e) => setNewTeam({ ...newTeam, clubId: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        >
                            <option value="">-- Independent / No Club --</option>
                            {clubs.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowAddTeamModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs"
                        >
                            Register Team
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

