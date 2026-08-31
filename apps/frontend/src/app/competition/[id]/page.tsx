'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { ModalPortal } from '@/components/ui/ModalPortal';
import {
    Trophy,
    Calendar,
    MapPin,
    Shield,
    Users,
    Play,
    Plus,
    Clock,
    ChevronRight,
    Award,
    Activity,
    Radio,
    Layers,
    Sliders,
    CheckCircle2,
    XCircle,
    Flame,
    Key,
    UserCheck,
    Mic,
    DollarSign,
    BarChart3,
    MessageSquare,
    Download,
    Lock,
    Unlock,
    Save,
    AlertCircle,
    Volume2,
    Check,
    RefreshCw,
    Search,
    Filter,
    CreditCard,
    ArrowRight,
    Trash2,
    Edit3,
} from 'lucide-react';
import { format } from 'date-fns';
import { getLocalizedValue } from '@/lib/i18nHelper';

export default function CompetitionWorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t, locale } = useI18n();
    const { setEntityMeta } = useMainView();

    const competitionId = params?.id as string;
    const [competition, setCompetition] = useState<any>(null);
    const [clubs, setClubs] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Active sub-page / tab state
    const [activeTab, setActiveTab] = useState<string>('categories');
    const [activeCategoryId, setActiveCategoryId] = useState<string>('');

    // Specific Module States
    const [roles, setRoles] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [speakerCallouts, setSpeakerCallouts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [actionsLog, setActionsLog] = useState<any[]>([]);

    // Modals
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);
    const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
    const [showCalloutModal, setShowCalloutModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Form States
    const [settingsForm, setSettingsForm] = useState<any>({});
    const [newCat, setNewCat] = useState({ name: '', teamSize: 1, minElo: '', maxElo: '', genderRestriction: 'ANY', roundsPerGroup: 1 });
    const [newTeam, setNewTeam] = useState({ name: '', clubId: '', playerUserIds: [] as string[] });
    const [newRole, setNewRole] = useState({ userId: '', role: 'REFEREE' });
    const [newCallout, setNewCallout] = useState({ title: '', message: '', type: 'MATCH_CALL', unitName: '' });

    // Live Result Entering Selected Match
    const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [setsScore, setSetsScore] = useState<Array<{ home: number; away: number }>>([{ home: 0, away: 0 }]);
    const [isMatchFinished, setIsMatchFinished] = useState(false);

    // Hash sync
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setActiveTab(hash);
        }
        const handleHashChange = () => {
            const currentHash = window.location.hash.replace('#', '');
            if (currentHash) setActiveTab(currentHash);
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const compData = await api.getCompetition(competitionId);
            setCompetition(compData);
            setSettingsForm({
                name: compData.name,
                description: compData.description || '',
                location: compData.location || '',
                startDate: compData.startDate ? compData.startDate.slice(0, 10) : '',
                endDate: compData.endDate ? compData.endDate.slice(0, 10) : '',
                isOfficial: compData.isOfficial ?? true,
                countsForElo: compData.countsForElo ?? true,
                entryFee: compData.entryFee || 0,
                status: compData.status,
            });

            if (compData.categories && compData.categories.length > 0 && !activeCategoryId) {
                setActiveCategoryId(compData.categories[0].id);
            }

            // Sync main view meta
            setEntityMeta({
                id: compData.id,
                title: compData.name,
                subtitle: `${compData.type} • ${compData.association?.name || 'Association'}`,
                badge: compData.status,
            });

            // Fetch ancillary data in parallel
            try {
                const [rolesData, playersData, calloutsData, statsData, actionsData, clubsData, usersData] = await Promise.all([
                    api.getCompetitionRoles(competitionId).catch(() => []),
                    api.getCompetitionPlayers(competitionId).catch(() => []),
                    api.getCompetitionSpeakerCallouts(competitionId).catch(() => []),
                    api.getCompetitionStatistics(competitionId).catch(() => null),
                    api.getCompetitionActions(competitionId).catch(() => []),
                    api.getClubs().catch(() => ({ clubs: [] })),
                    api.getUsers ? api.getUsers().catch(() => []) : Promise.resolve([]),
                ]);

                setRoles(rolesData || []);
                setPlayers(playersData || []);
                setSpeakerCallouts(calloutsData || []);
                setStats(statsData);
                setActionsLog(actionsData || []);
                setClubs(Array.isArray(clubsData) ? clubsData : clubsData?.clubs || []);
                setUsersList(Array.isArray(usersData) ? usersData : []);
            } catch (e) {
                console.warn('Ancillary fetch minor error:', e);
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to load competition');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (competitionId) {
            fetchAllData();
        }
    }, [competitionId]);

    // Permissions check
    const isSuperAdmin = user?.isSuperAdmin;
    const isAssocAdmin = user?.associationRoles?.some(
        (r: any) => r.associationId === competition?.associationId && ['ADMIN', 'PRESIDENT'].includes(r.role),
    );
    const hasRole = (roleType: string) =>
        isSuperAdmin ||
        isAssocAdmin ||
        roles.some((r) => r.userId === user?.id && (r.role === 'ADMIN' || r.role === roleType));

    const canManage = isSuperAdmin || isAssocAdmin || hasRole('ADMIN');

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.updateCompetition(competitionId, settingsForm);
            setSuccessMessage('Competition settings updated successfully.');
            fetchAllData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update settings');
        }
    };

    const handleApproval = async (approved: boolean) => {
        try {
            await api.approveCompetition(competitionId, { status: approved ? 'APPROVED' : 'REJECTED' });
            setSuccessMessage(`Competition ${approved ? 'approved' : 'rejected'} successfully.`);
            fetchAllData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Approval action failed');
        }
    };

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.assignCompetitionRole(competitionId, newRole);
            setShowAssignRoleModal(false);
            setSuccessMessage('Access role assigned successfully.');
            fetchAllData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to assign role');
        }
    };

    const handleRevokeRole = async (roleId: string) => {
        if (!confirm('Are you sure you want to revoke this access role?')) return;
        try {
            await api.revokeCompetitionRole(competitionId, roleId);
            setSuccessMessage('Role revoked.');
            fetchAllData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to revoke role');
        }
    };

    const handleToggleCheckin = async (regId: string, currentVal: boolean) => {
        try {
            await api.checkinCompetitionPlayer(competitionId, regId, !currentVal);
            setPlayers(players.map(p => p.registrationId === regId ? { ...p, isCheckedIn: !currentVal } : p));
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update check-in');
        }
    };

    const handleUpdatePayment = async (regId: string, status: string, method?: string) => {
        try {
            await api.updateCompetitionPlayerPayment(competitionId, regId, {
                paymentStatus: status,
                paidAmount: status === 'PAID' ? competition?.entryFee || 20 : 0,
                paymentMethod: method || 'CASH',
            });
            fetchAllData();
            setSuccessMessage('Payment status updated.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update payment');
        }
    };

    const handleCreateCallout = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createCompetitionSpeakerCallout(competitionId, newCallout);
            setShowCalloutModal(false);
            setNewCallout({ title: '', message: '', type: 'MATCH_CALL', unitName: '' });
            fetchAllData();
            setSuccessMessage('Speaker announcement queued.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to queue callout');
        }
    };

    const handleBackup = async () => {
        try {
            const backupData = await api.backupCompetition(competitionId);
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `competition-${competition.slug}-backup-${Date.now()}.json`;
            a.click();
            setSuccessMessage('Competition database backup exported successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to create backup');
        }
    };

    const handleSaveScore = async () => {
        if (!selectedMatch) return;
        try {
            await api.updateMatchScore(selectedMatch.id, {
                sets: setsScore,
                isFinished: isMatchFinished,
            });
            setSuccessMessage('Match score saved and published.');
            fetchAllData();
            setSelectedMatch(null);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update score');
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!competition) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
                <h2 className="text-xl font-bold">Competition Not Found</h2>
                <p className="text-slate-500 mt-1">The requested competition ID or slug does not exist.</p>
                <Link href="/tournaments" className="mt-4 inline-block btn-primary">Back to Overview</Link>
            </div>
        );
    }

    const activeCategory = competition.categories?.find((c: any) => c.id === activeCategoryId) || competition.categories?.[0];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header Card with Inofficial & Approval Badges */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-6 relative overflow-hidden backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                {competition.type}
                            </span>
                            {!competition.isOfficial && (
                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                    <Shield className="h-3 w-3" /> Inofficial (No ELO)
                                </span>
                            )}
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                {competition.status}
                            </span>
                            {competition.approvalStatus === 'PENDING_APPROVAL' && (
                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white animate-pulse">
                                    Approval Pending
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {competition.name}
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-amber-500" /> {format(new Date(competition.startDate), 'dd.MM.yyyy')} - {format(new Date(competition.endDate), 'dd.MM.yyyy')}</span>
                            {competition.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-rose-500" /> {competition.location}</span>}
                            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-blue-500" /> {competition.association?.name}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleBackup} className="px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-2">
                            <Download className="h-4 w-4" /> Backup
                        </button>
                    </div>
                </div>

                {/* Association Admin Approval Banner */}
                {competition.approvalStatus === 'PENDING_APPROVAL' && isAssocAdmin && (
                    <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                            <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
                                This competition is waiting for approval from the main association administration.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleApproval(true)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5">
                                <Check className="h-4 w-4" /> Approve
                            </button>
                            <button onClick={() => handleApproval(false)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5">
                                <XCircle className="h-4 w-4" /> Reject
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> {errorMessage}
                </div>
            )}

            {/* Navigation Sub-Menu Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto gap-1 pb-1">
                {[
                    { id: 'categories', label: 'Categories & Draws', icon: Layers },
                    { id: 'results', label: 'Result Entering', icon: Flame },
                    { id: 'players', label: 'Players Roster', icon: Users },
                    { id: 'speaker', label: 'Speaker Console', icon: Mic },
                    { id: 'cashier', label: 'Cashier Desk', icon: DollarSign },
                    { id: 'locations', label: 'Locations & Units', icon: MapPin },
                    { id: 'access', label: 'Access Rights', icon: Key },
                    { id: 'referees', label: 'Referees', icon: UserCheck },
                    { id: 'communication', label: 'Communication', icon: MessageSquare },
                    { id: 'actions', label: 'Actions & Audit', icon: Activity },
                    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
                    { id: 'settings', label: 'Settings', icon: Sliders },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <a
                            key={tab.id}
                            href={`#${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </a>
                    );
                })}
            </div>

            {/* TAB CONTENT MODULES */}

            {/* 1. CATEGORIES & DRAWS */}
            {activeTab === 'categories' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Competition Categories</h2>
                        {canManage && (
                            <button onClick={() => setShowAddCatModal(true)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm flex items-center gap-2 shadow-sm">
                                <Plus className="h-4 w-4" /> Add Category
                            </button>
                        )}
                    </div>

                    {/* Category Selector Pills */}
                    <div className="flex overflow-x-auto gap-2 pb-2">
                        {competition.categories?.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategoryId(cat.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    activeCategoryId === cat.id
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-amber-500'
                                }`}
                            >
                                {cat.name} ({cat.teams?.length || 0})
                            </button>
                        ))}
                    </div>

                    {activeCategory ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Category Overview Card */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg">{activeCategory.name}</h3>
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                                            Team Size: {activeCategory.teamSize}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        <p><strong>Registered:</strong> {activeCategory.teams?.length || 0} teams</p>
                                        <p><strong>Encounters:</strong> {activeCategory.encounters?.length || 0} matches</p>
                                        <p><strong>Groups:</strong> {activeCategory.groups?.length || 0} groups</p>
                                        <p><strong>Gender:</strong> {activeCategory.genderRestriction}</p>
                                    </div>
                                    {canManage && (
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                                            <button onClick={() => setShowAddTeamModal(true)} className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
                                                <Plus className="h-4 w-4" /> Register Team / Player
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Encounters & Standings Matrix */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                                    <h4 className="font-bold text-base flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-amber-500" /> Matches & Encounters
                                    </h4>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {activeCategory.encounters?.length === 0 ? (
                                            <p className="text-sm text-slate-500 py-6 text-center">No matches generated yet.</p>
                                        ) : (
                                            activeCategory.encounters?.map((enc: any) => (
                                                <div key={enc.id} className="py-3 flex items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-semibold flex items-center gap-2">
                                                            <span>{enc.homeTeam?.name || 'TBD'}</span>
                                                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold">
                                                                {enc.homeScore} : {enc.awayScore}
                                                            </span>
                                                            <span>{enc.awayTeam?.name || 'TBD'}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500">Round {enc.round} • {enc.status}</p>
                                                    </div>
                                                    <a href="#results" onClick={() => { setActiveTab('results'); setSelectedEncounter(enc); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors">
                                                        Score Desk
                                                    </a>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            <Layers className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                            <p className="text-slate-500">No categories created yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* 2. RESULT ENTERING */}
            {activeTab === 'results' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Flame className="h-5 w-5 text-amber-500" /> Dedicated Score Entry Desk
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-3">
                            <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">Select Encounter</h3>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {competition.categories?.flatMap((c: any) => c.encounters || []).map((enc: any) => (
                                    <div
                                        key={enc.id}
                                        onClick={() => { setSelectedEncounter(enc); setSelectedMatch(enc.matches?.[0] || null); }}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                            selectedEncounter?.id === enc.id
                                                ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                                        }`}
                                    >
                                        <p className="text-xs text-slate-500 mb-1">{enc.category?.name || 'Category'} • {enc.status}</p>
                                        <div className="font-semibold text-sm flex items-center justify-between">
                                            <span>{enc.homeTeam?.name}</span>
                                            <span className="font-mono font-bold text-amber-600">{enc.homeScore} : {enc.awayScore}</span>
                                            <span>{enc.awayTeam?.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            {selectedEncounter ? (
                                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <div>
                                            <h3 className="font-bold text-lg">Encounter Scoring</h3>
                                            <p className="text-sm text-slate-500">{selectedEncounter.homeTeam?.name} vs {selectedEncounter.awayTeam?.name}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">
                                            {selectedEncounter.status}
                                        </span>
                                    </div>

                                    {/* Matches within encounter */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Matches</h4>
                                        {selectedEncounter.matches?.map((m: any, idx: number) => (
                                            <div
                                                key={m.id}
                                                onClick={() => { setSelectedMatch(m); setSetsScore(m.sets?.length ? m.sets : [{ home: 0, away: 0 }]); setIsMatchFinished(m.status === 'FINISHED'); }}
                                                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between ${
                                                    selectedMatch?.id === m.id
                                                        ? 'border-amber-500 bg-amber-500/10'
                                                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <div>
                                                    <span className="font-bold text-sm">Match {idx + 1}: {m.label || m.matchType}</span>
                                                    <p className="text-xs text-slate-500">
                                                        {m.homePlayer1 ? `${m.homePlayer1.firstName} ${m.homePlayer1.lastName}` : 'Home Player'} vs {m.awayPlayer1 ? `${m.awayPlayer1.firstName} ${m.awayPlayer1.lastName}` : 'Away Player'}
                                                    </p>
                                                </div>
                                                <div className="font-mono font-bold text-base">
                                                    {m.homeWonSets} : {m.awayWonSets}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedMatch && (
                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                            <h4 className="font-bold text-base">Edit Sets for Match: {selectedMatch.label}</h4>
                                            <div className="space-y-3">
                                                {setsScore.map((set, sIdx) => (
                                                    <div key={sIdx} className="flex items-center gap-3">
                                                        <span className="text-xs font-semibold text-slate-500 w-12">Set {sIdx + 1}</span>
                                                        <input
                                                            type="number"
                                                            value={set.home}
                                                            onChange={(e) => {
                                                                const updated = [...setsScore];
                                                                updated[sIdx].home = parseInt(e.target.value) || 0;
                                                                setSetsScore(updated);
                                                            }}
                                                            className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-center font-mono font-bold"
                                                        />
                                                        <span className="text-slate-400 font-bold">:</span>
                                                        <input
                                                            type="number"
                                                            value={set.away}
                                                            onChange={(e) => {
                                                                const updated = [...setsScore];
                                                                updated[sIdx].away = parseInt(e.target.value) || 0;
                                                                setSetsScore(updated);
                                                            }}
                                                            className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-center font-mono font-bold"
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => setSetsScore([...setsScore, { home: 0, away: 0 }])}
                                                    className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                                                >
                                                    <Plus className="h-3 w-3" /> Add Set
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isMatchFinished}
                                                        onChange={(e) => setIsMatchFinished(e.target.checked)}
                                                        className="rounded text-amber-500"
                                                    />
                                                    Mark match as finished
                                                </label>
                                            </div>

                                            <button
                                                onClick={handleSaveScore}
                                                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm flex items-center gap-2 shadow-sm"
                                            >
                                                <Save className="h-4 w-4" /> Save & Broadcast Score
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                                    <Flame className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-slate-500">Select an encounter from the left to enter scores.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. PLAYERS ROSTER */}
            {activeTab === 'players' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Players Roster & Check-In</h2>
                            <p className="text-sm text-slate-500">Consolidated athlete list with licensing, ELO rating, and registration payment status.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3.5">Athlete</th>
                                        <th className="px-5 py-3.5">Club</th>
                                        <th className="px-5 py-3.5">Category</th>
                                        <th className="px-5 py-3.5">License & ELO</th>
                                        <th className="px-5 py-3.5">Payment</th>
                                        <th className="px-5 py-3.5 text-right">Check-In</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {players.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                                                No registered players found.
                                            </td>
                                        </tr>
                                    ) : (
                                        players.map((p) => (
                                            <tr key={p.registrationId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                                                    {p.user ? `${p.user.firstName} ${p.user.lastName}` : p.teamName}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                                                    {p.clubName}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                                    {p.categoryName}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                                                    <span className="font-mono text-xs">{p.user?.licenseId || 'N/A'}</span> • <strong className="text-amber-600">{p.user?.eloPoints || 1000} ELO</strong>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        p.paymentStatus === 'PAID'
                                                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                            : p.paymentStatus === 'EXEMPT'
                                                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                                    }`}>
                                                        {p.paymentStatus || 'UNPAID'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <button
                                                        onClick={() => handleToggleCheckin(p.registrationId, p.isCheckedIn)}
                                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                                            p.isCheckedIn
                                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {p.isCheckedIn ? 'Checked In' : 'Not Checked'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. SPEAKER CONSOLE */}
            {activeTab === 'speaker' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Mic className="h-5 w-5 text-amber-500" /> Speaker & Callouts Console
                            </h2>
                            <p className="text-sm text-slate-500">Announce matches to tables, summon missing players, and broadcast audio alerts.</p>
                        </div>
                        <button onClick={() => setShowCalloutModal(true)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm flex items-center gap-2 shadow-sm">
                            <Volume2 className="h-4 w-4" /> New Announcement
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Active Queue */}
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Radio className="h-4 w-4 text-rose-500 animate-pulse" /> Announcement Queue
                            </h3>
                            <div className="space-y-3">
                                {speakerCallouts.length === 0 ? (
                                    <p className="text-sm text-slate-500 py-6 text-center">No announcements in queue.</p>
                                ) : (
                                    speakerCallouts.map((call) => (
                                        <div key={call.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white">{call.title}</span>
                                                {call.unitName && (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                                        {call.unitName}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                                "{call.message}"
                                            </p>
                                            <p className="text-xs text-slate-400">{format(new Date(call.createdAt), 'HH:mm:ss')} • Status: {call.status}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Action Station */}
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                            <h3 className="font-bold text-base">Quick Call Presets</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setNewCallout({
                                            title: 'Next Round Ready',
                                            message: 'All players for Round 2 please prepare at your allocated tables.',
                                            type: 'GENERAL_ANNOUNCEMENT',
                                            unitName: 'Main Hall',
                                        });
                                        setShowCalloutModal(true);
                                    }}
                                    className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-sm font-medium transition-all"
                                >
                                    📢 Round Callout
                                </button>
                                <button
                                    onClick={() => {
                                        setNewCallout({
                                            title: 'Missing Player Summon',
                                            message: 'Player please report immediately to the tournament desk.',
                                            type: 'MISSING_PLAYER',
                                            unitName: 'Desk',
                                        });
                                        setShowCalloutModal(true);
                                    }}
                                    className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-sm font-medium transition-all"
                                >
                                    🚨 Missing Player Summon
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. CASHIER DESK */}
            {activeTab === 'cashier' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-500" /> Cashier & Entry Fee Register
                            </h2>
                            <p className="text-sm text-slate-500">Track entry fee collections, receipts, and tournament financial balance.</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-lg">
                            Entry Fee: CHF {competition.entryFee || 0}.00
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3.5">Athlete / Team</th>
                                        <th className="px-5 py-3.5">Category</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5">Paid Amount</th>
                                        <th className="px-5 py-3.5">Method</th>
                                        <th className="px-5 py-3.5 text-right">Cashier Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {players.map((p) => (
                                        <tr key={p.registrationId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                                                {p.user ? `${p.user.firstName} ${p.user.lastName}` : p.teamName}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">{p.categoryName}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    p.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                                }`}>
                                                    {p.paymentStatus || 'UNPAID'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 font-mono font-bold">CHF {p.paidAmount || 0}</td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500">{p.paymentMethod || '—'}</td>
                                            <td className="px-5 py-3.5 text-right space-x-2">
                                                <button
                                                    onClick={() => handleUpdatePayment(p.registrationId, 'PAID', 'CASH')}
                                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                                                >
                                                    Cash
                                                </button>
                                                <button
                                                    onClick={() => handleUpdatePayment(p.registrationId, 'PAID', 'TWINT')}
                                                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                                                >
                                                    Twint
                                                </button>
                                                <button
                                                    onClick={() => handleUpdatePayment(p.registrationId, 'EXEMPT')}
                                                    className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                                                >
                                                    Exempt
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. ACCESS RIGHTS */}
            {activeTab === 'access' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Key className="h-5 w-5 text-amber-500" /> Competition Access Rights & Permissions
                            </h2>
                            <p className="text-sm text-slate-500">Assign granular operational roles for this specific competition event.</p>
                        </div>
                        {canManage && (
                            <button onClick={() => setShowAssignRoleModal(true)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm flex items-center gap-2 shadow-sm">
                                <Plus className="h-4 w-4" /> Grant Role
                            </button>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3.5">User</th>
                                        <th className="px-5 py-3.5">Email / License</th>
                                        <th className="px-5 py-3.5">Granted Role</th>
                                        <th className="px-5 py-3.5">Granted At</th>
                                        {canManage && <th className="px-5 py-3.5 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {roles.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                                                No specific competition roles assigned.
                                            </td>
                                        </tr>
                                    ) : (
                                        roles.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                                                    {r.user ? `${r.user.firstName} ${r.user.lastName}` : 'User'}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-500 text-xs">
                                                    {r.user?.email} • {r.user?.licenseId || 'N/A'}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                        {r.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-slate-400">
                                                    {format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm')}
                                                </td>
                                                {canManage && (
                                                    <td className="px-5 py-3.5 text-right">
                                                        <button onClick={() => handleRevokeRole(r.id)} className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. LOCATIONS & UNITS */}
            {activeTab === 'locations' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-rose-500" /> Linked Facilities & Playing Units
                    </h2>
                    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                        <h3 className="font-bold text-base">Facility Details</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Location: <strong>{competition.location || 'Main Sports Complex'}</strong>
                        </p>
                    </div>
                </div>
            )}

            {/* 8. REFEREES */}
            {activeTab === 'referees' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-500" /> Assigned Referees & Umpires
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                            <h3 className="font-bold text-base">Head Referee / Tournament Director</h3>
                            <p className="text-sm text-slate-500">Oversees sports regulations, official appeals, and match disputes.</p>
                            <div className="pt-2">
                                <span className="font-medium text-slate-900 dark:text-white">
                                    {roles.find(r => r.role === 'HEAD_REFEREE')?.user ? `${roles.find(r => r.role === 'HEAD_REFEREE')?.user.firstName} ${roles.find(r => r.role === 'HEAD_REFEREE')?.user.lastName}` : 'No Head Referee assigned yet'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 9. COMMUNICATION */}
            {activeTab === 'communication' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-purple-500" /> Communication & Ticker
                    </h2>
                    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                        <h3 className="font-bold text-base">Broadcast Message</h3>
                        <textarea
                            placeholder="Type a broadcast message to all registered clubs and captains..."
                            rows={3}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-transparent"
                        />
                        <button className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm">
                            Broadcast to Participants
                        </button>
                    </div>
                </div>
            )}

            {/* 10. ACTIONS & AUDIT */}
            {activeTab === 'actions' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-amber-500" /> Operations Audit Trail & Snapshot Backups
                    </h2>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-base">Audit Trail</h3>
                            <button onClick={handleBackup} className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5">
                                <Download className="h-3.5 w-3.5" /> Export Snapshot Backup
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                            {actionsLog.length === 0 ? (
                                <p className="text-sm text-slate-500 p-6 text-center">No recorded action logs yet.</p>
                            ) : (
                                actionsLog.map((log) => (
                                    <div key={log.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{log.description || log.action}</p>
                                            <p className="text-xs text-slate-400">{log.userEmail || 'System'} • {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss')}</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800">
                                            {log.action}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 11. STATISTICS */}
            {activeTab === 'statistics' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" /> Tournament Statistics
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                            <span className="text-3xl font-extrabold text-amber-500">{stats?.totalMatches || 0}</span>
                            <p className="text-xs text-slate-500 mt-1 font-semibold">Total Matches</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                            <span className="text-3xl font-extrabold text-emerald-500">{stats?.completedMatches || 0}</span>
                            <p className="text-xs text-slate-500 mt-1 font-semibold">Completed Matches</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                            <span className="text-3xl font-extrabold text-blue-500">{stats?.totalPlayers || 0}</span>
                            <p className="text-xs text-slate-500 mt-1 font-semibold">Athletes</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                            <span className="text-3xl font-extrabold text-purple-500">{stats?.totalClubs || 0}</span>
                            <p className="text-xs text-slate-500 mt-1 font-semibold">Clubs Represented</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 12. GENERAL SETTINGS */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sliders className="h-5 w-5 text-amber-500" /> Competition Configuration & Governance
                    </h2>

                    <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Competition Name</label>
                                <input
                                    type="text"
                                    value={settingsForm.name || ''}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Location / Venue</label>
                                <input
                                    type="text"
                                    value={settingsForm.location || ''}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={settingsForm.startDate || ''}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, startDate: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={settingsForm.endDate || ''}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, endDate: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                />
                            </div>
                        </div>

                        {/* Inofficial & ELO Toggles */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settingsForm.isOfficial}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, isOfficial: e.target.checked })}
                                    className="rounded text-amber-500"
                                />
                                <div>
                                    <span className="font-semibold text-sm block">Official Competition</span>
                                    <span className="text-xs text-slate-500">Uncheck for unofficial / friendly tournaments.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settingsForm.countsForElo}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, countsForElo: e.target.checked })}
                                    className="rounded text-amber-500"
                                />
                                <div>
                                    <span className="font-semibold text-sm block">Count towards ELO Calculation</span>
                                    <span className="text-xs text-slate-500">Matches played adjust player ELO ratings when checked.</span>
                                </div>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button type="submit" className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm flex items-center gap-2 shadow-sm">
                                <Save className="h-4 w-4" /> Save Configuration
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODALS */}

            {/* Add Role Modal */}
            {showAssignRoleModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Grant Competition Access Role</h3>
                            <form onSubmit={handleAssignRole} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">User</label>
                                    <select
                                        value={newRole.userId}
                                        onChange={(e) => setNewRole({ ...newRole, userId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        required
                                    >
                                        <option value="">Select a user...</option>
                                        {usersList.map((u) => (
                                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Role</label>
                                    <select
                                        value={newRole.role}
                                        onChange={(e) => setNewRole({ ...newRole, role: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                    >
                                        <option value="ADMIN">ADMIN (Full management)</option>
                                        <option value="ENTER_RESULTS">ENTER_RESULTS (Score entering)</option>
                                        <option value="ASSIGN_COURTS">ASSIGN_COURTS (Assign courts / tables)</option>
                                        <option value="SPEAKER">SPEAKER (Callouts & speaker console)</option>
                                        <option value="HEAD_REFEREE">HEAD_REFEREE (Head referee)</option>
                                        <option value="REFEREE">REFEREE (Match referee)</option>
                                        <option value="CASHIER">CASHIER (Cashier desk)</option>
                                        <option value="CREATE_BACKUPS">CREATE_BACKUPS (Create backups)</option>
                                        <option value="EDIT_REGISTRATIONS">EDIT_REGISTRATIONS (Edit registrations)</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowAssignRoleModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm">
                                        Grant Role
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Add Callout Modal */}
            {showCalloutModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Speaker Announcement</h3>
                            <form onSubmit={handleCreateCallout} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={newCallout.title}
                                        onChange={(e) => setNewCallout({ ...newCallout, title: e.target.value })}
                                        placeholder="e.g. Table Callout / Missing Player"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Allocated Table / Court</label>
                                    <input
                                        type="text"
                                        value={newCallout.unitName}
                                        onChange={(e) => setNewCallout({ ...newCallout, unitName: e.target.value })}
                                        placeholder="e.g. Table 4"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Announcement Message</label>
                                    <textarea
                                        value={newCallout.message}
                                        onChange={(e) => setNewCallout({ ...newCallout, message: e.target.value })}
                                        placeholder="Spoken text..."
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowCalloutModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm">
                                        Queue Announcement
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Add Category Modal */}
            {showAddCatModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Category</h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    await api.createCategory(competitionId, {
                                        name: newCat.name,
                                        teamSize: Number(newCat.teamSize) || 1,
                                        genderRestriction: newCat.genderRestriction,
                                        roundsPerGroup: Number(newCat.roundsPerGroup) || 1,
                                    });
                                    setShowAddCatModal(false);
                                    fetchAllData();
                                } catch (err: any) {
                                    setErrorMessage(err.message || 'Failed to create category');
                                }
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Category Name</label>
                                    <input
                                        type="text"
                                        value={newCat.name}
                                        onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                                        placeholder="e.g. Men Singles A / U18"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Team Size</label>
                                        <input
                                            type="number"
                                            value={newCat.teamSize}
                                            onChange={(e) => setNewCat({ ...newCat, teamSize: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Gender</label>
                                        <select
                                            value={newCat.genderRestriction}
                                            onChange={(e) => setNewCat({ ...newCat, genderRestriction: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        >
                                            <option value="ANY">Any / Mixed</option>
                                            <option value="MALE_ONLY">Male Only</option>
                                            <option value="FEMALE_ONLY">Female Only</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowAddCatModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm">
                                        Create Category
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Add Team Modal */}
            {showAddTeamModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register Team / Player</h3>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    await api.registerTeam(activeCategoryId, {
                                        teamName: newTeam.name,
                                        clubId: newTeam.clubId || null,
                                        playerUserIds: newTeam.playerUserIds,
                                    });
                                    setShowAddTeamModal(false);
                                    fetchAllData();
                                } catch (err: any) {
                                    setErrorMessage(err.message || 'Failed to register team');
                                }
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Team / Player Name</label>
                                    <input
                                        type="text"
                                        value={newTeam.name}
                                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                        placeholder="e.g. Roger Federer / TTC Basel 1"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Affiliated Club</label>
                                    <select
                                        value={newTeam.clubId}
                                        onChange={(e) => setNewTeam({ ...newTeam, clubId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                    >
                                        <option value="">Individual / None</option>
                                        {clubs.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowAddTeamModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm">
                                        Register
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
