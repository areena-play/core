'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { normalizePhoneNumber, formatPhoneNumber } from '@areena/shared';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Modal } from '@/components/ui/Modal';
import {
    Users,
    User as UserIcon,
    Shield,
    ShieldCheck,
    ShieldAlert,
    KeyRound,
    Edit3,
    Trash2,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Award,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    Copy,
    Check,
    Save,
    RefreshCw,
    Building2,
    Home,
    GraduationCap,
    Sliders,
    ChevronRight,
    ExternalLink,
    BadgeCheck,
    X,
} from 'lucide-react';

interface UserDetailData {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    licenseId?: string | null;
    eloPoints: number;
    rank?: number | null;
    isSuperAdmin: boolean;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    associationRoles?: {
        id: string;
        role: string;
        association: { id: string; name: string; shortName: string; code: string };
    }[];
    clubRoles?: {
        id: string;
        role: string;
        club: { id: string; name: string; code: string };
    }[];
    licenses?: {
        id: string;
        type: string;
        status: string;
        scope?: string;
        validFrom: string;
        validUntil: string;
        autoApproved?: boolean;
        rejectionReason?: string | null;
        createdAt: string;
        updatedAt: string;
        club?: { id: string; name: string; code: string } | null;
        association?: { id: string; name: string; shortName: string; code: string } | null;
        season?: { id: string; name: string; code: string } | null;
        appliedBy?: { id: string; firstName: string; lastName: string; email: string } | null;
        approvedBy?: { id: string; firstName: string; lastName: string; email: string } | null;
    }[];
    courseAttendances?: {
        id: string;
        attested: boolean;
        attestedAt?: string | null;
        notes?: string | null;
        createdAt: string;
        course?: {
            id: string;
            title: string;
            type: string;
            location: string;
            date: string;
            durationHours: number;
            validityExtensionMonths: number;
        };
        attestedBy?: { id: string; firstName: string; lastName: string; email: string } | null;
    }[];
}

export default function AdminUserDetailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-96 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
                </div>
            }
        >
            <UserDetailContent />
        </Suspense>
    );
}

function UserDetailContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: currentUser, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const assocId = params.userId ? (params.id as string) : undefined;
    const userId = (params.userId || params.id) as string;

    const backUrl = assocId ? `/association/${assocId}/management/users` : '/management/users';

    const activeTab = (searchParams.get('tab') || 'profile') as 'profile' | 'settings' | 'roles' | 'licenses';

    const [userData, setUserData] = useState<UserDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Profile form state
    const [formData, setFormData] = useState<any>({});
    const [savingProfile, setSavingProfile] = useState(false);

    // Password reset modal
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [customPassword, setCustomPassword] = useState('');
    const [autoGeneratePass, setAutoGeneratePass] = useState(true);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetResult, setResetResult] = useState<{ message: string; temporaryPassword?: string } | null>(null);
    const [copiedPass, setCopiedPass] = useState(false);

    // Delete modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Toggle superadmin
    const [togglingAdmin, setTogglingAdmin] = useState(false);

    const isAuthorized =
        currentUser?.isSuperAdmin ||
        currentUser?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const loadUserData = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await api.getAdminUser(userId);
            setUserData(data);
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                street: data.street || '',
                postalCode: data.postalCode || '',
                city: data.city || '',
                country: data.country || 'Switzerland',
                birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
                gender: data.gender || '',
                licenseId: data.licenseId || '',
                eloPoints: data.eloPoints || 1000,
                emailVerified: data.emailVerified ?? false,
                isSuperAdmin: data.isSuperAdmin ?? false,
            });
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to load user profile' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser && isAuthorized) {
            loadUserData();
        }
    }, [userId, currentUser, isAuthorized]);

    const setTab = (tab: string) => {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set('tab', tab);
        const currentPath = assocId
            ? `/association/${assocId}/management/users/${userId}`
            : `/management/users/${userId}`;
        router.replace(`${currentPath}?${nextParams.toString()}`);
    };

    // Save profile handler
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setSavingProfile(true);
        setActionBanner(null);

        try {
            const normalizedPhone = formData.phone ? normalizePhoneNumber(formData.phone) : formData.phone;
            const payload = {
                ...formData,
                phone: normalizedPhone || formData.phone,
                birthDate: formData.birthDate ? formData.birthDate : null,
                gender: formData.gender ? formData.gender : null,
                licenseId: formData.licenseId ? formData.licenseId : null,
                eloPoints: parseInt(formData.eloPoints, 10) || 1000,
            };

            await api.updateAdminUser(userId, payload);
            setActionBanner({ type: 'success', text: 'User profile updated successfully.' });
            await loadUserData();
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to update user profile.' });
        } finally {
            setSavingProfile(false);
        }
    };

    // Password reset handler
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setResetLoading(true);

        try {
            const res = await api.adminResetPassword(userId, {
                newPassword: autoGeneratePass ? undefined : customPassword,
                autoGenerate: autoGeneratePass,
            });
            setResetResult(res);
            setActionBanner({
                type: 'success',
                text: `Password reset successfully for ${userData?.firstName} ${userData?.lastName}.`,
            });
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to reset password.' });
        } finally {
            setResetLoading(false);
        }
    };

    // Toggle Superadmin handler
    const handleToggleSuperAdmin = async () => {
        if (!userData || !userId) return;
        const action = userData.isSuperAdmin ? 'demote' : 'promote';
        if (
            !confirm(
                `Are you sure you want to ${action} ${userData.firstName} ${userData.lastName} ${
                    userData.isSuperAdmin ? 'from Super Administrator?' : 'to Super Administrator?'
                }`,
            )
        ) {
            return;
        }

        setTogglingAdmin(true);
        try {
            await api.adminToggleSuperAdmin(userId);
            setActionBanner({
                type: 'success',
                text: `Super Admin privileges updated for ${userData.firstName} ${userData.lastName}.`,
            });
            await loadUserData();
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to update Super Admin status.' });
        } finally {
            setTogglingAdmin(false);
        }
    };

    // Resend email verification
    const handleSendVerification = async () => {
        if (!userId || !userData) return;
        try {
            await api.adminSendVerification(userId);
            setActionBanner({
                type: 'success',
                text: `Verification email dispatched to ${userData.email}.`,
            });
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to dispatch verification email.' });
        }
    };

    // Delete user handler
    const handleDeleteUser = async () => {
        if (!userId || !userData) return;
        setDeleteLoading(true);

        try {
            await api.adminDeleteUser(userId);
            router.push(`${backUrl}?deleted=${encodeURIComponent(`${userData.firstName} ${userData.lastName}`)}`);
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to delete user account.' });
            setDeleteLoading(false);
            setDeleteModalOpen(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
    };

    if (authLoading || loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <AccessDenied
                title="Administrator Access Required"
                description="This portal requires Federation, Association, or Super Administrator permissions to inspect and manage user profiles."
                requiredRole="Administrator"
            />
        );
    }

    if (!userData) {
        return (
            <div className="space-y-6 pb-16">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to User Management
                </Link>
                <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">User Not Found</h2>
                    <p className="text-xs text-slate-500 mt-1">The requested user could not be located in the directory.</p>
                </div>
            </div>
        );
    }

    const initials = `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`.toUpperCase();

    // License status styling helper
    const getLicenseStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Approved / Active
                    </span>
                );
            case 'PENDING_CLUB':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Pending Club Review
                    </span>
                );
            case 'PENDING_ASSOCIATION':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                        <Clock className="w-3 h-3 text-blue-500" />
                        Pending Association Review
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
                        <XCircle className="w-3 h-3 text-red-500" />
                        Rejected
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        Expired
                    </span>
                );
            case 'SUSPENDED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        Suspended
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Top Navigation & Back Link */}
            <div className="flex items-center justify-between">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to User Directory</span>
                </Link>

                <button
                    type="button"
                    onClick={loadUserData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Action Feedback Banner */}
            {actionBanner && (
                <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        actionBanner.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {actionBanner.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span>{actionBanner.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActionBanner(null)}
                        className="p-1 hover:opacity-75"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* User Identity Header Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                            {initials}
                        </div>
                        <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {userData.firstName} {userData.lastName}
                                </h1>
                                {userData.isSuperAdmin && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                                        <Shield className="w-3 h-3" />
                                        Super Admin
                                    </span>
                                )}
                                {userData.emailVerified ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                        <Clock className="w-3 h-3 text-amber-500" />
                                        Pending Verification
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5 font-mono">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{userData.email}</span>
                                </div>
                                {userData.phone && (
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{formatPhoneNumber(userData.phone)}</span>
                                    </div>
                                )}
                                {userData.city && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                        <span>
                                            {userData.city}, {userData.country || 'CH'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[100px]">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Rating</div>
                            <div className="text-base font-black text-slate-900 dark:text-white">
                                {userData.eloPoints}{' '}
                                {userData.rank && (
                                    <span className="text-xs font-normal text-slate-400">
                                        (#{userData.rank})
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[120px]">
                            <div className="text-[10px] uppercase font-bold text-slate-400">License ID</div>
                            <div className="font-mono text-xs font-bold text-red-600 dark:text-red-400 truncate">
                                {userData.licenseId || 'Unassigned'}
                            </div>
                        </div>

                        <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[90px]">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Licenses</div>
                            <div className="text-base font-black text-slate-900 dark:text-white">
                                {userData.licenses?.length || 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 mt-6 pt-4 overflow-x-auto">
                    {[
                        { id: 'profile', label: 'Profile & Personal Details', icon: UserIcon },
                        { id: 'settings', label: 'Account Settings & Security', icon: Sliders },
                        { id: 'roles', label: `Roles & Affiliations (${(userData.associationRoles?.length || 0) + (userData.clubRoles?.length || 0)})`, icon: Shield },
                        { id: 'licenses', label: `Licenses & History (${userData.licenses?.length || 0})`, icon: Award },
                    ].map((t) => {
                        const Icon = t.icon;
                        const isCurrent = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                                    isCurrent
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: Profile & Personal Details */}
            {/* ========================================================================= */}
            {activeTab === 'profile' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <div className="space-y-1 mb-6">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-red-500" />
                            Personal Profile Information
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Modify personal data, official license identifiers, address, and ranking points.
                        </p>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.firstName || ''}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.lastName || ''}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Phone Number
                                </label>
                                <PhoneInput
                                    value={formData.phone || ''}
                                    onChange={(val) => setFormData({ ...formData, phone: val })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    National License ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. LIC-2026-CH-0001"
                                    value={formData.licenseId || ''}
                                    onChange={(e) => setFormData({ ...formData, licenseId: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">Birth Date</label>
                                <input
                                    type="date"
                                    value={formData.birthDate || ''}
                                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">Gender</label>
                                <select
                                    value={formData.gender || ''}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                >
                                    <option value="">Not Specified</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Street & Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.street || ''}
                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Postal Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.postalCode || ''}
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">City</label>
                                <input
                                    type="text"
                                    value={formData.city || ''}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">Country</label>
                                <input
                                    type="text"
                                    value={formData.country || 'Switzerland'}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Rating / ELO Points
                                </label>
                                <input
                                    type="number"
                                    value={formData.eloPoints || 1000}
                                    onChange={(e) =>
                                        setFormData({ ...formData, eloPoints: parseInt(e.target.value, 10) || 1000 })
                                    }
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={loadUserData}
                                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-semibold"
                            >
                                Revert Changes
                            </button>
                            <button
                                type="submit"
                                disabled={savingProfile}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition shadow"
                            >
                                <Save className="w-4 h-4" />
                                <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: Account Settings & Security */}
            {/* ========================================================================= */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    {/* Security & Access Management */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <KeyRound className="w-4 h-4 text-amber-500" />
                                Credentials & Security Controls
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Issue temporary passwords, update authentication verification, and manage admin privileges.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Password Management Box */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                            Password Reset
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Generate an auto-generated temporary key or specify custom password.
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetModalOpen(true);
                                        setResetResult(null);
                                        setCustomPassword('');
                                        setAutoGeneratePass(true);
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-semibold transition"
                                >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    <span>Reset User Password</span>
                                </button>
                            </div>

                            {/* Email Verification Box */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                            Email Verification Status
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Current: {userData.emailVerified ? 'Verified Account' : 'Pending Verification'}
                                        </div>
                                    </div>
                                    {userData.emailVerified ? (
                                        <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-500">
                                            <Check className="w-4 h-4" />
                                        </span>
                                    ) : (
                                        <span className="p-1 rounded-full bg-amber-500/20 text-amber-500">
                                            <Clock className="w-4 h-4" />
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSendVerification}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 text-xs font-semibold transition"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Resend Verification Email</span>
                                </button>
                            </div>
                        </div>

                        {/* Super Admin Privileges Box */}
                        {currentUser?.isSuperAdmin && (
                            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-red-500" />
                                        Super Administrator Privileges
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Super Admins possess unrestricted global governance across all associations, clubs, users, and audit records.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={userData.id === currentUser.id || togglingAdmin}
                                    onClick={handleToggleSuperAdmin}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${
                                        userData.id === currentUser.id
                                            ? 'border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                                            : userData.isSuperAdmin
                                            ? 'border-red-500/40 bg-red-600 text-white hover:bg-red-700'
                                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-red-500/50 hover:text-red-500'
                                    }`}
                                >
                                    {userData.isSuperAdmin ? 'Revoke Super Administrator' : 'Grant Super Administrator'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Metadata Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                            Account Metadata & Audit Info
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <div className="text-[10px] text-slate-400 font-semibold">User UUID</div>
                                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate select-all">
                                    {userData.id}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <div className="text-[10px] text-slate-400 font-semibold">Registered At</div>
                                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                    {new Date(userData.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <div className="text-[10px] text-slate-400 font-semibold">Last Updated</div>
                                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                    {new Date(userData.updatedAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone: Account Deletion */}
                    {userData.id !== currentUser?.id && (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4" />
                                        Danger Zone: Delete User Account
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Permanently delete this user account. All associated role memberships will be wiped immediately.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDeleteModalOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow shrink-0"
                                >
                                    Delete User
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: Roles & Affiliations */}
            {/* ========================================================================= */}
            {activeTab === 'roles' && (
                <div className="space-y-6">
                    {/* Association Roles */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-purple-500" />
                                Association & Federation Governance Roles
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Associations where this user holds executive, administrative, or disciplinary positions.
                            </p>
                        </div>

                        {!userData.associationRoles || userData.associationRoles.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                                No association leadership roles assigned to this account.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {userData.associationRoles.map((ar) => (
                                    <div
                                        key={ar.id}
                                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                                                {ar.association?.code || 'AS'}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {ar.association?.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    Code: {ar.association?.code}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold">
                                            {ar.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Club Roles */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Home className="w-4 h-4 text-blue-500" />
                                Club Roles & Memberships
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Registered club affiliations, team managerial responsibilities, and player memberships.
                            </p>
                        </div>

                        {!userData.clubRoles || userData.clubRoles.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                                No club affiliations registered for this user.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {userData.clubRoles.map((cr) => (
                                    <div
                                        key={cr.id}
                                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                                {cr.club?.code || 'CL'}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {cr.club?.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    Code: {cr.club?.code}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-bold">
                                            {cr.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: Licenses & Certifications History */}
            {/* ========================================================================= */}
            {activeTab === 'licenses' && (
                <div className="space-y-6">
                    {/* Licenses History Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    Player, Coach & Referee Licenses
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Comprehensive audit trail of all historical and active licenses issued to this athlete.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                                    ID: {userData.licenseId || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {!userData.licenses || userData.licenses.length === 0 ? (
                            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                                <Award className="w-8 h-8 text-slate-300 mx-auto" />
                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    No licenses recorded for this user
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    License passes requested by clubs or athletes will appear here with complete verification logs.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {userData.licenses.map((lic) => (
                                    <div
                                        key={lic.id}
                                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-3 transition hover:border-slate-300 dark:hover:border-slate-700"
                                    >
                                        {/* Card Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                                    <Award className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span>{lic.type.replace(/_/g, ' ')}</span>
                                                        {lic.autoApproved && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                                Auto-Approved
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        Season: {lic.season?.name || 'All Season'} • Scope: {lic.scope || 'ALL'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>{getLicenseStatusBadge(lic.status)}</div>
                                        </div>

                                        {/* Card Details Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                            <div>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Affiliated Club
                                                </span>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {lic.club?.name || 'Independent / Direct'}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Association
                                                </span>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {lic.association?.name || 'National Federation'}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Validity Period
                                                </span>
                                                <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                                    {new Date(lic.validFrom).toLocaleDateString()} -{' '}
                                                    {new Date(lic.validUntil).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                                    Created On
                                                </span>
                                                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                    {new Date(lic.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Audit Log / Applied & Approved By */}
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                                            <div className="flex items-center gap-3">
                                                {lic.appliedBy && (
                                                    <span>
                                                        Applied by:{' '}
                                                        <strong className="text-slate-700 dark:text-slate-300">
                                                            {lic.appliedBy.firstName} {lic.appliedBy.lastName}
                                                        </strong>
                                                    </span>
                                                )}
                                                {lic.approvedBy && (
                                                    <span>
                                                        Approved by:{' '}
                                                        <strong className="text-slate-700 dark:text-slate-300">
                                                            {lic.approvedBy.firstName} {lic.approvedBy.lastName}
                                                        </strong>
                                                    </span>
                                                )}
                                            </div>

                                            {lic.rejectionReason && (
                                                <div className="w-full mt-1 p-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-[11px]">
                                                    <strong>Rejection Justification:</strong> {lic.rejectionReason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Refresher Courses / Attestations */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-indigo-500" />
                                Refresher Courses & Certifications Attestations
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Training courses, instructor attestations, and credential validity extensions.
                            </p>
                        </div>

                        {!userData.courseAttendances || userData.courseAttendances.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                                No refresher course attendance records on file for this user.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {userData.courseAttendances.map((ca) => (
                                    <div
                                        key={ca.id}
                                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>{ca.course?.title || 'Refresher Course'}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
                                                    {ca.course?.type}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                Location: {ca.course?.location} • Date:{' '}
                                                {ca.course?.date ? new Date(ca.course.date).toLocaleDateString() : 'N/A'}{' '}
                                                • +{ca.course?.validityExtensionMonths || 12} Months validity
                                            </div>
                                            {ca.notes && (
                                                <div className="text-[11px] text-slate-500 italic">
                                                    Notes: {ca.notes}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {ca.attested ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                    Attested
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold">
                                                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                    Attestation Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* Modal: Reset Password */}
            {/* ========================================================================= */}
            <Modal
                isOpen={resetModalOpen}
                onClose={() => setResetModalOpen(false)}
                title={`Reset Password: ${userData.firstName} ${userData.lastName}`}
                subtitle="Issue temporary login credentials or set custom password"
                icon={<KeyRound className="w-5 h-5 text-amber-500" />}
                size="md"
            >
                {resetResult ? (
                    <div className="space-y-4 py-2 text-xs">
                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 space-y-2">
                            <div className="flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                {resetResult.message}
                            </div>
                            {resetResult.temporaryPassword && (
                                <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                        Temporary Password (Click to Copy):
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="px-2.5 py-1.5 rounded-lg bg-black/30 text-white font-mono text-sm font-bold tracking-wider select-all">
                                            {resetResult.temporaryPassword}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(resetResult.temporaryPassword!)}
                                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                        >
                                            {copiedPass ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-right pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setResetModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoGeneratePass}
                                    onChange={(e) => setAutoGeneratePass(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    Auto-generate secure temporary password (Recommended)
                                </span>
                            </label>
                        </div>

                        {!autoGeneratePass && (
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Set Custom Password
                                </label>
                                <PasswordInput
                                    required
                                    placeholder="Enter new password (min. 8 chars)"
                                    value={customPassword}
                                    onChange={(e) => setCustomPassword(e.target.value)}
                                    containerClassName="mt-1"
                                    className="font-mono"
                                />
                            </div>
                        )}

                        <p className="text-[11px] text-slate-500">
                            The user will receive an email notification indicating their password was reset by an administrator.
                        </p>

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setResetModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={resetLoading}
                                className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition shadow"
                            >
                                {resetLoading ? 'Resetting...' : 'Confirm Reset Password'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ========================================================================= */}
            {/* Modal: Delete User Confirmation */}
            {/* ========================================================================= */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete User Account"
                subtitle="Permanent and irreversible account deletion"
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                size="sm"
            >
                <div className="space-y-4 text-xs">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Are you sure you want to permanently delete{' '}
                        <strong className="text-slate-900 dark:text-white">
                            {userData.firstName} {userData.lastName}
                        </strong>{' '}
                        (<span className="font-mono">{userData.email}</span>)? All associated club and federation roles will be permanently revoked.
                    </p>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setDeleteModalOpen(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={deleteLoading}
                            onClick={handleDeleteUser}
                            className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition shadow"
                        >
                            {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
