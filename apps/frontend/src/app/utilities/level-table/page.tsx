'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Table as TableIcon,
    Trophy,
    Search,
    Shield,
    Sparkles,
    ChevronRight,
    Award,
    Calculator,
    Info,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';

interface EloTier {
    category: string;
    level: string;
    minElo: number;
    maxElo: number;
    description: string;
    leagueEligibility: string;
    color: string;
    badgeColor: string;
}

const ELO_TIERS: EloTier[] = [
    // Category A - National Elite
    { category: 'A - National Elite', level: 'A20', minElo: 2200, maxElo: 3000, description: 'National Champions, Olympic & World Tour Players', leagueEligibility: 'National League A (NLA)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { category: 'A - National Elite', level: 'A19', minElo: 2100, maxElo: 2199, description: 'Top National League Competitors', leagueEligibility: 'National League A (NLA)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { category: 'A - National Elite', level: 'A18', minElo: 2000, maxElo: 2099, description: 'National League & Top Regional Players', leagueEligibility: 'National League B (NLB)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { category: 'A - National Elite', level: 'A17', minElo: 1900, maxElo: 1999, description: 'Semi-Professional & Elite Regional Competitors', leagueEligibility: 'National League B (NLB)', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    { category: 'A - National Elite', level: 'A16', minElo: 1800, maxElo: 1899, description: 'High-Level 1st League Players', leagueEligibility: '1st League Interclub', color: 'border-red-500', badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },

    // Category B - Expert
    { category: 'B - Expert', level: 'B15', minElo: 1700, maxElo: 1799, description: 'Experienced 1st League Club Representatives', leagueEligibility: '1st / 2nd League', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { category: 'B - Expert', level: 'B14', minElo: 1600, maxElo: 1699, description: 'Regular 2nd League Starters', leagueEligibility: '2nd League Interclub', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { category: 'B - Expert', level: 'B13', minElo: 1500, maxElo: 1599, description: 'Solid 2nd & 3rd League Contenders', leagueEligibility: '2nd / 3rd League', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { category: 'B - Expert', level: 'B12', minElo: 1400, maxElo: 1499, description: 'Established Competitive Club Members', leagueEligibility: '3rd League Interclub', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { category: 'B - Expert', level: 'B11', minElo: 1300, maxElo: 1399, description: 'Developing Competitive League Players', leagueEligibility: '3rd / 4th League', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },

    // Category C - Advanced Regional
    { category: 'C - Advanced Regional', level: 'C10', minElo: 1200, maxElo: 1299, description: 'Active Regional Tournament Participants', leagueEligibility: '4th League Interclub', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { category: 'C - Advanced Regional', level: 'C9', minElo: 1100, maxElo: 1199, description: 'Regional Team Players & Club Regulars', leagueEligibility: '4th / 5th League', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { category: 'C - Advanced Regional', level: 'C8', minElo: 1000, maxElo: 1099, description: 'Solid Recreational & Junior Competitors', leagueEligibility: '5th League / Junior A', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { category: 'C - Advanced Regional', level: 'C7', minElo: 900, maxElo: 999, description: 'Club Training & Open Tournament Level', leagueEligibility: '5th League / Junior B', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    { category: 'C - Advanced Regional', level: 'C6', minElo: 800, maxElo: 899, description: 'Licensed Players with Basic Match Experience', leagueEligibility: '5th League / Open Cups', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },

    // Category D - Intermediate & Entry
    { category: 'D - Intermediate', level: 'D5', minElo: 700, maxElo: 799, description: 'Entry-Level Licensed Players', leagueEligibility: 'Regional Open Cups', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { category: 'D - Intermediate', level: 'D4', minElo: 600, maxElo: 699, description: 'Junior Beginners & Hobby Tournament Level', leagueEligibility: 'Youth Leagues / Hobby', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { category: 'D - Intermediate', level: 'D1-D3', minElo: 400, maxElo: 599, description: 'Recreational & Youth Development', leagueEligibility: 'Non-license & Open Days', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { category: 'R - Unranked / Junior', level: 'R1-R9', minElo: 0, maxElo: 399, description: 'New Entrants & Unranked Club Members', leagueEligibility: 'School & Friendly Matches', color: 'border-slate-400', badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' },
];

export default function LevelTablePage() {
    const { t } = useI18n();
    const [searchElo, setSearchElo] = useState<string>('');

    const searchNum = searchElo ? parseInt(searchElo, 10) : null;

    return (
        <div className="space-y-6 pb-12 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <Link href="/" className="hover:underline">
                            {t('nav.dashboard')}
                        </Link>
                        <ChevronRight className="h-3 w-3" />
                        <span>{t('nav.utilitiesSection')}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {t('nav.levelTable')}
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <TableIcon className="h-6 w-6 text-amber-500" />
                        <span>{t('nav.levelTable')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Official AREENA Elo Classification, Skill Levels & League Eligibility Matrix
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/utilities/elo-calculator"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <Calculator className="h-4 w-4 text-red-500" />
                        <span>{t('nav.eloCalculator')}</span>
                    </Link>
                </div>
            </div>

            {/* Quick Elo Lookup Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Search className="h-4 w-4 text-red-500" />
                        <span>Check Player Rating Tier</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                        Enter any Elo number to highlight the corresponding category, rank code, and league eligibility.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="number"
                        placeholder="e.g. 1540"
                        value={searchElo}
                        onChange={(e) => setSearchElo(e.target.value)}
                        className="w-full sm:w-40 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                    />
                    {searchElo && (
                        <button
                            type="button"
                            onClick={() => setSearchElo('')}
                            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Matrix Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="px-4 py-3">Category / Tier</th>
                                <th className="px-4 py-3">Rank Level</th>
                                <th className="px-4 py-3">Elo Range</th>
                                <th className="px-4 py-3">Description & Skill Profile</th>
                                <th className="px-4 py-3">League Eligibility</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {ELO_TIERS.map((tier, idx) => {
                                const isMatched =
                                    searchNum !== null &&
                                    searchNum >= tier.minElo &&
                                    searchNum <= tier.maxElo;

                                return (
                                    <tr
                                        key={idx}
                                        className={`transition ${
                                            isMatched
                                                ? 'bg-amber-500/15 dark:bg-amber-500/20 font-bold'
                                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                                        }`}
                                    >
                                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                                            {tier.category}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-xs border ${tier.badgeColor}`}
                                            >
                                                {tier.level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                                            {tier.minElo} – {tier.maxElo === 3000 ? '∞' : tier.maxElo}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                                            {tier.description}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200">
                                            <span className="inline-flex items-center gap-1">
                                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                                <span>{tier.leagueEligibility}</span>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}