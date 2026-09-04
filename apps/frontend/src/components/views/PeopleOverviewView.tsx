'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';
import {
    Users,
    Shield,
    Search,
    Mail,
    Building2,
    Award,
    Sparkles,
    Lock,
    ExternalLink,
    Filter,
    ChevronRight,
    MapPin,
    Calendar,
    CheckCircle2,
    Phone,
    X,
} from 'lucide-react';

interface PeopleOverviewViewProps {
    scopedAssociationId?: string;
}

function PeopleOverviewViewContent({ scopedAssociationId }: PeopleOverviewViewProps) {
    const { user: currentUser } = useAuth();
    const { t } = useI18n();
    const searchParams = useSearchParams();

    const queryRole = (searchParams.get('role') || 'all').toLowerCase();

    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalUnfiltered, setTotalUnfiltered] = useState<number | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalPages, setTotalPages] = useState(1);

    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [selectedAssoc, setSelectedAssoc] = useState<string>(scopedAssociationId || '');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>(queryRole);
    const [loading, setLoading] = useState(true);

    // Sync role from query parameters
    useEffect(() => {
        const r = (searchParams.get('role') || 'all').toLowerCase();
        setRoleFilter(r);
        setPage(1);
    }, [searchParams]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);

    // Load available associations for scoping
    useEffect(() => {
        async function loadAssocs() {
            try {
                const data = await api.getAssociations();
                const list = data.associations || [];
                setAssociations(list);
                if (scopedAssociationId) {
                    const found = list.find((a: any) => a.id === scopedAssociationId);
                    if (found) setScopedAssoc(found);
                }
            } catch (err) {
                console.error('Failed to load associations:', err);
            }
        }
        loadAssocs();
    }, [scopedAssociationId]);

    // Load paginated users
    const loadUsers = async () => {
        setLoading(true);
        try {
            const activeAssocId = scopedAssociationId || selectedAssoc;
            const res = await api.getUsers({
                q: debouncedSearch,
                associationId: activeAssocId || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                page,
                limit: pageSize,
            });

            if (res && Array.isArray(res.users)) {
                setUsers(res.users);
                setTotal(res.total ?? res.users.length);
                setTotalUnfiltered(res.totalUnfiltered);
                setTotalPages(res.totalPages ?? 1);
            } else if (Array.isArray(res)) {
                setUsers(res);
                setTotal(res.length);
                setTotalUnfiltered(res.length);
                setTotalPages(1);
            } else {
                setUsers([]);
                setTotal(0);
                setTotalUnfiltered(0);
                setTotalPages(1);
            }
        } catch (err) {
            console.error('Failed to load people directory:', err);
            setUsers([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [debouncedSearch, selectedAssoc, scopedAssociationId, roleFilter, page, pageSize]);

    const getRoleTitle = () => {
        if (roleFilter === 'player') return 'Players Directory';
        if (roleFilter === 'referee') return 'Referees & Umpires';
        if (roleFilter === 'coach') return 'Licensed Coaches';
        if (roleFilter === 'official') return 'Association & Club Officials';
        return t('nav.people') || 'People Overview';
    };

    // Define table columns
    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'person',
                accessorFn: (u) => `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Person / Name" />,
                cell: ({ row }) => {
                    const u = row.original;
                    const personHref = `/people/${encodeURIComponent(u.licenseId || u.id)}`;
                    return (
                        <div className="flex items-center gap-3 py-1">
                            <Link href={personHref} className="group shrink-0">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/15 to-rose-500/15 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/20 group-hover:scale-105 group-hover:border-red-500/50 transition">
                                    {u.firstName?.[0] || 'U'}
                                    {u.lastName?.[0] || ''}
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white leading-tight truncate flex items-center gap-1.5">
                                    <Link
                                        href={personHref}
                                        className="hover:text-red-600 dark:hover:text-red-400 transition hover:underline"
                                    >
                                        {u.firstName} {u.lastName}
                                    </Link>
                                    {u.isSuperAdmin && (
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {u.email}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'licenseId',
                accessorFn: (u) => u.licenseId || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="License ID" />,
                cell: ({ row }) => {
                    const u = row.original;
                    if (!u.licenseId) {
                        return <span className="text-slate-400 italic text-[11px]">—</span>;
                    }
                    return (
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            #{u.licenseId}
                        </span>
                    );
                },
            },
            {
                id: 'rating',
                accessorFn: (u) => String(u.eloPoints || 1000),
                header: ({ column }) => <DataTableColumnHeader column={column} title="Rating / Elo" />,
                cell: ({ row }) => {
                    const u = row.original;
                    return (
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-full text-xs">
                                {u.eloPoints || 1000}
                            </span>
                            {u.rank && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                    (#{u.rank})
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'club',
                accessorFn: (u) => u.licenses?.[0]?.club?.name || u.clubRoles?.[0]?.club?.name || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Affiliated Club" />,
                cell: ({ row }) => {
                    const u = row.original;
                    const club = u.licenses?.[0]?.club || u.clubRoles?.[0]?.club;
                    if (!club) {
                        return <span className="text-slate-400 italic text-[11px]">—</span>;
                    }
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                            <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="font-medium truncate max-w-[160px]">{club.name}</span>
                        </div>
                    );
                },
            },
            {
                id: 'association',
                accessorFn: (u) => u.associationRoles?.[0]?.association?.name || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Federation / Region" />,
                cell: ({ row }) => {
                    const u = row.original;
                    const assoc = u.associationRoles?.[0]?.association;
                    if (!assoc) {
                        return <span className="text-slate-400 italic text-[11px]">—</span>;
                    }
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                            <Building2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="font-medium truncate max-w-[160px]">{assoc.name}</span>
                        </div>
                    );
                },
            },
            {
                id: 'roles',
                header: () => <span>Roles & Passes</span>,
                cell: ({ row }) => {
                    const u = row.original;
                    const licenses = u.licenses || [];
                    const assocRoles = u.associationRoles || [];
                    const clubRoles = u.clubRoles || [];

                    if (licenses.length === 0 && assocRoles.length === 0 && clubRoles.length === 0 && !u.isSuperAdmin) {
                        return <span className="text-[11px] text-slate-400">Standard Member</span>;
                    }

                    return (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                            {licenses.map((lic: any) => (
                                <span
                                    key={lic.id}
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1"
                                >
                                    <Award className="w-2.5 h-2.5" />
                                    {lic.type}
                                </span>
                            ))}
                            {assocRoles.map((ar: any) => (
                                <span
                                    key={ar.id}
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/50"
                                >
                                    {ar.role}
                                </span>
                            ))}
                            {clubRoles.map((cr: any) => (
                                <span
                                    key={cr.id}
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
                                >
                                    {cr.role}
                                </span>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: 'location',
                accessorFn: (u) => `${u.city || ''} ${u.country || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
                cell: ({ row }) => {
                    const u = row.original;
                    if (!u.city && !u.country) {
                        return <span className="text-slate-400 italic text-[11px]">—</span>;
                    }
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{u.city ? `${u.city}, ` : ''}{u.country || 'CH'}</span>
                        </div>
                    );
                },
            },
        ],
        []
    );

    return (
        <div className="space-y-6 pb-16">
            {/* Header Banner */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-red-500" />
                                    <span>Regional Sub-Association Directory</span>
                                </>
                            ) : (
                                <>
                                    <Users className="h-3.5 w-3.5 text-red-500" />
                                    <span>Federation-Wide Member Directory</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc ? `${scopedAssoc.name} • ${getRoleTitle()}` : getRoleTitle()}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            {scopedAssoc
                                ? `Showing licensed members, coaches, and officials affiliated with ${scopedAssoc.name} [${scopedAssoc.code}].`
                                : 'Explore athletes, referees, club coaches, and federation officials across all regional associations.'}
                        </p>
                    </div>

                    {scopedAssociationId && (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/people"
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>View All Federation People</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Paginated DataTable with Integrated Search & Filter Slot */}
            <DataTable
                columns={columns}
                data={users}
                loading={loading}
                emptyMessage="No members or licensed people found matching your criteria."
                showSearch={false}
                searchSlot={
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between w-full">
                        {/* Unified Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, license, email, city (e.g. 'marc zurich')..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition shadow-xs"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Role Filter Tabs & Association Dropdown */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'player', label: 'Players' },
                                    { id: 'referee', label: 'Referees' },
                                    { id: 'coach', label: 'Coaches' },
                                    { id: 'official', label: 'Officials' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setRoleFilter(tab.id);
                                            setPage(1);
                                        }}
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                                            roleFilter === tab.id
                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {scopedAssociationId ? (
                                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                    <Lock className="h-3 w-3 text-red-500" />
                                    <span className="truncate max-w-[180px]">
                                        {scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
                                    </span>
                                </div>
                            ) : (
                                <select
                                    value={selectedAssoc}
                                    onChange={(e) => {
                                        setSelectedAssoc(e.target.value);
                                        setPage(1);
                                    }}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-red-500 focus:outline-none shrink-0"
                                >
                                    <option value="">All Associations</option>
                                    {associations.map((a: any) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} [{a.code}]
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                }
                manualPagination={true}
                pageCount={totalPages}
                totalCount={total}
                totalUnfilteredCount={totalUnfiltered}
                pageIndex={page - 1}
                pageSize={pageSize}
                pageSizeOptions={[15, 25, 50, 100]}
                onPaginationChange={(newPageIndex, newPageSize) => {
                    setPage(newPageIndex + 1);
                    setPageSize(newPageSize);
                }}
            />
        </div>
    );
}

export function PeopleOverviewView(props: PeopleOverviewViewProps) {
    return (
        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" /></div>}>
            <PeopleOverviewViewContent {...props} />
        </React.Suspense>
    );
}

