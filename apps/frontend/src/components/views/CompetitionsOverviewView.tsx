'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { Trophy, Plus, Filter, Calendar, MapPin, Users, ChevronRight, Shield, Search, Lock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface CompetitionsOverviewViewProps {
    scopedAssociationId?: string;
    defaultType?: string;
}

export function CompetitionsOverviewView({ scopedAssociationId, defaultType }: CompetitionsOverviewViewProps) {
    const { user } = useAuth();
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const queryType = (searchParams.get('type') || defaultType || '').toUpperCase();

    const [competitions, setCompetitions] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [typeFilter, setTypeFilter] = useState<string>(queryType);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [assocFilter, setAssocFilter] = useState<string>(scopedAssociationId || '');
    const [search, setSearch] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentQueryType = (searchParams.get('type') || defaultType || '').toUpperCase();
        setTypeFilter(currentQueryType);
    }, [searchParams, defaultType]);

    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formType, setFormType] = useState(queryType || 'LEAGUE');
    const [formAssocId, setFormAssocId] = useState(scopedAssociationId || '');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formLocation, setFormLocation] = useState('');
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
                const assocData = await api.getAssociations();
                const list = assocData.associations || [];
                setAssociations(list);
                if (scopedAssociationId) {
                    const found = list.find((a: any) => a.id === scopedAssociationId);
                    if (found) setScopedAssoc(found);
                } else if (list.length > 0 && !formAssocId) {
                    setFormAssocId(list[0].id);
                }
            } catch {}
        }
        init();
    }, [scopedAssociationId]);

    useEffect(() => {
        fetchCompetitions();
    }, [typeFilter, statusFilter, assocFilter, scopedAssociationId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErrorMsg('');
        try {
            await api.createCompetition({
                name: formName,
                description: formDesc,
                type: formType,
                associationId: scopedAssociationId || formAssocId,
                startDate: formStartDate,
                endDate: formEndDate,
                location: formLocation,
            });
            setShowCreateModal(false);
            setFormName('');
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

    const filteredComps = competitions.filter((c) => {
        if (!search) return true;
        return (
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.location?.toLowerCase().includes(search.toLowerCase()) ||
            c.association?.name?.toLowerCase().includes(search.toLowerCase())
        );
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Sub-Association Competitions</span>
                                </>
                            ) : (
                                <>
                                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Federation Competition Engine</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc
                                ? `${scopedAssoc.name} • ${defaultType === 'TOURNAMENT' ? 'Tournaments' : 'Competitions'}`
                                : defaultType === 'TOURNAMENT'
                                ? 'Tournaments Overview'
                                : t('nav.competitions')}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            {scopedAssoc
                                ? `Leagues, cups, and seasonal events organized by ${scopedAssoc.name} [${scopedAssoc.code}].`
                                : 'Multi-tier leagues, single elimination tournaments, and round-robin championships.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {scopedAssociationId && (
                            <Link
                                href={defaultType === 'TOURNAMENT' ? '/tournaments' : '/competitions'}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>All Competitions</span>
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
                                <span>New Competition</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search competitions, locations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white shadow-xs focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    >
                        <option value="">All Types</option>
                        <option value="LEAGUE">Leagues</option>
                        <option value="TOURNAMENT">Tournaments</option>
                        <option value="SEASON_TOURNAMENT">Season Tournaments</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Registration Open</option>
                        <option value="IN_PROGRESS">Active / In Progress</option>
                        <option value="COMPLETED">Completed</option>
                    </select>

                    {scopedAssociationId ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/40 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                            <span className="truncate max-w-[180px]">
                                {scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
                            </span>
                        </div>
                    ) : (
                        <select
                            value={assocFilter}
                            onChange={(e) => setAssocFilter(e.target.value)}
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none shrink-0"
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

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                    ))}
                </div>
            ) : filteredComps.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
                    <Trophy className="h-10 w-10 text-slate-400 mx-auto" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">No competitions found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {scopedAssociationId
                            ? 'No competitions organized under this sub-association match your filters.'
                            : 'No competitions found matching your search criteria.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredComps.map((comp: any) => (
                        <Link
                            key={comp.id}
                            href={comp.type === 'TOURNAMENT' ? `/tournament/${comp.id}` : `/competitions/${comp.id}`}
                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:shadow-md hover:border-amber-500/50 transition flex flex-col justify-between space-y-4 group"
                        >
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                                        {comp.type?.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {comp.status}
                                    </span>
                                </div>

                                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                    {comp.name}
                                </h3>

                                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    {comp.association && (
                                        <div className="flex items-center gap-1.5">
                                            <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            <span className="truncate">{comp.association.name}</span>
                                        </div>
                                    )}
                                    {comp.startDate && (
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span>
                                                {format(new Date(comp.startDate), 'dd.MM.yyyy')}
                                                {comp.endDate ? ` - ${format(new Date(comp.endDate), 'dd.MM.yyyy')}` : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-500">
                                    {comp._count?.teams || 0} Registered Teams
                                </span>
                                <span className="text-amber-600 dark:text-amber-400 font-bold group-hover:translate-x-0.5 transition flex items-center">
                                    <span>Enter</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                    <span>Create New Competition</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    ✕
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="rounded-xl p-3 text-xs bg-red-50 text-red-700 border border-red-200">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleCreate} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Competition Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Zurich Regional Cup 2026"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Format Type *
                                        </label>
                                        <select
                                            value={formType}
                                            onChange={(e) => setFormType(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-medium"
                                        >
                                            <option value="LEAGUE">League Championship</option>
                                            <option value="TOURNAMENT">Single/Double Tournament</option>
                                            <option value="SEASON_TOURNAMENT">Full-Season Tournament</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Hosting Association *
                                        </label>
                                        {scopedAssociationId ? (
                                            <input
                                                type="text"
                                                disabled
                                                value={scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
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
                                            Start Date *
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
                                            End Date
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
                                        Primary Venue / City
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Saalsporthalle, Zurich"
                                        value={formLocation}
                                        onChange={(e) => setFormLocation(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                                    >
                                        {creating ? 'Creating...' : 'Create Competition'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
