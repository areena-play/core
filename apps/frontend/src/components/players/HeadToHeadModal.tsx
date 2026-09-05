'use client';

import React, { useState } from 'react';
import {
    X,
    Users,
    Trophy,
    TrendingUp,
    Flame,
    Swords,
    ChevronRight,
    Search,
    Shield,
    Calendar,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/pwa/useHaptics';

export interface PlayerSummary {
    id: string;
    name: string;
    club: string;
    elo: number;
    avatar?: string;
    category?: string;
    winRate: number;
}

export interface PastH2HMatch {
    id: string;
    date: string;
    tournament: string;
    winnerId: string;
    score: string;
}

interface HeadToHeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPlayer1?: PlayerSummary;
    initialPlayer2?: PlayerSummary;
}

export function HeadToHeadModal({
    isOpen,
    onClose,
    initialPlayer1,
    initialPlayer2,
}: HeadToHeadModalProps) {
    const [p1, setP1] = useState<PlayerSummary>(
        initialPlayer1 || {
            id: 'u_1',
            name: 'Dominic Sonderegger',
            club: 'TTC Bern',
            elo: 1640,
            winRate: 68,
        }
    );

    const [p2, setP2] = useState<PlayerSummary>(
        initialPlayer2 || {
            id: 'u_2',
            name: 'Luca Bernasconi',
            club: 'TTC Zürich-Affoltern',
            elo: 1590,
            winRate: 62,
        }
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [selectingPlayerIndex, setSelectingPlayerIndex] = useState<1 | 2 | null>(null);

    // Mock head to head history
    const pastMatches: PastH2HMatch[] = [
        {
            id: 'h2h_1',
            date: '14.02.2026',
            tournament: 'Swiss Cup Round 3',
            winnerId: 'u_1',
            score: '3:1 (11:9, 8:11, 11:7, 11:8)',
        },
        {
            id: 'h2h_2',
            date: '28.11.2025',
            tournament: 'Bernese Cantonals 2025',
            winnerId: 'u_1',
            score: '3:2 (9:11, 11:6, 7:11, 12:10, 11:9)',
        },
        {
            id: 'h2h_3',
            date: '15.09.2025',
            tournament: 'National Masters Open',
            winnerId: 'u_2',
            score: '3:0 (11:8, 11:9, 11:7)',
        },
    ];

    if (!isOpen) return null;

    const p1Wins = pastMatches.filter((m) => m.winnerId === p1.id).length;
    const p2Wins = pastMatches.filter((m) => m.winnerId === p2.id).length;
    const totalMatches = pastMatches.length;
    const p1WinPct = totalMatches > 0 ? Math.round((p1Wins / totalMatches) * 100) : 50;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <Swords className="h-4 w-4" />
                        </div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">
                            Head-to-Head Comparison
                        </h2>
                    </div>
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            onClose();
                        }}
                        className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Versus Comparison Cards */}
                    <div className="grid grid-cols-2 gap-3 relative">
                        {/* Player 1 Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-b from-red-500/10 to-red-500/5 border border-red-500/20 text-center flex flex-col items-center">
                            <div className="h-12 w-12 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-lg mb-2 shadow-md shadow-red-500/30">
                                {p1.name.slice(0, 2).toUpperCase()}
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate w-full">{p1.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">{p1.club}</p>
                            <div className="mt-3 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black">
                                {p1.elo} ELO
                            </div>
                        </div>

                        {/* VS Badge */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-lg z-10">
                            VS
                        </div>

                        {/* Player 2 Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-500/10 to-blue-500/5 border border-blue-500/20 text-center flex flex-col items-center">
                            <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg mb-2 shadow-md shadow-blue-500/30">
                                {p2.name.slice(0, 2).toUpperCase()}
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate w-full">{p2.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">{p2.club}</p>
                            <div className="mt-3 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-black">
                                {p2.elo} ELO
                            </div>
                        </div>
                    </div>

                    {/* Win Bar Ratio */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-red-600 dark:text-red-400">{p1Wins} Wins ({p1WinPct}%)</span>
                            <span className="text-slate-500">{totalMatches} Encounters</span>
                            <span className="text-blue-600 dark:text-blue-400">{p2Wins} Wins ({100 - p1WinPct}%)</span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                            <div
                                style={{ width: `${p1WinPct}%` }}
                                className="bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-500"
                            />
                            <div
                                style={{ width: `${100 - p1WinPct}%` }}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                            />
                        </div>
                    </div>

                    {/* Stats Comparison Grid */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Comparative Metrics
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">{p1.elo}</div>
                            <div className="text-slate-500">Current Rating</div>
                            <div className="font-bold text-slate-900 dark:text-white">{p2.elo}</div>

                            <div className="font-bold text-emerald-600 dark:text-emerald-400">{p1.winRate}%</div>
                            <div className="text-slate-500">Season Win Rate</div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">{p2.winRate}%</div>

                            <div className="font-bold text-slate-900 dark:text-white">{p1.elo > p2.elo ? `+${p1.elo - p2.elo}` : '0'}</div>
                            <div className="text-slate-500">Rating Advantage</div>
                            <div className="font-bold text-slate-900 dark:text-white">{p2.elo > p1.elo ? `+${p2.elo - p1.elo}` : '0'}</div>
                        </div>
                    </div>

                    {/* Encounter History */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                            <span>Past Match Records</span>
                        </h4>
                        <div className="space-y-2">
                            {pastMatches.map((m) => (
                                <div
                                    key={m.id}
                                    className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                                >
                                    <div>
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {m.tournament}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {m.date}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                m.winnerId === p1.id
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                            }`}
                                        >
                                            {m.winnerId === p1.id ? p1.name.split(' ')[0] : p2.name.split(' ')[0]} Won
                                        </span>
                                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                            {m.score}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
