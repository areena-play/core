'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { ModalPortal } from '@/components/ui/ModalPortal';
import {
    Trophy,
    ChevronLeft,
    Plus,
    Users,
    Layers,
    Play,
    Zap,
    CheckCircle2,
    Calendar,
    ChevronRight,
} from 'lucide-react';

export default function CompetitionCategoriesPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [showRegisterTeamModal, setShowRegisterTeamModal] = useState(false);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [categoryForm, setCategoryForm] = useState({
        name: '',
        teamSize: 1,
        genderRestriction: 'ANY',
        minElo: '',
        maxElo: '',
        roundsPerGroup: 1,
    });

    const [teamForm, setTeamForm] = useState({
        teamName: '',
        playerUserIds: [] as string[],
    });

    const fetchData = async () => {
        try {
            const [comp, r, u] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
                api.getUsers().catch(() => ({ users: [] })),
            ]);
            setCompetition(comp);
            setRoles(r || []);
            setUsersList(u.users || (Array.isArray(u) ? u : []));
            if (!selectedCategoryId && comp.categories?.length > 0) {
                setSelectedCategoryId(comp.categories[0].id);
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to load categories');
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
    const hasAdminRole = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && r.role === 'ADMIN');

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newCat = await api.createCategory(competitionId, {
                name: categoryForm.name,
                teamSize: Number(categoryForm.teamSize),
                genderRestriction: categoryForm.genderRestriction,
                minElo: categoryForm.minElo ? Number(categoryForm.minElo) : null,
                maxElo: categoryForm.maxElo ? Number(categoryForm.maxElo) : null,
                roundsPerGroup: Number(categoryForm.roundsPerGroup),
            });
            setShowAddCategoryModal(false);
            setSuccessMessage('Category created successfully.');
            await fetchData();
            setSelectedCategoryId(newCat.id);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to create category');
        }
    };

    const handleRegisterTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategoryId) return;
        try {
            await api.registerTeam(selectedCategoryId, teamForm);
            setShowRegisterTeamModal(false);
            setSuccessMessage('Team registered successfully.');
            setTeamForm({ teamName: '', playerUserIds: [] });
            await fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to register team');
        }
    };

    const handleGenerateGroups = async () => {
        if (!selectedCategoryId) return;
        if (!confirm('Generate groups & round-robin draw fixtures for this category?')) return;
        try {
            await api.generateGroups(selectedCategoryId, { numberOfGroups: 2 });
            setSuccessMessage('Draw & Groups generated successfully!');
            await fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to generate groups');
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const categories = competition?.categories || [];
    const activeCategory = categories.find((c: any) => c.id === selectedCategoryId) || categories[0];

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
                            <Trophy className="h-7 w-7 text-blue-400" />
                            Categories, Divisions & Draws
                        </h1>
                    </div>
                </div>
                {hasAdminRole && (
                    <button
                        onClick={() => setShowAddCategoryModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500"
                    >
                        <Plus className="h-4 w-4" /> Add Category
                    </button>
                )}
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

            {/* Category Selector Tabs */}
            {categories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
                    {categories.map((cat: any) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                                (activeCategory?.id === cat.id)
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                        >
                            {cat.name} ({cat.teams?.length || 0} teams)
                        </button>
                    ))}
                </div>
            )}

            {categories.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-center">
                    <Trophy className="mx-auto h-12 w-12 text-zinc-600" />
                    <h3 className="mt-4 text-lg font-bold text-white">No Categories Created Yet</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                        Create categories such as Men Open Singles, U18 Juniors, or Mixed Doubles.
                    </p>
                    {hasAdminRole && (
                        <button
                            onClick={() => setShowAddCategoryModal(true)}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500"
                        >
                            <Plus className="h-4 w-4" /> Create First Category
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Active Category Overview Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                                    Team Size: {activeCategory?.teamSize === 1 ? 'Singles (1)' : `Doubles (${activeCategory?.teamSize})`}
                                </span>
                                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                                    Gender: {activeCategory?.genderRestriction}
                                </span>
                            </div>
                            <h2 className="mt-2 text-xl font-bold text-white">{activeCategory?.name}</h2>
                        </div>

                        {hasAdminRole && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowRegisterTeamModal(true)}
                                    className="flex items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
                                >
                                    <Plus className="h-4 w-4" /> Register Team / Player
                                </button>
                                <button
                                    onClick={handleGenerateGroups}
                                    className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-500"
                                >
                                    <Layers className="h-4 w-4" /> Generate Draw & Groups
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Registered Teams & Encounters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Teams Box */}
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                                <span>Registered Teams & Players</span>
                                <span className="text-xs text-zinc-400 font-normal">
                                    {activeCategory?.teams?.length || 0} teams
                                </span>
                            </h3>

                            <div className="space-y-2">
                                {(!activeCategory?.teams || activeCategory.teams.length === 0) ? (
                                    <p className="text-xs text-zinc-500 py-6 text-center">No teams registered yet.</p>
                                ) : (
                                    activeCategory.teams.map((reg: any) => (
                                        <div key={reg.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 p-3">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-orange-400" />
                                                <span className="text-sm font-semibold text-white">{reg.team?.name}</span>
                                            </div>
                                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                                reg.paymentStatus === 'PAID'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {reg.paymentStatus}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Fixtures / Encounters */}
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                                <span>Fixtures & Encounters</span>
                                <Link
                                    href={`/competition/${competitionId}/results`}
                                    className="text-xs text-orange-400 hover:underline"
                                >
                                    Open Score Desk →
                                </Link>
                            </h3>

                            <div className="space-y-2">
                                {(!activeCategory?.encounters || activeCategory.encounters.length === 0) ? (
                                    <p className="text-xs text-zinc-500 py-6 text-center">
                                        No fixtures generated yet. Click "Generate Draw" above.
                                    </p>
                                ) : (
                                    activeCategory.encounters.map((enc: any) => (
                                        <Link
                                            key={enc.id}
                                            href={`/competition/${competitionId}/encounter/${enc.id}`}
                                            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 p-3 hover:border-orange-500/40 transition group"
                                        >
                                            <div>
                                                <div className="text-xs font-semibold text-white group-hover:text-orange-400">
                                                    {enc.homeTeam?.name} vs {enc.awayTeam?.name}
                                                </div>
                                                <div className="text-[10px] text-zinc-500">
                                                    Round {enc.round} • {enc.status}
                                                </div>
                                            </div>
                                            <div className="text-sm font-extrabold text-orange-400 font-mono">
                                                {enc.homeScore} : {enc.awayScore}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add Category */}
            {showAddCategoryModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-white">Create New Category</h3>
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                        Category Name
                                    </label>
                                    <input
                                        type="text"
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                        placeholder="e.g. Men Singles A, Mixed Doubles"
                                        required
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                            Team Size
                                        </label>
                                        <select
                                            value={categoryForm.teamSize}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, teamSize: Number(e.target.value) })}
                                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white"
                                        >
                                            <option value="1">Singles (1)</option>
                                            <option value="2">Doubles (2)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                            Gender
                                        </label>
                                        <select
                                            value={categoryForm.genderRestriction}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, genderRestriction: e.target.value })}
                                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white"
                                        >
                                            <option value="ANY">Any</option>
                                            <option value="MALE_ONLY">Male Only</option>
                                            <option value="FEMALE_ONLY">Female Only</option>
                                            <option value="MIXED">Mixed</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCategoryModal(false)}
                                        className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-500"
                                    >
                                        Create Category
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal Register Team */}
            {showRegisterTeamModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-white">Register Team / Athlete</h3>
                            <form onSubmit={handleRegisterTeam} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                        Team / Athlete Name
                                    </label>
                                    <input
                                        type="text"
                                        value={teamForm.teamName}
                                        onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })}
                                        placeholder="e.g. Roger Federer"
                                        required
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                                        Select Athlete Account
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val) setTeamForm({ ...teamForm, playerUserIds: [val] });
                                        }}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white"
                                    >
                                        <option value="">-- Choose Athlete --</option>
                                        {usersList.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.firstName} {u.lastName} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowRegisterTeamModal(false)}
                                        className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-500"
                                    >
                                        Register
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
