'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Modal } from '@/components/ui/Modal';
import {
    Trophy,
    Shield,
    Users,
    Calendar,
    Crown,
    ChevronRight,
    ExternalLink,
    Filter,
    Search,
    Clock,
    Award,
    Flame,
    BarChart3,
    History,
    Sparkles,
    Plus,
    Edit,
    Trash2,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    UserCheck,
    UserMinus,
    ArrowRight,
    Layers,
} from 'lucide-react';

export default function ClubTeamHubPage() {
    const params = useParams();
    const router = useRouter();
    const clubIdentifier = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [eligibleMembers, setEligibleMembers] = useState<any[]>([]);
    const [availableCompetitions, setAvailableCompetitions] = useState<any[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('CURRENT');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Modal state for Registering a new team
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedCompId, setSelectedCompId] = useState('');
    const [selectedCatId, setSelectedCatId] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [captainUserId, setCaptainUserId] = useState('');
    const [registering, setRegistering] = useState(false);
    const [registerError, setRegisterError] = useState('');

    // Modal state for Editing squad roster & lineup ("who plays where")
    const [editingTeam, setEditingTeam] = useState<any>(null);
    const [editTeamName, setEditTeamName] = useState('');
    const [editPlayerIds, setEditPlayerIds] = useState<string[]>([]);
    const [editCaptainId, setEditCaptainId] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    // Modal state for Withdrawing a team
    const [withdrawingTeam, setWithdrawingTeam] = useState<any>(null);
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');

    // Promotion & Relegation Decision state
    const [decisionFeedback, setDecisionFeedback] = useState<{ [teamId: string]: string }>({});
    const [submittingDecision, setSubmittingDecision] = useState<{ [teamId: string]: boolean }>({});

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
            const seasonParam = selectedSeasonId === 'CURRENT' ? undefined : selectedSeasonId;
            const res = await api.getClubTeamHub(clubIdentifier, {
                seasonId: seasonParam === 'ALL' ? undefined : seasonParam,
            });

            setClub(res.club);
            setTeams(res.teams || []);
            setEligibleMembers(res.eligibleMembers || []);
            setAvailableCompetitions(res.availableCompetitions || []);
            setSeasons(res.seasons || []);

            if (res.availableCompetitions?.length > 0 && !selectedCompId) {
                setSelectedCompId(res.availableCompetitions[0].id);
                if (res.availableCompetitions[0].categories?.length > 0) {
                    setSelectedCatId(res.availableCompetitions[0].categories[0].id);
                }
            }

            if (res.club) {
                setEntityMeta({
                    id: res.club.id,
                    title: res.club.name,
                    code: res.club.code,
                    badge: 'Club',
                    subtitle: `${res.club.city || 'Switzerland'} • Official Team Hub`,
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load club team hub.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clubIdentifier) return;
        loadData();
    }, [clubIdentifier, selectedSeasonId]);

    const currentSeasonObj = useMemo(() => {
        return seasons.find((s) => s.isCurrent) || seasons[0];
    }, [seasons]);

    // Filter available categories based on selected competition in registration modal
    const currentCompCategories = useMemo(() => {
        const comp = availableCompetitions.find((c) => c.id === selectedCompId);
        return comp?.categories || [];
    }, [availableCompetitions, selectedCompId]);

    // Filter active teams list
    const filteredTeams = useMemo(() => {
        let result = teams;

        if (selectedSeasonId === 'CURRENT' && currentSeasonObj) {
            result = result.filter((team) =>
                team.registrations?.some(
                    (r: any) =>
                        !r.category?.competition?.seasonId ||
                        r.category?.competition?.seasonId === currentSeasonObj.id
                )
            );
        } else if (selectedSeasonId !== 'ALL' && selectedSeasonId !== 'CURRENT') {
            result = result.filter((team) =>
                team.registrations?.some(
                    (r: any) => r.category?.competition?.seasonId === selectedSeasonId
                )
            );
        }

        if (selectedType !== 'ALL') {
            result = result.filter((team) => {
                const types = team.registrations?.map((r: any) => r.category?.competition?.type) || [];
                return types.includes(selectedType);
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((team) => {
                const teamName = (team.name || '').toLowerCase();
                const catNames = (team.registrations || [])
                    .map((r: any) => `${r.category?.name || ''} ${r.category?.competition?.name || ''}`)
                    .join(' ')
                    .toLowerCase();
                const membersNames = (team.members || [])
                    .map((m: any) => `${m.user?.firstName || ''} ${m.user?.lastName || ''}`)
                    .join(' ')
                    .toLowerCase();
                return teamName.includes(q) || catNames.includes(q) || membersNames.includes(q);
            });
        }

        return result;
    }, [teams, selectedSeasonId, selectedType, searchQuery, currentSeasonObj]);

    // Metrics
    const leagueTeamsCount = useMemo(() => {
        return teams.filter((t) =>
            t.registrations?.some((r: any) => r.category?.competition?.type === 'LEAGUE')
        ).length;
    }, [teams]);

    const cupTeamsCount = useMemo(() => {
        return teams.filter((t) =>
            t.registrations?.some((r: any) => r.category?.competition?.type === 'CUP')
        ).length;
    }, [teams]);

    // Handle Register New Team
    const handleRegisterTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterError('');
        if (!selectedCatId) {
            setRegisterError('Please select a competition category.');
            return;
        }
        if (!newTeamName.trim()) {
            setRegisterError('Team name is required.');
            return;
        }

        setRegistering(true);
        try {
            await api.registerClubTeam(clubIdentifier, {
                categoryId: selectedCatId,
                teamName: newTeamName.trim(),
                playerUserIds: selectedPlayerIds,
                captainUserId: captainUserId || selectedPlayerIds[0] || undefined,
            });

            setShowRegisterModal(false);
            setNewTeamName('');
            setSelectedPlayerIds([]);
            setCaptainUserId('');
            setSuccessMessage(`Team "${newTeamName.trim()}" successfully registered!`);
            setTimeout(() => setSuccessMessage(''), 5000);
            await loadData();
        } catch (err: any) {
            setRegisterError(err.message || 'Failed to register team.');
        } finally {
            setRegistering(false);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (team: any) => {
        setEditingTeam(team);
        setEditTeamName(team.name || '');
        const memberIds = (team.members || []).map((m: any) => m.userId || m.user?.id);
        setEditPlayerIds(memberIds);
        const captain = (team.members || []).find((m: any) => m.role === 'CAPTAIN');
        setEditCaptainId(captain?.userId || captain?.user?.id || memberIds[0] || '');
        setEditError('');
    };

    // Handle Save Edit Squad
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeam) return;
        setEditError('');
        if (!editTeamName.trim()) {
            setEditError('Team name cannot be empty.');
            return;
        }

        setSavingEdit(true);
        try {
            await api.updateClubTeam(clubIdentifier, editingTeam.id, {
                name: editTeamName.trim(),
                playerUserIds: editPlayerIds,
                captainUserId: editCaptainId || editPlayerIds[0] || undefined,
            });

            setEditingTeam(null);
            setSuccessMessage(`Squad lineup for "${editTeamName.trim()}" updated successfully.`);
            setTimeout(() => setSuccessMessage(''), 5000);
            await loadData();
        } catch (err: any) {
            setEditError(err.message || 'Failed to update team.');
        } finally {
            setSavingEdit(false);
        }
    };

    // Handle Withdraw Team
    const handleConfirmWithdraw = async () => {
        if (!withdrawingTeam) return;
        setWithdrawing(true);
        setWithdrawError('');
        try {
            await api.withdrawClubTeam(clubIdentifier, withdrawingTeam.id);
            setWithdrawingTeam(null);
            setSuccessMessage(`Team "${withdrawingTeam.name}" withdrawn successfully.`);
            setTimeout(() => setSuccessMessage(''), 5000);
            await loadData();
        } catch (err: any) {
            setWithdrawError(err.message || 'Failed to withdraw team.');
        } finally {
            setWithdrawing(false);
        }
    };

    // Handle Promotion & Relegation Decision
    const handleLeagueDecision = async (teamId: string, decision: string) => {
        setSubmittingDecision((prev) => ({ ...prev, [teamId]: true }));
        try {
            const res = await api.submitClubTeamLeagueDecision(clubIdentifier, teamId, { decision });
            setDecisionFeedback((prev) => ({
                ...prev,
                [teamId]: res.message || `Decision '${decision}' saved successfully.`,
            }));
            setTimeout(() => {
                setDecisionFeedback((prev) => {
                    const copy = { ...prev };
                    delete copy[teamId];
                    return copy;
                });
            }, 6000);
        } catch (err: any) {
            alert(err.message || 'Failed to submit league decision.');
        } finally {
            setSubmittingDecision((prev) => ({ ...prev, [teamId]: false }));
        }
    };

    if (!loading && (!user || !isClubOfficial)) {
        return (
            <AccessDenied
                title="Club Officials Access Required"
                description="The Team Hub is restricted to authorized Club Officials (Presidents, Secretaries, Coaches) and Platform Administrators."
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
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Team Hub Unavailable</h2>
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
                        <span className="text-slate-900 dark:text-white">Team Hub</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-red-600" />
                        <span>Official Team Hub &amp; Squad Lineups</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Official management portal for {club.name}: Register teams, assign player rosters and captains, withdraw teams, and decide on league promotions and relegations.
                    </p>
                </div>

                {/* Top Action Buttons & Season Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 shadow-xs">
                        <History className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-500">Season:</span>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                        >
                            <option value="CURRENT">
                                Current Season ({currentSeasonObj?.name || '2026/2027'})
                            </option>
                            <option value="ALL">All Seasons (Historical)</option>
                            {seasons
                                .filter((s) => !s.isCurrent)
                                .map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} (Past)
                                    </option>
                                ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setShowRegisterModal(true);
                            setNewTeamName(`${club.name} ${teams.length + 1}`);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Register New Team</span>
                    </button>
                </div>
            </div>

            {/* Success Feedback Alert */}
            {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white cursor-pointer">
                        ✕
                    </button>
                </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Teams</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{teams.length}</div>
                    </div>
                    <Users className="w-7 h-7 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">League Teams</div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{leagueTeamsCount}</div>
                    </div>
                    <Trophy className="w-7 h-7 text-blue-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cup Squads</div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{cupTeamsCount}</div>
                    </div>
                    <Award className="w-7 h-7 text-purple-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Eligible Athletes</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{eligibleMembers.length}</div>
                    </div>
                    <UserCheck className="w-7 h-7 text-emerald-500" />
                </div>
            </div>

            {/* Filter Bar: Competition Types & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedType('ALL')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            selectedType === 'ALL'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        All Teams ({teams.length})
                    </button>
                    <button
                        onClick={() => setSelectedType('LEAGUE')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            selectedType === 'LEAGUE'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        League ({leagueTeamsCount})
                    </button>
                    <button
                        onClick={() => setSelectedType('CUP')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            selectedType === 'CUP'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        Cup ({cupTeamsCount})
                    </button>
                </div>

                <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search team, category, or player..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>

            {/* Teams Management Grid */}
            {filteredTeams.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                    <Users className="w-12 h-12 text-slate-400 mx-auto" />
                    <div className="space-y-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">No Teams Found</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            No club teams match the selected filter. Register a new team to participate in upcoming league and cup seasons.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setShowRegisterModal(true);
                            setNewTeamName(`${club.name} 1`);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Register First Team</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredTeams.map((team) => {
                        const members = team.members || [];
                        const captain = members.find((m: any) => m.role === 'CAPTAIN');
                        const players = members.filter((m: any) => m.role !== 'CAPTAIN');
                        const registrations = team.registrations || [];
                        const primaryReg = registrations[0];
                        const competition = primaryReg?.category?.competition;
                        const category = primaryReg?.category;
                        const standings = team.standings?.[0];

                        const compType = competition?.type || 'LEAGUE';
                        const isLeague = compType === 'LEAGUE';

                        // Promotion / Relegation Status indicators based on standings
                        const tablePoints = standings?.tablePoints || 0;
                        const played = standings?.played || 0;
                        const won = standings?.won || 0;

                        return (
                            <div
                                key={team.id}
                                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition"
                            >
                                <div className="space-y-4">
                                    {/* Top Card Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wide ${
                                                        isLeague
                                                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                                                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
                                                    }`}
                                                >
                                                    {isLeague ? 'League Team' : 'Cup Squad'}
                                                </span>
                                                {competition?.season?.name && (
                                                    <span className="text-[11px] font-bold text-slate-400">
                                                        • {competition.season.name}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>{team.name}</span>
                                            </h3>
                                        </div>

                                        {/* Actions: Edit Squad & Withdraw */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleOpenEdit(team)}
                                                title="Manage Squad Roster & Lineup"
                                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setWithdrawingTeam(team)}
                                                title="Withdraw Team from Competition"
                                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Competition & Category Info */}
                                    {competition && category && (
                                        <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-1">
                                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                                <Link
                                                    href={`/competition/${competition.slug || competition.id}`}
                                                    className="hover:text-red-600 transition flex items-center gap-1.5"
                                                >
                                                    <span>{competition.name}</span>
                                                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                                </Link>
                                                <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5">
                                                    {category.name}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                <span>{competition.association?.name || 'Governing Body'}</span>
                                                {category.teamSize > 1 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Format: {category.teamSize} Players/Match</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Squad Roster ("Who Plays Where") */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <span>Registered Squad ({members.length})</span>
                                            <button
                                                onClick={() => handleOpenEdit(team)}
                                                className="text-red-600 hover:text-red-700 text-[11px] font-bold cursor-pointer"
                                            >
                                                + Edit Lineup
                                            </button>
                                        </div>

                                        {members.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-center text-xs text-slate-400">
                                                No players assigned to this squad yet.{' '}
                                                <button
                                                    onClick={() => handleOpenEdit(team)}
                                                    className="text-red-600 font-bold underline ml-1 cursor-pointer"
                                                >
                                                    Assign players
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {captain && (
                                                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                                                <Crown className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                                                                    <span>
                                                                        {captain.user?.firstName} {captain.user?.lastName}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                                                                    Team Captain
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 shrink-0">
                                                            {captain.user?.eloPoints || 1200} Elo
                                                        </span>
                                                    </div>
                                                )}

                                                {players.map((m: any, idx: number) => (
                                                    <div
                                                        key={m.id || idx}
                                                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5 flex items-center justify-between gap-2"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                #{idx + (captain ? 2 : 1)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                    {m.user?.firstName} {m.user?.lastName}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 truncate">
                                                                    {m.user?.licenseId || 'Regular Player'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                                                            {m.user?.eloPoints || 1200} Elo
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* League Promotion & Relegation Decision Section (For League Teams) */}
                                    {isLeague && (
                                        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-4 h-4 text-indigo-600" />
                                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                        League Promotion &amp; Relegation Status
                                                    </h4>
                                                </div>
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full">
                                                    {tablePoints} Table Pts • {won}/{played} Won
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                                Official club decisions regarding advancement or division placement for the upcoming season:
                                            </p>

                                            {/* Action Decision Buttons */}
                                            <div className="flex items-center gap-2 flex-wrap pt-1">
                                                <button
                                                    onClick={() => handleLeagueDecision(team.id, 'ACCEPT_PROMOTION')}
                                                    disabled={submittingDecision[team.id]}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                                                >
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                    <span>Accept Promotion</span>
                                                </button>

                                                <button
                                                    onClick={() => handleLeagueDecision(team.id, 'DECLINE_PROMOTION')}
                                                    disabled={submittingDecision[team.id]}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    <span>Decline Promotion</span>
                                                </button>

                                                <button
                                                    onClick={() => handleLeagueDecision(team.id, 'ACCEPT_RELEGATION')}
                                                    disabled={submittingDecision[team.id]}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                                                >
                                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                                    <span>Acknowledge Relegation</span>
                                                </button>
                                            </div>

                                            {/* Decision Feedback Message */}
                                            {decisionFeedback[team.id] && (
                                                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-2 text-[11px] font-bold flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                    <span>{decisionFeedback[team.id]}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer link */}
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>Team ID: {team.id.slice(0, 8)}...</span>
                                    {competition && (
                                        <Link
                                            href={`/competition/${competition.slug || competition.id}`}
                                            className="text-red-600 hover:underline flex items-center gap-1"
                                        >
                                            <span>View Group Standings</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL: Register New Team */}
            <Modal
                isOpen={showRegisterModal}
                onClose={() => setShowRegisterModal(false)}
                title="Register New Team in Competition"
            >
                <form onSubmit={handleRegisterTeam} className="space-y-4 text-xs">
                    {registerError && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-3 text-red-600 text-xs font-semibold">
                            {registerError}
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                            Select Competition (Leagues &amp; Cups) *
                        </label>
                        <select
                            value={selectedCompId}
                            onChange={(e) => {
                                setSelectedCompId(e.target.value);
                                const comp = availableCompetitions.find((c) => c.id === e.target.value);
                                if (comp?.categories?.length > 0) {
                                    setSelectedCatId(comp.categories[0].id);
                                }
                            }}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                            required
                        >
                            {availableCompetitions.map((c) => (
                                <option key={c.id} value={c.id}>
                                    [{c.type}] {c.name} ({c.season?.name || 'Upcoming'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                            Target Category / Division *
                        </label>
                        <select
                            value={selectedCatId}
                            onChange={(e) => setSelectedCatId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                            required
                        >
                            {currentCompCategories.length === 0 ? (
                                <option value="">No categories configured in this competition</option>
                            ) : (
                                currentCompCategories.map((cat: any) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name} (Team Size: {cat.teamSize || 1})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                            Team Name *
                        </label>
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="e.g. Young Stars 1"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                            required
                        />
                    </div>

                    {/* Choose Squad Members */}
                    <div className="space-y-2">
                        <label className="block text-slate-700 dark:text-slate-300 font-bold">
                            Select Squad Members ({selectedPlayerIds.length} Selected)
                        </label>
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/40">
                            {eligibleMembers.map((m) => {
                                const isChecked = selectedPlayerIds.includes(m.id);
                                return (
                                    <label
                                        key={m.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPlayerIds([...selectedPlayerIds, m.id]);
                                                        if (!captainUserId) setCaptainUserId(m.id);
                                                    } else {
                                                        setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== m.id));
                                                        if (captainUserId === m.id) setCaptainUserId('');
                                                    }
                                                }}
                                                className="rounded-sm text-red-600 focus:ring-red-500"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {m.firstName} {m.lastName}
                                            </span>
                                            <span className="text-[10px] text-slate-400">({m.licenseId})</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-sm border border-slate-200 dark:border-slate-800">
                                            {m.eloPoints || 1200} Elo
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Select Captain */}
                    {selectedPlayerIds.length > 0 && (
                        <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                                Appoint Team Captain
                            </label>
                            <select
                                value={captainUserId}
                                onChange={(e) => setCaptainUserId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                            >
                                {selectedPlayerIds.map((pid) => {
                                    const m = eligibleMembers.find((mem) => mem.id === pid);
                                    return (
                                        <option key={pid} value={pid}>
                                            {m ? `${m.firstName} ${m.lastName} (${m.eloPoints || 1200} Elo)` : pid}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowRegisterModal(false)}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={registering}
                            className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                        >
                            {registering ? 'Registering Team...' : 'Register Team'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: Edit Squad Lineup & Captain */}
            <Modal
                isOpen={!!editingTeam}
                onClose={() => setEditingTeam(null)}
                title={`Manage Squad Roster: ${editingTeam?.name || ''}`}
            >
                <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                    {editError && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-3 text-red-600 text-xs font-semibold">
                            {editError}
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                            Team Name *
                        </label>
                        <input
                            type="text"
                            value={editTeamName}
                            onChange={(e) => setEditTeamName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                            required
                        />
                    </div>

                    {/* Edit Squad Members */}
                    <div className="space-y-2">
                        <label className="block text-slate-700 dark:text-slate-300 font-bold">
                            Squad Roster ({editPlayerIds.length} Players Assigned)
                        </label>
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/40">
                            {eligibleMembers.map((m) => {
                                const isChecked = editPlayerIds.includes(m.id);
                                return (
                                    <label
                                        key={m.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setEditPlayerIds([...editPlayerIds, m.id]);
                                                        if (!editCaptainId) setEditCaptainId(m.id);
                                                    } else {
                                                        setEditPlayerIds(editPlayerIds.filter((id) => id !== m.id));
                                                        if (editCaptainId === m.id) setEditCaptainId('');
                                                    }
                                                }}
                                                className="rounded-sm text-red-600 focus:ring-red-500"
                                            />
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {m.firstName} {m.lastName}
                                            </span>
                                            <span className="text-[10px] text-slate-400">({m.licenseId})</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-sm border border-slate-200 dark:border-slate-800">
                                            {m.eloPoints || 1200} Elo
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Appoint Captain */}
                    {editPlayerIds.length > 0 && (
                        <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                                Appoint Team Captain
                            </label>
                            <select
                                value={editCaptainId}
                                onChange={(e) => setEditCaptainId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                            >
                                {editPlayerIds.map((pid) => {
                                    const m = eligibleMembers.find((mem) => mem.id === pid);
                                    return (
                                        <option key={pid} value={pid}>
                                            {m ? `${m.firstName} ${m.lastName} (${m.eloPoints || 1200} Elo)` : pid}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setEditingTeam(null)}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={savingEdit}
                            className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                        >
                            {savingEdit ? 'Saving Changes...' : 'Save Lineup Changes'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: Withdraw Team Confirmation */}
            <Modal
                isOpen={!!withdrawingTeam}
                onClose={() => setWithdrawingTeam(null)}
                title="Withdraw Team Confirmation"
            >
                <div className="space-y-4 text-xs">
                    {withdrawError && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-3 text-red-600 text-xs font-semibold">
                            {withdrawError}
                        </div>
                    )}

                    <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-4 space-y-2 text-red-800 dark:text-red-300">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                            <span>Are you sure you want to withdraw &quot;{withdrawingTeam?.name}&quot;?</span>
                        </div>
                        <p className="text-xs">
                            Withdrawing will remove this team from active competition groups, deregister squad player assignments, and void upcoming fixtures for this team.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setWithdrawingTeam(null)}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmWithdraw}
                            disabled={withdrawing}
                            className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                        >
                            {withdrawing ? 'Withdrawing Team...' : 'Confirm Withdrawal'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
