'use client';

import React, { useState } from 'react';
import {
    MapPin,
    Clock,
    RefreshCw,
    ChevronRight,
    CheckCircle2,
    Zap,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/pwa/useHaptics';
import { PushNotificationCard } from '@/components/pwa/PushNotificationCard';

export interface LiveMatchItem {
    id: string;
    table: string;
    category: string;
    stage: string;
    p1Name: string;
    p2Name: string;
    p1Club?: string;
    p2Club?: string;
    p1Score: number[];
    p2Score: number[];
    isCurrentUserMatch?: boolean;
    status: 'IN_PROGRESS' | 'CALLED' | 'UPCOMING' | 'COMPLETED';
    estimatedStartTime?: string;
    refereeName?: string;
}

export interface LiveTournamentCockpitProps {
    tournamentId?: string;
    tournamentName?: string;
    locationName?: string;
    onOpenScorepadForMatch?: (match: LiveMatchItem) => void;
    embedded?: boolean;
}

export function LiveTournamentCockpit({
    tournamentId = 'tourn_demo_1',
    tournamentName = 'Swiss Open Table Tennis Championships 2026',
    locationName = 'Sporthalle Wankdorf, Bern',
    onOpenScorepadForMatch,
    embedded = false,
}: LiveTournamentCockpitProps) {
    const [selectedTab, setSelectedTab] = useState<'my' | 'live' | 'schedule'>('my');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const [matches, setMatches] = useState<LiveMatchItem[]>([
        {
            id: 'm_101',
            table: 'Table 4',
            category: "Men's Singles A",
            stage: 'Quarterfinal',
            p1Name: 'Dominic Sonderegger',
            p2Name: 'Luca Bernasconi',
            p1Club: 'TTC Bern',
            p2Club: 'TTC Zürich-Affoltern',
            p1Score: [11, 8, 9],
            p2Score: [9, 11, 7],
            isCurrentUserMatch: true,
            status: 'IN_PROGRESS',
            refereeName: 'Referee Marc Keller',
        },
        {
            id: 'm_102',
            table: 'Table 1',
            category: "Women's Singles Elite",
            stage: 'Semifinal',
            p1Name: 'Elena Rossi',
            p2Name: 'Sarah Schneider',
            p1Club: 'ZZ Lancy',
            p2Club: 'TTC Neuhausen',
            p1Score: [11, 12],
            p2Score: [7, 10],
            isCurrentUserMatch: false,
            status: 'IN_PROGRESS',
            refereeName: 'Self-Refereed',
        },
        {
            id: 'm_103',
            table: 'Table 2',
            category: "Men's Doubles B",
            stage: 'Round of 16',
            p1Name: 'Meyer / Schmid',
            p2Name: 'Brunner / Weber',
            p1Club: 'TTC Basel',
            p2Club: 'TTC St. Gallen',
            p1Score: [4],
            p2Score: [6],
            isCurrentUserMatch: false,
            status: 'IN_PROGRESS',
        },
        {
            id: 'm_104',
            table: 'Table 3',
            category: "Men's Singles B",
            stage: 'Semifinal',
            p1Name: 'Jan Kohler',
            p2Name: 'Fabian Ammann',
            p1Club: 'TTC Rio-Star Muttenz',
            p2Club: 'TTC Uster',
            p1Score: [],
            p2Score: [],
            isCurrentUserMatch: false,
            status: 'CALLED',
            estimatedStartTime: 'Calling to Table 3 now',
        },
        {
            id: 'm_105',
            table: 'Table 5',
            category: 'Mixed Doubles',
            stage: 'Quarterfinal',
            p1Name: 'Keller / Widmer',
            p2Name: 'Zimmermann / Steiner',
            p1Club: 'TTC Young Stars ZH',
            p2Club: 'TTC Lugano',
            p1Score: [],
            p2Score: [],
            isCurrentUserMatch: false,
            status: 'UPCOMING',
            estimatedStartTime: 'Approx. 15:45',
        },
    ]);

    const handleRefresh = () => {
        triggerHaptic('light');
        setIsRefreshing(true);
        setTimeout(() => {
            setLastUpdated(new Date());
            setIsRefreshing(false);
            triggerHaptic('success');
        }, 600);
    };

    const myMatch = matches.find((m) => m.isCurrentUserMatch);

    return (
        <div className={`flex flex-col space-y-4 ${embedded ? '' : 'max-w-2xl mx-auto pb-20'}`}>
            {/* Header / Live Indicator Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-5 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-red-600/20 blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-xs font-black uppercase tracking-widest text-red-400">
                            Live Arena Cockpit
                        </span>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
                        title="Refresh tournament feed"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 text-slate-300 ${isRefreshing ? 'animate-spin text-red-400' : ''}`} />
                    </button>
                </div>

                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-1">
                    {tournamentName}
                </h2>
                <div className="flex items-center text-xs text-slate-300 space-x-3">
                    <span className="flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5 text-red-400" />
                        <span>{locationName}</span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
            </div>

            {/* Live Push Alerts Toggle */}
            <PushNotificationCard compact />

            {/* Navigation Filter Tabs */}
            <div className="flex bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-2xl backdrop-blur">
                <button
                    onClick={() => {
                        triggerHaptic('light');
                        setSelectedTab('my');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                        selectedTab === 'my'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    My Assignment {myMatch && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">1</span>}
                </button>
                <button
                    onClick={() => {
                        triggerHaptic('light');
                        setSelectedTab('live');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                        selectedTab === 'live'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Active Tables ({matches.filter((m) => m.status === 'IN_PROGRESS').length})
                </button>
                <button
                    onClick={() => {
                        triggerHaptic('light');
                        setSelectedTab('schedule');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                        selectedTab === 'schedule'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Upcoming Calls
                </button>
            </div>

            {/* TAB 1: MY ASSIGNMENT / ACTIVE USER MATCH */}
            {selectedTab === 'my' && (
                <div className="space-y-3">
                    {myMatch ? (
                        <div className="border-2 border-red-500/80 bg-gradient-to-b from-red-500/10 via-white dark:via-slate-900 to-white dark:to-slate-900 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="px-2.5 py-1 bg-red-600 text-white font-black text-xs rounded-full uppercase tracking-wider flex items-center space-x-1">
                                        <Zap className="h-3.5 w-3.5 fill-white" />
                                        <span>{myMatch.table}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        {myMatch.category} • {myMatch.stage}
                                    </span>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    Live in Progress
                                </span>
                            </div>

                            {/* Player Head to Head in Match */}
                            <div className="space-y-3 my-4">
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                                    <div>
                                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                                            <span>{myMatch.p1Name}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-bold">YOU</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{myMatch.p1Club}</div>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                        {myMatch.p1Score.map((score, idx) => (
                                            <span
                                                key={idx}
                                                className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold ${
                                                    score > myMatch.p2Score[idx]
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {score}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                                    <div>
                                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                                            {myMatch.p2Name}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{myMatch.p2Club}</div>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                        {myMatch.p2Score.map((score, idx) => (
                                            <span
                                                key={idx}
                                                className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold ${
                                                    score > myMatch.p1Score[idx]
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {score}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="pt-2 flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={() => {
                                        triggerHaptic('medium');
                                        if (onOpenScorepadForMatch) {
                                            onOpenScorepadForMatch(myMatch);
                                        } else if (typeof window !== 'undefined') {
                                            window.dispatchEvent(
                                                new CustomEvent('areena:open-scorepad', {
                                                    detail: {
                                                        matchId: myMatch.id,
                                                        player1Name: myMatch.p1Name,
                                                        player2Name: myMatch.p2Name,
                                                        unitName: myMatch.table,
                                                        matchCategory: myMatch.category,
                                                    },
                                                })
                                            );
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-red-600/30 transition-all"
                                >
                                    <Zap className="h-4 w-4 fill-white" />
                                    <span>Open Live Referee Scorecard</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-800 dark:text-white text-base">No Assigned Match Right Now</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                                You are not currently assigned to a live table. You will receive an alert as soon as your next match is called.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ACTIVE TABLES OVERVIEW */}
            {selectedTab === 'live' && (
                <div className="space-y-3">
                    {matches
                        .filter((m) => m.status === 'IN_PROGRESS')
                        .map((match) => (
                            <div
                                key={match.id}
                                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                                            {match.table}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {match.category} • {match.stage}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            triggerHaptic('light');
                                            if (onOpenScorepadForMatch) {
                                                onOpenScorepadForMatch(match);
                                            } else if (typeof window !== 'undefined') {
                                                window.dispatchEvent(
                                                    new CustomEvent('areena:open-scorepad', {
                                                        detail: {
                                                            matchId: match.id,
                                                            player1Name: match.p1Name,
                                                            player2Name: match.p2Name,
                                                            unitName: match.table,
                                                            matchCategory: match.category,
                                                        },
                                                    })
                                                );
                                            }
                                        }}
                                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
                                    >
                                        <span>Scorepad</span>
                                        <ChevronRight className="h-3 w-3" />
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                                            {match.p1Name}
                                        </span>
                                        <div className="flex space-x-1">
                                            {match.p1Score.map((s, i) => (
                                                <span key={i} className="font-mono font-bold text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                                            {match.p2Name}
                                        </span>
                                        <div className="flex space-x-1">
                                            {match.p2Score.map((s, i) => (
                                                <span key={i} className="font-mono font-bold text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* TAB 3: UPCOMING CALLS / SCHEDULE */}
            {selectedTab === 'schedule' && (
                <div className="space-y-3">
                    {matches
                        .filter((m) => m.status === 'CALLED' || m.status === 'UPCOMING')
                        .map((match) => (
                            <div
                                key={match.id}
                                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {match.table}
                                        </span>
                                        <span className="text-xs text-slate-400">•</span>
                                        <span className="text-xs text-slate-500">{match.category}</span>
                                    </div>
                                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                                        {match.p1Name} <span className="text-xs font-normal text-slate-400">vs</span> {match.p2Name}
                                    </div>
                                    {match.estimatedStartTime && (
                                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{match.estimatedStartTime}</span>
                                        </div>
                                    )}
                                </div>

                                {match.status === 'CALLED' ? (
                                    <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold animate-pulse">
                                        Calling
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                                        Queued
                                    </span>
                                )}
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
