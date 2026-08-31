'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
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
    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [selectedAssoc, setSelectedAssoc] = useState<string>(scopedAssociationId || '');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>(queryRole);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setRoleFilter((searchParams.get('role') || 'all').toLowerCase());
    }, [searchParams]);

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

    const loadUsers = async () => {
        setLoading(true);
        try {
            const activeAssocId = scopedAssociationId || selectedAssoc;
            const res = await api.getUsers({
                q: search,
                associationId: activeAssocId || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
            });
            setUsers(res || []);
        } catch (err) {
            console.error('Failed to load people directory:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadUsers();
        }, 150);
        return () => clearTimeout(timer);
    }, [search, selectedAssoc, scopedAssociationId, roleFilter]);

    const getRoleTitle = () => {
        if (roleFilter === 'player') return 'Players Directory';
        if (roleFilter === 'referee') return 'Referees & Umpires';
        if (roleFilter === 'coach') return 'Licensed Coaches';
        if (roleFilter === 'official') return 'Association & Club Officials';
        return t('nav.people') || 'People Overview';
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
                                href="/users"
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>View All Federation People</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, license number, email, or city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white shadow-xs focus:border-red-500 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-1">
                    {[
                        { id: 'all', label: 'All People' },
                        { id: 'player', label: 'Players' },
                        { id: 'referee', label: 'Referees' },
                        { id: 'coach', label: 'Coaches' },
                        { id: 'official', label: 'Officials' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setRoleFilter(tab.id)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                                roleFilter === tab.id
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {scopedAssociationId ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/40 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        <Lock className="h-3.5 w-3.5 text-red-500" />
                        <span className="truncate max-w-[200px]">
                            {scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
                        </span>
                    </div>
                ) : (
                    <select
                        value={selectedAssoc}
                        onChange={(e) => setSelectedAssoc(e.target.value)}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-red-500 focus:outline-none shrink-0"
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

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="h-36 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                    ))}
                </div>
            ) : users.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
                    <Users className="h-10 w-10 text-slate-400 mx-auto" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">No people found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {scopedAssociationId
                            ? 'No registered members found under this sub-association matching your search.'
                            : 'No members match your search criteria.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((u: any) => {
                        const clubName = u.licenses?.[0]?.club?.name || u.clubRoles?.[0]?.club?.name;
                        const assocName = u.associationRoles?.[0]?.association?.name;

                        return (
                            <div
                                key={u.id}
                                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:shadow-md hover:border-red-500/40 transition space-y-3 flex flex-col justify-between"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 text-red-600 dark:text-red-400 font-bold text-sm border border-red-500/30">
                                                {u.firstName?.[0] || 'U'}
                                                {u.lastName?.[0] || ''}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                                    {u.firstName} {u.lastName}
                                                </h4>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    {u.licenseId || 'No License ID'}
                                                </span>
                                            </div>
                                        </div>

                                        {u.eloPoints > 0 && (
                                            <span className="rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-2.5 py-0.5 text-[11px] font-black font-mono text-red-600 dark:text-red-400">
                                                {u.eloPoints} ELO
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1 pt-1 text-[11px]">
                                        {clubName && (
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                <span className="truncate">{clubName}</span>
                                            </div>
                                        )}
                                        {assocName && (
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                <Building2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                <span className="truncate">{assocName}</span>
                                            </div>
                                        )}
                                        {u.city && (
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                <span>{u.city}, {u.country || 'CH'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                                    {u.licenses?.length > 0 ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                            <Award className="h-3 w-3" />
                                            <span>{u.licenses[0].type} ({u.licenses[0].status})</span>
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">Standard Member</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


export function PeopleOverviewView(props: PeopleOverviewViewProps) {
    return (
        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}>
            <PeopleOverviewViewContent {...props} />
        </React.Suspense>
    );
}
