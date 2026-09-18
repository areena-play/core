'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import {
    User,
    Shield,
    Building2,
    Award,
    Calendar,
    MapPin,
    Mail,
    Phone,
    Home,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    GraduationCap,
    Clock,
    Sparkles,
    Trophy,
    ExternalLink,
    BadgeCheck,
    Lock,
    Unlock,
    Copy,
    Check,
    BarChart3,
    Flame,
    Activity,
    Layers,
    Users,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    HelpCircle,
    Info,
    Crown,
    AlertCircle,
    Swords,
    Zap,
    Target,
} from 'lucide-react';
import { JsonLd, generatePersonJsonLd } from '@/components/seo/JsonLd';
import { MatchAiAnalysisModal } from '@/components/competitions/MatchAiAnalysisModal';

type ActiveTab = 'overview' | 'roles' | 'statistics';

export default function PersonProfilePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const identifier = params?.identifier as string;

    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
    const [person, setPerson] = useState<any | null>(null);
    const [statsData, setStatsData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // AI Analysis Modal State
    const [aiModalMatchId, setAiModalMatchId] = useState<string | null>(null);
    const [aiModalTitle, setAiModalTitle] = useState<string | undefined>(undefined);

    // Filters for statistics / match history
    const [matchFilterType, setMatchFilterType] = useState<string>('ALL');
    const [matchSearchQuery, setMatchSearchQuery] = useState<string>('');

    // Head-to-Head specific state
    const [selectedH2hOpponent, setSelectedH2hOpponent] = useState<any | null>(null);
    const [h2hData, setH2hData] = useState<any | null>(null);
    const [h2hLoading, setH2hLoading] = useState(false);
    const [h2hSearchQuery, setH2hSearchQuery] = useState('');
    const [h2hSearchResults, setH2hSearchResults] = useState<any[]>([]);
    const [isSearchingH2h, setIsSearchingH2h] = useState(false);

    // Filters for licenses tab
    const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>('ALL');

    // Sync tab with URL if query parameter provided
    useEffect(() => {
        const tabQuery = searchParams.get('tab');
        if (tabQuery === 'roles' || tabQuery === 'statistics' || tabQuery === 'overview') {
            setActiveTab(tabQuery as ActiveTab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!identifier) return;

        async function loadPerson() {
            try {
                setLoading(true);
                setError(null);
                const data = await api.getPerson(identifier);
                setPerson(data);
            } catch (err: any) {
                console.error('Failed to load person profile:', err);
                setError(err.message || 'Person not found');
            } finally {
                setLoading(false);
            }
        }

        loadPerson();
    }, [identifier]);

    // Load statistics when switching to statistics tab or initially
    useEffect(() => {
        if (!identifier) return;

        async function loadStats() {
            try {
                setStatsLoading(true);
                const data = await api.getPersonStats(identifier);
                setStatsData(data);
                if (data?.headToHead?.length > 0 && !selectedH2hOpponent) {
                    setSelectedH2hOpponent(data.headToHead[0].opponent);
                }
            } catch (err: any) {
                console.warn('Failed to load person statistics:', err);
            } finally {
                setStatsLoading(false);
            }
        }

        if (activeTab === 'statistics' || activeTab === 'overview') {
            loadStats();
        }
    }, [identifier, activeTab]);

    // Load direct H2H data when selected opponent changes
    useEffect(() => {
        if (!identifier || !selectedH2hOpponent) {
            setH2hData(null);
            return;
        }

        async function loadH2h() {
            try {
                setH2hLoading(true);
                const oppId = selectedH2hOpponent.licenseId || selectedH2hOpponent.id;
                const data = await api.getHeadToHead(identifier, oppId);
                setH2hData(data);
            } catch (err) {
                console.error('Failed to load H2H breakdown:', err);
            } finally {
                setH2hLoading(false);
            }
        }

        loadH2h();
    }, [identifier, selectedH2hOpponent]);

    // Handle searching for any opponent across the federation
    useEffect(() => {
        if (!h2hSearchQuery.trim() || h2hSearchQuery.trim().length < 2) {
            setH2hSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsSearchingH2h(true);
                const res = await api.globalSearch(h2hSearchQuery.trim());
                const peopleResults = (res?.results || [])
                    .filter((r: any) => r.type === 'person' && r.id !== person?.id && r.id !== person?.licenseId)
                    .slice(0, 6);
                setH2hSearchResults(peopleResults);
            } catch (err) {
                console.error('Failed to search opponents for H2H:', err);
            } finally {
                setIsSearchingH2h(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [h2hSearchQuery, person]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url.toString());
    };

    // Filtered matches for Statistics tab
    const filteredMatches = useMemo(() => {
        if (!statsData?.matches) return [];
        return statsData.matches.filter((m: any) => {
            const matchesType =
                matchFilterType === 'ALL' ||
                (matchFilterType === 'LEAGUE' && m.competitionType === 'LEAGUE') ||
                (matchFilterType === 'TOURNAMENT' && ['TOURNAMENT', 'SEASON_TOURNAMENT', 'RANKING_TOURNAMENT'].includes(m.competitionType)) ||
                (matchFilterType === 'CUP' && m.competitionType === 'CUP') ||
                (matchFilterType === 'OTHER' && !['LEAGUE', 'TOURNAMENT', 'SEASON_TOURNAMENT', 'RANKING_TOURNAMENT', 'CUP'].includes(m.competitionType));

            if (!matchesType) return false;

            if (matchSearchQuery.trim()) {
                const q = matchSearchQuery.toLowerCase();
                const oppMatch = m.opponents?.some(
                    (op: any) => `${op.firstName} ${op.lastName}`.toLowerCase().includes(q) || op.licenseId?.toLowerCase().includes(q)
                );
                const compMatch = m.competitionName?.toLowerCase().includes(q) || m.categoryName?.toLowerCase().includes(q);
                const teamMatch = m.myTeam?.name?.toLowerCase().includes(q) || m.oppTeam?.name?.toLowerCase().includes(q);
                return oppMatch || compMatch || teamMatch;
            }

            return true;
        });
    }, [statsData?.matches, matchFilterType, matchSearchQuery]);

    // Filtered licenses for Roles tab
    const filteredLicenses = useMemo(() => {
        if (!person?.licenses) return [];
        return person.licenses.filter((lic: any) => {
            if (licenseStatusFilter === 'ALL') return true;
            if (licenseStatusFilter === 'ACTIVE') return lic.status === 'APPROVED';
            if (licenseStatusFilter === 'PENDING') return lic.status === 'PENDING_CLUB' || lic.status === 'PENDING_ASSOCIATION';
            if (licenseStatusFilter === 'EXPIRED') return lic.status === 'EXPIRED' || lic.status === 'REJECTED';
            return true;
        });
    }, [person?.licenses, licenseStatusFilter]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !person) {
        return (
            <div className="max-w-3xl mx-auto py-16 px-4 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 mb-4">
                    <User className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Person Not Found</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    We couldn&apos;t find a member profile matching identifier: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-xs">{identifier}</code>
                </p>
                <Link
                    href="/people"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to People Directory</span>
                </Link>
            </div>
        );
    }

    const canManage = Boolean(person.canManage);
    const activeLicenses = person.licenses?.filter((l: any) => l.status === 'APPROVED') || [];
    const stats = statsData?.stats;

    return (
        <div className="w-full space-y-6 pb-20">
            {/* Schema.org Person Structured Data */}
            <JsonLd data={generatePersonJsonLd(person)} />

            {/* Top Action Bar */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                </button>

                <div className="flex items-center gap-2">
                    {canManage && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-xs">
                            <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>Management Rights</span>
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() => handleCopy(window.location.href)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Link Copied' : 'Share Profile'}</span>
                    </button>
                </div>
            </div>

            {/* Profile Header Hero Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                    {/* Avatar */}
                    <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 text-red-600 dark:text-red-400 font-black text-2xl sm:text-3xl border-2 border-red-500/30 shadow-inner shrink-0 overflow-hidden">
                        {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.firstName} className="w-full h-full object-cover" />
                        ) : (
                            <>
                                {person.firstName?.[0] || 'U'}
                                {person.lastName?.[0] || ''}
                            </>
                        )}
                    </div>

                    {/* Main Bio Info */}
                    <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {person.firstName} {person.lastName}
                            </h1>
                            {person.licenseId && (
                                <button
                                    onClick={() => handleCopy(person.licenseId)}
                                    title="Click to copy License ID"
                                    className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/60 hover:bg-red-100 transition"
                                >
                                    <BadgeCheck className="h-3.5 w-3.5 text-red-600" />
                                    <span>{person.licenseId}</span>
                                    <Copy className="h-2.5 w-2.5 text-red-400 ml-0.5" />
                                </button>
                            )}
                            {person.accountStatus === 'MANAGED' && (
                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                    Managed Dependent
                                </span>
                            )}
                            {(person.phoneticFirstName || person.phoneticLastName) && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 text-[10px] font-mono text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title="Phonetic Pronunciation Guide">
                                    <span>🗣️</span>
                                    <span>{[person.phoneticFirstName, person.phoneticLastName].filter(Boolean).join(' ')}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            {person.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{person.city}{person.country ? `, ${person.country}` : ''}</span>
                                </div>
                            )}
                            {person.createdAt && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Member since {format(new Date(person.createdAt), 'yyyy')}</span>
                                </div>
                            )}
                            {activeLicenses.length > 0 && (
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>{activeLicenses.length} Active License{activeLicenses.length > 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ELO / Rating Badge & Level */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto p-4 sm:p-0 rounded-2xl bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent border sm:border-0 border-slate-200 dark:border-slate-800 gap-2">
                        <div className="text-left sm:text-right">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ELO Rating</div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">
                                    {person.eloPoints ?? 1000}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">pts</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {person.currentLevel && (
                                <span className="rounded-lg bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 px-2.5 py-1 text-xs font-black border border-red-200 dark:border-red-800/60">
                                    Level {person.currentLevel}
                                </span>
                            )}
                            {person.rank && (
                                <span className="rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 text-xs font-bold">
                                    Rank #{person.rank}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section Tabs Bar */}
                <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-6 pt-4 overflow-x-auto">
                    <button
                        onClick={() => handleTabChange('overview')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                            activeTab === 'overview'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <User className="w-4 h-4" />
                        <span>Overview</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('roles')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                            activeTab === 'roles'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Award className="w-4 h-4" />
                        <span>Licenses, Memberships & Roles</span>
                        {person.licenses?.length > 0 && (
                            <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    activeTab === 'roles' ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {person.licenses.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('statistics')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                            activeTab === 'statistics'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>Statistics & Matches</span>
                        {stats?.totalMatches !== undefined && (
                            <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    activeTab === 'statistics' ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {stats.totalMatches}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Contact Details & Affiliations */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Contact Information & Privacy Details */}
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-red-600" />
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Personal & Contact Information
                                    </h2>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {canManage ? (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold border border-purple-200 dark:border-purple-800/60">
                                            <Unlock className="w-3 h-3 text-purple-600" />
                                            <span>Full Management View</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                                            <Shield className="w-3 h-3" />
                                            <span>Privacy Masked</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Email Address</span>
                                    </div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white break-all">
                                        {person.email || (
                                            <span className="text-slate-400 italic">
                                                {person.hideContactInfo && !canManage ? 'Hidden by user privacy' : 'No email recorded'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Phone Number</span>
                                    </div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                                        {person.phone ? (
                                            <span>{person.phone}</span>
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                {!canManage ? 'Hidden for public' : 'Not recorded'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Home className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Physical Address</span>
                                    </div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                                        {person.street || person.postalCode || person.city ? (
                                            <span>
                                                {person.street && <span>{person.street}, </span>}
                                                {person.postalCode} {person.city}
                                                {person.country && <span> ({person.country})</span>}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                {!canManage ? 'Address restricted' : 'No street address'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Date of Birth & Gender</span>
                                    </div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                                        {person.birthDate ? (
                                            <span>
                                                {format(new Date(person.birthDate), 'dd.MM.yyyy')}
                                                {person.gender && ` • ${person.gender}`}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                {!canManage ? 'Protected birthdate' : 'Not provided'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Primary Affiliations & Active Licenses Highlights */}
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-red-600" />
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Active License & Primary Club
                                    </h2>
                                </div>
                                <button
                                    onClick={() => handleTabChange('roles')}
                                    className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                                >
                                    <span>All Licenses & Roles</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {activeLicenses.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {activeLicenses.slice(0, 2).map((lic: any) => (
                                        <div
                                            key={lic.id}
                                            className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {lic.type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    <span>ACTIVE</span>
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                                                {lic.club && (
                                                    <div>
                                                        Club:{' '}
                                                        <Link
                                                            href={`/club/${lic.club.slug || lic.club.id}`}
                                                            className="font-bold text-red-600 hover:underline"
                                                        >
                                                            {lic.club.name}
                                                        </Link>
                                                    </div>
                                                )}
                                                {lic.association && (
                                                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                        Assoc: {lic.association.name}
                                                    </div>
                                                )}
                                            </div>

                                            {lic.validUntil && (
                                                <div className="text-[11px] text-slate-400 font-mono">
                                                    Valid until: {format(new Date(lic.validUntil), 'dd.MM.yyyy')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                    No active licenses on file.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Quick Stats & Metadata Box */}
                    <div className="space-y-6">
                        {/* Quick Performance Metrics */}
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Flame className="h-5 w-5 text-amber-500" />
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Performance</h2>
                                </div>
                                <button
                                    onClick={() => handleTabChange('statistics')}
                                    className="text-xs font-bold text-red-600 hover:underline"
                                >
                                    Full Stats
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Matches</div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                        {stats?.totalMatches ?? 0}
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Win Rate</div>
                                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {stats?.winRate ?? 0}%
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Record</div>
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                                        {stats?.wins ?? 0}W - {stats?.losses ?? 0}L
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Peak Elo</div>
                                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                                        {stats?.highestElo ?? person.eloPoints} pts
                                    </div>
                                </div>
                            </div>

                            {/* Recent Form */}
                            {stats?.recentForm && stats.recentForm.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Recent Form:</span>
                                    <div className="flex items-center gap-1">
                                        {stats.recentForm.map((res: string, i: number) => (
                                            <span
                                                key={i}
                                                className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center ${
                                                    res === 'WIN'
                                                        ? 'bg-emerald-500 text-white'
                                                        : res === 'DRAW'
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-rose-500 text-white'
                                                }`}
                                            >
                                                {res === 'WIN' ? 'W' : res === 'DRAW' ? 'D' : 'L'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Identifiers & Meta */}
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-5 space-y-3 text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">Profile Identifiers</div>
                            <div className="space-y-2 text-[11px] font-mono">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">License ID:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {person.licenseId || 'None'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Internal UUID:</span>
                                    <span className="text-slate-500 truncate max-w-[140px]">{person.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: LICENSES, CLUB MEMBERSHIPS & ROLES */}
            {activeTab === 'roles' && (
                <div className="space-y-6">
                    {/* Management View Security Notice */}
                    {canManage ? (
                        <div className="rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 p-4 flex items-start gap-3">
                            <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 text-xs text-purple-900 dark:text-purple-200">
                                <div className="font-bold">Authorized Management View</div>
                                <p className="text-purple-700 dark:text-purple-300 text-[11px]">
                                    You have administrative or guardian management rights for this person. All active, pending, expired, and historical licenses, club memberships, and internal roles are fully accessible below.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                                <div className="font-bold">Public Credentials View</div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Displaying active official licenses and public governance affiliations. Historical and internal membership records are restricted to club officials, legal guardians, and the member.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Licenses List Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-red-600" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Official Licenses ({person.licenses?.length || 0})
                                </h2>
                            </div>

                            {/* License filter chips */}
                            {canManage && (
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                                    <button
                                        onClick={() => setLicenseStatusFilter('ALL')}
                                        className={`px-2.5 py-1 rounded-lg transition ${
                                            licenseStatusFilter === 'ALL'
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setLicenseStatusFilter('ACTIVE')}
                                        className={`px-2.5 py-1 rounded-lg transition ${
                                            licenseStatusFilter === 'ACTIVE'
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Active ({activeLicenses.length})
                                    </button>
                                    <button
                                        onClick={() => setLicenseStatusFilter('PENDING')}
                                        className={`px-2.5 py-1 rounded-lg transition ${
                                            licenseStatusFilter === 'PENDING'
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        onClick={() => setLicenseStatusFilter('EXPIRED')}
                                        className={`px-2.5 py-1 rounded-lg transition ${
                                            licenseStatusFilter === 'EXPIRED'
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Past / Expired
                                    </button>
                                </div>
                            )}
                        </div>

                        {filteredLicenses.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filteredLicenses.map((lic: any) => {
                                    const isApproved = lic.status === 'APPROVED';
                                    const isPending = lic.status === 'PENDING_CLUB' || lic.status === 'PENDING_ASSOCIATION';
                                    const isExpired = lic.status === 'EXPIRED';
                                    const isRejected = lic.status === 'REJECTED';

                                    return (
                                        <div
                                            key={lic.id}
                                            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                                        >
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                        {lic.type.replace(/_/g, ' ')}
                                                    </span>

                                                    {isApproved && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            <span>ACTIVE</span>
                                                        </span>
                                                    )}

                                                    {isPending && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                                                            <Clock className="h-3 w-3" />
                                                            <span>PENDING APPROVAL</span>
                                                        </span>
                                                    )}

                                                    {isExpired && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                                            <span>EXPIRED</span>
                                                        </span>
                                                    )}

                                                    {isRejected && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                                                            <XCircle className="h-3 w-3" />
                                                            <span>REJECTED</span>
                                                        </span>
                                                    )}

                                                    {lic.isSecondaryClubLicense && (
                                                        <span className="rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-bold">
                                                            Secondary Pass
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    {lic.club && (
                                                        <span>
                                                            Club:{' '}
                                                            <Link
                                                                href={`/club/${lic.club.slug || lic.club.id}`}
                                                                className="font-bold text-slate-700 dark:text-slate-200 hover:text-red-600"
                                                            >
                                                                {lic.club.name} ({lic.club.code})
                                                            </Link>
                                                        </span>
                                                    )}
                                                    {lic.association && (
                                                        <span>
                                                            Assoc:{' '}
                                                            <strong className="text-slate-700 dark:text-slate-200">
                                                                {lic.association.name}
                                                            </strong>
                                                        </span>
                                                    )}
                                                    {lic.season?.name && (
                                                        <span>Season: <strong>{lic.season.name}</strong></span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                                <div>From: {format(new Date(lic.validFrom), 'dd.MM.yyyy')}</div>
                                                <div>Until: {format(new Date(lic.validUntil), 'dd.MM.yyyy')}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                No licenses matching selected filter.
                            </div>
                        )}
                    </div>

                    {/* Club Roles & Memberships */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-red-600" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Club Roles & Governance Memberships
                            </h2>
                        </div>

                        {person.clubRoles?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {person.clubRoles.map((cr: any) => (
                                    <div
                                        key={cr.id}
                                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                {cr.club?.name || 'Club'}
                                            </div>
                                            <span className="rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                                {cr.role}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                            <span>Code: {cr.club?.code}</span>
                                            {cr.createdAt && (
                                                <span>Since {format(new Date(cr.createdAt), 'MM/yyyy')}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                No direct club governance leadership roles assigned.
                            </div>
                        )}
                    </div>

                    {/* Team Memberships & Squad Registrations (Visible to Managers) */}
                    {canManage && (
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-600" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Team & Competition Squad Registrations
                                </h2>
                            </div>

                            {person.teamMemberships?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {person.teamMemberships.map((tm: any) => {
                                        const t = tm.team || {};
                                        const cat = t.registrations?.[0]?.category || t.category;
                                        const comp = cat?.competition || {};
                                        return (
                                            <div
                                                key={tm.id}
                                                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        <span>{t.name || 'Team'}</span>
                                                        {tm.role === 'CAPTAIN' && (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md">
                                                                <Crown className="w-3 h-3" />
                                                                <span>Captain</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {tm.role}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                                                    {comp.name && <div>Competition: <strong>{comp.name}</strong></div>}
                                                    {cat?.name && (
                                                        <div className="text-[11px]">Category: {cat.name}</div>
                                                    )}
                                                    {t.club?.name && (
                                                        <div className="text-[11px]">Club: {t.club.name}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                    No active league or tournament team memberships recorded.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Association Roles & Federation Positions */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-600" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Association & Federation Affiliations
                            </h2>
                        </div>

                        {person.associationRoles?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {person.associationRoles.map((ar: any) => (
                                    <div
                                        key={ar.id}
                                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                {ar.association?.name || 'Association'}
                                            </div>
                                            <span className="rounded-lg bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold border border-red-200 dark:border-red-800">
                                                {ar.role}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            Code: {ar.association?.code}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                No federation administrative or governance roles recorded.
                            </div>
                        )}
                    </div>

                    {/* Training & Refresher Courses */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-red-600" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Training & Continuing Education Courses
                            </h2>
                        </div>

                        {person.courseAttendances?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {person.courseAttendances.map((ca: any) => (
                                    <div
                                        key={ca.id}
                                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5"
                                    >
                                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                                            {ca.course?.title || 'Certification Course'}
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                            <span>{ca.course?.category || ca.course?.type || 'Referee / Coach'}</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {ca.attested ? 'Attested / Passed' : 'Registered'}
                                            </span>
                                        </div>
                                        {ca.course?.date && (
                                            <div className="text-[10px] text-slate-400">
                                                Date: {format(new Date(ca.course.date), 'dd.MM.yyyy')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                No course attendance or certification records on file.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: STATISTICS & MATCH HISTORY */}
            {activeTab === 'statistics' && (
                <div className="space-y-6">
                    {/* Performance Summary Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Total Matches
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                {stats?.totalMatches ?? 0}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {stats?.wins ?? 0}W - {stats?.losses ?? 0}L
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Win Rate
                            </div>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {stats?.winRate ?? 0}%
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Sets: {stats?.setsWon ?? 0}:{stats?.setsLost ?? 0} ({stats?.setWinRate ?? 0}%)
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Singles / Doubles
                            </div>
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                {stats?.singles?.wins ?? 0}W / {stats?.doubles?.wins ?? 0}W
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Singles ({stats?.singles?.played ?? 0}) • Doubles ({stats?.doubles?.played ?? 0})
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Peak Rating
                            </div>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {stats?.highestElo ?? person.eloPoints}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Current: {person.eloPoints} pts (Lvl {person.currentLevel || 'D1'})
                            </div>
                        </div>
                    </div>

                    {/* HEAD-TO-HEAD CLASH ARENA */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                                    <Swords className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Head-to-Head Matchup Arena
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Analyze historical rivalry records, direct encounters, and Elo win probabilities.
                                    </p>
                                </div>
                            </div>

                            {/* Opponent Search Bar */}
                            <div className="relative w-full md:w-72">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search any player to compare..."
                                    value={h2hSearchQuery}
                                    onChange={(e) => setH2hSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                                />

                                {/* Search Dropdown Results */}
                                {h2hSearchResults.length > 0 && (
                                    <div className="absolute right-0 left-0 mt-1.5 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {h2hSearchResults.map((res: any) => (
                                            <button
                                                key={res.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedH2hOpponent({
                                                        id: res.id,
                                                        licenseId: res.licenseId || res.id,
                                                        firstName: res.title?.split(' ')[0] || '',
                                                        lastName: res.title?.split(' ').slice(1).join(' ') || '',
                                                        club: res.subtitle ? { name: res.subtitle } : undefined,
                                                    });
                                                    setH2hSearchQuery('');
                                                    setH2hSearchResults([]);
                                                }}
                                                className="w-full p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-2 transition"
                                            >
                                                <div className="min-w-0">
                                                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                        {res.title}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate">
                                                        {res.subtitle || 'Player'}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-red-600 shrink-0">
                                                    Compare &rarr;
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Rival Select Pills */}
                        {statsData?.headToHead && statsData.headToHead.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Frequent Opponents & Rivals
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                    {statsData.headToHead.slice(0, 8).map((h: any) => {
                                        const opp = h.opponent;
                                        const isSelected = selectedH2hOpponent && (
                                            (opp.licenseId && selectedH2hOpponent.licenseId === opp.licenseId) ||
                                            (opp.id && selectedH2hOpponent.id === opp.id)
                                        );
                                        return (
                                            <button
                                                key={opp.id || opp.licenseId}
                                                type="button"
                                                onClick={() => setSelectedH2hOpponent(opp)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                                                    isSelected
                                                        ? 'bg-red-600 text-white shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <span>{opp.firstName} {opp.lastName}</span>
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                                    isSelected
                                                        ? 'bg-red-700/80 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                }`}>
                                                    {h.matchesCount} {h.matchesCount === 1 ? 'match' : 'matches'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Matchup Comparison Card */}
                        {h2hLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                <span className="text-xs">Analyzing head-to-head clash...</span>
                            </div>
                        ) : h2hData ? (
                            <div className="space-y-6">
                                <div className="p-6 rounded-3xl bg-linear-to-br from-slate-50 to-slate-100/70 dark:from-slate-950/60 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                                        {/* Player 1 (Viewed Person) */}
                                        <div className="md:col-span-3 flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                                                {h2hData.player.firstName?.[0]}{h2hData.player.lastName?.[0]}
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    Current Player
                                                </div>
                                                <div className="font-black text-base text-slate-900 dark:text-white truncate">
                                                    {h2hData.player.firstName} {h2hData.player.lastName}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                                                        {h2hData.player.eloPoints} pts
                                                    </span>
                                                    <span className="px-2 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                        Lvl {h2hData.player.currentLevel || 'D1'}
                                                    </span>
                                                    {h2hData.player.club && (
                                                        <span className="text-[11px] text-slate-500 truncate">
                                                            {h2hData.player.club.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* VS Center Badge & Probabilities */}
                                        <div className="md:col-span-1 flex flex-col items-center justify-center py-2 text-center">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-xs shadow-md mb-2">
                                                VS
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500">
                                                {h2hData.eloDifference >= 0
                                                    ? `+${h2hData.eloDifference} Elo delta`
                                                    : `${h2hData.eloDifference} Elo delta`}
                                            </div>
                                        </div>

                                        {/* Player 2 (Opponent) */}
                                        <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-4 text-left md:text-right">
                                            <div className="space-y-1 min-w-0 order-2 md:order-1">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    Opponent
                                                </div>
                                                <Link
                                                    href={`/people/${h2hData.opponent.licenseId || h2hData.opponent.id}`}
                                                    className="font-black text-base text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 truncate block transition"
                                                >
                                                    {h2hData.opponent.firstName} {h2hData.opponent.lastName}
                                                </Link>
                                                <div className="flex items-center justify-start md:justify-end gap-2 flex-wrap">
                                                    {h2hData.opponent.club && (
                                                        <span className="text-[11px] text-slate-500 truncate">
                                                            {h2hData.opponent.club.name}
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                        Lvl {h2hData.opponent.currentLevel || 'D1'}
                                                    </span>
                                                    <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                                                        {h2hData.opponent.eloPoints} pts
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 order-1 md:order-2">
                                                {h2hData.opponent.firstName?.[0]}{h2hData.opponent.lastName?.[0]}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Win Probability Bar & Overall Record Stats */}
                                    <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                                <Zap className="w-3.5 h-3.5" />
                                                {h2hData.expectedWinProbability}% Expected Win Chance
                                            </span>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {100 - h2hData.expectedWinProbability}%
                                            </span>
                                        </div>

                                        {/* Probability Progress Bar */}
                                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                            <div
                                                className="bg-linear-to-r from-red-500 to-rose-600 h-full transition-all duration-500"
                                                style={{ width: `${h2hData.expectedWinProbability}%` }}
                                            />
                                            <div
                                                className="bg-slate-400 dark:bg-slate-600 h-full transition-all duration-500"
                                                style={{ width: `${100 - h2hData.expectedWinProbability}%` }}
                                            />
                                        </div>

                                        {/* Head-to-Head Statistics Badges */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Clash Count</div>
                                                <div className="text-lg font-black text-slate-900 dark:text-white">
                                                    {h2hData.record.totalMatches}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">W - L - D</div>
                                                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                                    {h2hData.record.wins} - {h2hData.record.losses} - {h2hData.record.draws}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Win Rate</div>
                                                <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                                                    {h2hData.record.winRate}%
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Sets Won:Lost</div>
                                                <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                                                    {h2hData.record.setsWon}:{h2hData.record.setsLost}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Historical Encounters List */}
                                <div className="space-y-3">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                        <span>Historical Encounters ({h2hData.matches.length})</span>
                                        <span className="text-[11px] font-normal text-slate-400">
                                            Chronological match log
                                        </span>
                                    </div>

                                    {h2hData.matches.length > 0 ? (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
                                            {h2hData.matches.map((m: any) => {
                                                const isWin = m.result === 'WIN';
                                                const isDraw = m.result === 'DRAW';

                                                return (
                                                    <div
                                                        key={m.id}
                                                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-black text-[11px] ${
                                                                    isWin
                                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                        : isDraw
                                                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                                }`}
                                                            >
                                                                <span>{m.result}</span>
                                                                <span className="text-[10px] font-mono">{m.scoreSets}</span>
                                                            </div>

                                                            <div className="space-y-0.5">
                                                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                                    {m.competitionName}
                                                                    {m.categoryName && (
                                                                        <span className="text-slate-400 font-normal"> • {m.categoryName}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                    {m.matchType === 'DOUBLE' ? 'Doubles Match' : 'Singles Match'}
                                                                    {m.myTeam?.name && ` • Team: ${m.myTeam.name}`}
                                                                </div>

                                                                {/* Set scores chips */}
                                                                {Array.isArray(m.setsDetail) && m.setsDetail.length > 0 && (
                                                                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                                                                        {m.setsDetail.map((s: any, idx: number) => {
                                                                            const h = s.homeScore ?? s.home ?? 0;
                                                                            const a = s.awayScore ?? s.away ?? 0;
                                                                            const myScore = m.isHome ? h : a;
                                                                            const oppScore = m.isHome ? a : h;
                                                                            const wonSet = myScore > oppScore;

                                                                            return (
                                                                                <span
                                                                                    key={idx}
                                                                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                                                                                        wonSet
                                                                                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                                                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                                    }`}
                                                                                >
                                                                                    {myScore}:{oppScore}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                                                            <div>{format(new Date(m.date), 'dd.MM.yyyy')}</div>
                                                            <div className="text-[10px] uppercase">{m.competitionType}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-1">
                                            <p className="font-bold text-slate-600 dark:text-slate-300">
                                                No direct tournament or league encounters recorded yet.
                                            </p>
                                            <p className="text-[11px]">
                                                Use the matchup stats above to compare rating advantage and expected win probabilities.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                Select a rival above or search for any player to inspect direct head-to-head records.
                            </div>
                        )}
                    </div>

                    {/* ALL OPPONENTS HEAD-TO-HEAD RECORD DIRECTORY */}
                    {statsData?.headToHead && statsData.headToHead.length > 0 && (
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-red-600" />
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Opponents Faced Directory ({statsData.headToHead.length})
                                    </h2>
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                    All-time recorded adversaries
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="py-2.5 px-3">Opponent</th>
                                            <th className="py-2.5 px-3">Current Elo</th>
                                            <th className="py-2.5 px-3">Matches</th>
                                            <th className="py-2.5 px-3">W - L - D</th>
                                            <th className="py-2.5 px-3">Win %</th>
                                            <th className="py-2.5 px-3">Sets (W:L)</th>
                                            <th className="py-2.5 px-3">Last Clash</th>
                                            <th className="py-2.5 px-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                        {statsData.headToHead.map((h: any) => {
                                            const opp = h.opponent;
                                            const isSelected = selectedH2hOpponent && (
                                                (opp.licenseId && selectedH2hOpponent.licenseId === opp.licenseId) ||
                                                (opp.id && selectedH2hOpponent.id === opp.id)
                                            );

                                            return (
                                                <tr
                                                    key={opp.id || opp.licenseId}
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                                                        isSelected ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                                                    }`}
                                                >
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-[10px] shrink-0">
                                                                {opp.firstName?.[0]}{opp.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <Link
                                                                    href={`/people/${opp.licenseId || opp.id}`}
                                                                    className="font-bold text-slate-900 dark:text-white hover:text-red-600 block truncate"
                                                                >
                                                                    {opp.firstName} {opp.lastName}
                                                                </Link>
                                                                <div className="text-[10px] text-slate-400 truncate">
                                                                    {opp.club?.name || opp.licenseId || 'Player'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                            {opp.eloPoints ? `${opp.eloPoints} pts` : '-'}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            Lvl {opp.currentLevel || 'D1'}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                                        {h.matchesCount}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                            {h.wins}
                                                        </span>
                                                        <span className="text-slate-400"> - </span>
                                                        <span className="font-bold text-rose-600 dark:text-rose-400">
                                                            {h.losses}
                                                        </span>
                                                        <span className="text-slate-400"> - </span>
                                                        <span className="font-bold text-slate-500">
                                                            {h.draws}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                                        {h.winRate}%
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                                                        {h.setsWon}:{h.setsLost}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                        {h.lastMatchDate ? format(new Date(h.lastMatchDate), 'dd.MM.yyyy') : '-'}
                                                        {h.lastMatchResult && (
                                                            <span className={`ml-1.5 px-1.5 py-0.2 rounded-md font-bold text-[9px] ${
                                                                h.lastMatchResult === 'WIN'
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                            }`}>
                                                                {h.lastMatchResult}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedH2hOpponent(opp);
                                                                window.scrollTo({ top: 400, behavior: 'smooth' });
                                                            }}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                                                isSelected
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-300'
                                                            }`}
                                                        >
                                                            {isSelected ? 'Active Arena' : 'Clash Arena'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Elo Rating History Timeline */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-red-600" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Elo Rating Progression & Snapshot History
                                </h2>
                            </div>
                            <span className="text-xs font-bold text-slate-400">
                                {statsData?.eloHistory?.length || 0} Snapshots
                            </span>
                        </div>

                        {statsData?.eloHistory && statsData.eloHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="py-2.5 px-3">Effective Date</th>
                                            <th className="py-2.5 px-3">Rating (Elo)</th>
                                            <th className="py-2.5 px-3">Level</th>
                                            <th className="py-2.5 px-3">National Rank</th>
                                            <th className="py-2.5 px-3">Trigger Reason</th>
                                            <th className="py-2.5 px-3">Association</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                        {statsData.eloHistory.map((snap: any) => (
                                            <tr key={snap.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                                                    {format(new Date(snap.effectiveFrom), 'dd.MM.yyyy')}
                                                </td>
                                                <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                                                    {Math.round(snap.elo)} pts
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold text-[10px] border border-red-200 dark:border-red-800/60">
                                                        {snap.level}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                                    {snap.rankOverall ? `#${snap.rankOverall}` : '-'}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                        {snap.triggerReason?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-slate-500">
                                                    {snap.association?.code || snap.association?.name}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                No historical rating snapshots recorded yet.
                            </div>
                        )}
                    </div>

                    {/* Match History Table */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Match History ({filteredMatches.length})
                                </h2>
                            </div>

                            {/* Search & Competition Filter Chips */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search opponent or competition..."
                                        value={matchSearchQuery}
                                        onChange={(e) => setMatchSearchQuery(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-red-500 w-48 sm:w-60"
                                    />
                                </div>

                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                                    {['ALL', 'LEAGUE', 'TOURNAMENT', 'CUP'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setMatchFilterType(t)}
                                            className={`px-2.5 py-1 rounded-lg transition ${
                                                matchFilterType === t
                                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {statsLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            </div>
                        ) : filteredMatches.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filteredMatches.map((m: any) => {
                                    const isWin = m.result === 'WIN';
                                    const isDraw = m.result === 'DRAW';

                                    return (
                                        <div
                                            key={m.id}
                                            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex items-start sm:items-center gap-3">
                                                {/* Outcome Badge */}
                                                <div
                                                    className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-black text-xs ${
                                                        isWin
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : isDraw
                                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                    }`}
                                                >
                                                    <span>{m.result}</span>
                                                    <span className="text-[10px] font-mono">{m.scoreSets}</span>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                            {m.matchType === 'DOUBLE' ? 'Doubles Match' : 'Singles Match'}
                                                        </span>
                                                        <span className="text-slate-400 text-xs">vs</span>
                                                        {m.opponents?.length > 0 ? (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {m.opponents.map((opp: any) => (
                                                                    <Link
                                                                        key={opp.id}
                                                                        href={`/people/${opp.licenseId || opp.id}`}
                                                                        className="font-bold text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                                                                    >
                                                                        <span>{opp.firstName} {opp.lastName}</span>
                                                                        {opp.eloPoints && (
                                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                                ({opp.eloPoints})
                                                                            </span>
                                                                        )}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Opponent</span>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                                            {m.competitionName}
                                                        </span>
                                                        <span>• {m.categoryName}</span>
                                                        {m.myTeam?.name && (
                                                            <span>• Team: <strong>{m.myTeam.name}</strong></span>
                                                        )}
                                                    </div>

                                                    {/* Sets Breakdown Chips */}
                                                    {Array.isArray(m.setsDetail) && m.setsDetail.length > 0 && (
                                                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                                            {m.setsDetail.map((s: any, idx: number) => {
                                                                const h = s.homeScore ?? s.home ?? 0;
                                                                const a = s.awayScore ?? s.away ?? 0;
                                                                const myScore = m.isHome ? h : a;
                                                                const oppScore = m.isHome ? a : h;
                                                                const wonSet = myScore > oppScore;

                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                                                                            wonSet
                                                                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                        }`}
                                                                    >
                                                                        {myScore}:{oppScore}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 text-right">
                                                <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                                    <div>{format(new Date(m.date), 'dd.MM.yyyy')}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase">{m.competitionType}</div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAiModalMatchId(m.id);
                                                        setAiModalTitle(`${person.firstName} ${person.lastName} vs ${m.opponents?.map((o: any) => `${o.firstName} ${o.lastName}`).join('/') || 'Opponent'}`);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition shadow-2xs"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                    <span>AI Analysis</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                No completed matches recorded matching the selected filter.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Tactical Match Analysis Modal */}
            <MatchAiAnalysisModal
                isOpen={!!aiModalMatchId}
                onClose={() => {
                    setAiModalMatchId(null);
                    setAiModalTitle(undefined);
                }}
                matchId={aiModalMatchId || ''}
                matchSummaryTitle={aiModalTitle}
            />
        </div>
    );
}