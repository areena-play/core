'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Layers,
    ChevronRight,
    ArrowLeft,
    Plus,
    Users,
    Trophy,
    Play,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Flame,
    ArrowUpRight,
    MapPin,
    Shield,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function CompetitionCategoriesPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeCategoryId, setActiveCategoryId] = useState<string>('');
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);
    const [newCat, setNewCat] = useState({ name: '', teamSize: 1, minElo: '', maxElo: '', genderRestriction: 'ANY', roundsPerGroup: 1 });
    const [newTeam, setNewTeam] = useState({ name: '', clubId: '', playerUserIds: [] as string[] });
    const [groupCount, setGroupCount] = useState(2);
    const [generatingGroups, setGeneratingGroups] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
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
            if (comp.categories && comp.categories.length > 0 && !activeCategoryId) {
                setActiveCategoryId(comp.categories[0].id);
            }
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load categories' });
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

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createCompetitionCategory(competitionId, {
                name: newCat.name,
                teamSize: Number(newCat.teamSize),
                minElo: newCat.minElo ? Number(newCat.minElo) : undefined,
                maxElo: newCat.maxElo ? Number(newCat.maxElo) : undefined,
                genderRestriction: newCat.genderRestriction,
                roundsPerGroup: Number(newCat.roundsPerGroup),
            });
            setShowAddCatModal(false);
            setNewCat({ name: '', teamSize: 1, minElo: '', maxElo: '', genderRestriction: 'ANY', roundsPerGroup: 1 });
            setActionMsg({ type: 'success', text: 'Category created successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to create category' });
        }
    };

    const handleRegisterTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCategoryId) return;
        try {
            await api.createCategoryTeam(activeCategoryId, newTeam);
            setShowAddTeamModal(false);
            setNewTeam({ name: '', clubId: '', playerUserIds: [] });
            setActionMsg({ type: 'success', text: 'Team registered successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to register team' });
        }
    };

    const handleGenerateGroups = async () => {
        if (!activeCategoryId) return;
        setGeneratingGroups(true);
        try {
            await api.generateCategoryGroups(activeCategoryId, { groupCount });
            setActionMsg({ type: 'success', text: 'Round-robin groups and encounters generated successfully!' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
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

    const activeCategory = competition?.categories?.find((c: any) => c.id === activeCategoryId) || competition?.categories?.[0];

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
                <span className="font-semibold text-slate-900 dark:text-white">Categories & Draws</span>
            </div>

            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Divisions & Draws
                            </span>
                            <span className="font-mono text-xs text-slate-400">{competition?.categories?.length || 0} Categories</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers className="h-6 w-6 text-red-500" />
                            <span>Categories, Teams & Draws</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Create tournament divisions, register participant squads, and generate round-robin groups
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
                                onClick={() => setShowAddCatModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Category</span>
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

            {/* Category Selector Tabs */}
            {competition?.categories && competition.categories.length > 0 ? (
                <div className="space-y-6">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {competition.categories.map((c: any) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCategoryId(c.id)}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                                    activeCategoryId === c.id
                                        ? 'bg-red-600 text-white shadow-sm'
                                        : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                                }`}
                            >
                                {c.name} ({c.teams?.length || 0} teams)
                            </button>
                        ))}
                    </div>

                    {activeCategory && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Teams Roster in this category */}
                            <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Users className="h-4 w-4 text-red-500" />
                                        <span>Registered Teams ({activeCategory.teams?.length || 0})</span>
                                    </h3>
                                    {canManage && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddTeamModal(true)}
                                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                                            title="Register Team"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {(!activeCategory.teams || activeCategory.teams.length === 0) ? (
                                        <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                            No teams registered in this category yet.
                                        </div>
                                    ) : (
                                        activeCategory.teams.map((t: any) => (
                                            <div key={t.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                                                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                                                    <span>{t.name}</span>
                                                    <span className="font-mono text-[10px] text-slate-400">{t.club?.code || 'IND'}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {t.members?.map((m: any) => `${m.user?.firstName || ''} ${m.user?.lastName || ''}`).join(', ') || 'No members'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {canManage && (
                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Draw / Group Generator</h4>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={groupCount}
                                                onChange={(e) => setGroupCount(Number(e.target.value))}
                                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                                            >
                                                <option value={1}>1 Group (Single Round-Robin)</option>
                                                <option value={2}>2 Groups (Group A & B)</option>
                                                <option value={4}>4 Groups (A, B, C, D)</option>
                                                <option value={8}>8 Groups</option>
                                            </select>
                                            <button
                                                type="button"
                                                disabled={generatingGroups || (activeCategory.teams?.length || 0) < 2}
                                                onClick={handleGenerateGroups}
                                                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs shrink-0 transition"
                                            >
                                                {generatingGroups ? 'Generating...' : 'Generate'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Groups & Encounters in this category */}
                            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-red-500" />
                                    <span>Draws & Encounters</span>
                                </h3>

                                {(!activeCategory.encounters || activeCategory.encounters.length === 0) ? (
                                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                                        <p>No encounters generated yet for this category.</p>
                                        <p className="text-[11px] text-slate-500">Register at least 2 teams and use the Group Generator to create match fixtures.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {activeCategory.encounters.map((enc: any) => (
                                            <Link
                                                key={enc.id}
                                                href={`/competition/${competitionId}/encounter/${enc.id}`}
                                                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-red-500/50 transition space-y-2 block group"
                                            >
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-mono text-slate-400">Round {enc.round || 1} • {enc.location || 'Hall'}</span>
                                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                                        enc.status === 'LIVE' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        {enc.status}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                                    <span>{enc.homeTeam?.name || 'TBD'}</span>
                                                    <span className="font-mono text-sm text-red-600 dark:text-red-400">{enc.homeScore ?? 0} : {enc.awayScore ?? 0}</span>
                                                    <span>{enc.awayTeam?.name || 'TBD'}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-8 text-center text-slate-500 space-y-3">
                    <Layers className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="text-xs font-medium">No competition categories created yet.</p>
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => setShowAddCatModal(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
                        >
                            <Plus className="h-4 w-4" /> Create First Category
                        </button>
                    )}
                </div>
            )}

            {/* Add Category Modal */}
            <Modal
                isOpen={showAddCatModal}
                onClose={() => setShowAddCatModal(false)}
                title="Create Competition Category"
                subtitle="Define group format, team size, and rating thresholds"
                icon={<Layers className="h-5 w-5 text-red-500" />}
                size="md"
            >
                <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Category Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Men Singles A, Mixed Doubles U18"
                            value={newCat.name}
                            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Team Size</label>
                            <select
                                value={newCat.teamSize}
                                onChange={(e) => setNewCat({ ...newCat, teamSize: Number(e.target.value) })}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                            >
                                <option value={1}>1 (Singles)</option>
                                <option value={2}>2 (Doubles)</option>
                                <option value={3}>3 (Team / Squad)</option>
                                <option value={4}>4 (Team)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Gender Restriction</label>
                            <select
                                value={newCat.genderRestriction}
                                onChange={(e) => setNewCat({ ...newCat, genderRestriction: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                            >
                                <option value="ANY">Open / Any</option>
                                <option value="MALE_ONLY">Men Only</option>
                                <option value="FEMALE_ONLY">Women Only</option>
                                <option value="MIXED">Mixed</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Min ELO (Optional)</label>
                            <input
                                type="number"
                                placeholder="None"
                                value={newCat.minElo}
                                onChange={(e) => setNewCat({ ...newCat, minElo: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500 font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Max ELO (Optional)</label>
                            <input
                                type="number"
                                placeholder="None"
                                value={newCat.maxElo}
                                onChange={(e) => setNewCat({ ...newCat, maxElo: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500 font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowAddCatModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs"
                        >
                            Create Category
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Add Team Modal */}
            <Modal
                isOpen={showAddTeamModal}
                onClose={() => setShowAddTeamModal(false)}
                title="Register Team in Category"
                subtitle="Assign participant or club team to this category"
                icon={<Users className="h-5 w-5 text-red-500" />}
                size="md"
            >
                <form onSubmit={handleRegisterTeam} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Team / Participant Name</label>
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
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Club Affiliation</label>
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
