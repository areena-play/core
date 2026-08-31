'use client';

import React from 'react';
import { Table as TableIcon, Award, Shield } from 'lucide-react';

interface LevelTableViewProps {
    scopedAssociationId?: string;
}

export function LevelTableView({ scopedAssociationId }: LevelTableViewProps) {
    const levels = [
        { grade: 'National Master (N1)', minElo: 2200, badge: 'ELITE', color: 'bg-red-500 text-white' },
        { grade: 'Senior League A (A1)', minElo: 1900, badge: 'PRO', color: 'bg-amber-500 text-white' },
        { grade: 'Regional League B (B1)', minElo: 1650, badge: 'ADVANCED', color: 'bg-blue-500 text-white' },
        { grade: 'Intermediate Class C (C1)', minElo: 1400, badge: 'ACTIVE', color: 'bg-emerald-500 text-white' },
        { grade: 'Novice / Beginner (D1)', minElo: 1000, badge: 'STARTER', color: 'bg-slate-500 text-white' },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 text-[11px] font-bold uppercase">
                    <TableIcon className="h-3.5 w-3.5" />
                    <span>Official Rating Classes</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    ELO Classification & Level Boundaries
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Standardized national rating divisions for competition eligibility and seeding.
                </p>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {levels.map((lvl, idx) => (
                        <div key={idx} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <div className="flex items-center gap-3">
                                <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${lvl.color}`}>
                                    {lvl.badge}
                                </span>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{lvl.grade}</h4>
                                    <span className="text-[11px] text-slate-400">Rating threshold: {lvl.minElo}+ ELO</span>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-300">
                                ≥ {lvl.minElo} pts
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
