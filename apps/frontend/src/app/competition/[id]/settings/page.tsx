'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Sliders,
    Save,
    AlertCircle,
    CheckCircle2,
    Calendar,
    MapPin,
    DollarSign,
    Shield,
    Check,
    XCircle,
    ArrowLeft,
    Trophy,
    Clock,
    Users,
    FileText,
    Volume2,
    Printer,
    Lock,
    CreditCard,
    Mail,
    Building,
    Database,
    Globe,
    Plus,
    Trash2,
    Tag,
    ListFilter,
    Layers,
    Share2,
    Info,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { TournamentSettings, DiscountRule } from '@areena/shared';

type SettingsTab =
    | 'general'
    | 'schedule'
    | 'registration'
    | 'financials'
    | 'draw_teams'
    | 'logistics'
    | 'sub_tournaments'
    | 'comms_billing'
    | 'operations';

export default function CompetitionSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    // General & Top-level DB Fields
    const [generalForm, setGeneralForm] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        entryFee: 0,
        isOfficial: true,
        countsForElo: true,
        status: 'DRAFT',
    });

    // Deep Tournament Settings (Stored in Json column)
    const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings>({
        nameShort: '',
        nameDiploma: '',
        nameI18n: { de: '', fr: '', it: '', en: '' },
        tournamentHomeText: '',
        sport: 'TABLE_TENNIS',
        isSimpleMode: false,

        plannedStartTime: '',
        plannedEndTime: '',
        regStartTime: '',
        regEndTime: '',
        deregEndTime: '',
        deregInfo: '',
        blockEnrollment: false,
        regPassword: '',
        noRegPasswordForConfirmation: false,

        currency: 'CHF',
        associationCostSingle: 0,
        associationCostEachDay: false,
        noAssociationCostForUnlicensed: false,
        fineCost: 0,
        manyEnrollmentsDiscount: 0,
        manyEnrollmentsNrCategories: 2,
        manyEnrollmentsDiscountOnlyTotal: false,
        manyEnrollmentsAlsoJuniorCost: false,
        manyEnrollmentsAlsoTeamCost: false,
        moreDiscounts: [],
        allowOnlinePayment: false,
        forcePaymentDelay: 0,
        enrollmentConfirmationDelay: 0,

        maxNrRegistrationsPerPlayer: 0,
        maxNrRegistrations: 0,
        maxNrPlayers: 0,
        allowOnlyRegions: [],
        allowOnlyClubs: [],
        playerBlacklist: '',
        ageCutMonth: 0,
        juniorAge: 18,
        categoryConflicts: [],
        forceTelNr: false,
        additionalDataClub: false,
        additionalDataLevel: false,
        additionalDataEmail: false,
        autoEnrollIfOnlyOneCategory: false,

        chiefReferee: '',
        allPlayersCanBeReferees: false,
        allowRefOnlyOnCorrectTable: false,
        allowDoubleCourtUsage: false,
        noWhenCourtFreeMessage: false,
        allowMatchesWithoutCourt: false,
        usersCanAddAvailableCourts: false,
        defaultCourtOrder: '',
        autoSetGamesToCalledOut: false,
        maxNrCallouts: 3,
        automatedCallouts: false,
        usePushNotifications: false,
        skipAwardCeremonies: false,
        useShirtNumbers: false,
        printClubOnMatchform: true,
        printLevelOnMatchform: true,
        printShortTournamentName: false,
        printPlannedStartTime: true,
        printCourtPlaceDetails: true,
        showOnlyPlaceNotCourt: false,
        playersCanPrintMatchForm: false,
        advancedMatchFormTwoRows: false,

        allowWaitlist: true,
        hideWaitlistForNonadmins: false,
        autoConfirmTeams: false,
        autoConfirmDoubles: false,
        teamChangeKeepWaitlist: false,
        drawOnlyDisplayPresentTeams: false,
        drawOnlyDisplayPaidTeams: false,
        categoryRankingsShowAllTeams: false,
        categorySortMode: 'restrictions',
        categorySortModeRestrictions: 'teamsize',

        hasSubTournaments: false,
        subTournamentsName: '',
        subTournamentsNamePlural: '',
        subTournamentPassword: '',
        allowSamePlayerInMultipleSubTournaments: false,
        newSubTournamentInfotext: '',

        registrationMailText: '',
        registrationMailHideCost: false,

        organizerName: '',
        organizerIban: '',
        organizerCountry: 'CH',
        organizerZip: '',
        organizerCity: '',
        organizerStreet: '',
        organizerStreetNumber: '',

        autoBackup: 20,
        keepNrBackups: 10,
        backupWithChangeData: true,
        showInArchive: true,
        hideInGlobalArchive: false,
    });

    // Helper to format ISO datetime to input datetime-local string (YYYY-MM-DDTHH:mm)
    const formatDateTimeForInput = (val?: string | null) => {
        if (!val) return '';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return val;
            return d.toISOString().slice(0, 16);
        } catch {
            return val;
        }
    };

    const fetchData = async () => {
        try {
            const comp = await api.getCompetition(competitionId);
            setCompetition(comp);
            setGeneralForm({
                name: comp.name || '',
                description: comp.description || '',
                startDate: comp.startDate ? comp.startDate.substring(0, 10) : '',
                endDate: comp.endDate ? comp.endDate.substring(0, 10) : '',
                location: comp.location || '',
                entryFee: comp.entryFee || 0,
                isOfficial: comp.isOfficial !== false,
                countsForElo: comp.countsForElo !== false,
                status: comp.status || 'DRAFT',
            });

            const s = (comp.settings as TournamentSettings) || {};
            setTournamentSettings((prev) => ({
                ...prev,
                ...s,
                ...comp,
                nameI18n: {
                    de: comp.nameI18n?.de || s.nameI18n?.de || '',
                    fr: comp.nameI18n?.fr || s.nameI18n?.fr || '',
                    it: comp.nameI18n?.it || s.nameI18n?.it || '',
                    en: comp.nameI18n?.en || s.nameI18n?.en || '',
                },
                regStartTime: formatDateTimeForInput(comp.regStartTime || s.regStartTime),
                regEndTime: formatDateTimeForInput(comp.regEndTime || s.regEndTime),
                deregEndTime: formatDateTimeForInput(comp.deregEndTime || s.deregEndTime),
                moreDiscounts: Array.isArray(comp.moreDiscounts)
                    ? comp.moreDiscounts
                    : Array.isArray(s.moreDiscounts)
                    ? s.moreDiscounts
                    : [],
            }));

            const r = await api.getCompetitionRoles(competitionId).catch(() => []);
            setRoles(r || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    const isAssocAdmin = user?.associationRoles?.some(
        (r) => r.role === 'ADMIN' && r.associationId === competition?.associationId
    );
    const hasAdminRole = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && r.role === 'ADMIN');

    const updateSetting = <K extends keyof TournamentSettings>(key: K, value: TournamentSettings[K]) => {
        setTournamentSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...generalForm,
                ...tournamentSettings,
            };
            await api.updateCompetition(competitionId, payload);
            setActionMsg({ type: 'success', text: 'All competition settings saved successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3500);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to update settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleApproval = async (approved: boolean) => {
        try {
            await api.approveCompetition(competitionId, { status: approved ? 'APPROVED' : 'REJECTED' });
            setActionMsg({ type: 'success', text: `Competition ${approved ? 'approved' : 'rejected'} successfully.` });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Approval action failed' });
        }
    };

    // Custom Discount Rules Handlers
    const addDiscountRule = () => {
        const rules = tournamentSettings.moreDiscounts || [];
        updateSetting('moreDiscounts', [...rules, { name: '', amount: 5, condition: '' }]);
    };

    const updateDiscountRule = (index: number, field: keyof DiscountRule, val: any) => {
        const rules = [...(tournamentSettings.moreDiscounts || [])];
        rules[index] = { ...rules[index], [field]: val };
        updateSetting('moreDiscounts', rules);
    };

    const removeDiscountRule = (index: number) => {
        const rules = [...(tournamentSettings.moreDiscounts || [])];
        rules.splice(index, 1);
        updateSetting('moreDiscounts', rules);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!hasAdminRole) {
        return (
            <AccessDenied
                title="Tournament Settings Restricted"
                description="Modifying competition configurations and sanctioning approvals is restricted to tournament directors and federation administrators."
                requiredRole="Competition Administrator"
                returnHref={`/competition/${competitionId}`}
            />
        );
    }

    const tabs: { id: SettingsTab; label: string; icon: any; badge?: string }[] = [
        { id: 'general', label: 'General & Branding', icon: Sliders },
        { id: 'schedule', label: 'Schedule & Deadlines', icon: Clock },
        { id: 'registration', label: 'Registration & Limits', icon: Users },
        { id: 'financials', label: 'Fees & Discounts', icon: DollarSign },
        { id: 'draw_teams', label: 'Draw, Teams & Waitlist', icon: ListFilter },
        { id: 'logistics', label: 'Logistics & Match Forms', icon: Printer },
        { id: 'sub_tournaments', label: 'Sub-Tournaments', icon: Layers },
        { id: 'comms_billing', label: 'Emails & Invoicing', icon: Mail },
        { id: 'operations', label: 'System & Backups', icon: Database },
    ];

    return (
        <div className="space-y-6 md:space-y-8 pb-16 max-w-7xl mx-auto">
            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                {competition?.type}
                            </span>
                            <span className="font-mono text-xs text-slate-400">Settings & Regulations Matrix</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Sliders className="h-6 w-6 text-red-500" />
                            <span>{generalForm.name || 'Competition Settings'}</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Configure rules, eligibility, fees, match logistics, print options, and sub-tournament parameters
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={`/competition/${competitionId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Back to Competition</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Feedback Banner */}
            {actionMsg && (
                <div
                    className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 border ${
                        actionMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    }`}
                >
                    {actionMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Association Approval Banner */}
            {competition?.requiresApproval && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="h-4 w-4 text-red-500" />
                                <span>Main Association Sanctioning Status</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Current Status: <strong className="text-slate-900 dark:text-white uppercase font-mono">{competition.approvalStatus}</strong>
                            </p>
                        </div>
                        {isAssocAdmin && competition.approvalStatus === 'PENDING_APPROVAL' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleApproval(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
                                >
                                    <Check className="h-3.5 w-3.5" /> Approve Sanctioning
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApproval(false)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
                                >
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Settings Form with Horizontal Navigation Tabs */}
            <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Navigation Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-thin">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                                    isActive
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: General & Branding */}
                {activeTab === 'general' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Basic Identification & Multilingual Titles</h3>
                            <p className="text-xs text-slate-500">Configure official names, diploma naming, and sport categorization.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Competition Name (Official)</label>
                                <input
                                    type="text"
                                    required
                                    value={generalForm.name}
                                    onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Short Name (for Badges & Tables)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Bern Open '26"
                                    value={tournamentSettings.nameShort || ''}
                                    onChange={(e) => updateSetting('nameShort', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Diploma / Certificate Tournament Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 15. Internationales Tischtennisturnier Bern"
                                    value={tournamentSettings.nameDiploma || ''}
                                    onChange={(e) => updateSetting('nameDiploma', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Sport Type</label>
                                <select
                                    value={tournamentSettings.sport || 'TABLE_TENNIS'}
                                    onChange={(e) => updateSetting('sport', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                >
                                    <option value="TABLE_TENNIS">Table Tennis (Tischtennis)</option>
                                    <option value="BADMINTON">Badminton</option>
                                    <option value="PICKLEBALL">Pickleball</option>
                                    <option value="SQUASH">Squash</option>
                                    <option value="PADEL">Padel</option>
                                    <option value="TENNIS">Tennis</option>
                                </select>
                            </div>

                            {/* Multilingual Titles */}
                            <div className="sm:col-span-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Multilingual Tournament Names</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 block mb-1">Deutsch (DE)</span>
                                        <input
                                            type="text"
                                            value={tournamentSettings.nameI18n?.de || ''}
                                            onChange={(e) =>
                                                updateSetting('nameI18n', { ...tournamentSettings.nameI18n, de: e.target.value })
                                            }
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 block mb-1">Français (FR)</span>
                                        <input
                                            type="text"
                                            value={tournamentSettings.nameI18n?.fr || ''}
                                            onChange={(e) =>
                                                updateSetting('nameI18n', { ...tournamentSettings.nameI18n, fr: e.target.value })
                                            }
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 block mb-1">Italiano (IT)</span>
                                        <input
                                            type="text"
                                            value={tournamentSettings.nameI18n?.it || ''}
                                            onChange={(e) =>
                                                updateSetting('nameI18n', { ...tournamentSettings.nameI18n, it: e.target.value })
                                            }
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-500 block mb-1">English (EN)</span>
                                        <input
                                            type="text"
                                            value={tournamentSettings.nameI18n?.en || ''}
                                            onChange={(e) =>
                                                updateSetting('nameI18n', { ...tournamentSettings.nameI18n, en: e.target.value })
                                            }
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 sm:col-span-3">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Description & Rules Summary</label>
                                <textarea
                                    rows={3}
                                    value={generalForm.description}
                                    onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-3">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Homepage Intro Text (Markdown Supported)</label>
                                <textarea
                                    rows={4}
                                    placeholder="Welcome text shown prominently on the tournament public homepage..."
                                    value={tournamentSettings.tournamentHomeText || ''}
                                    onChange={(e) => updateSetting('tournamentHomeText', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            {/* Classification Toggles */}
                            <div className="sm:col-span-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={generalForm.isOfficial}
                                        onChange={(e) => setGeneralForm({ ...generalForm, isOfficial: e.target.checked })}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Official Tournament</span>
                                        <span className="text-[11px] text-slate-500">Sanctioned federation tier</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={generalForm.countsForElo}
                                        onChange={(e) => setGeneralForm({ ...generalForm, countsForElo: e.target.checked })}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Elo Rating Points</span>
                                        <span className="text-[11px] text-slate-500">Calculates official ratings</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.isSimpleMode}
                                        onChange={(e) => updateSetting('isSimpleMode', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Simple Mode</span>
                                        <span className="text-[11px] text-slate-500">Simplified organizer view</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Schedule & Deadlines */}
                {activeTab === 'schedule' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dates, Timings & Registration Deadlines</h3>
                            <p className="text-xs text-slate-500">Control registration windows, deregistration rules, and venue logistics.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Competition Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={generalForm.startDate}
                                    onChange={(e) => setGeneralForm({ ...generalForm, startDate: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Competition End Date</label>
                                <input
                                    type="date"
                                    required
                                    value={generalForm.endDate}
                                    onChange={(e) => setGeneralForm({ ...generalForm, endDate: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Location / Venue</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sporthalle Wankdorf, Bern"
                                    value={generalForm.location}
                                    onChange={(e) => setGeneralForm({ ...generalForm, location: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Planned Start Time (HH:mm)</label>
                                <input
                                    type="time"
                                    value={tournamentSettings.plannedStartTime || ''}
                                    onChange={(e) => updateSetting('plannedStartTime', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Expected End Time (HH:mm)</label>
                                <input
                                    type="time"
                                    value={tournamentSettings.plannedEndTime || ''}
                                    onChange={(e) => updateSetting('plannedEndTime', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Lifecycle Status</label>
                                <select
                                    value={generalForm.status}
                                    onChange={(e) => setGeneralForm({ ...generalForm, status: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                >
                                    <option value="DRAFT">DRAFT (Setup)</option>
                                    <option value="REGISTRATION_OPEN">REGISTRATION OPEN</option>
                                    <option value="REGISTRATION_CLOSED">REGISTRATION CLOSED</option>
                                    <option value="IN_PROGRESS">IN PROGRESS (Live)</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                            </div>

                            {/* Registration Deadlines */}
                            <div className="sm:col-span-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Registration Opening Window</label>
                                    <input
                                        type="datetime-local"
                                        value={tournamentSettings.regStartTime || ''}
                                        onChange={(e) => updateSetting('regStartTime', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Registration Deadline</label>
                                    <input
                                        type="datetime-local"
                                        value={tournamentSettings.regEndTime || ''}
                                        onChange={(e) => updateSetting('regEndTime', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Deregistration Deadline (Free)</label>
                                    <input
                                        type="datetime-local"
                                        value={tournamentSettings.deregEndTime || ''}
                                        onChange={(e) => updateSetting('deregEndTime', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Deregistration Instructions & Contact Info</label>
                                <textarea
                                    rows={2}
                                    placeholder="Explain how players must notify organizers for late deregistrations..."
                                    value={tournamentSettings.deregInfo || ''}
                                    onChange={(e) => updateSetting('deregInfo', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="flex items-center pt-4">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 w-full">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.blockEnrollment}
                                        onChange={(e) => updateSetting('blockEnrollment', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-red-900 dark:text-red-300 block">Emergency Registration Lock</span>
                                        <span className="text-[11px] text-red-600 dark:text-red-400">Instantly prevent any new sign-ups</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Registration & Eligibility */}
                {activeTab === 'registration' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Registration Controls, Limits & Restrictions</h3>
                            <p className="text-xs text-slate-500">Configure participant capacities, age cut-off rules, password protection, and eligibility filters.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            {/* Passwords */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Registration Password (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Leave empty for open registration"
                                    value={tournamentSettings.regPassword || ''}
                                    onChange={(e) => updateSetting('regPassword', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="flex items-center pt-4">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.noRegPasswordForConfirmation}
                                        onChange={(e) => updateSetting('noRegPasswordForConfirmation', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Password Exempt Confirmations</span>
                                        <span className="text-[11px] text-slate-500">No password needed to confirm invite</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center pt-4">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.forceTelNr}
                                        onChange={(e) => updateSetting('forceTelNr', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Require Mobile Phone</span>
                                        <span className="text-[11px] text-slate-500">Mandatory phone number on entry</span>
                                    </div>
                                </label>
                            </div>

                            {/* Participant Limits */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Max Entries per Player (0 = Unlimited)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={tournamentSettings.maxNrRegistrationsPerPlayer ?? 0}
                                    onChange={(e) => updateSetting('maxNrRegistrationsPerPlayer', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Max Total Entries (0 = Unlimited)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={tournamentSettings.maxNrRegistrations ?? 0}
                                    onChange={(e) => updateSetting('maxNrRegistrations', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Max Distinct Players (0 = Unlimited)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={tournamentSettings.maxNrPlayers ?? 0}
                                    onChange={(e) => updateSetting('maxNrPlayers', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            {/* Age Cut-off Logic */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Age Cut-off Calculation (Stichmonat)</label>
                                <select
                                    value={tournamentSettings.ageCutMonth ?? 0}
                                    onChange={(e) => updateSetting('ageCutMonth', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                >
                                    <option value={-1}>Exact age on tournament day</option>
                                    <option value={0}>Birth Year (Age on Dec 31)</option>
                                    <option value={1}>January 1 (Season standard)</option>
                                    <option value={6}>June 30 (Mid-year cut)</option>
                                    <option value={7}>July 1 (Federation standard)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Junior Age Threshold (Years)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="25"
                                    value={tournamentSettings.juniorAge ?? 18}
                                    onChange={(e) => updateSetting('juniorAge', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="flex items-center pt-4">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.autoEnrollIfOnlyOneCategory}
                                        onChange={(e) => updateSetting('autoEnrollIfOnlyOneCategory', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Auto-Enroll Single Category</span>
                                        <span className="text-[11px] text-slate-500">Auto-add if only 1 category exists</span>
                                    </div>
                                </label>
                            </div>

                            {/* Blacklist */}
                            <div className="space-y-1.5 sm:col-span-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Player Blacklist (License numbers, comma-separated, without spaces)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 10243,50122,88941"
                                    value={tournamentSettings.playerBlacklist || ''}
                                    onChange={(e) => updateSetting('playerBlacklist', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            {/* Extra data for unlicensed players */}
                            <div className="sm:col-span-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Mandatory Information for Unlicensed / Amateur Players
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.additionalDataClub}
                                            onChange={(e) => updateSetting('additionalDataClub', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white block">Require Home Club</span>
                                            <span className="text-[11px] text-slate-500">Ask for club affiliation</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.additionalDataLevel}
                                            onChange={(e) => updateSetting('additionalDataLevel', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white block">Require Skill Level</span>
                                            <span className="text-[11px] text-slate-500">Ask for playing strength</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.additionalDataEmail}
                                            onChange={(e) => updateSetting('additionalDataEmail', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white block">Require Email Address</span>
                                            <span className="text-[11px] text-slate-500">Mandatory email address</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: Fees, Discounts & Payment */}
                {activeTab === 'financials' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Entry Fees, Federation Levies & Multi-Entry Discounts</h3>
                            <p className="text-xs text-slate-500">Configure participant charges, no-show penalties, discounts, and Stripe online checkout.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Currency</label>
                                <select
                                    value={tournamentSettings.currency || 'CHF'}
                                    onChange={(e) => updateSetting('currency', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="CHF">CHF (Swiss Franc)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                    <option value="USD">USD (US Dollar)</option>
                                    <option value="GBP">GBP (British Pound)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Base Entry Fee</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={generalForm.entryFee}
                                    onChange={(e) => setGeneralForm({ ...generalForm, entryFee: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Federation Levy (Verbandsabgabe)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={tournamentSettings.associationCostSingle ?? 0}
                                    onChange={(e) => updateSetting('associationCostSingle', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">No-Show / Fine Penalty</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={tournamentSettings.fineCost ?? 0}
                                    onChange={(e) => updateSetting('fineCost', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.associationCostEachDay}
                                        onChange={(e) => updateSetting('associationCostEachDay', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Charge Federation Levy Per Day</span>
                                        <span className="text-[11px] text-slate-500">Calculate fee for each match day instead of once</span>
                                    </div>
                                </label>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.noAssociationCostForUnlicensed}
                                        onChange={(e) => updateSetting('noAssociationCostForUnlicensed', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Exempt Unlicensed Players</span>
                                        <span className="text-[11px] text-slate-500">Do not charge federation fee to amateur athletes</span>
                                    </div>
                                </label>
                            </div>

                            {/* Multi-Category Discount Rules */}
                            <div className="sm:col-span-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Multi-Category Participation Discount
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Discount Amount</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={tournamentSettings.manyEnrollmentsDiscount ?? 0}
                                            onChange={(e) => updateSetting('manyEnrollmentsDiscount', Number(e.target.value))}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Min. Categories to Trigger Discount</label>
                                        <input
                                            type="number"
                                            min="2"
                                            value={tournamentSettings.manyEnrollmentsNrCategories ?? 2}
                                            onChange={(e) => updateSetting('manyEnrollmentsNrCategories', Number(e.target.value))}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center pt-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                            <input
                                                type="checkbox"
                                                checked={!!tournamentSettings.manyEnrollmentsDiscountOnlyTotal}
                                                onChange={(e) => updateSetting('manyEnrollmentsDiscountOnlyTotal', e.target.checked)}
                                                className="h-4 w-4 rounded accent-red-600"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Single Discount on Total</span>
                                                <span className="text-[11px] text-slate-500">Deduct once vs per each category</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                            <input
                                                type="checkbox"
                                                checked={!!tournamentSettings.manyEnrollmentsAlsoJuniorCost}
                                                onChange={(e) => updateSetting('manyEnrollmentsAlsoJuniorCost', e.target.checked)}
                                                className="h-4 w-4 rounded accent-red-600"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Apply to Juniors</span>
                                                <span className="text-[11px] text-slate-500">Include junior fees in discount</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                            <input
                                                type="checkbox"
                                                checked={!!tournamentSettings.manyEnrollmentsAlsoTeamCost}
                                                onChange={(e) => updateSetting('manyEnrollmentsAlsoTeamCost', e.target.checked)}
                                                className="h-4 w-4 rounded accent-red-600"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Apply to Team Categories</span>
                                                <span className="text-[11px] text-slate-500">Include doubles/team fees</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Dynamic Discounts */}
                            <div className="sm:col-span-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                        Custom Dynamic Discounts & Surcharges
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={addDiscountRule}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add Rule
                                    </button>
                                </div>

                                {(!tournamentSettings.moreDiscounts || tournamentSettings.moreDiscounts.length === 0) && (
                                    <p className="text-xs text-slate-400 italic">No custom discount rules defined.</p>
                                )}

                                {tournamentSettings.moreDiscounts?.map((rule, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                        <input
                                            type="text"
                                            placeholder="Discount Description (e.g. Early Bird, Host Club Member)"
                                            value={rule.name}
                                            onChange={(e) => updateDiscountRule(idx, 'name', e.target.value)}
                                            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-500 font-bold">{tournamentSettings.currency || 'CHF'}</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={rule.amount}
                                                onChange={(e) => updateDiscountRule(idx, 'amount', Number(e.target.value))}
                                                className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeDiscountRule(idx)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Online Payments & Delayed Timers */}
                            <div className="sm:col-span-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.allowOnlinePayment}
                                        onChange={(e) => updateSetting('allowOnlinePayment', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Stripe Online Payment</span>
                                        <span className="text-[11px] text-slate-500">Credit card & TWINT checkout</span>
                                    </div>
                                </label>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Forced Payment Timeout (Minutes)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0 = No timer"
                                        value={tournamentSettings.forcePaymentDelay ?? 0}
                                        onChange={(e) => updateSetting('forcePaymentDelay', Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Confirmation Email Delay (Minutes)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0 = Instant email"
                                        value={tournamentSettings.enrollmentConfirmationDelay ?? 0}
                                        onChange={(e) => updateSetting('enrollmentConfirmationDelay', Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: Draw, Teams & Waitlist */}
                {activeTab === 'draw_teams' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Draw Mechanics, Waitlists & Team Auto-Confirmations</h3>
                            <p className="text-xs text-slate-500">Configure how rosters and draws are generated, sorted, and confirmed.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={tournamentSettings.allowWaitlist !== false}
                                    onChange={(e) => updateSetting('allowWaitlist', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Enable Category Waitlist</span>
                                    <span className="text-[11px] text-slate-500">Queue players when capacity is reached</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.hideWaitlistForNonadmins}
                                    onChange={(e) => updateSetting('hideWaitlistForNonadmins', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Hide Public Waitlist Names</span>
                                    <span className="text-[11px] text-slate-500">Only admins see waitlist queue</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.teamChangeKeepWaitlist}
                                    onChange={(e) => updateSetting('teamChangeKeepWaitlist', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Preserve Waitlist on Roster Change</span>
                                    <span className="text-[11px] text-slate-500">Retain queue rank when partner changes</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.autoConfirmTeams}
                                    onChange={(e) => updateSetting('autoConfirmTeams', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Auto-Confirm Teams</span>
                                    <span className="text-[11px] text-slate-500">Auto-approve complete team rosters</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.autoConfirmDoubles}
                                    onChange={(e) => updateSetting('autoConfirmDoubles', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Auto-Confirm Doubles Pairings</span>
                                    <span className="text-[11px] text-slate-500">Approve mutual partner pairings</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.categoryRankingsShowAllTeams}
                                    onChange={(e) => updateSetting('categoryRankingsShowAllTeams', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Show All Players in Rankings</span>
                                    <span className="text-[11px] text-slate-500">Display full participant list in results</span>
                                </div>
                            </label>

                            {/* Draw Preparation Filters */}
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.drawOnlyDisplayPresentTeams}
                                    onChange={(e) => updateSetting('drawOnlyDisplayPresentTeams', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Draw: Present Players Only</span>
                                    <span className="text-[11px] text-slate-500">Only include checked-in players in draw</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.drawOnlyDisplayPaidTeams}
                                    onChange={(e) => updateSetting('drawOnlyDisplayPaidTeams', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Draw: Paid Players Only</span>
                                    <span className="text-[11px] text-slate-500">Only include paid players in draw</span>
                                </div>
                            </label>

                            {/* Category Sorting Modes */}
                            <div className="space-y-1.5 sm:col-span-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Category Menu Sort Order</label>
                                <select
                                    value={tournamentSettings.categorySortMode || 'restrictions'}
                                    onChange={(e: any) => updateSetting('categorySortMode', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="restrictions">By Restrictions (Category Tier)</option>
                                    <option value="date_restrictions">By Date, then Restrictions</option>
                                    <option value="time">By Start Time</option>
                                </select>
                            </div>

                            <div className="space-y-1.5 sm:col-span-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Restrictions Sub-Sort Mode</label>
                                <select
                                    value={tournamentSettings.categorySortModeRestrictions || 'teamsize'}
                                    onChange={(e: any) => updateSetting('categorySortModeRestrictions', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="teamsize">By Team Size (Singles, Doubles, Teams)</option>
                                    <option value="age">By Age Bracket</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 6: Match Logistics & Print Forms */}
                {activeTab === 'logistics' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Match Operations, Court Management & Printed Score Slips</h3>
                            <p className="text-xs text-slate-500">Configure refereeing, speaker callouts, court double-booking, and printed score sheet layouts.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Head Referee / Oberschiedsrichter Contact</label>
                                <input
                                    type="text"
                                    placeholder="Name and contact phone/email of head referee..."
                                    value={tournamentSettings.chiefReferee || ''}
                                    onChange={(e) => updateSetting('chiefReferee', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Max Speaker Callouts (Default 3)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={tournamentSettings.maxNrCallouts ?? 3}
                                    onChange={(e) => updateSetting('maxNrCallouts', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            {/* Court Toggles */}
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.allowDoubleCourtUsage}
                                    onChange={(e) => updateSetting('allowDoubleCourtUsage', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Double-Book Courts / Tables</span>
                                    <span className="text-[11px] text-slate-500">Queue 2 matches on the same court</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.allowMatchesWithoutCourt}
                                    onChange={(e) => updateSetting('allowMatchesWithoutCourt', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Start Matches Without Court</span>
                                    <span className="text-[11px] text-slate-500">Permit unallocated match starts</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.usersCanAddAvailableCourts}
                                    onChange={(e) => updateSetting('usersCanAddAvailableCourts', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Users Can Add Available Courts</span>
                                    <span className="text-[11px] text-slate-500">Allow table coordinators to add courts</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.allPlayersCanBeReferees}
                                    onChange={(e) => updateSetting('allPlayersCanBeReferees', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">All Players Can Referee</span>
                                    <span className="text-[11px] text-slate-500">Assign participants as umpires</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.automatedCallouts}
                                    onChange={(e) => updateSetting('automatedCallouts', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Automated TTS Voice Callouts</span>
                                    <span className="text-[11px] text-slate-500">Text-to-speech speaker announcements</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.usePushNotifications}
                                    onChange={(e) => updateSetting('usePushNotifications', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">WebPush Match Notifications</span>
                                    <span className="text-[11px] text-slate-500">Push callout alert to player devices</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.useShirtNumbers}
                                    onChange={(e) => updateSetting('useShirtNumbers', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Use Shirt / Bib Numbers</span>
                                    <span className="text-[11px] text-slate-500">Track player back numbers</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                <input
                                    type="checkbox"
                                    checked={!!tournamentSettings.skipAwardCeremonies}
                                    onChange={(e) => updateSetting('skipAwardCeremonies', e.target.checked)}
                                    className="h-4 w-4 rounded accent-red-600"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Skip Award Ceremonies</span>
                                    <span className="text-[11px] text-slate-500">Suppress award presentation alerts</span>
                                </div>
                            </label>

                            {/* Match Form Printing Options */}
                            <div className="sm:col-span-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Match Form Printing Layout Options
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={tournamentSettings.printClubOnMatchform !== false}
                                            onChange={(e) => updateSetting('printClubOnMatchform', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Print Player Club</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={tournamentSettings.printLevelOnMatchform !== false}
                                            onChange={(e) => updateSetting('printLevelOnMatchform', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Print Elo / Skill Rating</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.printShortTournamentName}
                                            onChange={(e) => updateSetting('printShortTournamentName', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Print Short Tournament Name</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={tournamentSettings.printPlannedStartTime !== false}
                                            onChange={(e) => updateSetting('printPlannedStartTime', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Print Planned Start Time</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={tournamentSettings.printCourtPlaceDetails !== false}
                                            onChange={(e) => updateSetting('printCourtPlaceDetails', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Print Court / Hall Details</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.showOnlyPlaceNotCourt}
                                            onChange={(e) => updateSetting('showOnlyPlaceNotCourt', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Show Place only, not Court #</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.playersCanPrintMatchForm}
                                            onChange={(e) => updateSetting('playersCanPrintMatchForm', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Players Can Print Form</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.advancedMatchFormTwoRows}
                                            onChange={(e) => updateSetting('advancedMatchFormTwoRows', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-300">Compact 2-Row Layout</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 7: Sub-Tournaments */}
                {activeTab === 'sub_tournaments' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sub-Tournaments & Regional Qualifiers Configuration</h3>
                            <p className="text-xs text-slate-500">Configure parent-child tournament series structures and child event creation security.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            <div className="sm:col-span-3">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.hasSubTournaments}
                                        onChange={(e) => updateSetting('hasSubTournaments', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">This Competition Has Sub-Tournaments</span>
                                        <span className="text-[11px] text-slate-500">Enable umbrella tournament series structure</span>
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Sub-Tournament Singular Label</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Regional Qualifier, Stage"
                                    value={
                                        typeof tournamentSettings.subTournamentsName === 'string'
                                            ? tournamentSettings.subTournamentsName
                                            : ''
                                    }
                                    onChange={(e) => updateSetting('subTournamentsName', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Sub-Tournament Plural Label</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Regional Qualifiers, Stages"
                                    value={
                                        typeof tournamentSettings.subTournamentsNamePlural === 'string'
                                            ? tournamentSettings.subTournamentsNamePlural
                                            : ''
                                    }
                                    onChange={(e) => updateSetting('subTournamentsNamePlural', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Sub-Tournament Creation Password</label>
                                <input
                                    type="password"
                                    placeholder="Password required to spin up a child stage..."
                                    value={tournamentSettings.subTournamentPassword || ''}
                                    onChange={(e) => updateSetting('subTournamentPassword', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.allowSamePlayerInMultipleSubTournaments}
                                        onChange={(e) => updateSetting('allowSamePlayerInMultipleSubTournaments', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Cross-Stage Athlete Participation</span>
                                        <span className="text-[11px] text-slate-500">Allow players to compete across multiple child stages</span>
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-1.5 sm:col-span-3">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Instructions for New Sub-Tournament Hosts</label>
                                <textarea
                                    rows={3}
                                    placeholder="Guidelines and instructions displayed to organizers creating new stages..."
                                    value={tournamentSettings.newSubTournamentInfotext || ''}
                                    onChange={(e) => updateSetting('newSubTournamentInfotext', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 8: Communications & Invoicing */}
                {activeTab === 'comms_billing' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Confirmation Emails & Organizer Invoicing / Bank Details</h3>
                            <p className="text-xs text-slate-500">Configure custom registration email notices and official IBAN banking details for payouts.</p>
                        </div>

                        <div className="space-y-5">
                            {/* Email Settings */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Confirmation Email Custom Addendum</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Add custom notes, parking directions, or check-in instructions to confirmation emails..."
                                        value={tournamentSettings.registrationMailText || ''}
                                        onChange={(e) => updateSetting('registrationMailText', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                    />
                                </div>

                                <div className="flex items-center pt-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                        <input
                                            type="checkbox"
                                            checked={!!tournamentSettings.registrationMailHideCost}
                                            onChange={(e) => updateSetting('registrationMailHideCost', e.target.checked)}
                                            className="h-4 w-4 rounded accent-red-600"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white block">Hide Fee Breakdown in Email</span>
                                            <span className="text-[11px] text-slate-500">Suppress prices in confirmation mail</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Organizer Invoicing Address & IBAN */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Organizer Bank & Billing Invoicing Address
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Recipient / Organization Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. TTC Bern Tournament Committee"
                                            value={tournamentSettings.organizerName || ''}
                                            onChange={(e) => updateSetting('organizerName', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">IBAN Number</label>
                                        <input
                                            type="text"
                                            placeholder="CH93 0000 0000 0000 0000 0"
                                            value={tournamentSettings.organizerIban || ''}
                                            onChange={(e) => updateSetting('organizerIban', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Street</label>
                                        <input
                                            type="text"
                                            placeholder="Musterstrasse"
                                            value={tournamentSettings.organizerStreet || ''}
                                            onChange={(e) => updateSetting('organizerStreet', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Street Number</label>
                                        <input
                                            type="text"
                                            placeholder="12A"
                                            value={tournamentSettings.organizerStreetNumber || ''}
                                            onChange={(e) => updateSetting('organizerStreetNumber', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">ZIP / Postleitzahl</label>
                                        <input
                                            type="text"
                                            placeholder="3000"
                                            value={tournamentSettings.organizerZip || ''}
                                            onChange={(e) => updateSetting('organizerZip', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">City / Ort</label>
                                        <input
                                            type="text"
                                            placeholder="Bern"
                                            value={tournamentSettings.organizerCity || ''}
                                            onChange={(e) => updateSetting('organizerCity', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Country Code (2-Letter ISO)</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="CH"
                                            value={tournamentSettings.organizerCountry || 'CH'}
                                            onChange={(e) => updateSetting('organizerCountry', e.target.value.toUpperCase())}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 9: Operations & Backups */}
                {activeTab === 'operations' && (
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Operations, Automatic Backups & Archive Visibility</h3>
                            <p className="text-xs text-slate-500">Configure snapshot frequencies, audit retention, and public historical visibility.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Auto-Backup Snapshot Interval (Actions)</label>
                                <input
                                    type="number"
                                    min="5"
                                    max="500"
                                    value={tournamentSettings.autoBackup ?? 20}
                                    onChange={(e) => updateSetting('autoBackup', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Keep Snapshot Count</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={tournamentSettings.keepNrBackups ?? 10}
                                    onChange={(e) => updateSetting('keepNrBackups', Number(e.target.value))}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            <div className="flex items-center pt-4">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                    <input
                                        type="checkbox"
                                        checked={tournamentSettings.backupWithChangeData !== false}
                                        onChange={(e) => updateSetting('backupWithChangeData', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Include Audit Delta Logs</span>
                                        <span className="text-[11px] text-slate-500">Record diff history in snapshots</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                    <input
                                        type="checkbox"
                                        checked={tournamentSettings.showInArchive !== false}
                                        onChange={(e) => updateSetting('showInArchive', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Show in Public Archive</span>
                                        <span className="text-[11px] text-slate-500">Display in association archive</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 w-full">
                                    <input
                                        type="checkbox"
                                        checked={!!tournamentSettings.hideInGlobalArchive}
                                        onChange={(e) => updateSetting('hideInGlobalArchive', e.target.checked)}
                                        className="h-4 w-4 rounded accent-red-600"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">Hide from Global Archive</span>
                                        <span className="text-[11px] text-slate-500">Suppress from federation-wide list</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sticky Footer Save Action */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 shadow-md">
                    <div className="text-xs text-slate-500">
                        Active section: <strong className="text-slate-900 dark:text-white capitalize">{tabs.find((t) => t.id === activeTab)?.label}</strong>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
