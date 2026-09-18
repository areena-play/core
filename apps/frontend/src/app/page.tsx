'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useTheme } from '@/lib/themeContext';
import { useWebSocket } from '@/lib/useWebSocket';
import {
    Trophy,
    Award,
    Users,
    Calendar,
    Shield,
    ArrowRight,
    Flame,
    CheckCircle2,
    ChevronRight,
    Sparkles,
    Network,
    Tv,
    Radio,
    Zap,
    BookOpen,
    HelpCircle,
    Building2,
    Mail,
    Phone,
    Globe,
    ExternalLink,
    MapPin,
    Clock,
    FileText,
    Calculator,
    Activity,
    Layers,
    UserCheck,
} from 'lucide-react';
import { LiveTicker } from '@/components/layout/LiveTicker';

export default function DashboardPage() {
    const { user } = useAuth();
    const { t, formatDate } = useI18n();
    const { associations, mainAssoc } = useMainView();
    const { resolvedTheme } = useTheme();

    const [clubs, setClubs] = useState<any[]>([]);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [liveEncounters, setLiveEncounters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    const fetchData = async () => {
        try {
            const [clubsRes, compRes, liveRes] = await Promise.allSettled([
                api.getClubs(),
                api.getCompetitions(),
                api.getLiveEncounters(),
            ]);

            if (clubsRes.status === 'fulfilled') setClubs(clubsRes.value || []);
            if (compRes.status === 'fulfilled') setCompetitions(compRes.value || []);
            if (liveRes.status === 'fulfilled') setLiveEncounters(liveRes.value || []);
        } catch (err) {
            console.error('Failed to load home page data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Listen to real-time score updates from Redis pub/sub over WebSocket
    useWebSocket((event) => {
        if (event.channel === 'areena:scores' || event.channel === 'areena:encounters') {
            api.getLiveEncounters()
                .then((data) => setLiveEncounters(data || []))
                .catch(() => {});
        }
    });

    const nationalAssoc = useMemo(() => {
        return associations.find((a) => a.isTopLevel) || mainAssoc || associations[0];
    }, [associations, mainAssoc]);

    const regionalAssocs = useMemo(() => {
        return associations.filter((a) => !a.isTopLevel);
    }, [associations]);

    // 1. LIVE TOURNAMENTS ONLY (NO Leagues or Season Tournaments)
    const liveTournaments = useMemo(() => {
        return competitions.filter((c) => {
            const isTournamentOnly =
                c.type === 'TOURNAMENT' ||
                c.type === 'CUP' ||
                c.type === 'RANKING_TOURNAMENT';
            return isTournamentOnly;
        });
    }, [competitions]);

    // 2. High-Profile Matches with Live Referee Point-by-Point Updates (e.g. NLA, National Championships)
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
                // If encounter itself is live without child matches breakdown
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
        <div className="space-y-8 md:space-y-12 pb-16">
            {/* Live Ticker Bar at Top */}
            <LiveTicker />

            {/* SECTION: Hero Welcome Banner with Quick Status */}
            <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-100/90 via-white to-rose-50/50 p-6 sm:p-8 md:p-10 shadow-sm dark:border-red-900/40 dark:bg-gradient-to-br dark:from-red-950/80 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl transition-all">
                <div className="relative z-10 max-w-4xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-600/10 dark:bg-red-600/20 px-3.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        <span>{nationalAssoc?.name} • Official AREENA Portal</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                        Live Sports, Rankings & Competition Network
                    </h1>

                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                        Discover live national tournaments, watch real-time referee scorecards, request player & referee licenses, and explore the Swiss table tennis association hierarchy.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <a
                            href="#live-matches"
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-red-700 transition"
                        >
                            <Radio className="h-4 w-4 animate-pulse" />
                            <span>Live Matches & Stream</span>
                        </a>

                        <a
                            href="#live-tournaments"
                            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
                        >
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span>Live Tournaments</span>
                        </a>

                        <a
                            href="#quick-licenses"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-slate-700 hover:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-sm"
                        >
                            <Award className="h-4 w-4 text-emerald-400" />
                            <span>Get License</span>
                        </a>

                        <a
                            href="#onboarding-guide"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 transition"
                        >
                            <HelpCircle className="h-4 w-4" />
                            <span>New to AREENA?</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* SECTION 5: MATCHES WITH LIVE RESULTS & REFEREE POINT-BY-POINT STREAM */}
            <div id="live-matches" className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                            <span>Live Match Arena (Point-by-Point Referee Stream)</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Real-time digital scoreboards from National League A (NLA), Swiss Championship Finals & Elite Cups.
                        </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-3 py-1 text-xs font-bold font-mono">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        <span>LIVE STREAM</span>
                    </span>
                </div>

                {liveStreamMatches.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500">
                            <Tv className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            No Active Elite Match Streams Right Now
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            When referees officiate live championship fixtures, set scores and point tickers update here instantaneously.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {liveStreamMatches.map((item, idx) => {
                            const enc = item.encounter;
                            const comp = item.competition;
                            const sets = Array.isArray(item.sets) ? item.sets : [];

                            return (
                                <div
                                    key={item.id || idx}
                                    className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-white dark:bg-slate-900/90 p-5 shadow-sm hover:shadow-md transition space-y-4 relative overflow-hidden"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-md bg-red-50 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/40 font-mono">
                                            {comp?.name || 'National Championship'}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                            OFFICIAL SCORECARD
                                        </span>
                                    </div>

                                    {/* Score Card */}
                                    <div className="space-y-2.5">
                                        {/* Home Side */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                                    H
                                                </div>
                                                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[140px]">
                                                    {item.homePlayer1
                                                        ? `${item.homePlayer1.firstName} ${item.homePlayer1.lastName}`
                                                        : enc?.homeTeam?.name || 'Home Player'}
                                                </div>
                                            </div>
                                            <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                                                {item.homeScore ?? item.homeWonSets ?? enc?.homeScore ?? 0}
                                            </span>
                                        </div>

                                        {/* Away Side */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                                                    A
                                                </div>
                                                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[140px]">
                                                    {item.awayPlayer1
                                                        ? `${item.awayPlayer1.firstName} ${item.awayPlayer1.lastName}`
                                                        : enc?.awayTeam?.name || 'Away Player'}
                                                </div>
                                            </div>
                                            <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                                                {item.awayScore ?? item.awayWonSets ?? enc?.awayScore ?? 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sets Breakdown if present */}
                                    {sets.length > 0 && (
                                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto text-[11px] font-mono">
                                            <span className="text-slate-400 text-[10px]">Sets:</span>
                                            {sets.map((s: any, sIdx: number) => (
                                                <span
                                                    key={sIdx}
                                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                >
                                                    {s.home}:{s.away}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <Link
                                        href={`/competition/${comp?.id || enc?.category?.competitionId || ''}/encounter/${enc?.id || ''}`}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-600 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-600 dark:hover:text-white py-2 text-xs font-bold transition shadow-xs"
                                    >
                                        <span>Open Live Match Scoresheet</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 1: LIVE TOURNAMENTS HAPPENING RIGHT NOW (NO LEAGUES / SEASON TOURNAMENTS) */}
            <div id="live-tournaments" className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <span>Live Tournaments & Open Cups</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Official individual tournaments, qualification circuits, and national cup events (leagues excluded).
                        </p>
                    </div>

                    <Link
                        href="/competitions?type=TOURNAMENT"
                        className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                    >
                        <span>All Tournaments</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {liveTournaments.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                        No individual tournaments scheduled right now.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {liveTournaments.map((tourn) => (
                            <div
                                key={tourn.id}
                                className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 hover:border-amber-500/60 dark:hover:border-amber-500/60 transition shadow-sm space-y-3.5 flex flex-col justify-between"
                            >
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 uppercase">
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

                                    {tourn.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {tourn.description}
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
                                        <span>Tournament Hub</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 2: ONBOARDING FOR NEW USERS */}
            <div id="onboarding-guide" className="space-y-5">
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        <span>Getting Started with AREENA (Athlete & Club Onboarding)</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Everything you need to know about joining clubs, entering competitions, obtaining licenses, and tracking ratings.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Track 1: Find Clubs & Play */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                1. Find a Club & Train
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Join a licensed table tennis club in your region, participate in group training, and join official league rosters.
                            </p>
                        </div>
                        <Link
                            href="/clubs"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-2"
                        >
                            <span>Browse Clubs ({clubs.length})</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Track 2: Open Tournaments */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                2. Compete in Tournaments
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Register for open tournaments, Swiss circuit series, youth rankings, and regional championships across Switzerland.
                            </p>
                        </div>
                        <Link
                            href="/competitions"
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-2"
                        >
                            <span>Explore Calendar</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Track 3: Licenses & Passports */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <Award className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                3. Get Your License ID
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Your permanent license number is generated upon first approval. Choose from seasonal passes or tournament-only cards.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-2"
                        >
                            <span>Request License</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Track 4: Elo & Level Matrix */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                4. Elo & Level Classification
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Track your official skill tier (D1 to A20), simulate rating deltas, and review monthly ranking list updates.
                            </p>
                        </div>
                        <Link
                            href="/utilities/level-table"
                            className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-2"
                        >
                            <span>View Level Matrix</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* SECTION 4: QUICK ACCESS TO REQUEST NEW LICENSES */}
            <div id="quick-licenses" className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            <Award className="h-5 w-5 text-emerald-500" />
                            <span>Quick License Request Hub</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Apply for digital competition passports, short-term tournament passes, or official referee/coach credentials.
                        </p>
                    </div>

                    <Link
                        href="/profile?tab=licenses"
                        className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                    >
                        <span>My Licenses</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Regular Player License */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-mono">
                                    FULL SEASON
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">Club Affiliated</span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                Regular Player License
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Valid for all interclub league matches and open national tournaments throughout the entire season.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true&type=PLAYER_REGULAR"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition shadow-xs"
                        >
                            <span>Apply Regular License</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* 2. Tournament / Short-term Pass */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 font-mono">
                                    EVENT PASS / T-CARD
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">No Club Required</span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                Short-Term Tournament Pass
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Single event or day license for guest participants, foreign players, and open recreational competitions.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true&type=PLAYER_TCARD"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold transition shadow-xs"
                        >
                            <span>Get Tournament Pass</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* 3. Official Coach / Referee Pass */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 font-mono">
                                    OFFICIAL
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">Refresher Compliant</span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                Referee & Coach Pass
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Federation certified official credentials with automated refresher course attendance tracking.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true&type=REFEREE"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white py-2.5 text-xs font-bold transition shadow-xs"
                        >
                            <span>Request Official Pass</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* SECTION 3: GRAPHICAL OVERVIEW OF THE SUB-ASSOCIATIONS */}
            <div className="space-y-5">
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        <Network className="h-5 w-5 text-red-500" />
                        <span>Federation & Sub-Associations Hierarchy (DAG Network)</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Multi-tier governance network connecting the National Swiss Federation to regional sub-associations.
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm space-y-6">
                    {/* Top Level Federation Node */}
                    <div className="flex flex-col items-center">
                        <div className="rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/80 p-5 shadow-md text-center max-w-md w-full space-y-2">
                            <span className="rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase">
                                Top-Level National Federation
                            </span>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                {nationalAssoc?.name || 'Swiss Table Tennis (STT)'}
                            </h3>
                            <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400 pt-1">
                                <span>Code: <strong>{nationalAssoc?.code || 'STT'}</strong></span>
                                <span>•</span>
                                <span>Clubs: <strong>{clubs.length}</strong></span>
                                <span>•</span>
                                <span>Regions: <strong>{regionalAssocs.length}</strong></span>
                            </div>
                        </div>

                        {/* Connection Tree Line */}
                        <div className="h-8 w-0.5 bg-red-300 dark:bg-red-800 my-1" />
                        <div className="h-0.5 w-3/4 max-w-2xl bg-red-300 dark:bg-red-800" />
                    </div>

                    {/* Regional Sub-Associations Nodes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                        {regionalAssocs.length === 0 ? (
                            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    No regional sub-associations created yet.
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Import from ClickTT or add regional federations in Management Settings.
                                </p>
                            </div>
                        ) : (
                            regionalAssocs.map((ra) => (
                                <Link
                                    key={ra.id}
                                    href={`/association/${ra.id}`}
                                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 text-center space-y-1.5 hover:border-red-500 transition shadow-xs"
                                >
                                    <span className="font-mono font-black text-xs text-red-600 dark:text-red-400 group-hover:underline">
                                        {ra.code}
                                    </span>
                                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {ra.shortName || ra.name}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        Level: {ra.level}
                                    </p>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* SECTION 6: IMPRESSUM OF THE MAIN FEDERATION */}
            <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 shrink-0">
                            <Image src="/icon.svg" alt="AREENA" fill className="object-contain" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                {nationalAssoc?.rules?.impressum?.organizationName || nationalAssoc?.name} • Impressum
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {nationalAssoc?.rules?.impressum?.customLegalNotes || 'Official Sports Platform Governance & Federation Administration'}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/impressum"
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                    >
                        <span>Full Legal & Tech Impressum</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-300">
                    {/* Federation Entity */}
                    <div className="space-y-2">
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-red-500" />
                            <span>Federation Headquarters</span>
                        </div>
                        <p className="leading-relaxed">
                            {nationalAssoc?.rules?.impressum?.organizationName || nationalAssoc?.name || 'Swiss Table Tennis (STT)'}<br />
                            {nationalAssoc?.rules?.impressum?.addressLine1 || 'Haus des Sports, Talgut-Zentrum 27'}<br />
                            {nationalAssoc?.rules?.impressum?.addressLine2 ? (
                                <>
                                    {nationalAssoc.rules.impressum.addressLine2}<br />
                                </>
                            ) : null}
                            {nationalAssoc?.rules?.impressum?.cityPostalCode || 'CH-3063 Ittigen / Bern'}, {nationalAssoc?.rules?.impressum?.country || 'Switzerland'}
                        </p>
                        <p className="text-slate-400 font-mono text-[11px]">
                            UID: {nationalAssoc?.rules?.impressum?.uidNumber || 'CHE-107.822.451'}
                            {nationalAssoc?.rules?.impressum?.affiliation
                                ? ` • ${nationalAssoc.rules.impressum.affiliation}`
                                : ' • Swiss Olympic Member'}
                        </p>
                    </div>

                    {/* Contact & Support */}
                    <div className="space-y-2">
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-red-500" />
                            <span>Official Contact</span>
                        </div>
                        <p className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{nationalAssoc?.rules?.impressum?.email || 'info@swisstabletennis.ch'}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{nationalAssoc?.rules?.impressum?.phone || '+41 (0)31 359 73 90'}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            <span>{nationalAssoc?.rules?.impressum?.website || 'www.swisstabletennis.ch'}</span>
                        </p>
                    </div>

                    {/* Governance & Software Stack */}
                    <div className="space-y-2">
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-red-500" />
                            <span>Platform Engine</span>
                        </div>
                        <p className="leading-relaxed">
                            Operating System: <strong>AREENA v{process.env.NEXT_PUBLIC_APP_VERSION || '1.4.0'}</strong><br />
                            Rating Standard: <strong>FIDE / STT Elo & Classification Matrix (D1–A20)</strong><br />
                            Tournament Engine: <strong>DAG Multi-Parent League & Swiss Circuit</strong>
                        </p>
                        {nationalAssoc?.rules?.impressum?.presidentName && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                                Leadership: <strong>{nationalAssoc.rules.impressum.presidentName}</strong>
                            </p>
                        )}
                        <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <Link href="/manual" className="hover:underline">User Manual</Link>
                            <span>•</span>
                            <Link href="/data-protection" className="hover:underline">Data Protection</Link>
                            <span>•</span>
                            <Link href="/developers" className="hover:underline">API & OAuth</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
