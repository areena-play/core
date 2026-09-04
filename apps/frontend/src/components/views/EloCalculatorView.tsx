'use client';

import React, { useState } from 'react';
import { Calculator, ArrowRight, Trophy, RefreshCw } from 'lucide-react';

interface EloCalculatorViewProps {
    scopedAssociationId?: string;
}

export function EloCalculatorView({ scopedAssociationId }: EloCalculatorViewProps) {
    const [p1Elo, setP1Elo] = useState<number>(1450);
    const [p2Elo, setP2Elo] = useState<number>(1420);
    const [kFactor, setKFactor] = useState<number>(32);
    const [winner, setWinner] = useState<'p1' | 'p2' | 'draw'>('p1');

    const expected1 = 1 / (1 + Math.pow(10, (p2Elo - p1Elo) / 400));
    const expected2 = 1 / (1 + Math.pow(10, (p1Elo - p2Elo) / 400));

    const actual1 = winner === 'p1' ? 1 : winner === 'draw' ? 0.5 : 0;
    const actual2 = winner === 'p2' ? 1 : winner === 'draw' ? 0.5 : 0;

    const delta1 = Math.round(kFactor * (actual1 - expected1));
    const delta2 = Math.round(kFactor * (actual2 - expected2));

    const newP1Elo = p1Elo + delta1;
    const newP2Elo = p2Elo + delta2;

    return (
        <div className="w-full space-y-6 pb-16">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1 text-[11px] font-bold uppercase">
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Official Rating System</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    FIDE / Swiss Elo Calculator
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Simulate real-time ranking point exchanges based on match outcomes and k-factor weightings.
                </p>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Player 1 Current ELO</label>
                        <input
                            type="number"
                            value={p1Elo}
                            onChange={(e) => setP1Elo(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono font-bold"
                        />
                        <span className="text-[11px] text-slate-400">Win Probability: {(expected1 * 100).toFixed(1)}%</span>
                    </div>

                    <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Player 2 Current ELO</label>
                        <input
                            type="number"
                            value={p2Elo}
                            onChange={(e) => setP2Elo(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono font-bold"
                        />
                        <span className="text-[11px] text-slate-400">Win Probability: {(expected2 * 100).toFixed(1)}%</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Match Outcome</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'p1', label: 'Player 1 Wins' },
                            { id: 'draw', label: 'Draw / Tie' },
                            { id: 'p2', label: 'Player 2 Wins' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => setWinner(btn.id as any)}
                                className={`rounded-xl py-2 text-xs font-bold transition ${winner === btn.id ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-950">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Player 1 New Rating</span>
                        <div className="text-2xl font-mono font-black text-slate-900 dark:text-white mt-1">
                            {newP1Elo} <span className={`text-xs ${delta1 >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>({delta1 >= 0 ? `+${delta1}` : delta1})</span>
                        </div>
                    </div>
                    <div className="text-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-950">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Player 2 New Rating</span>
                        <div className="text-2xl font-mono font-black text-slate-900 dark:text-white mt-1">
                            {newP2Elo} <span className={`text-xs ${delta2 >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>({delta2 >= 0 ? `+${delta2}` : delta2})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
