'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useWebSocket } from '@/lib/useWebSocket';
import {
    Trophy,
    Users,
    Calendar,
    MapPin,
    Shield,
    Plus,
    Play,
    Flame,
    CheckCircle2,
    ChevronRight,
    ArrowRight,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CompetitionDetailPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);

    // Add Category form state
    const [catName, setCatName] = useState('');
    const [catTeamSize, setCatTeamSize] = useState(1);
    const [catMinElo, setCatMinElo] = useState('');
    const [catFormatType, setCatFormatType] = useState('DAVIS_3V3'); // 1v1, 2v2, DAVIS_3V3
    const [catRounds, setCatRounds] = useState(2);

    // Register Team form state
    const [teamName, setTeamName] = useState('');
    const [clubs, setClubs] = useState<any[]>([]);
    const [selectedClubId, setSelectedClubId] = useState('');

    const fetchCompetition = async () => {
        try {
            const data = await api.getCompetition(competitionId);
            setCompetition(data);
            if (data.categories && data.categories.length > 0 && !activeCategoryId) {
                setActiveCategoryId(data.categories[0].id);
            }
        } catch (err) {
            console.error('Failed to load competition:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompetition();
        api.getClubs()
            .then(setClubs)
            .catch(() => {});
    }, [competitionId]);

    // Real-time live score updates over WebSocket
    useWebSocket((event) => {
        if (event.channel === 'areena:scores' || event.channel === 'areena:encounters') {
            fetchCompetition();
        }
    });

    const activeCategory = competition?.categories?.find((c: any) => c.id === activeCategoryId);

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let encounterFormat: any[] = [];
            if (catFormatType === 'DAVIS_3V3') {
                encounterFormat = [
                    { type: 'SINGLE', homeSlot: 1, awaySlot: 1, label: 'Singles 1: Home A vs Away X' },
                    { type: 'SINGLE', homeSlot: 2, awaySlot: 2, label: 'Singles 2: Home B vs Away Y' },
                    { type: 'SINGLE', homeSlot: 3, awaySlot: 3, label: 'Singles 3: Home C vs Away Z' },
                    { type: 'SINGLE', homeSlot: 1, awaySlot: 2, label: 'Singles 4: Home A vs Away Y' },
                    { type: 'SINGLE', homeSlot: 2, awaySlot: 3, label: 'Singles 5: Home B vs Away Z' },
                    { type: 'SINGLE', homeSlot: 3, awaySlot: 1, label: 'Singles 6: Home C vs Away X' },
                    { type: 'SINGLE', homeSlot: 1, awaySlot: 3, label: 'Singles 7: Home A vs Away Z' },
                    { type: 'SINGLE', homeSlot: 2, awaySlot: 1, label: 'Singles 8: Home B vs Away X' },
                    { type: 'SINGLE', homeSlot: 3, awaySlot: 2, label: 'Singles 9: Home C vs Away Y' },
                    { type: 'DOUBLE', homeSlot: 1, awaySlot: 1, label: 'Doubles: Home Doubles vs Away Doubles' },
                ];
            } else if (catFormatType === 'DOUBLES_2V2') {
                encounterFormat = [
                    { type: 'DOUBLE', homeSlot: 1, awaySlot: 1, label: 'Doubles 1' },
                    { type: 'SINGLE', homeSlot: 1, awaySlot: 1, label: 'Singles 1' },
                    { type: 'SINGLE', homeSlot: 2, awaySlot: 2, label: 'Singles 2' },
                ];
            } else {
                encounterFormat = [{ type: 'SINGLE', homeSlot: 1, awaySlot: 1, label: 'Singles Match' }];
            }

            await api.createCategory(competitionId, {
                name: catName,
                teamSize: Number(catTeamSize),
                minElo: catMinElo ? Number(catMinElo) : null,
                roundsPerGroup: Number(catRounds),
                encounterFormat,
            });

            setShowAddCatModal(false);
            fetchCompetition();
            setCatName('');
        } catch (err) {
            alert('Failed to create category');
        }
    };

    const handleRegisterTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCategoryId) return;
        try {
            await api.registerTeam(activeCategoryId, {
                name: teamName,
                clubId: selectedClubId || null,
                playerUserIds: user ? [user.id] : [],
            });
            setShowAddTeamModal(false);
            fetchCompetition();
            setTeamName('');
        } catch (err) {
            alert('Failed to register team');
        }
    };

    const handleGenerateGroup = async () => {
        if (!activeCategory) return;
        const teamIds = activeCategory.teams.map((t: any) => t.teamId);
        if (teamIds.length < 2) {
            alert('At least 2 registered teams required to generate group schedule.');
            return;
        }

        try {
            await api.generateGroups(activeCategory.id, {
                groupName: 'Division 1 Championship',
                teamIds,
                roundsPerGroup: activeCategory.roundsPerGroup || 2,
            });
            fetchCompetition();
        } catch (err: any) {
            alert(err.message || 'Failed to generate group encounters');
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400">
                {t('common.loading')}
            </div>
        );
    }

    if (!competition) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-8 text-center text-slate-700 dark:text-slate-300">
                Competition not found.
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Competition Header */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span
                                className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase ${
                                    competition.type === 'LEAGUE'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                                }`}
                            >
                                {competition.type}
                            </span>
                            <span className="rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 text-xs font-medium">
                                {competition.status.replace('_', ' ')}
                            </span>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">
                            {competition.name}
                        </h1>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                            <span className="flex items-center gap-1.5">
                                <Shield className="h-4 w-4 text-red-500" />
                                {competition.association?.name}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                {format(new Date(competition.startDate), 'MMM dd, yyyy')} -{' '}
                                {format(new Date(competition.endDate), 'MMM dd, yyyy')}
                            </span>
                            {competition.location && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    {competition.location}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowAddCatModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-sm"
                        >
                            <Plus className="h-4 w-4" />
                            <span>{t('competitions.addCategory')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Tabs & Controls */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    {/* Horizontally scrollable category buttons */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full">
                        {competition.categories?.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategoryId(cat.id)}
                                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
                                    activeCategoryId === cat.id
                                        ? 'bg-red-600 text-white shadow'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <span>{cat.name}</span>
                                <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
                                    {cat.teamSize === 1
                                        ? '1v1'
                                        : cat.teamSize === 2
                                          ? '2v2'
                                          : `${cat.teamSize}v${cat.teamSize}`}
                                </span>
                            </button>
                        ))}
                    </div>

                    {activeCategory && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setShowAddTeamModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                <Users className="h-3.5 w-3.5" />
                                <span>{t('competitions.registerTeam')}</span>
                            </button>
                            {activeCategory.groups?.length === 0 && (
                                <button
                                    onClick={handleGenerateGroup}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                                >
                                    <Play className="h-3.5 w-3.5" />
                                    <span>{t('competitions.generateSchedule')}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Active Category Content */}
                {activeCategory ? (
                    <div className="space-y-8">
                        {/* Category Meta Rules Banner */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 text-xs shadow-sm">
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">
                                    {t('competitions.teamSize')}:
                                </span>
                                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                                    {activeCategory.teamSize === 1
                                        ? 'Singles (1v1)'
                                        : activeCategory.teamSize === 2
                                          ? 'Doubles (2v2)'
                                          : `Team (${activeCategory.teamSize}v${activeCategory.teamSize} Davis Cup)`}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">
                                    {t('competitions.minElo')}:
                                </span>
                                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                                    {activeCategory.minElo ? `${activeCategory.minElo} Elo` : 'Open / Unrestricted'}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">
                                    {t('competitions.encounterStructure')}:
                                </span>
                                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                                    {Array.isArray(activeCategory.encounterFormat) &&
                                    activeCategory.encounterFormat.length > 0
                                        ? `${activeCategory.encounterFormat.length} Matches / Encounter`
                                        : '1 Match'}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-slate-400">
                                    {t('competitions.registeredTeams')}:
                                </span>
                                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                                    {t('competitions.registeredCount', { count: activeCategory.teams?.length || 0 })}
                                </div>
                            </div>
                        </div>

                        {/* Standings Table with Responsive Horizontal Scroll */}
                        {activeCategory.groups?.map((grp: any) => (
                            <div key={grp.id} className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-red-500" />
                                        <span>
                                            {grp.name} {t('competitions.standings')}
                                        </span>
                                    </h3>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        2 pts for Win, 1 pt for Draw, 0 for Loss
                                    </span>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-x-auto shadow-sm">
                                    <table className="w-full text-left text-xs min-w-[600px]">
                                        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-3 py-2.5 sm:px-4 sm:py-3">#</th>
                                                <th className="px-3 py-2.5 sm:px-4 sm:py-3">
                                                    {t('common.club')} / Team
                                                </th>
                                                <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-center">
                                                    {t('competitions.played')}
                                                </th>
                                                <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-center">
                                                    {t('competitions.won')}
                                                </th>
                                                <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-center">
                                                    {t('competitions.drawn')}
                                                </th>
                                                <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-center">
                                                    {t('competitions.lost')}
                                                </th>
                                                <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-center">
                                                    {t('competitions.matches')}
                                                </th>
                                                <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-center">
                                                    {t('competitions.sets')}
                                                </th>
                                                <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-right font-extrabold text-slate-900 dark:text-white">
                                                    {t('competitions.points')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                                            {grp.standings?.map((st: any, idx: number) => (
                                                <tr
                                                    key={st.id}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition"
                                                >
                                                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-slate-400">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                                                        <span className="truncate max-w-[160px] sm:max-w-none">
                                                            {st.team?.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center text-slate-700 dark:text-slate-300">
                                                        {st.played}
                                                    </td>
                                                    <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                                        {st.won}
                                                    </td>
                                                    <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center text-slate-500 dark:text-slate-400">
                                                        {st.drawn}
                                                    </td>
                                                    <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center text-red-600 dark:text-red-400">
                                                        {st.lost}
                                                    </td>
                                                    <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                                        {st.matchesWon} : {st.matchesLost}
                                                    </td>
                                                    <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center font-mono text-slate-500 dark:text-slate-400">
                                                        {st.setsWon} : {st.setsLost}
                                                    </td>
                                                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right font-extrabold text-slate-900 dark:text-white text-sm font-mono">
                                                        {st.tablePoints}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}

                        {/* Encounters & Match Days Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-red-500" />
                                    <span>{t('competitions.scheduledEncounters')}</span>
                                </h3>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {t('competitions.openScoreSheet')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                {activeCategory.encounters?.map((enc: any) => (
                                    <Link
                                        key={enc.id}
                                        href={`/competitions/${competitionId}/encounter/${enc.id}`}
                                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-red-500/40 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-red-500/40 transition group shadow-sm"
                                    >
                                        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {t('competitions.roundNumber', { round: enc.round })}
                                            </span>
                                            <span
                                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                    enc.status === 'LIVE'
                                                        ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800 animate-pulse'
                                                        : enc.status === 'FINISHED'
                                                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}
                                            >
                                                {enc.status}
                                            </span>
                                        </div>

                                        <div className="my-3 sm:my-4 flex items-center justify-between gap-2 sm:gap-4">
                                            {/* Home Team */}
                                            <div className="flex-1 text-right">
                                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition text-xs sm:text-sm truncate">
                                                    {enc.homeTeam?.name}
                                                </div>
                                            </div>

                                            {/* Score Badge */}
                                            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-950 px-2.5 py-1 sm:px-3 sm:py-1.5 border border-slate-200 dark:border-slate-800 font-mono font-extrabold text-sm sm:text-base flex-shrink-0">
                                                <span
                                                    className={
                                                        enc.homeScore > enc.awayScore
                                                            ? 'text-red-600 dark:text-red-500'
                                                            : 'text-slate-900 dark:text-white'
                                                    }
                                                >
                                                    {enc.homeScore}
                                                </span>
                                                <span className="text-slate-400 dark:text-slate-600">:</span>
                                                <span
                                                    className={
                                                        enc.awayScore > enc.homeScore
                                                            ? 'text-red-600 dark:text-red-500'
                                                            : 'text-slate-900 dark:text-white'
                                                    }
                                                >
                                                    {enc.awayScore}
                                                </span>
                                            </div>

                                            {/* Away Team */}
                                            <div className="flex-1 text-left">
                                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition text-xs sm:text-sm truncate">
                                                    {enc.awayTeam?.name}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80">
                                            <span>
                                                {enc.matches?.length || 0} {t('competitions.matches')}
                                            </span>
                                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold group-hover:underline">
                                                {t('competitions.scoreSheet')} <ArrowRight className="h-3 w-3" />
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 p-8 text-center text-slate-500 dark:text-slate-400">
                        {t('competitions.subtitle')}
                    </div>
                )}
            </div>

            {/* Add Category Modal */}
            {showAddCatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {t('competitions.addCategory')}
                            </h3>
                            <button
                                onClick={() => setShowAddCatModal(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('competitions.category')} {t('common.name')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Men's Team Division A (3v3)"
                                    value={catName}
                                    onChange={(e) => setCatName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('competitions.matchType')}
                                    </label>
                                    <select
                                        value={catFormatType}
                                        onChange={(e) => {
                                            setCatFormatType(e.target.value);
                                            if (e.target.value === 'DAVIS_3V3') setCatTeamSize(3);
                                            else if (e.target.value === 'DOUBLES_2V2') setCatTeamSize(2);
                                            else setCatTeamSize(1);
                                        }}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="DAVIS_3V3">3v3 Davis Cup (10 Matches: 9S + 1D)</option>
                                        <option value="DOUBLES_2V2">2v2 Doubles + Singles (3 Matches)</option>
                                        <option value="SINGLES_1V1">1v1 Singles Match</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('competitions.teamSize')}
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={catTeamSize}
                                        onChange={(e) => setCatTeamSize(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('competitions.minElo')}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 1500"
                                        value={catMinElo}
                                        onChange={(e) => setCatMinElo(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('competitions.round')}
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={catRounds}
                                        onChange={(e) => setCatRounds(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddCatModal(false)}
                                    className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 shadow"
                                >
                                    {t('competitions.addCategory')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Register Team Modal */}
            {showAddTeamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {t('competitions.registerTeam')} ({activeCategory?.name})
                            </h3>
                            <button
                                onClick={() => setShowAddTeamModal(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRegisterTeam} className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Team {t('common.name')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. TTC Young Stars Zurich 2"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('common.club')}
                                </label>
                                <select
                                    value={selectedClubId}
                                    onChange={(e) => setSelectedClubId(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                >
                                    <option value="">No Club (Independent / Tournament Team)</option>
                                    {clubs.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTeamModal(false)}
                                    className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 shadow"
                                >
                                    {t('competitions.registerTeam')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
