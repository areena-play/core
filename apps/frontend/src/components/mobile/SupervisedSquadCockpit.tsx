'use client';

import React, { useState } from 'react';
import {
    Users,
    Zap,
    MapPin,
    Clock,
    CheckCircle2,
    Flame,
    Award,
    ChevronRight,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/pwa/useHaptics';

export interface SupervisedKidStatus {
    id: string;
    name: string;
    club: string;
    elo: number;
    category: string;
    currentTable?: string;
    opponentName?: string;
    status: 'PLAYING' | 'NEXT_UP' | 'QUEUED' | 'FINISHED';
    scores?: { myScore: number; oppScore: number }[];
    estimatedStartTime?: string;
}

export function SupervisedSquadCockpit({
    onOpenScorepad,
}: {
    onOpenScorepad?: (kid: SupervisedKidStatus) => void;
}) {
    // Sample live squad data for coach/parent
    const [squad, setSquad] = useState<SupervisedKidStatus[]>([
        {
            id: 'k_1',
            name: 'Leo Sonderegger',
            club: 'TTC Bern',
            elo: 1120,
            category: "Boys U13",
            currentTable: 'Table 4',
            opponentName: 'Luca Bernasconi',
            status: 'PLAYING',
            scores: [{ myScore: 11, oppScore: 9 }, { myScore: 8, oppScore: 11 }, { myScore: 9, oppScore: 7 }],
        },
        {
            id: 'k_2',
            name: 'Mia Sonderegger',
            club: 'TTC Bern',
            elo: 980,
            category: "Girls U11",
            currentTable: 'Table 2',
            opponentName: 'Sarah Schneider',
            status: 'NEXT_UP',
            estimatedStartTime: 'Approx. 15:10 (Table 2)',
        },
        {
            id: 'k_3',
            name: 'Tim Keller',
            club: 'TTC Bern',
            elo: 1040,
            category: "Boys U15",
            status: 'FINISHED',
            opponentName: 'Jan Kohler',
            scores: [{ myScore: 11, oppScore: 6 }, { myScore: 11, oppScore: 8 }, { myScore: 11, oppScore: 7 }],
        },
    ]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    My Supervised Squad ({squad.length} Players)
                </span>
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                    {squad.filter((s) => s.status === 'PLAYING').length} Playing Now
                </span>
            </div>

            {squad.map((kid) => (
                <div
                    key={kid.id}
                    className={`p-4 rounded-2xl border transition shadow-sm space-y-3 ${
                        kid.status === 'PLAYING'
                            ? 'bg-gradient-to-br from-red-500/10 via-white dark:via-slate-900 to-white dark:to-slate-900 border-red-500/80'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {kid.name}
                            </span>
                            <span className="text-[11px] text-slate-500">({kid.category})</span>
                        </div>

                        {kid.status === 'PLAYING' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase tracking-wider animate-pulse flex items-center space-x-1">
                                <Zap className="h-3 w-3 fill-white" />
                                <span>{kid.currentTable}</span>
                            </span>
                        ) : kid.status === 'NEXT_UP' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Next Up
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Won 3:0
                            </span>
                        )}
                    </div>

                    {/* Opponent & Table Info */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <div>
                            <span>vs. {kid.opponentName}</span>
                        </div>
                        {kid.estimatedStartTime && (
                            <div className="text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{kid.estimatedStartTime}</span>
                            </div>
                        )}
                    </div>

                    {/* Scores row if active or finished */}
                    {kid.scores && kid.scores.length > 0 && (
                        <div className="flex items-center space-x-1.5 pt-1">
                            {kid.scores.map((set, idx) => (
                                <span
                                    key={idx}
                                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                                        set.myScore > set.oppScore
                                            ? 'bg-red-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                    }`}
                                >
                                    {set.myScore}:{set.oppScore}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Action button */}
                    {kid.status === 'PLAYING' && (
                        <button
                            onClick={() => {
                                triggerHaptic('medium');
                                if (onOpenScorepad) onOpenScorepad(kid);
                                else if (typeof window !== 'undefined') {
                                    window.dispatchEvent(
                                        new CustomEvent('areena:open-scorepad', {
                                            detail: {
                                                player1Name: kid.name,
                                                player2Name: kid.opponentName,
                                                unitName: kid.currentTable,
                                                matchCategory: kid.category,
                                            },
                                        })
                                    );
                                }
                            }}
                            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow transition"
                        >
                            <Zap className="h-3.5 w-3.5 fill-white" />
                            <span>Open Live Scorecard for {kid.name.split(' ')[0]}</span>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
