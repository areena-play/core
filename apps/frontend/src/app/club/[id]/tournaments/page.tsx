'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Trophy,
    Shield,
    Plus,
    Calendar,
    MapPin,
    Users,
    ChevronRight,
    ExternalLink,
    Filter,
    Search,
    Clock,
    Award,
    Flame,
    Layers,
    Medal,
    Swords,
    Sparkles,
    CheckCircle2,
    SlidersHorizontal,
    DollarSign,
    Building2,
    Lock,
    ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { AccessDenied } from '@/components/auth/AccessDenied';

function getTypeBadge(type: string) {
    switch (type) {
        case 'LEAGUE':
            return {
                label: 'League',
                className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
                icon: Trophy,
            };
        case 'CUP':
            return {
                label: 'Cup',
                className: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60',
                icon: Medal,
            };
        case 'SEASON_TOURNAMENT':
            return {
                label: 'Season Tournament',
                className: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
                icon: Layers,
            };
        case 'RANKING_TOURNAMENT':
            return {
                label: 'Ranking Tournament',
                className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
                icon: Trophy,
            };
        case 'FRIENDLY':
        case 'INOFFICIAL':
            return {
                label: type === 'FRIENDLY' ? 'Friendly' : 'Inofficial',
                className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                icon: Swords,
            };
        case 'TOURNAMENT':
        default:
            return {
                label: 'Tournament',
                className: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
                icon: Swords,
            };
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'REGISTRATION_OPEN':
            return {
                label: 'Registration Open',
                className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            };
        case 'IN_PROGRESS':
            return {
                label: 'Live / In Progress',
                className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse',
            };
        case 'COMPLETED':
            return {
                label: 'Completed',
                className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
            };
        case 'REGISTRATION_CLOSED':
            return {
                label: 'Registration Closed',
                className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            };
        case 'DRAFT':
        default:
            return {
                label: 'Draft / Setup',
                className: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
            };
    }
}

const COMMON_QUICK_CATEGORIES = [
    { name: 'Men Singles A', teamSize: 1, minElo: 1800, maxElo: null },
    { name: 'Men Singles B', teamSize: 1, minElo: 1500, maxElo: 1799 },
    { name: 'Men Singles C', teamSize: 1, minElo: 1200, maxElo: 1499 },
    { name: 'Men Singles D/E', teamSize: 1, minElo: null, maxElo: 1199 },
    { name: 'Women Singles Open', teamSize: 1, minElo: null, maxElo: null },
    { name: 'Mixed Doubles', teamSize: 2, minElo: null, maxElo: null },
    { name: 'Youth / U15 Singles', teamSize: 1, maxAge: 15, minElo: null, maxElo: null },
];

export default function ClubTournamentsPage() {
    const params = useParams();
    const router = useRouter();
    const clubIdentifier = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [hostedTournaments, setHostedTournaments] = useState<any[]>([]);
    const [participatingTournaments, setParticipatingTournaments] = useState<any[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'hosted' | 'participating'>('hosted');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Modal state for registering a new tournament
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [formSeriesSlug, setFormSeriesSlug] = useState('');
    const [formType, setFormType] = useState('TOURNAMENT');
    const [formAssocId, setFormAssocId] = useState('');
    const [formSeasonId, setFormSeasonId] = useState('');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [formEntryFee, setFormEntryFee] = useState('0');
    const [formDesc, setFormDesc] = useState('');
    const [formIsOfficial, setFormIsOfficial] = useState(true);
    const [formCountsForElo, setFormCountsForElo] = useState(true);
    const [selectedQuickCats, setSelectedQuickCats] = useState<string[]>(['Men Singles A', 'Men Singles B', 'Men Singles C']);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const isClubOfficial =
        user?.isSuperAdmin ||
        user?.clubRoles?.some(
            (r: any) =>
                (r.clubId === club?.id || r.club?.slug === club?.slug || r.clubId === clubIdentifier || r.club?.slug === clubIdentifier) &&
                ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COACH', 'TECHNICAL_DIRECTOR', 'JUNIOR_COACH', 'OFFICIAL'].includes(r.role)
        );

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.getClubTournaments(clubIdentifier);
            setClub(res.club);
            setHostedTournaments(res.hostedTournaments || []);
            setParticipatingTournaments(res.participatingTournaments || []);
            setSeasons(res.seasons || []);
            setAssociations(res.associations || []);
            setLocations(res.locations || []);

            if (res.associations?.length > 0 && !formAssocId) {
                setFormAssocId(res.associations[0].id);
            }
            if (res.currentSeason?.id && !formSeasonId) {
                setFormSeasonId(res.currentSeason.id);
            }

            if (res.club) {
                setEntityMeta({
                    id: res.club.id,
                    title: res.club.name,
                    code: res.club.code,
                    badge: 'Club',
                    subtitle: `${res.club.city || 'Switzerland'} • Tournament Hosting Hub`,
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load club tournament hub.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clubIdentifier) return;
        loadData();
    }, [clubIdentifier]);

    // Filter active list
    const currentList = activeTab === 'hosted' ? hostedTournaments : participatingTournaments;

    const filteredTournaments = useMemo(() => {
        let list = currentList;

        if (statusFilter !== 'ALL') {
            list = list.filter((t) => t.status === statusFilter);
        }

        if (typeFilter !== 'ALL') {
            list = list.filter((t) => t.type === typeFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (t) =>
                    (t.name || '').toLowerCase().includes(q) ||
                    (t.location || '').toLowerCase().includes(q) ||
                    (t.description || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [currentList, statusFilter, typeFilter, searchQuery]);

    const activeHostedCount = useMemo(() => {
        return hostedTournaments.filter((t) => t.status === 'REGISTRATION_OPEN' || t.status === 'IN_PROGRESS').length;
    }, [hostedTournaments]);

    const totalCategoriesCount = useMemo(() => {
        return hostedTournaments.reduce((acc, t) => acc + (t.categories?.length || t._count?.categories || 0), 0);
    }, [hostedTournaments]);

    // Handle Tournament Creation
    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        if (!formName.trim()) {
            setCreateError('Tournament name is required.');
            return;
        }
        if (!formStartDate || !formEndDate) {
            setCreateError('Start date and end date are required.');
            return;
        }
        if (!formAssocId) {
            setCreateError('Please select a governing association.');
            return;
        }

        try {
            setCreating(true);
            const body = {
                name: formName.trim(),
                seriesSlug: formSeriesSlug.trim() || undefined,
                type: formType,
                associationId: formAssocId,
                seasonId: formSeasonId || undefined,
                startDate: new Date(formStartDate).toISOString(),
                endDate: new Date(formEndDate).toISOString(),
                location: formLocation.trim() || `${club.name}, ${club.city || 'Switzerland'}`,
                entryFee: parseFloat(formEntryFee) || 0,
                description: formDesc.trim() || undefined,
                isOfficial: formIsOfficial,
                countsForElo: formCountsForElo,
            };

            const createdComp = await api.createClubTournament(clubIdentifier, body);

            // Create initial selected quick categories
            if (createdComp?.id && selectedQuickCats.length > 0) {
                for (const catName of selectedQuickCats) {
                    const template = COMMON_QUICK_CATEGORIES.find((c) => c.name === catName);
                    if (template) {
                        try {
                            await api.createCategory(createdComp.id, {
                                name: template.name,
                                teamSize: template.teamSize || 1,
                                minElo: template.minElo,
                                maxElo: template.maxElo,
                                minAge: null,
                                maxAge: (template as any).maxAge || null,
                                genderRestriction: 'ANY',
                            });
                        } catch (catErr) {
                            console.warn('Failed to auto-create category:', catErr);
                        }
                    }
                }
            }

            setShowCreateModal(false);
            // Reset form
            setFormName('');
            setFormSeriesSlug('');
            setFormDesc('');
            setFormEntryFee('0');

            // Redirect immediately to the created Tournament Workspace
            if (createdComp?.slug || createdComp?.id) {
                router.push(`/competition/${createdComp.slug || createdComp.id}`);
            } else {
                await loadData();
            }
        } catch (err: any) {
            setCreateError(err.message || 'Failed to register tournament.');
        } finally {
            setCreating(false);
        }
    };

    if (!loading && (!user || !isClubOfficial)) {
        return (
            <AccessDenied
                title="Club Officials Access Required"
                description="The Tournament Hub is restricted to authorized Club Officials (Presidents, Secretaries, Coaches) and Platform Administrators."
                requiredRole="Club Official / Administrator"
                returnHref={`/club/${club?.slug || clubIdentifier}`}
            />
        );
    }

    if (loading && !club) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !club) {
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Tournament Hub Unavailable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {error || `No club found for identifier "${clubIdentifier}".`}
                    </p>
                </div>
                <Link
                    href="/clubs"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                    <span>Back to Clubs Directory</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Link href={`/club/${club.slug || clubIdentifier}`} className="hover:text-red-600 transition">
                            {club.name}
                        </Link>
                        <span>/</span>
                        <span className="text-slate-900 dark:text-white">Tournament Hub</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Layers className="w-8 h-8 text-red-600" />
                        <span>Club Tournament Hub & Hosting</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage tournaments hosted by {club.name}, register new competitions, and track club entries.
                    </p>
                </div>

                {/* Host New Tournament Action Button */}
                {isClubOfficial && (
                    <div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 px-5 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Host New Tournament</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hosted by Club</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{hostedTournaments.length}</div>
                    </div>
                    <Trophy className="w-7 h-7 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active & Upcoming</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeHostedCount}</div>
                    </div>
                    <Flame className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hosted Categories</div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalCategoriesCount}</div>
                    </div>
                    <Layers className="w-7 h-7 text-blue-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Participations</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{participatingTournaments.length}</div>
                    </div>
                    <Medal className="w-7 h-7 text-amber-500" />
                </div>
            </div>

            {/* Navigation Tabs & Filters */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    {/* Tabs */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('hosted')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                                activeTab === 'hosted'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Hosted by Club ({hostedTournaments.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('participating')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                                activeTab === 'participating'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            <Medal className="w-3.5 h-3.5" />
                            <span>Other Participations ({participatingTournaments.length})</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-xs w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tournament or venue..."
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </div>

                {/* Secondary Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-500">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="REGISTRATION_OPEN">Registration Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="DRAFT">Draft / Setup</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                        <span className="font-bold text-slate-500">Type:</span>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                        >
                            <option value="ALL">All Types</option>
                            <option value="TOURNAMENT">Tournaments</option>
                            <option value="CUP">Cups</option>
                            <option value="SEASON_TOURNAMENT">Season Tournaments</option>
                            <option value="RANKING_TOURNAMENT">Ranking Tournaments</option>
                            <option value="FRIENDLY">Friendlies</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tournaments Grid */}
            {filteredTournaments.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Trophy className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            {activeTab === 'hosted' ? 'No Hosted Tournaments' : 'No Tournament Participations'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {activeTab === 'hosted'
                                ? `${club.name} has not registered any hosted tournaments yet. Click below to host your first tournament.`
                                : `No tournament entries recorded for ${club.name}.`}
                        </p>
                    </div>
                    {activeTab === 'hosted' && isClubOfficial && (
                        <div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Host Your First Tournament</span>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredTournaments.map((comp) => {
                        const typeInfo = getTypeBadge(comp.type);
                        const statusInfo = getStatusBadge(comp.status);
                        const TypeIcon = typeInfo.icon;
                        const categories = comp.categories || [];

                        return (
                            <div
                                key={comp.id}
                                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-6"
                            >
                                <div className="space-y-4">
                                    {/* Top Line Badges */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${typeInfo.className}`}
                                            >
                                                <TypeIcon className="w-3 h-3" />
                                                <span>{typeInfo.label}</span>
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${statusInfo.className}`}
                                            >
                                                <span>{statusInfo.label}</span>
                                            </span>
                                        </div>

                                        {comp.entryFee > 0 && (
                                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                CHF {comp.entryFee.toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Title & Info */}
                                    <div className="space-y-1.5">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white hover:text-red-600 transition">
                                            <Link href={`/competition/${comp.seriesSlug || comp.slug || comp.id}`}>
                                                {comp.name}
                                            </Link>
                                        </h3>
                                        {comp.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                {comp.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Dates & Location */}
                                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                            <span>
                                                {format(new Date(comp.startDate), 'dd.MM.yyyy')}
                                                {comp.endDate ? ` - ${format(new Date(comp.endDate), 'dd.MM.yyyy')}` : ''}
                                            </span>
                                        </div>
                                        {comp.location && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                                <span className="truncate">{comp.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Categories Pills */}
                                    {categories.length > 0 && (
                                        <div className="space-y-1.5 pt-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                Categories ({categories.length})
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {categories.slice(0, 5).map((cat: any) => (
                                                    <span
                                                        key={cat.id}
                                                        className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                                                    >
                                                        {cat.name}
                                                    </span>
                                                ))}
                                                {categories.length > 5 && (
                                                    <span className="text-[10px] text-slate-400 self-center">
                                                        +{categories.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Action */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {comp.association?.name || 'Sanctioned Event'}
                                    </span>
                                    <Link
                                        href={`/competition/${comp.seriesSlug || comp.slug || comp.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-red-600 dark:bg-slate-800 dark:hover:bg-red-600 px-3.5 py-2 text-xs font-bold transition shadow-xs"
                                    >
                                        <span>Open Workspace</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Host New Tournament Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Host New Tournament / Competition"
                size="lg"
            >
                <form onSubmit={handleCreateTournament} className="space-y-5">
                    {createError && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-3 text-xs text-red-600 dark:text-red-400 font-medium">
                            {createError}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Tournament Name & Series */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Tournament Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. 42. Club Open Championship"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Series Identifier / Slug (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formSeriesSlug}
                                    onChange={(e) => setFormSeriesSlug(e.target.value)}
                                    placeholder="e.g. club-open"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden font-mono"
                                />
                            </div>
                        </div>

                        {/* Competition Type & Governing Association */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Competition Type *
                                </label>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden cursor-pointer"
                                >
                                    <option value="TOURNAMENT">Tournament (Single Event)</option>
                                    <option value="CUP">Cup Competition (Knockout)</option>
                                    <option value="SEASON_TOURNAMENT">Season Tournament</option>
                                    <option value="RANKING_TOURNAMENT">Ranking Tournament</option>
                                    <option value="FRIENDLY">Friendly Tournament</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Governing Association *
                                </label>
                                <select
                                    value={formAssocId}
                                    onChange={(e) => setFormAssocId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden cursor-pointer"
                                >
                                    {associations.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} [{a.code}]
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Start Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formStartDate}
                                    onChange={(e) => setFormStartDate(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    End Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formEndDate}
                                    onChange={(e) => setFormEndDate(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                                />
                            </div>
                        </div>

                        {/* Location / Venue & Entry Fee */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Venue / Sports Hall
                                </label>
                                {locations.length > 0 ? (
                                    <div className="space-y-1">
                                        <select
                                            value={formLocation}
                                            onChange={(e) => setFormLocation(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden cursor-pointer"
                                        >
                                            <option value="">Select Club Hall or custom...</option>
                                            {locations.map((loc) => (
                                                <option key={loc.id} value={`${loc.name}, ${loc.address || ''}`}>
                                                    {loc.name} {loc.city ? `(${loc.city})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={formLocation}
                                        onChange={(e) => setFormLocation(e.target.value)}
                                        placeholder={`e.g. ${club.name} Sports Hall, ${club.city || 'Bern'}`}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                                    />
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Entry Fee (CHF)
                                </label>
                                <input
                                    type="number"
                                    step="0.50"
                                    min="0"
                                    value={formEntryFee}
                                    onChange={(e) => setFormEntryFee(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden font-mono"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Description & Invitation Notes
                            </label>
                            <textarea
                                rows={2}
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                placeholder="Details about registration schedule, tournament rules, catering, etc."
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                            />
                        </div>

                        {/* Quick Categories Initial Setup */}
                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                Quick Pre-generate Categories
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {COMMON_QUICK_CATEGORIES.map((cat) => {
                                    const isSelected = selectedQuickCats.includes(cat.name);
                                    return (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedQuickCats((prev) => prev.filter((c) => c !== cat.name));
                                                } else {
                                                    setSelectedQuickCats((prev) => [...prev, cat.name]);
                                                }
                                            }}
                                            className={`rounded-xl p-2 text-left text-xs font-medium border transition ${
                                                isSelected
                                                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-bold'
                                                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{cat.name}</span>
                                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center gap-6 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={formCountsForElo}
                                    onChange={(e) => setFormCountsForElo(e.target.checked)}
                                    className="rounded text-red-600 focus:ring-red-500"
                                />
                                <span>Counts for Elo Ranking</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={formIsOfficial}
                                    onChange={(e) => setFormIsOfficial(e.target.checked)}
                                    className="rounded text-red-600 focus:ring-red-500"
                                />
                                <span>Official Sanctioned Event</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                        >
                            {creating ? 'Registering Tournament...' : 'Register & Open Workspace'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

