'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    Flame,
    Check,
    CheckCircle2,
    AlertCircle,
    Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DataTable, DataTableColumnHeader, ColumnDef } from '@/components/ui/DataTable';
import { useMainView } from '@/lib/mainViewContext';
import { LevelTierDefinition, ELO_TIERS_DATA, sortTiers } from '@areena/shared';
import { getCategorySlug } from '@/lib/slug';

export default function CompetitionCategoriesPage() {
    const params = useParams();
    const router = useRouter();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [newCat, setNewCat] = useState({
        name: '',
        teamSize: 1,
        minElo: '',
        maxElo: '',
        genderRestriction: 'ANY',
        roundsPerGroup: 1,
        minLevel: '',
        maxLevel: '',
    });
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { mainAssoc, associations, setEntityMeta } = useMainView();

    const activeTiers = useMemo<LevelTierDefinition[]>(() => {
        if (Array.isArray(competition?.association?.rules?.eloTiers) && competition.association.rules.eloTiers.length > 0) {
            return sortTiers(competition.association.rules.eloTiers);
        }
        if (Array.isArray(mainAssoc?.rules?.eloTiers) && mainAssoc.rules.eloTiers.length > 0) {
            return sortTiers(mainAssoc.rules.eloTiers);
        }
        const top = associations.find((a: any) => a.isTopLevel) || associations[0];
        if (Array.isArray(top?.rules?.eloTiers) && top.rules.eloTiers.length > 0) {
            return sortTiers(top.rules.eloTiers);
        }
        return sortTiers(ELO_TIERS_DATA);
    }, [competition, mainAssoc, associations]);

    const handleSelectMaxLevel = (levelCode: string) => {
        if (!levelCode) {
            setNewCat((prev) => ({ ...prev, maxElo: '' }));
            return;
        }
        const tier = activeTiers.find((t: LevelTierDefinition) => t.level === levelCode);
        if (tier) {
            setNewCat((prev) => ({
                ...prev,
                maxElo: String(tier.maxElo === 3000 ? '' : tier.maxElo),
            }));
        }
    };

    const handleSelectMinLevel = (levelCode: string) => {
        if (!levelCode) {
            setNewCat((prev) => ({ ...prev, minElo: '' }));
            return;
        }
        const tier = activeTiers.find((t: LevelTierDefinition) => t.level === levelCode);
        if (tier) {
            setNewCat((prev) => ({
                ...prev,
                minElo: String(tier.minElo),
            }));
        }
    };

    const fetchData = async () => {
        try {
            const [comp, r] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
            ]);
            setCompetition(comp);
            setRoles(r || []);
            setEntityMeta({
                id: comp.id,
                title: comp.name,
                code: comp.seriesSlug || comp.slug || 'COMP',
                badge: comp.type,
                subtitle: `${comp.type} • ${comp.association?.name || 'Federation'}`,
                categories: comp.categories || [],
            });
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load categories' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (competitionId) {
            fetchData();
        }
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
            setNewCat({
                name: '',
                teamSize: 1,
                minElo: '',
                maxElo: '',
                genderRestriction: 'ANY',
                roundsPerGroup: 1,
                minLevel: '',
                maxLevel: '',
            });
            setActionMsg({ type: 'success', text: 'Category created successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to create category' });
        }
    };

    const categoryColumns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader column={column} title={t('tournamentWorkspace.categories') || 'Category / Division'} />
                ),
                cell: ({ row }: { row: any }) => {
                    const cat = row.original;
                    const genderBadge =
                        cat.genderRestriction === 'MALE_ONLY'
                            ? { label: 'Men', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' }
                            : cat.genderRestriction === 'FEMALE_ONLY'
                              ? { label: 'Women', bg: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400 border-pink-200 dark:border-pink-800/50' }
                              : cat.genderRestriction === 'MIXED'
                                ? { label: 'Mixed', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' }
                                : { label: 'Open', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };

                    return (
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                <Layers className="h-4 w-4" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                        {cat.name}
                                    </span>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${genderBadge.bg}`}>
                                        {genderBadge.label}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">
                                    {cat.roundsPerGroup > 1 ? `${cat.roundsPerGroup} rounds per group` : '1 round-robin round'}
                                </p>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'teamSize',
                header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title="Type" />,
                cell: ({ row }: { row: any }) => {
                    const size = row.original.teamSize || 1;
                    return (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {size === 1 ? 'Singles (1v1)' : size === 2 ? 'Doubles (2v2)' : `Team (${size}p)`}
                        </span>
                    );
                },
            },
            {
                id: 'eloRange',
                header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title="Rating / Level" />,
                accessorFn: (row: any) => `${row.minElo ?? 0}-${row.maxElo ?? 9999}`,
                cell: ({ row }: { row: any }) => {
                    const { minElo, maxElo } = row.original;
                    if (minElo && maxElo) {
                        return (
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {minElo} – {maxElo} ELO
                            </span>
                        );
                    }
                    if (maxElo) {
                        return (
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                ≤ {maxElo} ELO
                            </span>
                        );
                    }
                    if (minElo) {
                        return (
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                ≥ {minElo} ELO
                            </span>
                        );
                    }
                    return <span className="text-xs text-slate-400">Open (All ELO)</span>;
                },
            },
            {
                id: 'teamsCount',
                header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title="Registered Squads" />,
                accessorFn: (row: any) => row.teams?.length || 0,
                cell: ({ row }: { row: any }) => {
                    const count = row.original.teams?.length || 0;
                    return (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Users className="h-3.5 w-3.5 text-blue-500" />
                            <span>{count} {count === 1 ? 'entry' : 'entries'}</span>
                        </div>
                    );
                },
            },
            {
                id: 'groupsCount',
                header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title="Draw / Groups" />,
                accessorFn: (row: any) => row.groups?.length || 0,
                cell: ({ row }: { row: any }) => {
                    const count = row.original.groups?.length || 0;
                    return count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Check className="h-3 w-3" /> {count} {count === 1 ? 'Group' : 'Groups'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800">
                            Draw Pending
                        </span>
                    );
                },
            },
            {
                id: 'progress',
                header: ({ column }: { column: any }) => <DataTableColumnHeader column={column} title="Matches Progress" />,
                accessorFn: (row: any) => row.encounters?.length || 0,
                cell: ({ row }: { row: any }) => {
                    const encounters = row.original.encounters || [];
                    const total = encounters.length;
                    const finished = encounters.filter((e: any) => e.status === 'FINISHED').length;
                    const live = encounters.filter((e: any) => e.status === 'LIVE').length;

                    if (total === 0) {
                        return <span className="text-xs text-slate-400">No matches scheduled</span>;
                    }

                    const pct = Math.round((finished / total) * 100);

                    return (
                        <div className="space-y-1 w-32">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {finished}/{total} played
                                </span>
                                {live > 0 && (
                                    <span className="text-red-500 font-bold flex items-center gap-0.5 animate-pulse">
                                        <Flame className="h-3 w-3" /> {live} live
                                    </span>
                                )}
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                cell: ({ row }: { row: any }) => {
                    const cat = row.original;
                    const slug = getCategorySlug(cat);
                    return (
                        <div className="flex justify-end">
                            <Link
                                href={`/competition/${competitionId}/category/${slug}`}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            >
                                <span>Open</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    );
                },
            },
        ],
        [competitionId, t]
    );

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    const categories = competition?.categories || [];
    const totalTeams = categories.reduce((sum: number, c: any) => sum + (c.teams?.length || 0), 0);
    const totalGroups = categories.reduce((sum: number, c: any) => sum + (c.groups?.length || 0), 0);
    const totalEncounters = categories.reduce((sum: number, c: any) => sum + (c.encounters?.length || 0), 0);
    const finishedEncounters = categories.reduce(
        (sum: number, c: any) => sum + (c.encounters?.filter((e: any) => e.status === 'FINISHED').length || 0),
        0
    );

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Categories Overview
                            </span>
                            <span className="font-mono text-xs text-slate-400">{categories.length} Divisions</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers className="h-6 w-6 text-red-500" />
                            <span>Tournament Categories & Divisions</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Overview of all divisions, registered team rosters, round-robin pools, and fixtures progress
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

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Divisions</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                            <Layers className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {categories.length}
                    </div>
                    <p className="text-[11px] text-slate-500">Active competition categories</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Squads</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {totalTeams}
                    </div>
                    <p className="text-[11px] text-slate-500">Total participant entries</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Round-Robin Pools</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Trophy className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {totalGroups}
                    </div>
                    <p className="text-[11px] text-slate-500">Generated draw groups</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fixtures Progress</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <Flame className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {finishedEncounters}/{totalEncounters}
                    </div>
                    <p className="text-[11px] text-slate-500">
                        {totalEncounters > 0 ? `${Math.round((finishedEncounters / totalEncounters) * 100)}% completed` : 'No fixtures generated'}
                    </p>
                </div>
            </div>

            {/* Categories DataTable */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <DataTable
                    columns={categoryColumns}
                    data={categories}
                    searchPlaceholder="Filter categories by division name, format, or rating..."
                    emptyMessage="No categories created yet for this tournament. Click 'Add Category' to create your first division."
                    defaultPageSize={10}
                    onRowClick={(row: any) => router.push(`/competition/${competitionId}/category/${getCategorySlug(row)}`)}
                />
            </div>

            {/* Add Category Modal */}
            <Modal
                isOpen={showAddCatModal}
                onClose={() => setShowAddCatModal(false)}
                title="Create Competition Category"
                subtitle="Define division format, team size, and rating thresholds"
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

                    {/* Skill / Rank Level Restrictions */}
                    <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                <span>Skill & Level Eligibility Limits</span>
                            </label>
                            <span className="text-[11px] text-slate-400">Optional</span>
                        </div>

                        {/* Dropdown Pickers */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">Min Rank Level</label>
                                <select
                                    value={newCat.minLevel}
                                    onChange={(e) => {
                                        setNewCat({ ...newCat, minLevel: e.target.value });
                                        handleSelectMinLevel(e.target.value);
                                    }}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 font-medium"
                                >
                                    <option value="">-- No Minimum Level --</option>
                                    {activeTiers.map((t: LevelTierDefinition) => (
                                        <option key={t.level} value={t.level}>
                                            Min {t.level} ({t.minElo}+ pts)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">Max Rank Level</label>
                                <select
                                    value={newCat.maxLevel}
                                    onChange={(e) => {
                                        setNewCat({ ...newCat, maxLevel: e.target.value });
                                        handleSelectMaxLevel(e.target.value);
                                    }}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 font-medium"
                                >
                                    <option value="">-- No Maximum Level --</option>
                                    {activeTiers.map((t: LevelTierDefinition) => (
                                        <option key={t.level} value={t.level}>
                                            Max {t.level} (≤ {t.maxElo === 3000 ? '∞' : t.maxElo} pts)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Elo Points Numeric Range */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                                <label className="block text-[11px] text-slate-500 dark:text-slate-400">Min ELO Points</label>
                                <input
                                    type="number"
                                    placeholder="None"
                                    value={newCat.minElo}
                                    onChange={(e) => setNewCat({ ...newCat, minElo: e.target.value, minLevel: '' })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[11px] text-slate-500 dark:text-slate-400">Max ELO Points</label>
                                <input
                                    type="number"
                                    placeholder="None"
                                    value={newCat.maxElo}
                                    onChange={(e) => setNewCat({ ...newCat, maxElo: e.target.value, maxLevel: '' })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 font-mono"
                                />
                            </div>
                        </div>

                        {newCat.maxLevel && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                Level constraint: Any athlete at rank level <strong>{newCat.maxLevel}</strong> or below is eligible.
                            </p>
                        )}
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
        </div>
    );
}
