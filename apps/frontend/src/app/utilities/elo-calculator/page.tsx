'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Calculator,
    Trophy,
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    Sparkles,
    Shield,
    Users,
    HelpCircle,
    RotateCcw,
    Table,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';

export default function EloCalculatorPage() {
    const { t } = useI18n();

    const [eloA, setEloA] = useState<number>(1500);
    const [eloB, setEloB] = useState<number>(1500);
    const [kFactor, setKFactor] = useState<number>(32);
    const [winner, setWinner] = useState<'A' | 'B' | 'DRAW'>('A');

    // Expected probability formulas
    const diff = eloB - eloA;
    const expA = 1 / (1 + Math.pow(10, diff / 400));
    const expB = 1 - expA;

    // Actual score S_A, S_B
    const scoreA = winner === 'A' ? 1 : winner === 'B' ? 0 : 0.5;
    const scoreB = 1 - scoreA;

    // Delta points
    const deltaA = Math.round(kFactor * (scoreA - expA) * 10) / 10;
    const deltaB = Math.round(kFactor * (scoreB - expB) * 10) / 10;

    const newEloA = Math.round((eloA + deltaA) * 10) / 10;
    const newEloB = Math.round((eloB + deltaB) * 10) / 10;

    const handleReset = () => {
        setEloA(1500);
        setEloB(1500);
        setKFactor(32);
        setWinner('A');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-red-500" />
                        <span>{t('nav.eloCalculator')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Official AREENA Elo & Skill Rating Simulation Engine (FIDE / STT / Swiss Tournament Model)
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/utilities/level-table"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <Table className="h-4 w-4 text-amber-500" />
                        <span>{t('nav.levelTable')}</span>
                    </Link>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player A Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-sm">
                                A
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Player / Team A</h3>
                                <p className="text-[11px] text-slate-500">Current Rating</p>
                            </div>
                        </div>
                        <span className="rounded-md bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                            {(expA * 100).toFixed(1)}% Win Chance
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Elo Rating: <strong className="text-slate-900 dark:text-white font-mono text-sm">{eloA}</strong>
                        </label>
                        <input
                            type="range"
                            min="600"
                            max="2800"
                            step="5"
                            value={eloA}
                            onChange={(e) => setEloA(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                            <span>600 (R9)</span>
                            <span>1500 (C8)</span>
                            <span>2800 (A20)</span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                        <div className="text-xs">
                            <span className="text-slate-500">Projected: </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                                {newEloA}
                            </span>
                        </div>
                        <div
                            className={`flex items-center gap-1 text-xs font-mono font-bold ${
                                deltaA >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                            {deltaA >= 0 ? (
                                <>
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    <span>+{deltaA} pts</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="h-3.5 w-3.5" />
                                    <span>{deltaA} pts</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Player B Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-sm">
                                B
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Player / Team B</h3>
                                <p className="text-[11px] text-slate-500">Current Rating</p>
                            </div>
                        </div>
                        <span className="rounded-md bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 text-xs font-bold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
                            {(expB * 100).toFixed(1)}% Win Chance
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Elo Rating: <strong className="text-slate-900 dark:text-white font-mono text-sm">{eloB}</strong>
                        </label>
                        <input
                            type="range"
                            min="600"
                            max="2800"
                            step="5"
                            value={eloB}
                            onChange={(e) => setEloB(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                            <span>600 (R9)</span>
                            <span>1500 (C8)</span>
                            <span>2800 (A20)</span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                        <div className="text-xs">
                            <span className="text-slate-500">Projected: </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                                {newEloB}
                            </span>
                        </div>
                        <div
                            className={`flex items-center gap-1 text-xs font-mono font-bold ${
                                deltaB >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                            {deltaB >= 0 ? (
                                <>
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    <span>+{deltaB} pts</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="h-3.5 w-3.5" />
                                    <span>{deltaB} pts</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Match Controls & Outcome Selection */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-5">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-red-500" />
                    <span>Match Parameters & Outcome</span>
                </h3>

                {/* Outcome Toggle */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Simulated Match Winner:
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => setWinner('A')}
                            className={`rounded-xl p-3 text-xs font-bold transition border text-center ${
                                winner === 'A'
                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            🏆 Player A Wins
                        </button>
                        <button
                            type="button"
                            onClick={() => setWinner('DRAW')}
                            className={`rounded-xl p-3 text-xs font-bold transition border text-center ${
                                winner === 'DRAW'
                                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            🤝 Draw / Tie
                        </button>
                        <button
                            type="button"
                            onClick={() => setWinner('B')}
                            className={`rounded-xl p-3 text-xs font-bold transition border text-center ${
                                winner === 'B'
                                    ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-600 dark:text-purple-400 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            🏆 Player B Wins
                        </button>
                    </div>
                </div>

                {/* K-Factor Selector */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Competition K-Factor (Weight):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                            { k: 16, label: 'K=16 (Youth / Casual)', desc: 'Low volatility' },
                            { k: 24, label: 'K=24 (Regional League)', desc: 'Standard club' },
                            { k: 32, label: 'K=32 (National Official)', desc: 'Swiss standard' },
                            { k: 40, label: 'K=40 (Championship Final)', desc: 'Max impact' },
                        ].map((item) => (
                            <button
                                key={item.k}
                                type="button"
                                onClick={() => setKFactor(item.k)}
                                className={`rounded-xl p-2.5 text-left transition border ${
                                    kFactor === item.k
                                        ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-600 dark:text-red-400 shadow-xs'
                                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="text-xs font-bold">{item.label}</div>
                                <div className="text-[10px] text-slate-400">{item.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mathematical Formula Breakdown */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-5 space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>How AREENA Calculates Rating Adjustments</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                        <div className="text-slate-400">1. Win Expectancy:</div>
                        <div className="text-blue-600 dark:text-blue-400">
                            E_A = 1 / (1 + 10^((R_B - R_A) / 400)) = {(expA * 100).toFixed(2)}%
                        </div>
                        <div className="text-purple-600 dark:text-purple-400">
                            E_B = 1 / (1 + 10^((R_A - R_B) / 400)) = {(expB * 100).toFixed(2)}%
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                        <div className="text-slate-400">2. Delta Exchange:</div>
                        <div className={deltaA >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            Δ R_A = {kFactor} × ({scoreA} - {expA.toFixed(3)}) = {deltaA > 0 ? `+${deltaA}` : deltaA}
                        </div>
                        <div className={deltaB >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            Δ R_B = {kFactor} × ({scoreB} - {expB.toFixed(3)}) = {deltaB > 0 ? `+${deltaB}` : deltaB}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}