'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useWebSocket } from '@/lib/useWebSocket';
import {
    Trophy,
    Award,
    Users,
    Calendar,
    Shield,
    ArrowRight,
    Flame,
    ChevronRight,
    Sparkles,
    Radio,
    Tv,
    BookOpen,
    Building2,
    Mail,
    Phone,
    Globe,
    ExternalLink,
    MapPin,
    Calculator,
    Activity,
    Search,
    User,
    Target,
} from 'lucide-react';

interface GuestPortalDashboardProps {
    clubs: any[];
    competitions: any[];
    liveEncounters: any[];
}

export function GuestPortalDashboard({ clubs, competitions, liveEncounters }: GuestPortalDashboardProps) {
    const { t, formatDate } = useI18n();
    const router = useRouter();
    const { associations, mainAssoc } = useMainView();

    // Instant Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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

    const nationalAssoc = useMemo(() => {
        return associations.find((a) => a.isTopLevel) || mainAssoc || associations[0];
    }, [associations, mainAssoc]);

    // Live Tournaments
    const liveTournaments = useMemo(() => {
        return competitions.filter((c) => {
            return c.type === 'TOURNAMENT' || c.type === 'CUP' || c.type === 'RANKING_TOURNAMENT';
        });
    }, [competitions]);

    // Live matches stream
    const liveStreamMatches = useMemo(() => {
        const matches: any[] = [];
        liveEncounters.forEach((enc) => {
            if (enc.matches && enc.matches.length > 0) {
                enc.matches.forEach((m: any) => {
                    matches.push({
                        ...m,
                        encounter: enc,
                        competition: enc.category?.competition,
                        category: enc.category,
                    });
                });
            } else {
                matches.push({
                    id: enc.id,
                    encounter: enc,
                    competition: enc.category?.competition,
                    category: enc.category,
                    isEncounterLevel: true,
                });
            }
        });
        return matches;
    }, [liveEncounters]);

    return (
        <div className="space-y-8 md:space-y-10 max-w-6xl mx-auto pb-16">
            {/* HERO SEARCH & WELCOME BANNER */}
            <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-100/90 via-white to-rose-50/50 p-6 sm:p-10 shadow-sm dark:border-red-900/40 dark:bg-gradient-to-br dark:from-red-950/80 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl transition-all">
                <div className="relative z-10 max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-600/10 dark:bg-red-600/20 px-3.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        <span>{nationalAssoc?.name || 'Swiss Table Tennis'} • Official Sports Platform</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                        Swiss Table Tennis Live Scores & Ratings
                    </h1>

                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                        Find any licensed player, look up club rankings, explore tournament schedules, and follow live referee point-by-point streams.
                    </p>

                    {/* Integrated Search Box */}
                    <div className="relative pt-2 max-w-2xl">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search players, clubs, license numbers, leagues..."
                                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-12 pr-4 py-3.5 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-md"
                            />
                            {isSearching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <span className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
                                </div>
                            )}
                        </div>

                        {/* Instant Search Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-30 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
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
                                        className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                                                {item.type === 'PERSON' || item.type === 'PLAYER' ? (
                                                    <User className="h-4 w-4 text-red-500" />
                                                ) : item.type === 'CLUB' ? (
                                                    <Building2 className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <Trophy className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {item.name || `${item.firstName} ${item.lastName}`}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {item.subtitle || item.clubName || (item.licenseId ? `License #${item.licenseId}` : item.type)}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-red-700 transition"
                        >
                            <User className="h-4 w-4" />
                            <span>Sign In to Player Portal</span>
                        </Link>

                        <Link
                            href="/guide"
                            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
                        >
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            <span>Getting Started & Guide Hub</span>
                        </Link>

                        <Link
                            href="/utilities/level-table"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-xs"
                        >
                            <Target className="h-4 w-4 text-purple-500" />
                            <span>Classification Matrix</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* LIVE MATCH ARENA (IF ANY ACTIVE MATCHES) */}
            {liveStreamMatches.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                                <span>Live Match Arena (Referee Point Stream)</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                Point-by-point updates from active championship and league fixtures.
                            </p>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-3 py-1 text-xs font-bold font-mono">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                            <span>LIVE</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {liveStreamMatches.map((item, idx) => {
                            const enc = item.encounter;
                            const comp = item.competition;
                            const sets = Array.isArray(item.sets) ? item.sets : [];

                            return (
                                <div
                                    key={item.id || idx}
                                    className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-md bg-red-50 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 font-mono">
                                            {comp?.name || 'Live Match'}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                            OFFICIAL SCORECARD
                                        </span>
                                    </div>

                                    {/* Score Card */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[150px]">
                                                {item.homePlayer1
                                                    ? `${item.homePlayer1.firstName} ${item.homePlayer1.lastName}`
                                                    : enc?.homeTeam?.name || 'Home'}
                                            </div>
                                            <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                                                {item.homeScore ?? item.homeWonSets ?? enc?.homeScore ?? 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[150px]">
                                                {item.awayPlayer1
                                                    ? `${item.awayPlayer1.firstName} ${item.awayPlayer1.lastName}`
                                                    : enc?.awayTeam?.name || 'Away'}
                                            </div>
                                            <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                                                {item.awayScore ?? item.awayWonSets ?? enc?.awayScore ?? 0}
                                            </span>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/competition/${comp?.id || enc?.category?.competitionId || ''}/encounter/${enc?.id || ''}`}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-600 dark:hover:text-white py-2 text-xs font-bold transition"
                                    >
                                        <span>Open Live Match Scoresheet</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* LIVE TOURNAMENTS & FEATURED EVENTS */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <span>Tournaments & Open Cups</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Upcoming individual tournaments, youth circuits, and national cups.
                        </p>
                    </div>

                    <Link
                        href="/competitions?type=TOURNAMENT"
                        className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                    >
                        <span>All Competitions</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {liveTournaments.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                        No upcoming tournaments scheduled at this moment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {liveTournaments.map((tourn) => (
                            <div
                                key={tourn.id}
                                className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 hover:border-amber-500/60 transition shadow-sm space-y-3 flex flex-col justify-between"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 uppercase font-mono">
                                            {tourn.type}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {formatDate(tourn.startDate, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition line-clamp-1">
                                        {tourn.name}
                                    </h3>

                                    {tourn.location && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span>{tourn.location}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        {tourn.categories?.length || 0} Categories
                                    </span>
                                    <Link
                                        href={`/competition/${tourn.id}`}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white px-3 py-1.5 text-xs font-bold transition"
                                    >
                                        <span>View Details</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CALLOUT BANNER: GUIDE & FEDERATION ONBOARDING */}
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:border-blue-900/40 dark:bg-gradient-to-r dark:from-slate-900 dark:to-blue-950/40 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">
                        <BookOpen className="h-4 w-4" />
                        <span>Knowledge Center & Handbook</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        New to Swiss Table Tennis or AREENA?
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                        Read our role-by-role guides for players, club managers, coaches, referees, and parents. Learn how licenses, rankings, and transfers work.
                    </p>
                </div>

                <Link
                    href="/guide"
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-xs sm:text-sm font-bold transition shadow-sm whitespace-nowrap shrink-0"
                >
                    <span>Open Getting Started Guide</span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
