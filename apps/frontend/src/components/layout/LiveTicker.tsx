'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import { Flame } from 'lucide-react';

export function LiveTicker() {
    const [encounters, setEncounters] = useState<any[]>([]);

    const fetchLive = async () => {
        try {
            const data = await api.getLiveEncounters();
            setEncounters(data);
        } catch {}
    };

    useEffect(() => {
        fetchLive();
    }, []);

    useWebSocket((event) => {
        if (event.channel === 'areena:scores' || event.channel === 'areena:encounters') {
            fetchLive();
        }
    });

    if (encounters.length === 0) return null;

    return (
        <div className="w-full bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/30 px-4 py-2 text-xs transition-colors duration-200">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex-shrink-0">
                    <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                    <span>Live Matches</span>
                </div>

                <div className="flex items-center gap-4 overflow-x-auto py-0.5">
                    {encounters.map((enc) => (
                        <Link
                            key={enc.id}
                            href={`/competitions/${enc.category.competitionId}/encounter/${enc.id}`}
                            className="flex items-center gap-3 rounded-lg bg-white border border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 px-3 py-1 text-slate-800 dark:text-slate-300 hover:border-red-500/50 transition flex-shrink-0 shadow-sm"
                        >
                            <span className="font-semibold text-slate-900 dark:text-slate-200">
                                {enc.homeTeam.name}
                            </span>
                            <span className="rounded bg-red-600 px-1.5 py-0.5 font-bold font-mono text-white text-[11px]">
                                {enc.homeScore} : {enc.awayScore}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">
                                {enc.awayTeam.name}
                            </span>
                            <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-mono font-bold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                                {enc.status}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
