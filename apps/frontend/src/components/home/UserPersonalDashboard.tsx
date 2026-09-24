'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Trophy,
    Award,
    Users,
    Calendar,
    Shield,
    ArrowRight,
    Flame,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Sparkles,
    Calculator,
    Activity,
    MapPin,
    Clock,
    Search,
    User,
    TrendingUp,
    TrendingDown,
    Building2,
    Radio,
    Tv,
    Layers,
    Target,
    Zap,
    ExternalLink,
    HelpCircle,
    Copy,
    Check,
    BookOpen,
} from 'lucide-react';

export function UserPersonalDashboard() {
    const { user } = useAuth();
    const { t, formatDate } = useI18n();
    const router = useRouter();
    const { associations, mainAssoc } = useMainView();

    const [personData, setPersonData] = useState<any | null>(null);
    const [statsData, setStatsData] = useState<any | null>(null);
    const [liveEncounters, setLiveEncounters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // Quick search bar state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function loadUserData() {
            try {
                setLoading(true);
                const identifier = user?.licenseId || user?.id;
                const [personRes, statsRes, liveRes] = await Promise.allSettled([
                    api.getPerson(identifier!),
                    api.getPersonStats(identifier!),
                    api.getLiveEncounters(),
                ]);

                if (personRes.status === 'fulfilled') setPersonData(personRes.value);
                if (statsRes.status === 'fulfilled') setStatsData(statsRes.value);
                if (liveRes.status === 'fulfilled') setLiveEncounters(liveRes.value || []);
            } catch (err) {
                console.error('Failed to load user personal dashboard:', err);
            } finally {
                setLoading(false);
            }
        }

        loadUserData();
    }, [user]);

    // Handle Quick Search
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                const res = await api.globalSearch(searchQuery.trim(), { limit: 5 });
                setSearchResults(res?.results || []);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Compute Primary Club & Active Licenses
    const primaryLicense = useMemo(() => {
        if (!personData?.licenses || personData.licenses.length === 0) return null;
        return personData.licenses.find((l: any) => l.status === 'APPROVED' && !l.isSecondaryClubLicense) || personData.licenses[0];
    }, [personData]);

    const primaryClub = useMemo(() => {
        if (primaryLicense?.club) return primaryLicense.club;
        if (personData?.clubRoles && personData.clubRoles.length > 0) return personData.clubRoles[0].club;
        if (personData?.teamMemberships && personData.teamMemberships.length > 0) return personData.teamMemberships[0].team?.club;
        return null;
    }, [primaryLicense, personData]);

    // Recent 5 Finished Matches
    const recentMatches = useMemo(() => {
        if (!statsData?.matches) return [];
        return statsData.matches.slice(0, 5);
    }, [statsData]);

    // Form Pill Badges (W / L)
    const formPills = useMemo(() => {
        if (!recentMatches || recentMatches.length === 0) return [];
        return recentMatches.map((m: any) => ({
            id: m.id,
            isWinner: m.isWinner,
            isDraw: m.isDraw,
        }));
    }, [recentMatches]);

    // Monthly Elo Delta
    const eloDelta = useMemo(() => {
        if (!statsData?.eloHistory || statsData.eloHistory.length < 2) return null;
        const current = statsData.eloHistory[0]?.eloPoints;
        const previous = statsData.eloHistory[1]?.eloPoints;
        if (current === undefined || previous === undefined) return null;
        const diff = current - previous;
        return {
            diff,
            isPositive: diff >= 0,
        };
    }, [statsData]);

    // Active Teams
    const teams = useMemo(() => {
        if (!personData?.teamMemberships) return [];
        return personData.teamMemberships.map((tm: any) => tm.team).filter(Boolean);
    }, [personData]);

    const handleCopyLicense = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (user?.licenseId) {
            navigator.clipboard.writeText(user.licenseId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto pb-16">
            {/* 1. TOP IDENTITY & STATUS BAR (TT-Stats Style) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-red-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-red-950/30 p-5 sm:p-7 shadow-sm transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Left: Player Avatar, Name, Club, License */}
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md border-2 border-white dark:border-slate-800 shrink-0 overflow-hidden">
                            {user?.avatarUrl ? (
                                <Image src={user.avatarUrl} alt={user.firstName} fill className="object-cover" />
                            ) : (
                                <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                            )}
                        </div>

                        <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                    {user?.firstName} {user?.lastName}
                                </h1>
                                {user?.isPro && (
                                    <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase font-mono tracking-wider">
                                        PRO
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                {primaryClub && (
                                    <Link
                                        href={`/clubs/${primaryClub.id || primaryClub.slug || ''}`}
                                        className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition"
                                    >
                                        <Building2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                        <span className="truncate max-w-[160px] sm:max-w-[220px]">{primaryClub.name}</span>
                                    </Link>
                                )}

                                {user?.licenseId ? (
                                    <button
                                        onClick={handleCopyLicense}
                                        title="Click to copy License ID"
                                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                    >
                                        <span>#{user.licenseId}</span>
                                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-400" />}
                                    </button>
                                ) : (
                                    <Link
                                        href="/profile?tab=licenses&apply=true"
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                                    >
                                        <span>Request License</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Elo Rating, Level Badge & Rank */}
                    <div className="flex items-center gap-3 sm:gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800 shrink-0">
                        {/* Level Tier & Elo Badge */}
                        <div className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/40 px-4 py-2.5 text-center min-w-[100px]">
                            <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 font-mono tracking-wider">
                                Classification
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {personData?.currentLevel || (user?.eloPoints ? `Lvl` : 'Unrated')}
                            </div>
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
                                {user?.eloPoints ? `${Math.round(user.eloPoints)} pts` : '-'}
                            </div>
                        </div>

                        {/* Rank & Trend */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-4 py-2.5 text-center min-w-[100px]">
                            <div className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                                National Rank
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {user?.rank ? `#${user.rank}` : '-'}
                            </div>
                            {eloDelta ? (
                                <div className={`inline-flex items-center gap-0.5 text-[11px] font-bold font-mono ${eloDelta.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {eloDelta.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    <span>{eloDelta.diff > 0 ? `+${eloDelta.diff}` : eloDelta.diff} pts</span>
                                </div>
                            ) : (
                                <div className="text-[11px] font-semibold text-slate-400 font-mono">Active</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile-Friendly Quick Action Pills Bar */}
                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
                    <Link
                        href={`/people/${user?.licenseId || user?.id}?tab=statistics`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold whitespace-nowrap hover:opacity-90 transition shadow-xs"
                    >
                        <Activity className="h-3.5 w-3.5" />
                        <span>My Statistics & H2H</span>
                    </Link>

                    <Link
                        href="/utilities/elo-calculator"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <Calculator className="h-3.5 w-3.5 text-blue-500" />
                        <span>Elo Calculator</span>
                    </Link>

                    <Link
                        href="/team-hub"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <Users className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Team Hub</span>
                    </Link>

                    <Link
                        href="/utilities/level-table"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <Target className="h-3.5 w-3.5 text-purple-500" />
                        <span>Level Matrix</span>
                    </Link>

                    <Link
                        href="/profile?tab=licenses"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        <span>Licensing</span>
                    </Link>
                </div>
            </div>

            {/* 2. FAST DIRECTORY SEARCH (Find any player, club, or league instantly) */}
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Quick search players, clubs, licenses across Switzerland..."
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-xs"
                    />
                    {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <span className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
                        </div>
                    )}
                </div>

                {/* Instant Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-30 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {searchResults.map((item, idx) => (
                            <Link
                                key={idx}
                                href={
                                    item.type === 'PERSON' || item.type === 'PLAYER'
                                        ? `/people/${item.licenseId || item.id}`
                                        : item.type === 'CLUB'
                                        ? `/clubs/${item.id}`
                                        : `/competition/${item.id}`
                                }
                                onClick={() => setSearchQuery('')}
                                className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                                        {item.type === 'PERSON' || item.type === 'PLAYER' ? (
                                            <User className="h-4 w-4 text-red-500" />
                                        ) : item.type === 'CLUB' ? (
                                            <Building2 className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <Trophy className="h-4 w-4 text-amber-500" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                            {item.name || `${item.firstName} ${item.lastName}`}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {item.subtitle || item.clubName || (item.licenseId ? `#${item.licenseId}` : item.type)}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. CORE 2-COLUMN DASHBOARD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Recent Matches & Form, My Teams */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Recent Match Form Widget */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Activity className="h-5 w-5 text-red-500" />
                                <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                                    Recent Form & Match History
                                </h2>
                            </div>

                            {formPills.length > 0 && (
                                <div className="flex items-center gap-1 font-mono">
                                    {formPills.map((p: any, idx: number) => (
                                        <span
                                            key={idx}
                                            className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                                                p.isWinner
                                                    ? 'bg-emerald-500 text-white'
                                                    : p.isDraw
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-rose-500 text-white'
                                            }`}
                                        >
                                            {p.isWinner ? 'W' : p.isDraw ? 'D' : 'L'}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {recentMatches.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                <p className="font-semibold">No finished matches recorded yet this season.</p>
                                <p className="text-[11px] text-slate-400">Official tournament and interclub results will be synced here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {recentMatches.map((match: any) => {
                                    const opponent = match.opponent;
                                    const isWin = match.isWinner;
                                    const eloChange = match.eloChange;

                                    return (
                                        <div
                                            key={match.id}
                                            className="py-3 sm:py-3.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span
                                                    className={`h-7 w-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                                        isWin
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                                    }`}
                                                >
                                                    {isWin ? 'W' : 'L'}
                                                </span>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                            vs {opponent ? `${opponent.firstName} ${opponent.lastName}` : 'Opponent'}
                                                        </span>
                                                        {opponent?.eloPoints && (
                                                            <span className="text-[10px] font-mono text-slate-400">
                                                                ({Math.round(opponent.eloPoints)} pts)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                                            {match.setsHome !== undefined && match.setsAway !== undefined
                                                                ? `${match.isHome ? match.setsHome : match.setsAway}:${match.isHome ? match.setsAway : match.setsHome}`
                                                                : 'Match finished'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                                            {match.category?.competition?.name || match.category?.name || 'League Encounter'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Elo change badge */}
                                            {eloChange !== undefined && eloChange !== null && (
                                                <span
                                                    className={`shrink-0 font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                                                        eloChange > 0
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                            : eloChange < 0
                                                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {eloChange > 0 ? `+${eloChange.toFixed(1)}` : eloChange.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Link
                                href={`/people/${user?.licenseId || user?.id}?tab=statistics`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                            >
                                <span>View complete statistics & head-to-head records</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>

                    {/* My Teams & Interclub Roster */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Users className="h-5 w-5 text-blue-500" />
                                <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                                    My Teams & Interclub Standings
                                </h2>
                            </div>

                            <Link
                                href="/team-hub"
                                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                            >
                                <span>Team Hub</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {teams.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                                <p className="font-semibold">You are not currently listed on any active team rosters.</p>
                                <p className="text-[11px] text-slate-400">Ask your club administrator to assign you to a team roster.</p>
                                <Link
                                    href="/clubs"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                                >
                                    <span>Browse Club Directory</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {teams.map((team: any) => (
                                    <Link
                                        key={team.id}
                                        href={`/competition/${team.category?.competitionId || ''}/category/${team.categoryId || ''}`}
                                        className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 hover:border-blue-500 transition space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2 py-0.5 text-[10px] font-bold font-mono">
                                                {team.category?.name || 'League Team'}
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition" />
                                        </div>

                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                            {team.name}
                                        </h3>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {team.club?.name || 'Club'}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Next Match Schedule & Quick Utilities */}
                <div className="space-y-6">
                    {/* Live Match Arena Callout (if active matches) */}
                    {liveEncounters.length > 0 && (
                        <div className="rounded-3xl border border-red-200 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40 p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 font-mono">
                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                                    LIVE MATCHES ({liveEncounters.length})
                                </span>
                                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                            </div>

                            <p className="text-xs text-slate-700 dark:text-slate-300">
                                Live referee scorecards are active right now. Follow real-time point tickers.
                            </p>

                            <Link
                                href="/competitions"
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 py-2 text-xs font-bold transition shadow-xs"
                            >
                                <span>View Live Arena</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* Quick Tools Box */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-sm uppercase tracking-wider text-slate-400 font-mono">
                            Swiss TT Quick Tools
                        </h3>

                        <div className="space-y-2">
                            <Link
                                href="/utilities/elo-calculator"
                                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                        <Calculator className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                            Elo Point Calculator
                                        </div>
                                        <div className="text-[10px] text-slate-400">Simulate match rating gains/losses</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition" />
                            </Link>

                            <Link
                                href="/utilities/level-table"
                                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                        <Target className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                            Classification Matrix (D1–A20)
                                        </div>
                                        <div className="text-[10px] text-slate-400">Swiss ranking threshold tables</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition" />
                            </Link>

                            <Link
                                href="/guide"
                                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                            Getting Started & Guide Hub
                                        </div>
                                        <div className="text-[10px] text-slate-400">Role handbooks, rules & licensing</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
