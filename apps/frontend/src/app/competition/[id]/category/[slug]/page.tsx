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
    CheckCircle2,
    AlertCircle,
    Shield,
    Sparkles,
    Shuffle,
    Settings,
    Sliders,
    Award,
    Crown,
    RotateCcw,
    Save,
    Globe,
    LayoutGrid,
    Table as TableIcon,
    ArrowUpRight,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useMainView } from '@/lib/mainViewContext';
import { findCategoryBySlug } from '@/lib/slug';

type CategoryTab = 'overview' | 'settings' | 'draw' | 'tableau' | 'ranking';

export default function DedicatedCategoryPage() {
    const params = useParams();
    const competitionId = params?.id as string;
    const slug = params?.slug as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;

    const [activeTab, setActiveTab] = useState<CategoryTab>('overview');
    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals & Action States
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);
    const [showResetDrawModal, setShowResetDrawModal] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', clubId: '', playerUserIds: [] as string[] });
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Draw Generator States
    const [drawGroupCount, setDrawGroupCount] = useState(2);
    const [drawSeedingMethod, setDrawSeedingMethod] = useState<'SNAKE' | 'SEEDED' | 'RANDOM' | 'MANUAL'>('SNAKE');
    const [drawAdvancePerGroup, setDrawAdvancePerGroup] = useState(2);
    const [generatingDraw, setGeneratingDraw] = useState(false);
    const [customGroupAssignments, setCustomGroupAssignments] = useState<Record<string, number>>({});

    // Category Settings Form State
    const [settingsForm, setSettingsForm] = useState({
        name: '',
        shortName: '',
        nameDe: '',
        nameFr: '',
        nameIt: '',
        teamSize: 1,
        minElo: '' as string | number,
        maxElo: '' as string | number,
        minAge: '' as string | number,
        maxAge: '' as string | number,
        genderRestriction: 'ANY',
        requiredLicenseType: '',
        roundsPerGroup: 1,
        entryFee: 0,
    });
    const [savingSettings, setSavingSettings] = useState(false);

    // Tableau View Filter
    const [tableauView, setTableauView] = useState<'bracket' | 'groups'>('bracket');

    const { setEntityMeta } = useMainView();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [comp, r, c] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
                api.getClubs().catch(() => ({ clubs: [] })),
            ]);
            setCompetition(comp);
            setRoles(r || []);
            setClubs(Array.isArray(c) ? c : c?.clubs || []);
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

    // Initialize settings form whenever category is loaded
    useEffect(() => {
        if (activeCategory) {
            const i18n = (activeCategory.nameI18n as Record<string, string>) || {};
            setSettingsForm({
                name: activeCategory.name || '',
                shortName: (activeCategory as any).shortName || '',
                nameDe: i18n.de || activeCategory.name || '',
                nameFr: i18n.fr || '',
                nameIt: i18n.it || '',
                teamSize: activeCategory.teamSize || 1,
                minElo: activeCategory.minElo ?? '',
                maxElo: activeCategory.maxElo ?? '',
                minAge: activeCategory.minAge ?? '',
                maxAge: activeCategory.maxAge ?? '',
                genderRestriction: activeCategory.genderRestriction || 'ANY',
                requiredLicenseType: activeCategory.requiredLicenseType || '',
                roundsPerGroup: activeCategory.roundsPerGroup || 1,
                entryFee: (activeCategory as any).entryFee || 0,
            });

            // Initialize custom group assignments for draw
            const initialAssignments: Record<string, number> = {};
            const catTeams = (activeCategory.teams || []).map((t: any) => t.team || t);
            catTeams.forEach((t: any, idx: number) => {
                initialAssignments[t.id] = idx % drawGroupCount;
            });
            setCustomGroupAssignments(initialAssignments);
        }
    }, [activeCategory, drawGroupCount]);

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

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCategory) return;
        setSavingSettings(true);
        try {
            const payload = {
                name: settingsForm.name,
                nameI18n: {
                    de: settingsForm.nameDe || settingsForm.name,
                    fr: settingsForm.nameFr,
                    it: settingsForm.nameIt,
                    en: settingsForm.name,
                },
                teamSize: Number(settingsForm.teamSize),
                minElo: settingsForm.minElo === '' ? null : Number(settingsForm.minElo),
                maxElo: settingsForm.maxElo === '' ? null : Number(settingsForm.maxElo),
                minAge: settingsForm.minAge === '' ? null : Number(settingsForm.minAge),
                maxAge: settingsForm.maxAge === '' ? null : Number(settingsForm.maxAge),
                genderRestriction: settingsForm.genderRestriction,
                requiredLicenseType: settingsForm.requiredLicenseType || null,
                roundsPerGroup: Number(settingsForm.roundsPerGroup),
            };

            await api.updateCategory(activeCategory.id, payload);
            setActionMsg({ type: 'success', text: 'Category settings successfully updated!' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3500);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to update category settings' });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleGenerateDraw = async () => {
        if (!activeCategory) return;
        setGeneratingDraw(true);
        try {
            const teamsList = (activeCategory.teams || []).map((t: any) => t.team || t);

            if (drawSeedingMethod === 'MANUAL') {
                const customGroups: Array<{ name: string; teamIds: string[] }> = [];
                for (let g = 0; g < drawGroupCount; g++) {
                    const groupLetter = String.fromCharCode(65 + g);
                    const groupTeamIds = teamsList
                        .filter((t: any) => customGroupAssignments[t.id] === g)
                        .map((t: any) => t.id);
                    customGroups.push({
                        name: `Group ${groupLetter}`,
                        teamIds: groupTeamIds,
                    });
                }
                await api.generateCategoryGroups(activeCategory.id, { customGroups });
            } else if (drawSeedingMethod === 'SNAKE') {
                const sorted = [...teamsList];
                const customGroups: Array<{ name: string; teamIds: string[] }> = Array.from(
                    { length: drawGroupCount },
                    (_, i) => ({ name: `Group ${String.fromCharCode(65 + i)}`, teamIds: [] })
                );

                sorted.forEach((team, idx) => {
                    const cycle = Math.floor(idx / drawGroupCount);
                    const pos = idx % drawGroupCount;
                    const groupIdx = cycle % 2 === 0 ? pos : drawGroupCount - 1 - pos;
                    customGroups[groupIdx].teamIds.push(team.id);
                });

                await api.generateCategoryGroups(activeCategory.id, { customGroups });
            } else {
                await api.generateCategoryGroups(activeCategory.id, { groupCount: drawGroupCount });
            }

            setActionMsg({ type: 'success', text: 'Category draw and match fixtures generated successfully!' });
            fetchData();
            setActiveTab('tableau');
            setTimeout(() => setActionMsg(null), 3500);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to generate category draw' });
        } finally {
            setGeneratingDraw(false);
        }
    };

    const handleResetDraw = async () => {
        if (!activeCategory) return;
        try {
            await api.resetCategoryDraw(activeCategory.id);
            setShowResetDrawModal(false);
            setActionMsg({ type: 'success', text: 'Category draw and matches cleared.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to reset draw' });
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

    const teams = (activeCategory.teams || []).map((t: any) => t.team || t);
    const groups = activeCategory.groups || [];
    const encounters = activeCategory.encounters || [];

    const finishedEncounters = encounters.filter((e: any) => e.status === 'FINISHED').length;
    const liveEncounters = encounters.filter((e: any) => e.status === 'LIVE').length;
    const progressPercent = encounters.length > 0 ? Math.round((finishedEncounters / encounters.length) * 100) : 0;

    // Derived category status
    const categoryStatus =
        encounters.length > 0 && finishedEncounters === encounters.length
            ? 'COMPLETED'
            : liveEncounters > 0 || finishedEncounters > 0
              ? 'IN_PROGRESS'
              : groups.length > 0
                ? 'DRAW_READY'
                : 'REGISTRATION_OPEN';

    // Compute Rankings from Standings or Encounters
    const allStandings = groups.flatMap((g: any) => g.standings || []);
    const sortedRankings = [...allStandings].sort((a: any, b: any) => {
        if ((b.tablePoints || 0) !== (a.tablePoints || 0)) return (b.tablePoints || 0) - (a.tablePoints || 0);
        if ((b.matchesWon || 0) !== (a.matchesWon || 0)) return (b.matchesWon || 0) - (a.matchesWon || 0);
        return (b.setsWon || 0) - (a.setsWon || 0);
    });

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
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
                            <span
                                className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase ${
                                    categoryStatus === 'COMPLETED'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : categoryStatus === 'IN_PROGRESS'
                                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse'
                                          : categoryStatus === 'DRAW_READY'
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {categoryStatus === 'COMPLETED'
                                    ? 'Completed'
                                    : categoryStatus === 'IN_PROGRESS'
                                      ? 'Live In Progress'
                                      : categoryStatus === 'DRAW_READY'
                                        ? 'Draw Ready'
                                        : 'Registration Open'}
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Layers className="h-7 w-7 text-red-500 shrink-0" />
                            <span>{activeCategory.name}</span>
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Tournament category division overview, configuration, draw brackets, live tableau, and podium rankings
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

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                        activeTab === 'overview'
                            ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    <span>Overview</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                        activeTab === 'settings'
                            ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('draw')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                        activeTab === 'draw'
                            ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                >
                    <Shuffle className="h-4 w-4" />
                    <span>Draw</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('tableau')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                        activeTab === 'tableau'
                            ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Tableau</span>
                    {liveEncounters > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-500 text-white animate-pulse">
                            {liveEncounters} Live
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('ranking')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                        activeTab === 'ranking'
                            ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                >
                    <Crown className="h-4 w-4" />
                    <span>Ranking</span>
                </button>
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
                    {actionMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 1: OVERVIEW TAB */}
            {/* ============================================================ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Progress Bar & Stage Bar */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    <span>Division Progress &amp; Status</span>
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {finishedEncounters} of {encounters.length} match encounters completed ({progressPercent}%)
                                </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                {progressPercent}% Complete
                            </span>
                        </div>

                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* KPI Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Teams</span>
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                                    <Users className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{teams.length}</div>
                            <p className="text-[11px] text-slate-500">Participant entries in division</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Round-Robin Pools</span>
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Trophy className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{groups.length}</div>
                            <p className="text-[11px] text-slate-500">{groups.length > 0 ? `${groups.length} active groups` : 'Draw pending'}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category Fixtures</span>
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                    <Flame className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{encounters.length}</div>
                            <p className="text-[11px] text-slate-500">{finishedEncounters} completed / {encounters.length - finishedEncounters} remaining</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Live Matches</span>
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                                    <Flame className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{liveEncounters}</div>
                            <p className="text-[11px] text-slate-500">Currently in progress</p>
                        </div>
                    </div>

                    {/* Quick Admin Action Toolbar */}
                    {canManage && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Quick Management Actions
                            </h3>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('draw')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition"
                                >
                                    <Shuffle className="h-3.5 w-3.5" />
                                    <span>Configure &amp; Generate Draw</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('tableau')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 text-xs font-bold transition"
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    <span>View Tableau &amp; Scores</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('settings')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 text-xs font-bold transition"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    <span>Edit Category Settings</span>
                                </button>
                                {groups.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowResetDrawModal(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Reset Draw</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Registered Teams Overview Table */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-500" />
                                    <span>Registered Participant Squads ({teams.length})</span>
                                </h3>
                                <p className="text-[11px] text-slate-500">Enrolled players and teams in this division</p>
                            </div>
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() => setShowAddTeamModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 px-3 py-1.5 text-xs font-bold transition"
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
                                    Register players or club squads to start creating the draw.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {teams.map((t: any, idx: number) => (
                                    <div
                                        key={t.id || idx}
                                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
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
            )}

            {/* ============================================================ */}
            {/* SECTION 2: SETTINGS TAB */}
            {/* ============================================================ */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        {/* General Division Settings */}
                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <Sliders className="h-5 w-5 text-red-500" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        General Division Settings
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Title, team format, and internationalization (i18n ready)
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Category Name (Primary)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={settingsForm.name}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                                        disabled={!canManage}
                                        placeholder="e.g. Herren Einzel A / Men Single Open"
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Short Name / Abbreviation
                                    </label>
                                    <input
                                        type="text"
                                        value={settingsForm.shortName}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, shortName: e.target.value })}
                                        disabled={!canManage}
                                        placeholder="e.g. HE-A"
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            {/* Multilingual / i18n Row */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <Globe className="h-4 w-4 text-indigo-500" />
                                    <span>Multilingual Translations (i18n)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                            German (DE)
                                        </label>
                                        <input
                                            type="text"
                                            value={settingsForm.nameDe}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, nameDe: e.target.value })}
                                            disabled={!canManage}
                                            placeholder="Herren Einzel A"
                                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                            French (FR)
                                        </label>
                                        <input
                                            type="text"
                                            value={settingsForm.nameFr}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, nameFr: e.target.value })}
                                            disabled={!canManage}
                                            placeholder="Messieurs Simple A"
                                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                            Italian (IT)
                                        </label>
                                        <input
                                            type="text"
                                            value={settingsForm.nameIt}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, nameIt: e.target.value })}
                                            disabled={!canManage}
                                            placeholder="Singolare Maschile A"
                                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Team Format / Size
                                    </label>
                                    <select
                                        value={settingsForm.teamSize}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, teamSize: Number(e.target.value) })}
                                        disabled={!canManage}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    >
                                        <option value={1}>Singles (1 Player)</option>
                                        <option value={2}>Doubles (2 Players)</option>
                                        <option value={3}>Trio (3 Players)</option>
                                        <option value={4}>4-Player Squad</option>
                                        <option value={6}>6-Player Squad</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Gender Restriction
                                    </label>
                                    <select
                                        value={settingsForm.genderRestriction}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, genderRestriction: e.target.value })}
                                        disabled={!canManage}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    >
                                        <option value="ANY">Open / Any</option>
                                        <option value="MALE_ONLY">Men Only</option>
                                        <option value="FEMALE_ONLY">Women Only</option>
                                        <option value="MIXED">Mixed (Male &amp; Female)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Rounds per Pool
                                    </label>
                                    <select
                                        value={settingsForm.roundsPerGroup}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, roundsPerGroup: Number(e.target.value) })}
                                        disabled={!canManage}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    >
                                        <option value={1}>Single Round-Robin (1 Round)</option>
                                        <option value={2}>Double Round-Robin (Home &amp; Away)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Registration & Eligibility Rules */}
                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <Shield className="h-5 w-5 text-amber-500" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Registration &amp; Qualification Criteria
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        ELO bounds, age limits, licensing requirements, and fees
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Min ELO Rating
                                    </label>
                                    <input
                                        type="number"
                                        value={settingsForm.minElo}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, minElo: e.target.value })}
                                        disabled={!canManage}
                                        placeholder="e.g. 1200 (optional)"
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Max ELO Rating
                                    </label>
                                    <input
                                        type="number"
                                        value={settingsForm.maxElo}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, maxElo: e.target.value })}
                                        disabled={!canManage}
                                        placeholder="e.g. 1599 (optional)"
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Min Age (Years)
                                    </label>
                                    <input
                                        type="number"
                                        value={settingsForm.minAge}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, minAge: e.target.value })}
                                        disabled={!canManage}
                                        placeholder="e.g. 40 (for O40)"
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Max Age (Years)
                                    </label>
                                    <input
                                        type="number"
                                        value={settingsForm.maxAge}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, maxAge: e.target.value })}
                                        disabled={!canManage}
                                        placeholder="e.g. 18 (for U18)"
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Required License Type
                                    </label>
                                    <select
                                        value={settingsForm.requiredLicenseType}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, requiredLicenseType: e.target.value })}
                                        disabled={!canManage}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    >
                                        <option value="">No License Required (Open Entry)</option>
                                        <option value="NATIONAL">Official National License (STT)</option>
                                        <option value="REGIONAL">Regional Association License</option>
                                        <option value="YOUTH">Junior / Youth License</option>
                                        <option value="HOBBY">Hobby / Recreational License</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Entry Fee (CHF)
                                    </label>
                                    <input
                                        type="number"
                                        value={settingsForm.entryFee}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, entryFee: Number(e.target.value) })}
                                        disabled={!canManage}
                                        placeholder="0.00"
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={savingSettings}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition"
                                >
                                    <Save className="h-4 w-4" />
                                    <span>{savingSettings ? 'Saving Settings...' : 'Save Settings'}</span>
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 3: DRAW GENERATOR TAB */}
            {/* ============================================================ */}
            {activeTab === 'draw' && (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                                    <Shuffle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Tournament Draw &amp; Pool Workspace
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Distribute {teams.length} participant squads into round-robin groups &amp; knockout brackets
                                    </p>
                                </div>
                            </div>

                            {groups.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowResetDrawModal(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition self-start sm:self-auto"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Reset Existing Draw</span>
                                </button>
                            )}
                        </div>

                        {/* Seeding & Draw Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Number of Pools / Groups
                                </label>
                                <select
                                    value={drawGroupCount}
                                    onChange={(e) => setDrawGroupCount(Number(e.target.value))}
                                    disabled={!canManage || generatingDraw}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-red-500"
                                >
                                    <option value={1}>1 Pool (Single Round-Robin)</option>
                                    <option value={2}>2 Pools (Group A, Group B)</option>
                                    <option value={4}>4 Pools (A, B, C, D)</option>
                                    <option value={8}>8 Pools (A through H)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Seeding / Draw Method
                                </label>
                                <select
                                    value={drawSeedingMethod}
                                    onChange={(e) => setDrawSeedingMethod(e.target.value as any)}
                                    disabled={!canManage || generatingDraw}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-red-500"
                                >
                                    <option value="SNAKE">ELO Snake Draw (1→A, 2→B, 3→B, 4→A...)</option>
                                    <option value="SEEDED">Top Seeds Split + Random Fill</option>
                                    <option value="RANDOM">Complete Random Draw</option>
                                    <option value="MANUAL">Manual Group Assignment</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Knockout Qualification
                                </label>
                                <select
                                    value={drawAdvancePerGroup}
                                    onChange={(e) => setDrawAdvancePerGroup(Number(e.target.value))}
                                    disabled={!canManage || generatingDraw}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-red-500"
                                >
                                    <option value={1}>Top 1 per Group advances to Final</option>
                                    <option value={2}>Top 2 per Group advance to Knockout</option>
                                    <option value={4}>Top 4 per Group advance</option>
                                </select>
                            </div>
                        </div>

                        {/* Interactive Pool Assignment Matrix */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Pool Allocation Preview ({drawGroupCount} Groups)
                                </h4>
                                <span className="text-[11px] text-slate-400">
                                    {teams.length} teams (~{Math.ceil(teams.length / drawGroupCount)} teams / pool)
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {Array.from({ length: drawGroupCount }, (_, gIdx) => {
                                    const groupLetter = String.fromCharCode(65 + gIdx);
                                    const groupTeams =
                                        drawSeedingMethod === 'MANUAL'
                                            ? teams.filter((t: any) => customGroupAssignments[t.id] === gIdx)
                                            : teams.filter((_: any, idx: number) => idx % drawGroupCount === gIdx);

                                    return (
                                        <div
                                            key={gIdx}
                                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3"
                                        >
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                    Group {groupLetter}
                                                </span>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    {groupTeams.length} Teams
                                                </span>
                                            </div>

                                            {groupTeams.length === 0 ? (
                                                <p className="text-[11px] text-slate-400 italic py-2">No teams assigned</p>
                                            ) : (
                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                    {groupTeams.map((team: any, tIdx: number) => (
                                                        <div
                                                            key={team.id || tIdx}
                                                            className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 space-y-1 shadow-xs"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                                    {team.name}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-slate-500">
                                                                    {team.club?.code || 'IND'}
                                                                </span>
                                                            </div>

                                                            {drawSeedingMethod === 'MANUAL' && canManage && (
                                                                <div className="pt-1 flex items-center justify-between text-[10px]">
                                                                    <span className="text-slate-400">Move to:</span>
                                                                    <select
                                                                        value={customGroupAssignments[team.id] ?? gIdx}
                                                                        onChange={(e) =>
                                                                            setCustomGroupAssignments({
                                                                                ...customGroupAssignments,
                                                                                [team.id]: Number(e.target.value),
                                                                            })
                                                                        }
                                                                        className="rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 outline-none"
                                                                    >
                                                                        {Array.from({ length: drawGroupCount }, (_, optIdx) => (
                                                                            <option key={optIdx} value={optIdx}>
                                                                                Group {String.fromCharCode(65 + optIdx)}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-xs text-slate-500">
                                    {teams.length < 2 ? (
                                        <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                                            <AlertCircle className="h-4 w-4" /> Requires at least 2 teams to generate draw.
                                        </span>
                                    ) : (
                                        <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4" /> Ready to generate draw and match fixtures.
                                        </span>
                                    )}
                                </span>

                                <button
                                    type="button"
                                    disabled={generatingDraw || teams.length < 2}
                                    onClick={handleGenerateDraw}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition"
                                >
                                    <Shuffle className="h-4 w-4" />
                                    <span>{generatingDraw ? 'Generating Draw...' : 'Generate &amp; Publish Draw'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 4: TABLEAU & MATCH RESULTS TAB */}
            {/* ============================================================ */}
            {activeTab === 'tableau' && (
                <div className="space-y-6">
                    {/* View Selector (Tableau Tree Bracket vs Groups Standings) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setTableauView('bracket')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                                    tableauView === 'bracket'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span>Tableau / Knockout Tree</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTableauView('groups')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                                    tableauView === 'groups'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                <TableIcon className="h-3.5 w-3.5" />
                                <span>Pools &amp; Standings Tables</span>
                            </button>
                        </div>

                        <span className="text-xs text-slate-500">
                            {encounters.length} Total Encounters ({finishedEncounters} Finished, {liveEncounters} Live)
                        </span>
                    </div>

                    {/* Tableau Knockout Tree View */}
                    {tableauView === 'bracket' && (
                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                    <span>Division Match Encounters &amp; Tableau</span>
                                </h3>
                                <span className="text-[11px] text-slate-400">Click match to view or enter scores</span>
                            </div>

                            {encounters.length === 0 ? (
                                <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                                    <LayoutGrid className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                                        No matches or tableau generated yet
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        Go to the &ldquo;Draw&rdquo; tab to create tournament groups and match fixtures.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    {encounters.map((enc: any) => (
                                        <Link
                                            key={enc.id}
                                            href={`/competition/${competitionId}/encounter/${enc.id}`}
                                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-red-500/50 hover:shadow-md transition space-y-3 block group"
                                        >
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-mono text-slate-500 font-semibold">
                                                    Round {enc.round || 1} {enc.group?.name ? `• ${enc.group.name}` : ''}
                                                </span>
                                                <span
                                                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
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

                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs font-bold">
                                                    <span
                                                        className={`truncate max-w-[150px] ${
                                                            enc.homeScore > enc.awayScore
                                                                ? 'text-red-600 dark:text-red-400 font-black'
                                                                : 'text-slate-900 dark:text-white'
                                                        }`}
                                                    >
                                                        {enc.homeTeam?.name || 'TBD'}
                                                    </span>
                                                    <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                        {enc.homeScore ?? 0}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-xs font-bold">
                                                    <span
                                                        className={`truncate max-w-[150px] ${
                                                            enc.awayScore > enc.homeScore
                                                                ? 'text-red-600 dark:text-red-400 font-black'
                                                                : 'text-slate-900 dark:text-white'
                                                        }`}
                                                    >
                                                        {enc.awayTeam?.name || 'TBD'}
                                                    </span>
                                                    <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                        {enc.awayScore ?? 0}
                                                    </span>
                                                </div>
                                            </div>

                                            {enc.matches && enc.matches.length > 0 && (
                                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500">
                                                    <span>{enc.matches.length} Individual Match Games</span>
                                                    <span className="text-red-600 dark:text-red-400 font-bold group-hover:underline flex items-center gap-0.5">
                                                        Score Sheet <ArrowUpRight className="h-3 w-3" />
                                                    </span>
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Group Stage Standings Tables */}
                    {tableauView === 'groups' && (
                        <div className="space-y-6">
                            {groups.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-12 text-center text-xs text-slate-400 space-y-3">
                                    <TableIcon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                                        No groups or standings available
                                    </p>
                                </div>
                            ) : (
                                groups.map((g: any, gIdx: number) => {
                                    const gStandings = g.standings || [];

                                    return (
                                        <div
                                            key={g.id || gIdx}
                                            className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4"
                                        >
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <Trophy className="h-4 w-4 text-amber-500" />
                                                    <span>{g.name} Standings</span>
                                                </h3>
                                                <span className="text-xs font-mono font-bold text-slate-500">
                                                    {gStandings.length} Teams
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] uppercase">
                                                            <th className="py-2.5 px-3">#</th>
                                                            <th className="py-2.5 px-3">Team / Athlete</th>
                                                            <th className="py-2.5 px-3 text-center">Played</th>
                                                            <th className="py-2.5 px-3 text-center">Won</th>
                                                            <th className="py-2.5 px-3 text-center">Lost</th>
                                                            <th className="py-2.5 px-3 text-center">Sets</th>
                                                            <th className="py-2.5 px-3 text-right">Points</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                        {gStandings.map((st: any, sIdx: number) => (
                                                            <tr
                                                                key={st.id || sIdx}
                                                                className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                                                                    sIdx === 0
                                                                        ? 'bg-amber-500/5 font-semibold'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                                                                    {sIdx + 1}
                                                                </td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                                                    {st.team?.name || 'Team'}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-mono">
                                                                    {st.played || 0}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                                                    {st.won || 0}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                                                    {st.lost || 0}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                                                    {st.setsWon || 0}:{st.setsLost || 0}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right font-mono font-black text-red-600 dark:text-red-400">
                                                                    {st.tablePoints || 0}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 5: RANKING & PODIUM TAB */}
            {/* ============================================================ */}
            {activeTab === 'ranking' && (
                <div className="space-y-6">
                    {/* Visual 3D Podium */}
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-slate-50 to-amber-500/5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-amber-950/20 p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="text-center space-y-1.5 max-w-lg mx-auto">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                <Crown className="h-4 w-4" />
                                <span>Official Category Classification</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                Division Champions &amp; Podium
                            </h3>
                            <p className="text-xs text-slate-500">
                                Final placement and standings for {activeCategory.name}
                            </p>
                        </div>

                        {/* Podium Columns */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto pt-6 items-end">
                            {/* 2nd Place (Silver) */}
                            <div className="text-center space-y-2 order-1">
                                <div className="p-3 sm:p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm space-y-1">
                                    <div className="h-8 w-8 mx-auto rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-sm">
                                        🥈
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                        {sortedRankings[1]?.team?.name || '2nd Place'}
                                    </div>
                                    <span className="text-[10px] text-slate-500 block">Runner-Up</span>
                                </div>
                                <div className="h-24 sm:h-28 rounded-t-2xl bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-2xl text-slate-600 dark:text-slate-400">
                                    2
                                </div>
                            </div>

                            {/* 1st Place (Gold Champion) */}
                            <div className="text-center space-y-2 order-2 -mt-4">
                                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 shadow-lg space-y-1">
                                    <Crown className="h-6 w-6 text-amber-500 mx-auto animate-bounce" />
                                    <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                        {sortedRankings[0]?.team?.name || 'Champion'}
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase">
                                        Gold 1st Place
                                    </span>
                                </div>
                                <div className="h-32 sm:h-36 rounded-t-2xl bg-gradient-to-t from-amber-600 to-amber-400 dark:from-amber-700 dark:to-amber-500 flex items-center justify-center font-black text-3xl text-white shadow-md">
                                    1
                                </div>
                            </div>

                            {/* 3rd Place (Bronze) */}
                            <div className="text-center space-y-2 order-3">
                                <div className="p-3 sm:p-4 rounded-2xl bg-amber-900/10 dark:bg-amber-950/30 border border-amber-800/30 shadow-sm space-y-1">
                                    <div className="h-8 w-8 mx-auto rounded-full bg-amber-800/20 flex items-center justify-center text-amber-800 dark:text-amber-400 font-black text-sm">
                                        🥉
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                        {sortedRankings[2]?.team?.name || '3rd Place'}
                                    </div>
                                    <span className="text-[10px] text-slate-500 block">Bronze Medal</span>
                                </div>
                                <div className="h-16 sm:h-20 rounded-t-2xl bg-gradient-to-t from-amber-800/50 to-amber-700/40 dark:from-amber-950 dark:to-amber-900 flex items-center justify-center font-black text-xl text-amber-900 dark:text-amber-400">
                                    3
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Complete Classification Table */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Award className="h-4 w-4 text-red-500" />
                                    <span>Complete Final Rankings</span>
                                </h3>
                                <p className="text-[11px] text-slate-500">Official tournament division results</p>
                            </div>
                        </div>

                        {sortedRankings.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                                <Crown className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
                                <p className="font-semibold text-slate-600 dark:text-slate-400">
                                    No rankings recorded yet
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    Rankings and podium positions will appear as match results are recorded.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] uppercase">
                                            <th className="py-2.5 px-3">Rank</th>
                                            <th className="py-2.5 px-3">Participant Squad</th>
                                            <th className="py-2.5 px-3">Club</th>
                                            <th className="py-2.5 px-3 text-center">Matches Won</th>
                                            <th className="py-2.5 px-3 text-center">Sets Ratio</th>
                                            <th className="py-2.5 px-3 text-right">Table Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {sortedRankings.map((st: any, idx: number) => (
                                            <tr
                                                key={st.id || idx}
                                                className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                                                    idx === 0 ? 'bg-amber-500/5 font-bold' : ''
                                                }`}
                                            >
                                                <td className="py-3 px-3 font-mono font-bold">
                                                    {idx === 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                            <Crown className="h-3.5 w-3.5" /> 1st
                                                        </span>
                                                    ) : idx === 1 ? (
                                                        <span className="text-slate-600 dark:text-slate-300">2nd</span>
                                                    ) : idx === 2 ? (
                                                        <span className="text-amber-800 dark:text-amber-500">3rd</span>
                                                    ) : (
                                                        <span className="text-slate-500">{idx + 1}th</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                                    {st.team?.name || 'Squad'}
                                                </td>
                                                <td className="py-3 px-3 text-slate-500 font-mono">
                                                    {st.team?.club?.code || 'IND'}
                                                </td>
                                                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {st.matchesWon || 0}
                                                </td>
                                                <td className="py-3 px-3 text-center font-mono text-slate-500">
                                                    {st.setsWon || 0}:{st.setsLost || 0}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-black text-red-600 dark:text-red-400">
                                                    {st.tablePoints || 0}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

            {/* Reset Draw Confirmation Modal */}
            <Modal
                isOpen={showResetDrawModal}
                onClose={() => setShowResetDrawModal(false)}
                title="Reset Category Draw?"
                subtitle={`Clear pools and fixtures for ${activeCategory.name}`}
                icon={<RotateCcw className="h-5 w-5 text-rose-500" />}
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Are you sure you want to reset the draw for <strong>{activeCategory.name}</strong>? This will remove all generated groups, encounters, and match results so that a new draw can be created.
                    </p>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowResetDrawModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleResetDraw}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs"
                        >
                            Reset Draw
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

