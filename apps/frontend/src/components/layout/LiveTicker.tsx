'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import { useI18n } from '@/lib/i18nContext';
import { Flame } from 'lucide-react';

export function LiveTicker() {
    const [encounters, setEncounters] = useState<any[]>([]);
    const { t } = useI18n();

    const fetchLive = async () => {
        try {
            const data = await api.getLiveEncounters();
            setEncounters(data || []);
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
        <div className="w-full rounded-2xl border border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 via-rose-50/50 to-amber-50/40 dark:from-red-950/40 dark:via-slate-900/60 dark:to-slate-900/40 p-3 text-xs shadow-xs transition-colors duration-200">
            <div className="flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex-shrink-0 pl-1">
                    <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                    <span>{t('competitions.liveScoring')}</span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto py-0.5 scrollbar-none">
                    {encounters.map((enc) => (
                        <Link
                            key={enc.id}
                            href={`/tournament/${enc.category?.competitionId || enc.category?.competition?.id || ''}/encounter/${enc.id}`}
                            className="flex items-center gap-3 rounded-xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 px-3.5 py-1.5 text-slate-800 dark:text-slate-200 hover:border-red-500/60 dark:hover:border-red-500/60 transition flex-shrink-0 shadow-xs group"
                        >
                            <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition truncate max-w-[130px]">
                                {enc.homeTeam?.name || 'Home'}
                            </span>
                            <span className="rounded-lg bg-red-600 px-2 py-0.5 font-bold font-mono text-white text-xs shadow-xs">
                                {enc.homeScore} : {enc.awayScore}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition truncate max-w-[130px]">
                                {enc.awayTeam?.name || 'Away'}
                            </span>
                            <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-mono font-bold flex items-center gap-1 pl-1">
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
