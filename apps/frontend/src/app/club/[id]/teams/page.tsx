'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Trophy,
    Shield,
    Users,
    Calendar,
    Crown,
    ChevronRight,
    ExternalLink,
    Filter,
    Search,
    Clock,
    Award,
    Flame,
    BarChart3,
    History,
    Sparkles,
    Settings,
    ArrowRight,
} from 'lucide-react';

export default function ClubTeamsPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('CURRENT');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [error, setError] = useState<string>('');

    const isClubOfficial =
        user?.isSuperAdmin ||
        user?.clubRoles?.some(
            (r: any) =>
                (r.clubId === club?.id || r.club?.slug === club?.slug || r.clubId === clubIdentifier || r.club?.slug === clubIdentifier) &&
                ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COACH', 'TECHNICAL_DIRECTOR', 'JUNIOR_COACH', 'OFFICIAL'].includes(r.role)
        );

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const seasonParam = selectedSeasonId === 'CURRENT' ? undefined : selectedSeasonId;
            const res = await api.getClubTeams(clubIdentifier, {
                seasonId: seasonParam === 'ALL' ? undefined : seasonParam,
            });

            setClub(res.club);
            setTeams(res.teams || []);
            setSeasons(res.seasons || []);

            if (selectedSeasonId === 'CURRENT' && res.currentSeason?.id) {
                // If CURRENT selected, keep 'CURRENT' in state or match currentSeason ID
            }

            if (res.club) {
                setEntityMeta({
                    id: res.club.id,
                    title: res.club.name,
                    code: res.club.code,
                    badge: 'Club',
                    subtitle: `${res.club.city || 'Switzerland'} • Registered Teams & Rosters`,
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load club teams.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clubIdentifier) return;
        loadData();
    }, [clubIdentifier, selectedSeasonId]);

    const currentSeasonObj = useMemo(() => {
        return seasons.find((s) => s.isCurrent) || seasons[0];
    }, [seasons]);

    // Grouping & Filtering
    const filteredTeams = useMemo(() => {
        let result = teams;

        // If specific season selected (and not ALL), filter if not already filtered by backend
        if (selectedSeasonId === 'CURRENT' && currentSeasonObj) {
            result = result.filter((team) =>
                team.registrations?.some(
                    (r: any) =>
                        !r.category?.competition?.seasonId ||
                        r.category?.competition?.seasonId === currentSeasonObj.id
                )
            );
        } else if (selectedSeasonId !== 'ALL' && selectedSeasonId !== 'CURRENT') {
            result = result.filter((team) =>
                team.registrations?.some(
                    (r: any) => r.category?.competition?.seasonId === selectedSeasonId
                )
            );
        }

        // Filter by competition type
        if (selectedType !== 'ALL') {
            result = result.filter((team) => {
                const types = team.registrations?.map((r: any) => r.category?.competition?.type) || [];
                if (selectedType === 'LEAGUE') {
                    return types.includes('LEAGUE');
                }
                if (selectedType === 'CUP') {
                    return types.includes('CUP');
                }
                if (selectedType === 'TOURNAMENT') {
                    return types.some((t: string) =>
                        ['TOURNAMENT', 'SEASON_TOURNAMENT', 'RANKING_TOURNAMENT'].includes(t)
                    );
                }
                if (selectedType === 'OTHER') {
                    return types.some((t: string) => ['FRIENDLY', 'INOFFICIAL'].includes(t));
                }
                return true;
            });
        }

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((team) => {
                const teamName = (team.name || '').toLowerCase();
                const catNames = (team.registrations || [])
                    .map((r: any) => `${r.category?.name || ''} ${r.category?.competition?.name || ''}`)
                    .join(' ')
                    .toLowerCase();
                const membersNames = (team.members || [])
                    .map((m: any) => `${m.user?.firstName || ''} ${m.user?.lastName || ''}`)
                    .join(' ')
                    .toLowerCase();
                return teamName.includes(q) || catNames.includes(q) || membersNames.includes(q);
            });
        }

        return result;
    }, [teams, selectedSeasonId, selectedType, searchQuery, currentSeasonObj]);

    // Metrics
    const leagueTeamsCount = useMemo(() => {
        return teams.filter((t) =>
            t.registrations?.some((r: any) => r.category?.competition?.type === 'LEAGUE')
        ).length;
    }, [teams]);

    const cupTeamsCount = useMemo(() => {
        return teams.filter((t) =>
            t.registrations?.some((r: any) => r.category?.competition?.type === 'CUP')
        ).length;
    }, [teams]);

    const tournamentTeamsCount = useMemo(() => {
        return teams.filter((t) =>
            t.registrations?.some((r: any) =>
                ['TOURNAMENT', 'SEASON_TOURNAMENT', 'RANKING_TOURNAMENT'].includes(
                    r.category?.competition?.type
                )
            )
        ).length;
    }, [teams]);

    if (loading && teams.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !club) {
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Teams Unavailable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {error || `No club found for identifier "${clubIdentifier}".`}
                    </p>
                </div>
                <Link
                    href="/clubs"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                    <span>Back to Clubs Directory</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Link href={`/club/${club.slug || clubIdentifier}`} className="hover:text-red-600 transition">
                            {club.name}
                        </Link>
                        <span>/</span>
                        <span className="text-slate-900 dark:text-white">Teams</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-red-600" />
                        <span>Registered Teams &amp; Rosters</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Public overview of all registered teams of {club.name} in league and cup competitions.
                    </p>
                </div>

                {/* Season Filter Dropdown */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 shadow-xs">
                        <History className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-500">Season:</span>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                        >
                            <option value="CURRENT">
                                Current Season ({currentSeasonObj?.name || '2026/2027'})
                            </option>
                            <option value="ALL">All Seasons (Historical)</option>
                            {seasons
                                .filter((s) => !s.isCurrent)
                                .map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} (Past)
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Official Link Banner if User is Club Official */}
            {isClubOfficial && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Club Official Operations
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                You can register new teams, manage player squad rosters, set captains, and accept/decline promotions &amp; relegations in the official Team Hub.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={`/club/${club.slug || clubIdentifier}/team-hub`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition shrink-0"
                    >
                        <span>Open Team Hub</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Teams</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{teams.length}</div>
                    </div>
                    <Users className="w-7 h-7 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">League Teams</div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{leagueTeamsCount}</div>
                    </div>
                    <Trophy className="w-7 h-7 text-blue-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cup Squads</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{cupTeamsCount}</div>
                    </div>
                    <Award className="w-7 h-7 text-amber-500" />
                </div>
            </div>

            {/* Filter Bar: Competition Types & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedType('ALL')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            selectedType === 'ALL'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        All Teams ({teams.length})
                    </button>
                    <button
                        onClick={() => setSelectedType('LEAGUE')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            selectedType === 'LEAGUE'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        League ({leagueTeamsCount})
                    </button>
                    <button
                        onClick={() => setSelectedType('CUP')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            selectedType === 'CUP'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        Cup ({cupTeamsCount})
                    </button>
                </div>

                <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search team, category, or player..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>

            {/* Teams Grid */}
            {filteredTeams.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <Trophy className="w-10 h-10 text-slate-400 mx-auto" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">No Teams Found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        No club teams registered matching the selected competition type and season filter.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredTeams.map((team) => {
                        const members = team.members || [];
                        const captain = members.find((m: any) => m.role === 'CAPTAIN');
                        const players = members.filter((m: any) => m.role !== 'CAPTAIN');
                        const registrations = team.registrations || [];
                        const primaryReg = registrations[0];
                        const competition = primaryReg?.category?.competition;
                        const category = primaryReg?.category;
                        const standings = team.standings?.[0];

                        // Format competition badge
                        const compType = competition?.type || 'LEAGUE';
                        const isLeague = compType === 'LEAGUE';
                        const isCup = compType === 'CUP';

                        return (
                            <div
                                key={team.id}
                                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-6"
                            >
                                <div className="space-y-4">
                                    {/* Top Line: Team Header & Type Badge */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                                {team.name?.[0] || 'T'}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                                    {team.name}
                                                </h3>
                                                {category && (
                                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        {category.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                    isLeague
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                                                        : isCup
                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400'
                                                }`}
                                            >
                                                {compType}
                                            </span>
                                            {competition?.season?.name && (
                                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                                    {competition.season.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Competition Card Link */}
                                    {competition && (
                                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/40 p-3.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Competition
                                                </span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    {competition.name}
                                                </span>
                                            </div>
                                            <Link
                                                href={`/competition/${competition.id}`}
                                                className="inline-flex items-center gap-1 font-bold text-red-600 hover:underline"
                                            >
                                                <span>Standings & Tables</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    )}

                                    {/* Standings Mini Strip (if played matches exist) */}
                                    {standings && (
                                        <div className="grid grid-cols-4 gap-2 text-center text-xs py-1">
                                            <div className="rounded-xl bg-slate-100 dark:bg-slate-800/60 p-2">
                                                <div className="text-[10px] font-semibold text-slate-400">Played</div>
                                                <div className="font-black text-slate-900 dark:text-white">
                                                    {standings.played || 0}
                                                </div>
                                            </div>
                                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-2">
                                                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Won</div>
                                                <div className="font-black text-emerald-700 dark:text-emerald-300">
                                                    {standings.won || 0}
                                                </div>
                                            </div>
                                            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-2">
                                                <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Lost</div>
                                                <div className="font-black text-rose-700 dark:text-rose-300">
                                                    {standings.lost || 0}
                                                </div>
                                            </div>
                                            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2">
                                                <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Table Pts</div>
                                                <div className="font-black text-amber-700 dark:text-amber-300">
                                                    {standings.tablePoints || 0}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Team Roster / Members */}
                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>Squad Members ({members.length})</span>
                                            </span>
                                        </div>

                                        {members.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No members assigned to this squad yet.</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {/* Captain first */}
                                                {captain && (
                                                    <div className="py-2 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase">
                                                                <Crown className="w-2.5 h-2.5" />
                                                                <span>Captain</span>
                                                            </span>
                                                            <Link
                                                                href={`/people/${captain.user?.licenseId || captain.user?.id}`}
                                                                className="font-bold text-slate-900 dark:text-white hover:text-red-600 transition truncate"
                                                            >
                                                                {captain.user?.firstName} {captain.user?.lastName}
                                                            </Link>
                                                        </div>
                                                        <span className="font-mono text-[11px] font-bold text-slate-500">
                                                            {captain.user?.eloPoints || 1200} pts
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Players */}
                                                {players.map((m: any) => (
                                                    <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 uppercase">
                                                                {m.role || 'Player'}
                                                            </span>
                                                            <Link
                                                                href={`/people/${m.user?.licenseId || m.user?.id}`}
                                                                className="font-semibold text-slate-800 dark:text-slate-200 hover:text-red-600 transition truncate"
                                                            >
                                                                {m.user?.firstName} {m.user?.lastName}
                                                            </Link>
                                                        </div>
                                                        <span className="font-mono text-[11px] font-bold text-slate-500">
                                                            {m.user?.eloPoints || 1200} pts
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                    <span className="text-[11px] text-slate-400">
                                        Average Elo:{' '}
                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                            {members.length > 0
                                                ? Math.round(
                                                      members.reduce(
                                                          (acc: number, m: any) =>
                                                              acc + (m.user?.eloPoints || 1200),
                                                          0
                                                      ) / members.length
                                                  )
                                                : 1200}{' '}
                                            pts
                                        </span>
                                    </span>

                                    {competition?.id && (
                                        <Link
                                            href={`/competition/${competition.id}`}
                                            className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700"
                                        >
                                            <span>Competition Sheet</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

