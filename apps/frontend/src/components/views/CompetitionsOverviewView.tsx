'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';
import {
    Trophy,
    Plus,
    Calendar,
    MapPin,
    Users,
    ChevronRight,
    Shield,
    Lock,
    ExternalLink,
    Layers,
    Medal,
    Swords,
} from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';

interface CompetitionsOverviewViewProps {
    scopedAssociationId?: string;
    defaultType?: string;
}

function getTypeBadge(type: string, t: any) {
    switch (type) {
        case 'LEAGUE':
            return {
                label: t('competitionsOverview.typeLeague', {}, 'League'),
                className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
                icon: Trophy,
            };
        case 'CUP':
            return {
                label: t('competitionsOverview.typeCup', {}, 'Cup'),
                className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60',
                icon: Medal,
            };
        case 'SEASON_TOURNAMENT':
            return {
                label: t('competitionsOverview.typeSeasonTournament', {}, 'Season Tournament'),
                className: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
                icon: Layers,
            };
        case 'RANKING_TOURNAMENT':
            return {
                label: t('competitionsOverview.typeRankingTournament', {}, 'Ranking Tournament'),
                className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
                icon: Trophy,
            };
        case 'FRIENDLY':
        case 'INOFFICIAL':
            return {
                label: type === 'FRIENDLY'
                    ? t('competitionsOverview.typeFriendly', {}, 'Friendly')
                    : t('competitionsOverview.typeInofficial', {}, 'Inofficial'),
                className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                icon: Swords,
            };
        case 'TOURNAMENT':
        default:
            return {
                label: t('competitionsOverview.typeTournament', {}, 'Tournament'),
                className: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
                icon: Swords,
            };
    }
}

function getStatusBadge(status: string, t: any) {
    switch (status) {
        case 'REGISTRATION_OPEN':
            return {
                label: t('competitionsOverview.statusRegistrationOpen', {}, 'Registration Open'),
                className: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
            };
        case 'IN_PROGRESS':
            return {
                label: t('competitionsOverview.statusInProgress', {}, 'In Progress'),
                className: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
            };
        case 'COMPLETED':
            return {
                label: t('competitionsOverview.statusCompleted', {}, 'Completed'),
                className: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
            };
        case 'DRAFT':
        default:
            return {
                label: status === 'DRAFT' ? t('competitionsOverview.statusDraft', {}, 'Draft') : (status || t('competitionsOverview.statusDraft', {}, 'Draft')),
                className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
            };
    }
}

function CompetitionsOverviewViewContent({ scopedAssociationId, defaultType }: CompetitionsOverviewViewProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { t } = useI18n();

    const queryType = (searchParams.get('type') || defaultType || '').toUpperCase();

    const [competitions, setCompetitions] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [typeFilter, setTypeFilter] = useState<string>(queryType);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [assocFilter, setAssocFilter] = useState<string>(scopedAssociationId || '');
    const [seasonFilter, setSeasonFilter] = useState<string>('CURRENT');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentQueryType = (searchParams.get('type') || defaultType || '').toUpperCase();
        setTypeFilter(currentQueryType);
    }, [searchParams, defaultType]);

    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formSeriesSlug, setFormSeriesSlug] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formType, setFormType] = useState(queryType || 'LEAGUE');
    const [formAssocId, setFormAssocId] = useState(scopedAssociationId || '');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [formIsOfficial, setFormIsOfficial] = useState(true);
    const [formCountsForElo, setFormCountsForElo] = useState(true);
    const [formEntryFee, setFormEntryFee] = useState('0');
    const [creating, setCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchCompetitions = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (typeFilter) params.type = typeFilter.toUpperCase();
            if (statusFilter) params.status = statusFilter;
            const effectiveAssoc = scopedAssociationId || assocFilter;
            if (effectiveAssoc) params.associationId = effectiveAssoc;

            if (seasonFilter === 'CURRENT') {
                params.isCurrentSeason = 'true';
            } else if (seasonFilter && seasonFilter !== 'ALL') {
                params.seasonName = seasonFilter;
            }

            const data = await api.getCompetitions(params);
            setCompetitions(data || []);
        } catch (err) {
            console.error('Failed to load competitions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        async function init() {
            try {
                const [assocData, seasonsData] = await Promise.all([
                    api.getAssociations().catch(() => ({ associations: [] })),
                    api.getCompetitionSeasons({ associationId: scopedAssociationId || '' }).catch(() => []),
                ]);
                const list = assocData?.associations || [];
                setAssociations(list);
                setSeasons(seasonsData || []);

                if (scopedAssociationId) {
                    const found = list.find((a: any) =>
                        a.id === scopedAssociationId ||
                        a.slug?.toLowerCase() === scopedAssociationId.toLowerCase() ||
                        a.code?.toUpperCase() === scopedAssociationId.toUpperCase()
                    );
                    if (found) {
                        setScopedAssoc(found);
                        setFormAssocId(found.id);
                    }
                } else if (list.length > 0 && !formAssocId) {
                    setFormAssocId(list[0].id);
                }
            } catch {}
        }
        init();
    }, [scopedAssociationId]);

    useEffect(() => {
        fetchCompetitions();
    }, [typeFilter, statusFilter, assocFilter, seasonFilter, scopedAssociationId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErrorMsg('');
        try {
            await api.createCompetition({
                name: formName,
                slug: formSlug ? formSlug.trim().toLowerCase() : undefined,
                seriesSlug: formSeriesSlug ? formSeriesSlug.trim().toLowerCase() : undefined,
                description: formDesc,
                type: formType,
                associationId: scopedAssociationId || formAssocId,
                startDate: formStartDate,
                endDate: formEndDate,
                location: formLocation,
                isOfficial: formType === 'INOFFICIAL' ? false : formIsOfficial,
                countsForElo: formType === 'INOFFICIAL' ? false : formCountsForElo,
                entryFee: Number(formEntryFee) || 0,
            });
            setShowCreateModal(false);
            setFormName('');
            setFormSlug('');
            setFormSeriesSlug('');
            setFormDesc('');
            fetchCompetitions();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create competition');
        } finally {
            setCreating(false);
        }
    };

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const currentSeason = seasons.find((s) => s.isCurrent) || seasons[0];
    const currentSeasonName = currentSeason?.name || '2026/27';

    // DataTable Column Definitions
    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'competition',
                accessorFn: (c) => `${c.name || ''} ${c.slug || ''} ${c.seriesSlug || ''} ${c.location || ''} ${c.season?.name || ''} ${c.association?.name || ''} ${c.association?.code || ''}`,
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title={t('competitionsOverview.colCompetition', {}, 'Competition')} />
                ),
                cell: ({ row }) => {
                    const c = row.original;
                    const compHref = `/competition/${c.seriesSlug || c.slug || c.id}`;
                    const badge = getTypeBadge(c.type, t);
                    const IconComponent = badge.icon;

                    return (
                        <div className="flex items-center gap-3 py-1">
                            <Link href={compHref} className="group shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 group-hover:scale-105 group-hover:border-amber-500/50 transition shadow-2xs">
                                    <IconComponent className="h-5 w-5" />
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    <Link
                                        href={compHref}
                                        className="hover:text-amber-600 dark:hover:text-amber-400 transition hover:underline"
                                    >
                                        {c.name}
                                    </Link>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-2">
                                    {c.seriesSlug ? (
                                        <span className="font-mono text-[10px] text-slate-500">
                                            series: {c.seriesSlug}
                                        </span>
                                    ) : c.slug ? (
                                        <span className="font-mono text-[10px] text-slate-500">
                                            {c.slug}
                                        </span>
                                    ) : (
                                        <span>{c.description || t('competitionsOverview.officialFederationComp', {}, 'Official Federation Competition')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'type',
                accessorKey: 'type',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('competitionsOverview.colType', {}, 'Type')} />,
                cell: ({ row }) => {
                    const type = row.original.type;
                    const badge = getTypeBadge(type, t);
                    return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${badge.className}`}>
                            {badge.label}
                        </span>
                    );
                },
            },
            {
                id: 'season',
                accessorFn: (c) => c.season?.name || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('competitionsOverview.colSeason', {}, 'Season')} />,
                cell: ({ row }) => {
                    const season = row.original.season;
                    if (!season?.name) {
                        return <span className="text-xs text-slate-400 italic">—</span>;
                    }
                    return (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {season.isCurrent && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            )}
                            <span>{season.name}</span>
                        </span>
                    );
                },
            },
            {
                id: 'association',
                accessorFn: (c) => c.association?.name || '',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title={t('competitionsOverview.colFederation', {}, 'Federation / Association')} />
                ),
                cell: ({ row }) => {
                    const assoc = row.original.association;
                    if (!assoc) {
                        return <span className="text-xs text-slate-400 italic">—</span>;
                    }
                    return (
                        <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={assoc.name}>
                                {assoc.name} {assoc.code ? `[${assoc.code}]` : ''}
                            </span>
                        </div>
                    );
                },
            },
            {
                id: 'dates',
                accessorFn: (c) => c.startDate || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('competitionsOverview.colDates', {}, 'Dates')} />,
                cell: ({ row }) => {
                    const c = row.original;
                    if (!c.startDate) {
                        return <span className="text-xs text-slate-400 italic">—</span>;
                    }
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                                {format(new Date(c.startDate), 'dd.MM.yyyy')}
                                {c.endDate ? ` - ${format(new Date(c.endDate), 'dd.MM.yyyy')}` : ''}
                            </span>
                        </div>
                    );
                },
            },
            {
                id: 'location',
                accessorKey: 'location',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('competitionsOverview.colLocation', {}, 'Location')} />,
                cell: ({ row }) => {
                    const loc = row.original.location;
                    if (!loc) {
                        return <span className="text-xs text-slate-400 italic">—</span>;
                    }
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]" title={loc}>{loc}</span>
                        </div>
                    );
                },
            },
            {
                id: 'teams',
                accessorFn: (c) => c._count?.teams || 0,
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('competitionsOverview.colTeams', {}, 'Teams')} />,
                cell: ({ row }) => (
                    <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 font-mono">
                        <Users className="h-3.5 w-3.5 text-amber-500" />
                        <span>{row.original._count?.teams || 0}</span>
                    </div>
                ),
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('competitionsOverview.colStatus', {}, 'Status')} />,
                cell: ({ row }) => {
                    const status = row.original.status;
                    const badge = getStatusBadge(status, t);
                    return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${badge.className}`}>
                            {badge.label}
                        </span>
                    );
                },
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const comp = row.original;
                    const compHref = `/competition/${comp.seriesSlug || comp.slug || comp.id}`;
                    return (
                        <div className="flex items-center justify-end">
                            <Link
                                href={compHref}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition group"
                            >
                                <span>{t('competitionsOverview.enter', {}, 'Enter')}</span>
                                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    );
                },
            },
        ],
        [t],
    );

    return (
        <div className="space-y-6 pb-16">
            {/* Header Hero Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                                    <span>{t('competitionsOverview.heroSubAssoc', {}, 'Sub-Association Competitions')}</span>
                                </>
                            ) : (
                                <>
                                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                    <span>{t('competitionsOverview.heroFederation', {}, 'Federation Competition Engine')}</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc
                                ? `${scopedAssoc.name} • ${defaultType === 'TOURNAMENT' ? t('competitionsOverview.tournamentsOverview', {}, 'Tournaments') : t('competitionsOverview.competitionsOverview', {}, 'Competitions')}`
                                : defaultType === 'TOURNAMENT'
                                ? t('competitionsOverview.tournamentsOverview', {}, 'Tournaments Overview')
                                : t('nav.competitions')}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            {scopedAssoc
                                ? t('competitionsOverview.subAssocDesc', { name: scopedAssoc.name, code: scopedAssoc.code }, `Leagues, cups, and seasonal events organized by ${scopedAssoc.name} [${scopedAssoc.code}].`)
                                : t('competitionsOverview.federationDesc', {}, 'Multi-tier leagues, single elimination tournaments, cups, and round-robin championships.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {scopedAssociationId && (
                            <Link
                                href={defaultType === 'TOURNAMENT' ? '/competitions' : '/competitions'}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>{t('competitionsOverview.allCompetitions', {}, 'All Competitions')}</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        )}
                        {isAssocAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (scopedAssociationId) setFormAssocId(scopedAssociationId);
                                    setShowCreateModal(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>{t('competitionsOverview.newCompetition', {}, 'New Competition')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Interactive Data Table */}
            <DataTable
                columns={columns}
                data={competitions}
                loading={loading}
                searchPlaceholder={t('competitionsOverview.searchPlaceholder', {}, 'Search competitions, venues, federations...')}
                emptyMessage={
                    scopedAssociationId
                        ? t('competitionsOverview.noCompetitionsScoped', {}, 'No competitions organized under this sub-association match your filters.')
                        : t('competitionsOverview.noCompetitionsGeneral', {}, 'No competitions found matching your search criteria.')
                }
                defaultPageSize={25}
                pageSizeOptions={[10, 25, 50, 100]}
                initialSorting={[{ id: 'competition', desc: false }]}
                searchSlot={
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Season Selector */}
                        <select
                            value={seasonFilter}
                            onChange={(e) => setSeasonFilter(e.target.value)}
                            className="rounded-xl border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-950 dark:text-amber-200 focus:border-amber-500 focus:outline-none cursor-pointer shadow-xs"
                        >
                            <option value="CURRENT">
                                {t('competitionsOverview.currentSeason', { name: currentSeasonName }, `Current Season (${currentSeasonName})`)}
                            </option>
                            <option value="ALL">{t('competitionsOverview.allSeasons', {}, 'All Seasons')}</option>
                            {seasons.map((s: any) => (
                                <option key={s.id || s.name} value={s.name}>
                                    {t('competitionsOverview.seasonOption', { name: s.name }, `Season ${s.name}`)}{s.isCurrent ? ` • ${t('competitionsOverview.seasonActive', {}, 'Active')}` : ''}
                                </option>
                            ))}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-xs"
                        >
                            <option value="">{t('competitionsOverview.allTypes', {}, 'All Types')}</option>
                            <option value="LEAGUE">{t('competitionsOverview.typeLeague', {}, 'Leagues')}</option>
                            <option value="CUP">{t('competitionsOverview.typeCup', {}, 'Cups')}</option>
                            <option value="TOURNAMENT">{t('competitionsOverview.typeTournament', {}, 'Tournaments')}</option>
                            <option value="SEASON_TOURNAMENT">{t('competitionsOverview.typeSeasonTournament', {}, 'Season Tournaments')}</option>
                            <option value="RANKING_TOURNAMENT">{t('competitionsOverview.typeRankingTournament', {}, 'Ranking Tournaments')}</option>
                            <option value="FRIENDLY">{t('competitionsOverview.typeFriendly', {}, 'Friendlies')}</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-xs"
                        >
                            <option value="">{t('competitionsOverview.allStatuses', {}, 'All Statuses')}</option>
                            <option value="DRAFT">{t('competitionsOverview.statusDraft', {}, 'Draft')}</option>
                            <option value="REGISTRATION_OPEN">{t('competitionsOverview.statusRegistrationOpen', {}, 'Registration Open')}</option>
                            <option value="IN_PROGRESS">{t('competitionsOverview.statusInProgress', {}, 'Active / In Progress')}</option>
                            <option value="COMPLETED">{t('competitionsOverview.statusCompleted', {}, 'Completed')}</option>
                        </select>

                        {/* Association Filter */}
                        {scopedAssociationId ? (
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                <Lock className="h-3.5 w-3.5 text-amber-500" />
                                <span className="truncate max-w-[180px]">
                                    {scopedAssoc ? scopedAssoc.name : t('competitionsOverview.currentSubAssoc', {}, 'Current Sub-Association')}
                                </span>
                            </div>
                        ) : (
                            <select
                                value={assocFilter}
                                onChange={(e) => setAssocFilter(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-xs shrink-0"
                            >
                                <option value="">{t('competitionsOverview.allAssociations', {}, 'All Associations')}</option>
                                {associations.map((a: any) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} [{a.code}]
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                }
                onRowClick={(comp) => {
                    router.push(`/competition/${comp.seriesSlug || comp.slug || comp.id}`);
                }}
            />

            {/* Create Competition Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title={t('competitionsOverview.createModalTitle', {}, 'Create New Competition')}
                subtitle={t('competitionsOverview.createModalSubtitle', {}, 'Configure tournament details, format, schedule, and hosting federation')}
                icon={<Trophy className="h-5 w-5 text-amber-500" />}
                size="lg"
            >
                {errorMsg && (
                    <div className="rounded-xl p-3 mb-4 text-xs bg-red-50 text-red-700 border border-red-200">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleCreate} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('competitionsOverview.formTitle', {}, 'Competition Title *')}
                        </label>
                        <input
                            type="text"
                            required
                            placeholder={t('competitionsOverview.formTitlePlaceholder', {}, 'e.g. Zurich Regional Cup 2026')}
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('competitionsOverview.formSlug', {}, 'Custom URL Slug (Optional)')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('competitionsOverview.formSlugPlaceholder', {}, 'e.g. zurich-cup-2026')}
                                value={formSlug}
                                onChange={(e) => setFormSlug(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('competitionsOverview.formSeries', {}, 'Recurring Series Key (Optional)')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('competitionsOverview.formSeriesPlaceholder', {}, 'e.g. zurich-cup')}
                                value={formSeriesSlug}
                                onChange={(e) => setFormSeriesSlug(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('competitionsOverview.formType', {}, 'Format Type *')}
                            </label>
                            <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-medium"
                            >
                                <option value="LEAGUE">{t('competitionsOverview.typeLeague', {}, 'League Championship')}</option>
                                <option value="TOURNAMENT">{t('competitionsOverview.typeTournament', {}, 'Single/Double Tournament')}</option>
                                <option value="SEASON_TOURNAMENT">{t('competitionsOverview.typeSeasonTournament', {}, 'Full-Season Tournament')}</option>
                                <option value="CUP">{t('competitionsOverview.typeCup', {}, 'Cup Competition')}</option>
                                <option value="INOFFICIAL">{t('competitionsOverview.typeInofficial', {}, 'Inofficial / Friendly (No ELO)')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('competitionsOverview.formHostingAssoc', {}, 'Hosting Association *')}
                            </label>
                            {scopedAssociationId ? (
                                <input
                                    type="text"
                                    disabled
                                    value={scopedAssoc ? scopedAssoc.name : t('competitionsOverview.currentSubAssoc', {}, 'Current Sub-Association')}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-500"
                                />
                            ) : (
                                <select
                                    value={formAssocId}
                                    onChange={(e) => setFormAssocId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-medium"
                                >
                                    {associations.map((a: any) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} [{a.code}]
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('competitionsOverview.formStartDate', {}, 'Start Date *')}
                            </label>
                            <input
                                type="date"
                                required
                                value={formStartDate}
                                onChange={(e) => setFormStartDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('competitionsOverview.formEndDate', {}, 'End Date')}
                            </label>
                            <input
                                type="date"
                                value={formEndDate}
                                onChange={(e) => setFormEndDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('competitionsOverview.formVenue', {}, 'Primary Venue / City')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('competitionsOverview.formVenuePlaceholder', {}, 'e.g. Saalsporthalle, Zurich')}
                            value={formLocation}
                            onChange={(e) => setFormLocation(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('competitionsOverview.formEntryFee', {}, 'Entry Fee (CHF)')}
                            </label>
                            <input
                                type="number"
                                value={formEntryFee}
                                onChange={(e) => setFormEntryFee(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col justify-center space-y-1 pt-4">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formType !== 'INOFFICIAL' && formCountsForElo}
                                    disabled={formType === 'INOFFICIAL'}
                                    onChange={(e) => setFormCountsForElo(e.target.checked)}
                                    className="rounded text-amber-500"
                                />
                                {t('competitionsOverview.formCountElo', {}, 'Count towards ELO Ratings')}
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                        >
                            {t('common.cancel', {}, 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                        >
                            {creating ? t('competitionsOverview.creating', {}, 'Creating...') : t('competitionsOverview.createBtn', {}, 'Create Competition')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export function CompetitionsOverviewView(props: CompetitionsOverviewViewProps) {
    return (
        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></div>}>
            <CompetitionsOverviewViewContent {...props} />
        </React.Suspense>
    );
}
