'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import { normalizePhoneNumber } from '@areena/shared';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useMainView } from '@/lib/mainViewContext';
import {
    User,
    Award,
    Shield,
    Save,
    CheckCircle2,
    AlertCircle,
    MapPin,
    Mail,
    Phone,
    Calendar,
    GraduationCap,
    Sun,
    Moon,
    Laptop,
    Globe,
    Trophy,
    Sliders,
    Building2,
    ExternalLink,
    ChevronRight,
    Crown,
    Flame,
    Clock,
    Check,
    Lock,
    ShieldAlert,
    ShieldCheck,
    Layers,
    FileBadge,
    Sparkles,
    Bell,
    CalendarCheck,
    X,
    Loader2,
    Eye,
    EyeOff,
    ArrowLeft,
    Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PasswordRequirements, checkPasswordRequirements } from '@/components/auth/PasswordRequirements';

type ProfileTab = 'personal' | 'preferences' | 'licenses' | 'competitions' | 'courses' | 'admin-access';

function ProfilePageContent() {
    const { user, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const { locale, setLocale, t, locales, supportedLocales } = useI18n();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
    const [overviewData, setOverviewData] = useState<any | null>(null);
    const [loadingOverview, setLoadingOverview] = useState(true);

    // Personal Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('Switzerland');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<string>('');

    // Preferences Form State
    const [emailMatchAlerts, setEmailMatchAlerts] = useState(true);
    const [emailLicensingAlerts, setEmailLicensingAlerts] = useState(true);
    const [isPubliclyHidden, setIsPubliclyHidden] = useState(false);
    const [displayNameChoice, setDisplayNameChoice] = useState<'FULL_NAME' | 'INITIALS' | 'ANONYMOUS'>('FULL_NAME');
    const [hideEloRanking, setHideEloRanking] = useState(false);
    const [hideContactInfo, setHideContactInfo] = useState(true);

    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [emailChangeModalOpen, setEmailChangeModalOpen] = useState(false);
    const [newEmailInput, setNewEmailInput] = useState('');
    const [emailChangeLoading, setEmailChangeLoading] = useState(false);
    const [emailChangeMsg, setEmailChangeMsg] = useState('');
    const [emailChangeErr, setEmailChangeErr] = useState('');
    // Password Change State
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
    const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

    // License Request / Application State
    const [showLicenseApplyForm, setShowLicenseApplyForm] = useState(false);
    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [applyLicenseType, setApplyLicenseType] = useState<string>('PLAYER_REGULAR');
    const [applyAssocId, setApplyAssocId] = useState<string>('');
    const [applyClubId, setApplyClubId] = useState<string>('');
    const [applySeasonId, setApplySeasonId] = useState<string>('');
    const [applyNotes, setApplyNotes] = useState<string>('');
    const [applySubmitting, setApplySubmitting] = useState(false);
    const [applyErrorMsg, setApplyErrorMsg] = useState('');
    const [applySuccessMsg, setApplySuccessMsg] = useState('');
    const [loadingLicenseFormData, setLoadingLicenseFormData] = useState(false);

    // Reset window scroll on mount to prevent mobile browser offset behind navbar
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    }, []);

    const loadLicenseFormData = async () => {
        if (associations.length > 0) return;
        setLoadingLicenseFormData(true);
        try {
            const [assocRes, clubsRes] = await Promise.all([
                api.getAssociations(),
                api.getClubs(),
            ]);
            const assocs = assocRes.associations || [];
            setAssociations(assocs);
            setClubs(clubsRes || []);

            if (assocs.length > 0) {
                const top = assocs.find((a: any) => a.isTopLevel) || assocs[0];
                setApplyAssocId(top.id);
                const seasonsRes = await api.getSeasons(top.id).catch(() => []);
                setSeasons(seasonsRes || []);
                if (seasonsRes?.length > 0) {
                    const curr = seasonsRes.find((s: any) => s.isCurrent) || seasonsRes[0];
                    setApplySeasonId(curr.id);
                }
            }
            if (clubsRes?.length > 0) {
                setApplyClubId(clubsRes[0].id);
            }
        } catch (err) {
            console.error('Failed to load license form data:', err);
        } finally {
            setLoadingLicenseFormData(false);
        }
    };

    // Synchronize tab with URL Query parameter or fallback Hash
    useEffect(() => {
        const validTabs: ProfileTab[] = ['personal', 'preferences', 'licenses', 'competitions', 'courses', 'admin-access'];
        const tabParam = searchParams.get('tab') as ProfileTab;
        const applyParam = searchParams.get('apply');
        const actionParam = searchParams.get('action');
        const typeParam = searchParams.get('type');

        if (typeParam) {
            setApplyLicenseType(typeParam);
        }

        if (tabParam && validTabs.includes(tabParam)) {
            setActiveTab(tabParam);
            if (tabParam === 'licenses' && (applyParam === 'true' || applyParam === '1' || actionParam === 'apply' || typeParam)) {
                setShowLicenseApplyForm(true);
                loadLicenseFormData();
            }
            return;
        }

        if (applyParam === 'true' || applyParam === '1' || actionParam === 'apply' || typeParam) {
            setActiveTab('licenses');
            setShowLicenseApplyForm(true);
            loadLicenseFormData();
            return;
        }

        if (typeof window !== 'undefined' && window.location.hash) {
            const hash = window.location.hash.replace('#', '') as ProfileTab;
            if (validTabs.includes(hash)) {
                setActiveTab(hash);
                if (hash === 'licenses' && (applyParam === 'true' || applyParam === '1' || actionParam === 'apply')) {
                    setShowLicenseApplyForm(true);
                    loadLicenseFormData();
                }
            }
        }
    }, [searchParams]);

    const handleTabChange = (tab: ProfileTab) => {
        setActiveTab(tab);
        if (tab === 'licenses') {
            loadLicenseFormData();
        }
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            url.hash = '';
            window.history.replaceState(null, '', url.pathname + url.search);
        }
    };

    const handleAssociationChange = async (newAssocId: string) => {
        setApplyAssocId(newAssocId);
        try {
            const s = await api.getSeasons(newAssocId).catch(() => []);
            setSeasons(s || []);
            if (s?.length > 0) {
                const curr = s.find((item: any) => item.isCurrent) || s[0];
                setApplySeasonId(curr.id);
            } else {
                setApplySeasonId('');
            }
        } catch {}
    };

    const handleApplyLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setApplySubmitting(true);
        setApplyErrorMsg('');
        setApplySuccessMsg('');

        try {
            const payload: any = {
                userId: user.id,
                type: applyLicenseType,
                associationId: applyAssocId,
                clubId: (applyLicenseType === 'PLAYER_REGULAR' || applyLicenseType === 'PLAYER_WOMEN') ? applyClubId : null,
                seasonId: applySeasonId || null,
                notes: applyNotes,
            };

            const result = await api.applyLicense(payload);

            if (result.autoApproved) {
                setApplySuccessMsg('🎉 Tournament Pass auto-approved! Your license is active immediately.');
            } else if (result.status === 'PENDING_CLUB') {
                setApplySuccessMsg('Application submitted! Awaiting club official verification.');
            } else {
                setApplySuccessMsg('Application submitted! Awaiting federation association approval.');
            }

            await fetchOverview();
            await refreshUser();

            setTimeout(() => {
                setShowLicenseApplyForm(false);
                setApplySuccessMsg('');
                setApplyNotes('');
            }, 3000);
        } catch (err: any) {
            setApplyErrorMsg(err.message || 'Failed to submit license application');
        } finally {
            setApplySubmitting(false);
        }
    };

    const fetchOverview = async () => {
        setLoadingOverview(true);
        try {
            const data = await api.getProfileOverview();
            setOverviewData(data);
            if (data?.user) {
                setFirstName(data.user.firstName || '');
                setLastName(data.user.lastName || '');
                setPhone(data.user.phone || '');
                setStreet(data.user.street || '');
                setPostalCode(data.user.postalCode || '');
                setCity(data.user.city || '');
                setCountry(data.user.country || 'Switzerland');
                setBirthDate(data.user.birthDate ? data.user.birthDate.substring(0, 10) : '');
                setGender(data.user.gender || '');
                setIsPubliclyHidden(data.user.isPubliclyHidden === true);
                setDisplayNameChoice(data.user.displayNameChoice || 'FULL_NAME');
                setHideEloRanking(data.user.hideEloRanking === true);
                setHideContactInfo(data.user.hideContactInfo !== false);
            }
        } catch (err) {
            console.error('Failed to load profile overview:', err);
        } finally {
            setLoadingOverview(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchOverview();
        }
    }, [user]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordErrorMsg('');
        setPasswordSuccessMsg('');

        if (!currentPassword) {
            setPasswordErrorMsg('Current password is required.');
            return;
        }

        const reqs = checkPasswordRequirements(newPassword);
        if (!reqs.isAllValid) {
            setPasswordErrorMsg('New password does not meet all required complexity criteria.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordErrorMsg(t('auth.passwordsDoNotMatch') || 'Passwords do not match.');
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await api.changePassword({ currentPassword, newPassword });
            if (res?.token) {
                localStorage.setItem('areena_token', res.token);
            }
            setPasswordSuccessMsg(res.message || 'Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            setPasswordErrorMsg(err.message || 'Failed to change password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleRequestEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailChangeLoading(true);
        setEmailChangeErr('');
        setEmailChangeMsg('');
        try {
            const res = await api.requestEmailChange(newEmailInput);
            setEmailChangeMsg(res.message || 'Confirmation link sent to your new email address. Please check your inbox.');
            fetchOverview();
        } catch (err: any) {
            setEmailChangeErr(err.message || 'Failed to request email change.');
        } finally {
            setEmailChangeLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const normalizedPhone = normalizePhoneNumber(phone);
            await api.updateProfile({
                firstName,
                lastName,
                phone: normalizedPhone || phone,
                street,
                postalCode,
                city,
                country,
                birthDate: birthDate || null,
                gender: gender || null,
                isPubliclyHidden,
                displayNameChoice,
                hideEloRanking,
                hideContactInfo,
            });
            await refreshUser();
            await fetchOverview();
            setSuccessMsg(t('profile.profileUpdated'));
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <AccessDenied
                title="Sign In to Access Profile"
                description="You must be logged in to view and edit your AREENA profile, licenses, registered competitions, and administrative settings."
                requiredRole="Authenticated User"
                returnHref="/"
            />
        );
    }

    const licensesCount = overviewData?.licenses?.length || user.licenses?.length || 0;
    const competitionsCount = overviewData?.registeredCompetitions?.length || 0;
    const coursesCount = (overviewData?.courseAttendances?.length || 0) + (overviewData?.instructedCourses?.length || 0);
    const adminAssocsCount = overviewData?.adminAccess?.associations?.length || 0;
    const adminClubsCount = overviewData?.adminAccess?.clubs?.length || 0;
    const adminTotalCount = adminAssocsCount + adminClubsCount + (user.isSuperAdmin ? 1 : 0);

    return (
        <div className="w-full space-y-6 md:space-y-8 pb-20">
            {/* Header Profile Hero Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start sm:items-center gap-5">
                        <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-600 to-amber-400 font-black text-2xl sm:text-3xl text-white shadow-md flex-shrink-0">
                            {user.firstName ? user.firstName[0] : 'U'}
                            {user.lastName ? user.lastName[0] : 'A'}
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {user.firstName} {user.lastName}
                                </h1>
                                {user.emailVerified ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                        <Check className="h-3 w-3" />
                                        <span>Verified</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                        <span>Pending Verification</span>
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                                <span>{user.email}</span>
                                <span>•</span>
                                <span>ID: {user.id.substring(0, 8)}...</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {user.isSuperAdmin && (
                                    <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
                                        {t('nav.superAdmin')}
                                    </span>
                                )}
                                {user.licenseId && (
                                    <span className="rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800/60 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                                        LIC #{user.licenseId}
                                    </span>
                                )}
                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                    {user.eloPoints} Elo Points {user.rank ? `• Rank #${user.rank}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                        <div className="px-2">
                            <span className="block text-lg font-black text-slate-900 dark:text-white">{licensesCount}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">{t('profile.tabs.licenses')}</span>
                        </div>
                        <div className="px-2 border-l border-slate-200 dark:border-slate-800">
                            <span className="block text-lg font-black text-amber-600 dark:text-amber-400">{competitionsCount}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Events</span>
                        </div>
                        <div className="px-2 border-l border-slate-200 dark:border-slate-800">
                            <span className="block text-lg font-black text-blue-600 dark:text-blue-400">{coursesCount}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Courses</span>
                        </div>
                        <div className="px-2 border-l border-slate-200 dark:border-slate-800">
                            <span className="block text-lg font-black text-purple-600 dark:text-purple-400">{adminTotalCount}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Admin</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Tabs Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
                <button
                    type="button"
                    onClick={() => handleTabChange('personal')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'personal'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <User className="h-4 w-4" />
                    <span>{t('profile.tabs.personal')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('preferences')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'preferences'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Sliders className="h-4 w-4" />
                    <span>{t('profile.tabs.preferences')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('licenses')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'licenses'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Award className="h-4 w-4" />
                    <span>{t('profile.tabs.licenses')}</span>
                    {licensesCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            activeTab === 'licenses' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                            {licensesCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('competitions')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'competitions'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Trophy className="h-4 w-4" />
                    <span>{t('profile.tabs.competitions')}</span>
                    {competitionsCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            activeTab === 'competitions' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                            {competitionsCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('courses')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'courses'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <GraduationCap className="h-4 w-4" />
                    <span>{t('profile.tabs.courses')}</span>
                    {coursesCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            activeTab === 'courses' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                            {coursesCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleTabChange('admin-access')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'admin-access'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t('profile.tabs.adminAccess')}</span>
                    {adminTotalCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            activeTab === 'admin-access' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                            {adminTotalCount}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB CONTENT SECTIONS */}

            {/* 1. PERSONAL DATA TAB */}
            {activeTab === 'personal' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <User className="h-5 w-5 text-amber-500" />
                            <span>{t('profile.personalInfo')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('profile.personalDesc')}
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-300">
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>{errorMsg}</div>
                        </div>
                    )}

                    {successMsg && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>{successMsg}</div>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.firstName')} *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.lastName')} *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.email')}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmailChangeModalOpen(true);
                                            setNewEmailInput('');
                                            setEmailChangeErr('');
                                            setEmailChangeMsg('');
                                        }}
                                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline"
                                    >
                                        {t('auth.emailChangeTitle') || 'Change Email'}
                                    </button>
                                </div>
                                <input
                                    type="email"
                                    disabled
                                    value={user.email}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 cursor-not-allowed font-mono"
                                />
                                {overviewData?.user?.pendingEmail && (
                                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <span>Pending verification: <strong>{overviewData.user.pendingEmail}</strong></span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.phone')} *
                                </label>
                                <PhoneInput
                                    required
                                    value={phone}
                                    onChange={(val) => setPhone(val)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.birthDate')}
                                </label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.actualGender') || 'Actual Gender'}
                                </label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-medium"
                                >
                                    <option value="">{t('profile.genderAny') || 'Not Specified'}</option>
                                    <option value="MALE">{t('profile.genderMale') || 'Male'}</option>
                                    <option value="FEMALE">{t('profile.genderFemale') || 'Female'}</option>
                                    <option value="OTHER">{t('profile.genderOther') || 'Other / Diverse'}</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{t('profile.playingGender') || 'Official Playing Category / Gender'}</span>
                                </label>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    user.playingGender === 'FEMALE'
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                }`}>
                                    {user.playingGender === 'FEMALE'
                                        ? (t('profile.playingGenderFemale') || 'Female (Women Category)')
                                        : (t('profile.playingGenderMale') || 'Male (Men / Open Category)')}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {t('profile.playingGenderLockedNotice') ||
                                    'Your playing category is locked for official competition ratings. Changes cannot be made directly and must be approved by the main national association manager.'}
                            </p>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {t('profile.street')} *
                            </label>
                            <input
                                type="text"
                                required
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.postalCode')} *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.city')} *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {t('profile.country')} *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                <span>{saving ? t('common.saving') : t('profile.saveProfile')}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Account Security & Password Card */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-amber-500" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {t('profile.securityTitle') || 'Account Security & Password'}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('profile.securitySubtitle') || 'Keep your account secure by using a strong password with letters, numbers, and symbols.'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setPasswordModalOpen(true);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmNewPassword('');
                                setPasswordErrorMsg('');
                                setPasswordSuccessMsg('');
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 text-xs font-bold shadow-xs transition shrink-0"
                        >
                            <Lock className="h-4 w-4" />
                            <span>{t('profile.changePasswordBtn') || 'Change Password'}</span>
                        </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                    {t('profile.passwordProtection') || 'Password Protection'}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    ••••••••••••••••
                                </div>
                            </div>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                            Active
                        </span>
                    </div>
                </div>
                </div>
            )}

            {/* 2. PREFERENCES TAB */}
            {activeTab === 'preferences' && (
                <div className="space-y-6">
                    {/* Language Preference Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-4">
                        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Globe className="h-5 w-5 text-amber-500" />
                            <span>{t('profile.languagePreference')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                            {t('profile.languageDescription')}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            {supportedLocales.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => setLocale(loc)}
                                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-semibold transition ${
                                        locale === loc
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <span className="text-3xl leading-none">{locales[loc].flag}</span>
                                    <span>{locales[loc].nativeLabel}</span>
                                    <span className="text-[10px] uppercase font-mono text-slate-400">
                                        {loc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Preference Setting Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-4">
                        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Sun className="h-5 w-5 text-amber-500" />
                            <span>{t('profile.themePreference')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                            {t('profile.themeDescription')}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setTheme('light')}
                                className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold transition ${
                                    theme === 'light'
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                }`}
                            >
                                <Sun className="h-5 w-5 text-amber-500" />
                                <div>
                                    <span className="block font-bold">{t('common.light')}</span>
                                    <span className="text-[10px] text-slate-400">Clean high-contrast theme</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTheme('dark')}
                                className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold transition ${
                                    theme === 'dark'
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                }`}
                            >
                                <Moon className="h-5 w-5 text-indigo-400" />
                                <div>
                                    <span className="block font-bold">{t('common.dark')}</span>
                                    <span className="text-[10px] text-slate-400">Modern low-glare dark mode</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTheme('system')}
                                className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold transition ${
                                    theme === 'system'
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold shadow-xs'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                }`}
                            >
                                <Laptop className="h-5 w-5 text-slate-500" />
                                <div>
                                    <span className="block font-bold">{t('common.system')}</span>
                                    <span className="text-[10px] text-slate-400">Sync with device system preference</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Email Notifications Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-4">
                        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Bell className="h-5 w-5 text-amber-500" />
                            <span>{t('profile.notificationsPreference')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                            {t('profile.notificationsDescription')}
                        </p>

                        <div className="space-y-3 pt-2">
                            <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        {t('profile.emailMatchAlerts')}
                                    </span>
                                    <p className="text-[11px] text-slate-500">
                                        Get notified when match schedules change, fixtures are assigned, or match scores are certified.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={emailMatchAlerts}
                                    onChange={(e) => setEmailMatchAlerts(e.target.checked)}
                                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        {t('profile.emailLicensingAlerts')}
                                    </span>
                                    <p className="text-[11px] text-slate-500">
                                        Receive automatic warnings 30 days before player/coach license expiry and course enrollment confirmations.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={emailLicensingAlerts}
                                    onChange={(e) => setEmailLicensingAlerts(e.target.checked)}
                                    className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Privacy & Public Visibility Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-amber-500" />
                                <span>Privacy & Public Visibility</span>
                            </h2>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                FADP & GDPR
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                            Control how your personal name, rankings, and contact information appear on public draw brackets, live scores, and member directories.
                        </p>

                        <div className="space-y-4 pt-2">
                            {/* Display Name Selection */}
                            <div className="space-y-2">
                                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">
                                    Display Name in Public Brackets & Results
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDisplayNameChoice('FULL_NAME');
                                            setIsPubliclyHidden(false);
                                        }}
                                        className={`flex flex-col text-left p-3.5 rounded-2xl border transition ${
                                            displayNameChoice === 'FULL_NAME' && !isPubliclyHidden
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-white font-bold'
                                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span className="text-xs font-bold">Full Name</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">e.g. {firstName || 'John'} {lastName || 'Doe'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDisplayNameChoice('INITIALS');
                                            setIsPubliclyHidden(false);
                                        }}
                                        className={`flex flex-col text-left p-3.5 rounded-2xl border transition ${
                                            displayNameChoice === 'INITIALS' && !isPubliclyHidden
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-white font-bold'
                                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-indigo-400 shrink-0" />
                                            <span className="text-xs font-bold">Initials Only</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">
                                            e.g. {firstName ? `${firstName[0]}.` : 'J.'} {lastName ? `${lastName[0]}.` : 'D.'}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDisplayNameChoice('ANONYMOUS');
                                            setIsPubliclyHidden(true);
                                        }}
                                        className={`flex flex-col text-left p-3.5 rounded-2xl border transition ${
                                            displayNameChoice === 'ANONYMOUS' || isPubliclyHidden
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-white font-bold'
                                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <EyeOff className="h-4 w-4 text-rose-500 shrink-0" />
                                            <span className="text-xs font-bold">Anonymous</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">e.g. Anonymous Player</span>
                                    </button>
                                </div>
                            </div>

                            {/* Additional Privacy Toggles */}
                            <div className="space-y-3 pt-2">
                                <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            Hide ELO Points & Rankings from Public Lists
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                            Your rating will still be calculated for tournament seedings, but concealed from unauthenticated viewers.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={hideEloRanking}
                                        onChange={(e) => setHideEloRanking(e.target.checked)}
                                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            Hide Email & Contact Details
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                            Keep your email and phone number private from public club and member directories.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={hideContactInfo}
                                        onChange={(e) => setHideContactInfo(e.target.checked)}
                                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                                    />
                                </label>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>{saving ? t('common.saving') : 'Save Privacy Preferences'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. LICENSES TAB */}
            {activeTab === 'licenses' && (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Award className="h-5 w-5 text-amber-500" />
                                    <span>{t('profile.activeLicenseBadge') || 'Active Federation Licenses'}</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('profile.licensesDesc') || 'Manage your registered competition licenses, tournament passes, and official credentials.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowLicenseApplyForm(!showLicenseApplyForm);
                                    if (!showLicenseApplyForm) loadLicenseFormData();
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition shrink-0"
                            >
                                {showLicenseApplyForm ? (
                                    <>
                                        <X className="h-4 w-4" />
                                        <span>Close Application</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        <span>Request License</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* License ID Callout if assigned */}
                        {user?.licenseId && (
                            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950 p-4 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 font-mono font-black text-white text-base shadow-xs">
                                        ID
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            Permanent Federation License ID
                                        </div>
                                        <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-widest">
                                            {user.licenseId}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                                        <Check className="h-3 w-3" />
                                        <span>Verified Holder</span>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* License Request / Application Form Panel */}
                    {showLicenseApplyForm && (
                        <div className="rounded-3xl border border-amber-200 dark:border-amber-800/80 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-md space-y-6 animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div className="space-y-0.5">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        <span>Apply for a Federation License</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Select your desired license category and affiliated association.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowLicenseApplyForm(false)}
                                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {applyErrorMsg && (
                                <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/80 p-4 text-xs text-red-700 dark:text-red-300">
                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="font-semibold">{t('common.error')}: </strong>
                                        <span>{applyErrorMsg}</span>
                                    </div>
                                </div>
                            )}

                            {applySuccessMsg && (
                                <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 p-4 text-xs text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>{applySuccessMsg}</div>
                                </div>
                            )}

                            <form onSubmit={handleApplyLicense} className="space-y-5 text-xs">
                                {/* License Type Options */}
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-900 dark:text-white">
                                        License Category & Over-Type
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label
                                            className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                                                applyLicenseType === 'PLAYER_REGULAR'
                                                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-white shadow-xs'
                                                    : 'border-slate-200 bg-slate-50/50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="applyLicenseType"
                                                value="PLAYER_REGULAR"
                                                checked={applyLicenseType === 'PLAYER_REGULAR'}
                                                onChange={(e) => setApplyLicenseType(e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                                <span>Regular Player License</span>
                                                <span className="text-[10px] rounded-full bg-amber-600/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5">
                                                    Club Attached
                                                </span>
                                            </div>
                                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                Valid for all interclub league matches and open tournaments for the full season.
                                            </p>
                                        </label>

                                        <label
                                            className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                                                applyLicenseType === 'PLAYER_TCARD'
                                                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-white shadow-xs'
                                                    : 'border-slate-200 bg-slate-50/50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="applyLicenseType"
                                                value="PLAYER_TCARD"
                                                checked={applyLicenseType === 'PLAYER_TCARD'}
                                                onChange={(e) => setApplyLicenseType(e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                                <span>Tournament Pass (T-Card)</span>
                                                <span className="text-[10px] rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5">
                                                    Auto-Approval
                                                </span>
                                            </div>
                                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                For tournament participation. No club attachment required. Instant verification for domestic athletes.
                                            </p>
                                        </label>

                                        <label
                                            className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                                                applyLicenseType === 'COACH'
                                                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-white shadow-xs'
                                                    : 'border-slate-200 bg-slate-50/50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="applyLicenseType"
                                                value="COACH"
                                                checked={applyLicenseType === 'COACH'}
                                                onChange={(e) => setApplyLicenseType(e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                                <span>Certified Coach License</span>
                                                <span className="text-[10px] rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5">
                                                    Refresher Required
                                                </span>
                                            </div>
                                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                Official coaching credential. Requires periodic refresher course credits.
                                            </p>
                                        </label>

                                        <label
                                            className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                                                applyLicenseType === 'REFEREE'
                                                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-white shadow-xs'
                                                    : 'border-slate-200 bg-slate-50/50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="applyLicenseType"
                                                value="REFEREE"
                                                checked={applyLicenseType === 'REFEREE'}
                                                onChange={(e) => setApplyLicenseType(e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                                <span>Official Referee / Umpire</span>
                                                <span className="text-[10px] rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5">
                                                    Refresher Required
                                                </span>
                                            </div>
                                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                Federation match official credential requiring attendance at annual rule seminars.
                                            </p>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Association Selection */}
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-900 dark:text-white">
                                            Federation / Association
                                        </label>
                                        <select
                                            value={applyAssocId}
                                            onChange={(e) => handleAssociationChange(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                        >
                                            {associations.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name} ({a.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Season Selection */}
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-900 dark:text-white">
                                            Competition Season
                                        </label>
                                        <select
                                            value={applySeasonId}
                                            onChange={(e) => setApplySeasonId(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                        >
                                            {seasons.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    Season {s.name} {s.isCurrent ? '(Active Current Season)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Club Selection (for regular licenses) */}
                                {(applyLicenseType === 'PLAYER_REGULAR' || applyLicenseType === 'PLAYER_WOMEN') && (
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-900 dark:text-white">
                                            Affiliated Sports Club
                                        </label>
                                        <select
                                            value={applyClubId}
                                            onChange={(e) => setApplyClubId(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                        >
                                            {clubs.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} ({c.code}) - {c.city}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Remarks / Notes */}
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-900 dark:text-white">
                                        Remarks & Additional Notes (Optional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Any notes or remarks for verification..."
                                        value={applyNotes}
                                        onChange={(e) => setApplyNotes(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2.5 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowLicenseApplyForm(false)}
                                        className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={applySubmitting}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 font-bold shadow-xs transition disabled:opacity-50"
                                    >
                                        {applySubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Award className="h-4 w-4" />
                                                <span>Submit License Request</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Existing Licenses Grid / Empty State */}
                    {overviewData?.licenses?.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
                            <Award className="h-10 w-10 text-slate-400 mx-auto" />
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{t('profile.noLicenses')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                You do not have any registered licenses yet. Request a competition license pass or short-term tournament card above.
                            </p>
                            {!showLicenseApplyForm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLicenseApplyForm(true);
                                        loadLicenseFormData();
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-xs mt-2"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Request Your First License</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {overviewData?.licenses?.map((lic: any) => (
                                <div
                                    key={lic.id}
                                    className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:border-amber-500/50 transition space-y-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 mb-1">
                                                <FileBadge className="h-3.5 w-3.5" />
                                                <span>{lic.type?.replace('PLAYER_', '').replace('_', ' ')}</span>
                                            </div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                {lic.type === 'COACH' ? 'Certified National Coach' : lic.type === 'REFEREE' ? 'Official Umpire License' : 'Official Player License Pass'}
                                            </h3>
                                        </div>

                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            lic.status === 'APPROVED'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                                : lic.status.includes('PENDING')
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>
                                            {lic.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                                        {lic.club && (
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                                                <span>{t('profile.affiliatedClub')}: <strong className="text-slate-900 dark:text-white">{lic.club.name}</strong></span>
                                            </div>
                                        )}
                                        {lic.association && (
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-amber-500 shrink-0" />
                                                <span>{t('profile.issuedBy')}: <strong className="text-slate-900 dark:text-white">{lic.association.name} [{lic.association.code}]</strong></span>
                                            </div>
                                        )}
                                        {lic.validUntil && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                                                <span>{t('profile.validity')}: <strong className="text-slate-900 dark:text-white">{format(new Date(lic.validUntil), 'dd.MM.yyyy')}</strong></span>
                                            </div>
                                        )}
                                    </div>

                                    {lic.season && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                                            <span>Season: {lic.season.name}</span>
                                            {lic.autoApproved && (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                    <Check className="h-3 w-3" />
                                                    <span>Auto-Verified</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 4. REGISTERED COMPETITIONS TAB */}
            {activeTab === 'competitions' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <span>{t('profile.competitionsTitle')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('profile.competitionsDesc')}
                        </p>
                    </div>

                    {overviewData?.registeredCompetitions?.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
                            <Trophy className="h-10 w-10 text-slate-400 mx-auto" />
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{t('profile.noCompetitions')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                Explore published tournaments, league schedules, and cups to join a team.
                            </p>
                            <Link
                                href="/competitions"
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition mt-2"
                            >
                                <span>Browse Competitions</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {overviewData?.registeredCompetitions?.map((comp: any) => (
                                <Link
                                    key={`${comp.id}-${comp.category?.id}`}
                                    href={`/competition/${comp.seriesSlug || comp.slug || comp.id}`}
                                    className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:border-amber-500/50 hover:shadow-md transition flex flex-col justify-between space-y-4 group"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                                                {comp.type?.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {comp.status}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                                {comp.name}
                                            </h3>
                                            {comp.association && (
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                                                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                                                    <span>{comp.association.name}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                                            {comp.team && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">Registered Team:</span>
                                                    <strong className="text-slate-900 dark:text-white font-semibold">{comp.team.name}</strong>
                                                </div>
                                            )}
                                            {comp.team?.role && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">{t('profile.roleInTeam')}:</span>
                                                    <span className={`inline-flex items-center gap-1 font-bold ${
                                                        comp.team.role === 'CAPTAIN' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {comp.team.role === 'CAPTAIN' && <Crown className="h-3 w-3" />}
                                                        <span>{comp.team.role}</span>
                                                    </span>
                                                </div>
                                            )}
                                            {comp.category?.name && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">Category / Division:</span>
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{comp.category.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                        <span>{t('profile.enterCompetition')}</span>
                                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 5. REGISTERED COURSES TAB */}
            {activeTab === 'courses' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-amber-500" />
                            <span>{t('profile.coursesTitle')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('profile.coursesDesc')}
                        </p>
                    </div>

                    {overviewData?.courseAttendances?.length === 0 && overviewData?.instructedCourses?.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
                            <GraduationCap className="h-10 w-10 text-slate-400 mx-auto" />
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{t('profile.noCourses')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                Check the calendar for upcoming coaching seminars, elite umpire modules, and technical courses.
                            </p>
                            <Link
                                href="/courses"
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition mt-2"
                            >
                                <span>View Refresher Courses</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {overviewData?.courseAttendances?.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {overviewData?.courseAttendances?.map((att: any) => (
                                        <div
                                            key={att.id}
                                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs space-y-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 mb-1">
                                                        {att.course?.type?.replace('_', ' ')}
                                                    </span>
                                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {att.course?.title}
                                                    </h3>
                                                </div>

                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    att.attested
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                                }`}>
                                                    {att.attested && <Check className="h-3 w-3" />}
                                                    <span>{att.attested ? t('profile.attested') : t('profile.pendingAttestation')}</span>
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                                                {att.course?.date && (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <span>{format(new Date(att.course.date), 'dd.MM.yyyy • HH:mm')} ({att.course.durationHours}h Workshop)</span>
                                                    </div>
                                                )}
                                                {att.course?.location && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <span className="truncate">{att.course.location}</span>
                                                    </div>
                                                )}
                                                {att.course?.instructor && (
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-amber-500 shrink-0" />
                                                        <span>{t('profile.instructor')}: <strong>{att.course.instructor.firstName} {att.course.instructor.lastName}</strong></span>
                                                    </div>
                                                )}
                                            </div>

                                            {att.notes && (
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 italic">
                                                    &ldquo;{att.notes}&rdquo;
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                <span>{t('profile.extensionGranted')}</span>
                                                <span>+{att.course?.validityExtensionMonths || 12} Months</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Courses Taught as Instructor */}
                            {overviewData?.instructedCourses?.length > 0 && (
                                <div className="space-y-3 pt-4">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        <span>{t('profile.instructedCoursesTitle')}</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {overviewData?.instructedCourses?.map((crs: any) => (
                                            <div
                                                key={crs.id}
                                                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs space-y-2"
                                            >
                                                <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-700 dark:text-purple-400">
                                                    Instructor Credit
                                                </span>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{crs.title}</h4>
                                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>{format(new Date(crs.date), 'dd.MM.yyyy')} • {crs._count?.attendances || 0} Attendees Attested</span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 6. ADMIN ACCESS OVERVIEW TAB */}
            {activeTab === 'admin-access' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm space-y-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-amber-500" />
                            <span>{t('profile.adminAccessTitle')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('profile.adminAccessDesc')}
                        </p>
                    </div>

                    {/* Global Super Admin Banner */}
                    {overviewData?.adminAccess?.isSuperAdmin && (
                        <div className="rounded-3xl border border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-6 shadow-sm flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-red-600 text-white shadow-md">
                                <ShieldAlert className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider">
                                    Platform Governance
                                </span>
                                <h3 className="font-black text-base text-slate-900 dark:text-white">
                                    {t('profile.superAdminGlobal')}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                                    {t('profile.superAdminGlobalDesc')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Governed Associations */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-amber-500" />
                            <span>{t('profile.governedAssociations')} ({overviewData?.adminAccess?.associations?.length || 0})</span>
                        </h3>

                        {overviewData?.adminAccess?.associations?.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-4 rounded-2xl bg-slate-50 dark:bg-slate-950">
                                No federation or regional association roles assigned.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {overviewData?.adminAccess?.associations?.map((assoc: any) => (
                                    <Link
                                        key={assoc.id}
                                        href={`/association/${assoc.slug || assoc.id}/management`}
                                        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:border-amber-500 hover:shadow-md transition space-y-3 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                                                {assoc.role}
                                            </span>
                                            <span className="font-mono text-[11px] text-slate-400">{assoc.code}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition leading-tight">
                                                {assoc.name}
                                            </h4>
                                            <span className="text-[11px] text-slate-400">{assoc.level} Level</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                            <span>{t('profile.openManagement')}</span>
                                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Managed Sports Clubs */}
                    <div className="space-y-3 pt-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span>{t('profile.managedClubs')} ({overviewData?.adminAccess?.clubs?.length || 0})</span>
                        </h3>

                        {overviewData?.adminAccess?.clubs?.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-4 rounded-2xl bg-slate-50 dark:bg-slate-950">
                                No sports club administration roles assigned.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {overviewData?.adminAccess?.clubs?.map((club: any) => (
                                    <Link
                                        key={club.id}
                                        href={`/club/${club.slug || club.id}`}
                                        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:border-blue-500 hover:shadow-md transition space-y-3 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-700 dark:text-blue-400">
                                                {club.role}
                                            </span>
                                            <span className="font-mono text-[11px] text-slate-400">{club.code}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-tight">
                                                {club.name}
                                            </h4>
                                            <span className="text-[11px] text-slate-400">{club.city || 'Switzerland'}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                                            <span>{t('profile.openClubPortal')}</span>
                                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Managed Competitions & Leagues */}
                    {overviewData?.adminAccess?.competitions?.length > 0 && (
                        <div className="space-y-3 pt-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span>{t('profile.managedCompetitions')} ({overviewData?.adminAccess?.competitions?.length})</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {overviewData?.adminAccess?.competitions?.map((comp: any) => (
                                    <Link
                                        key={comp.id}
                                        href={`/competition/${comp.seriesSlug || comp.slug || comp.id}`}
                                        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:border-amber-500 hover:shadow-md transition space-y-3 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                                                {comp.type?.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">{comp.status}</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition leading-tight">
                                            {comp.name}
                                        </h4>
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                            <span>Manage Engine</span>
                                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Password Change Modal */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {t('profile.changePasswordBtn') || 'Change Password'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {t('profile.changePasswordDesc') || 'Enter your current password and create a new secure password.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPasswordModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {passwordErrorMsg && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <div>{passwordErrorMsg}</div>
                            </div>
                        )}

                        {passwordSuccessMsg ? (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>{passwordSuccessMsg}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2.5 text-xs transition"
                                >
                                    {t('common.close') || 'Close'}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {t('auth.currentPasswordLabel') || 'Current Password'} *
                                    </label>
                                    <PasswordInput
                                        required
                                        placeholder="••••••••"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="rounded-xl px-3 py-2.5 text-xs focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {t('auth.newPasswordLabel') || 'New Password'} *
                                    </label>
                                    <PasswordInput
                                        required
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="rounded-xl px-3 py-2.5 text-xs focus:border-amber-500"
                                    />
                                    {newPassword && <PasswordRequirements password={newPassword} className="mt-2.5" />}
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {t('auth.confirmNewPasswordLabel') || 'Confirm New Password'} *
                                    </label>
                                    <PasswordInput
                                        required
                                        placeholder="••••••••"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className="rounded-xl px-3 py-2.5 text-xs focus:border-amber-500"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setPasswordModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {passwordLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                        <span>{passwordLoading ? t('common.saving') : (t('profile.updatePasswordBtn') || 'Update Password')}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Email Change Modal */}
            {emailChangeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Mail className="h-5 w-5 text-amber-500" />
                                    <span>{t('auth.emailChangeTitle')}</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('auth.emailChangeSubtitle')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailChangeModalOpen(false)}
                                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {emailChangeErr && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <div>{emailChangeErr}</div>
                            </div>
                        )}

                        {emailChangeMsg ? (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>{emailChangeMsg}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEmailChangeModalOpen(false)}
                                    className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2.5 text-xs transition"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestEmailChange} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Current Email
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={user.email}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {t('auth.newEmailLabel')} *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="new.email@example.ch"
                                        value={newEmailInput}
                                        onChange={(e) => setNewEmailInput(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-mono"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEmailChangeModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={emailChangeLoading}
                                        className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {emailChangeLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                        <span>{emailChangeLoading ? t('common.saving') : (t('auth.sendEmailChangeLink') || 'Send Confirmation Link')}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading profile...</div>}>
            <ProfilePageContent />
        </Suspense>
    );
}
