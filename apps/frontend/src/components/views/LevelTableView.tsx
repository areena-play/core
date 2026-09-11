'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
    Table as TableIcon,
    Trophy,
    Calculator,
    Shield,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';
import { LevelTierDefinition, ELO_TIERS_DATA } from '@areena/shared';

interface LevelTableViewProps {
    scopedAssociationId?: string;
}

export function LevelTableView({ scopedAssociationId }: LevelTableViewProps) {
    const { t } = useI18n();
    const { mainAssoc, associations } = useMainView();

    // Resolve effective ELO tiers from national association rules
    const eloTiers = useMemo<LevelTierDefinition[]>(() => {
        // Try national association rules first
        if (Array.isArray(mainAssoc?.rules?.eloTiers) && mainAssoc.rules.eloTiers.length > 0) {
            return mainAssoc.rules.eloTiers;
        }

        // Try searching in associations list
        const top = associations.find((a: any) => a.isTopLevel) || associations[0];
        if (Array.isArray(top?.rules?.eloTiers) && top.rules.eloTiers.length > 0) {
            return top.rules.eloTiers;
        }

        return ELO_TIERS_DATA;
    }, [mainAssoc, associations]);

    const eloCalcHref = scopedAssociationId
        ? `/association/${scopedAssociationId}/utilities/elo-calculator`
        : '/utilities/elo-calculator';

    const columns = useMemo<ColumnDef<LevelTierDefinition>[]>(
        () => [
            {
                accessorKey: 'category',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Category / Tier" />,
                cell: ({ row }) => (
                    <span className="font-bold text-slate-900 dark:text-white">
                        {row.original.category}
                    </span>
                ),
            },
            {
                accessorKey: 'level',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Rank Level" />,
                cell: ({ row }) => {
                    const isTop = row.original.category?.startsWith('A');
                    const isB = row.original.category?.startsWith('B');
                    const isC = row.original.category?.startsWith('C');
                    const badgeClass = isTop
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                        : isB
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : isC
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

                    return (
                        <span className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-xs border ${row.original.badgeColor || badgeClass}`}>
                            {row.original.level}
                        </span>
                    );
                },
            },
            {
                id: 'minElo',
                accessorKey: 'minElo',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Elo Range" />,
                cell: ({ row }) => (
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {row.original.minElo} – {row.original.maxElo === 3000 ? '∞' : row.original.maxElo} pts
                    </span>
                ),
            },
            {
                accessorKey: 'description',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Description & Skill Profile" />,
                cell: ({ row }) => (
                    <span className="text-slate-600 dark:text-slate-400">
                        {row.original.description || '—'}
                    </span>
                ),
            },
            {
                accessorKey: 'leagueEligibility',
                header: ({ column }) => <DataTableColumnHeader column={column} title="League Eligibility" />,
                cell: ({ row }) => (
                    <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                        <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{row.original.leagueEligibility || '—'}</span>
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TableIcon className="h-6 w-6 text-red-500" />
                        <span>Official Level & Elo Matrix</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {mainAssoc?.name || 'Swiss Table Tennis'} unified ranking categories, rating thresholds, and competition eligibility.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={eloCalcHref}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                    >
                        <Calculator className="h-4 w-4" />
                        <span>Elo Calculator</span>
                    </Link>
                </div>
            </div>

            {/* Federation Governance Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                    <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                        Standardized rating rules governed centrally by <strong>{mainAssoc?.name || 'National Federation'}</strong>.
                    </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 font-semibold">
                    {eloTiers.length} Active Tiers
                </span>
            </div>

            {/* Interactive DataTable */}
            <DataTable
                columns={columns}
                data={eloTiers}
                searchPlaceholder="Search tiers, levels (e.g. A20, B14), or eligibility..."
                defaultPageSize={25}
                pageSizeOptions={[10, 25, 50]}
            />
        </div>
    );
}
