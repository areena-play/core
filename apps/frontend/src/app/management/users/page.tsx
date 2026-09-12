'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { formatPhoneNumber } from '@areena/shared';
import { PasswordInput } from '@/components/ui/PasswordInput';
import {
    Users,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Search,
    KeyRound,
    Edit3,
    Trash2,
    Mail,
    CheckCircle2,
    Clock,
    UserCheck,
    RefreshCw,
    X,
    Copy,
    Check,
    Building2,
    Home,
    Award,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    ExternalLink,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

interface AdminUserItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    birthDate?: string | null;
    gender?: string | null;
    licenseId?: string | null;
    eloPoints: number;
    rank?: number | null;
    isSuperAdmin: boolean;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    associationRoles: {
        id: string;
        role: string;
        association: { id: string; name: string; shortName: string; code: string };
    }[];
    clubRoles: {
        id: string;
        role: string;
        club: { id: string; name: string; code: string };
    }[];
    licenses: {
        id: string;
        type: string;
        status: string;
        validUntil: string;
        club: { id: string; name: string };
    }[];
}

interface UserStats {
    totalUsers: number;
    superAdmins: number;
    verifiedUsers: number;
    unverifiedUsers: number;
}

export default function AdminUsersPage() {
    const params = useParams();
    const assocId = params?.id as string | undefined;
    const userPrefix = assocId ? `/association/${assocId}/management/users` : '/management/users';

    const { user: currentUser } = useAuth();
    const { t } = useI18n();

    const [users, setUsers] = useState<AdminUserItem[]>([]);
    const [stats, setStats] = useState<UserStats>({
        totalUsers: 0,
        superAdmins: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0,
    });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filter states
    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [selectedAssoc, setSelectedAssoc] = useState<string>(assocId || '');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState<'ALL' | 'SUPER_ADMIN' | 'FEDERATION' | 'CLUB' | 'ATHLETE' | 'COACH' | 'REFEREE' | 'UNVERIFIED'>('ALL');

    // Modals
    const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserItem | null>(null);
    const [customPassword, setCustomPassword] = useState('');
    const [autoGeneratePass, setAutoGeneratePass] = useState(true);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetResult, setResetResult] = useState<{ message: string; temporaryPassword?: string } | null>(null);
    const [copiedPass, setCopiedPass] = useState(false);

    const [deleteUser, setDeleteUser] = useState<AdminUserItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Duplicate detection and merge state
    const [activeTab, setActiveTab] = useState<'directory' | 'duplicates'>('directory');
    const [duplicateClusters, setDuplicateClusters] = useState<any[]>([]);
    const [scanningDuplicates, setScanningDuplicates] = useState(false);
    const [hasScannedDuplicates, setHasScannedDuplicates] = useState(false);

    const [mergeCluster, setMergeCluster] = useState<any | null>(null);
    const [primaryUserId, setPrimaryUserId] = useState<string>('');
    const [duplicateUserId, setDuplicateUserId] = useState<string>('');
    const [keepDuplicateEmail, setKeepDuplicateEmail] = useState(true);
    const [merging, setMerging] = useState(false);

    const loadDuplicates = async () => {
        setScanningDuplicates(true);
        try {
            const res = await api.getDuplicateUsers();
            setDuplicateClusters(res.clusters || []);
            setHasScannedDuplicates(true);
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to scan for duplicate accounts' });
        } finally {
            setScanningDuplicates(false);
        }
    };

    const handleOpenMerge = (cluster: any) => {
        setMergeCluster(cluster);
        if (cluster.users && cluster.users.length >= 2) {
            // Default primary to the one with an active login or license
            const u1 = cluster.users[0];
            const u2 = cluster.users[1];
            if (!u1.canLogin && u2.canLogin) {
                setPrimaryUserId(u2.id);
                setDuplicateUserId(u1.id);
            } else {
                setPrimaryUserId(u1.id);
                setDuplicateUserId(u2.id);
            }
        }
    };

    const handleExecuteMerge = async () => {
        if (!primaryUserId || !duplicateUserId) return;
        setMerging(true);
        try {
            await api.mergeDuplicateUsers({
                primaryUserId,
                duplicateUserId,
                keepDuplicateEmailIfUnset: keepDuplicateEmail,
            });
            setActionBanner({
                type: 'success',
                text: t('duplicates.mergeSuccess') || 'User accounts successfully merged.',
            });
            setMergeCluster(null);
            loadDuplicates();
            loadUsers();
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to merge user accounts.' });
        } finally {
            setMerging(false);
        }
    };

    const isAuthorized =
        currentUser?.isSuperAdmin ||
        currentUser?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

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
                if (assocId) {
                    const found = list.find((a: any) => a.id === assocId);
                    if (found) setScopedAssoc(found);
                }
            } catch (err) {
                console.error('Failed to load associations:', err);
            }
        }
        loadAssocs();
    }, [assocId]);

    // Load users from server
    const loadUsers = async () => {
        setLoading(true);
        try {
            const activeAssocId = assocId || selectedAssoc;
            const res = await api.getAdminUsers({
                q: debouncedSearch,
                role: selectedRole !== 'ALL' ? selectedRole : undefined,
                associationId: activeAssocId || undefined,
                page,
                limit: pageSize,
            });
            setUsers(res.users || []);
            setTotalPages(res.totalPages || 1);
            setTotal(res.total || 0);
            if (res.stats) {
                setStats(res.stats);
            }
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to load user directory' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            loadUsers();
        }
    }, [currentUser, isAuthorized, page, pageSize, selectedRole, debouncedSearch, selectedAssoc, assocId]);

    // Check permissions
    if (!currentUser || !isAuthorized) {
        return (
            <AccessDenied
                title="Administrator Access Required"
                description="The User Management portal is restricted to platform Super Administrators and Federation/Association Administrators. Please sign in with an authorized account."
                requiredRole="Administrator"
            />
        );
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetPasswordUser) return;
        setResetLoading(true);

        try {
            const res = await api.adminResetPassword(resetPasswordUser.id, {
                newPassword: autoGeneratePass ? undefined : customPassword,
                autoGenerate: autoGeneratePass,
            });
            setResetResult(res);
            setActionBanner({
                type: 'success',
                text: `Password reset successfully for ${resetPasswordUser.firstName} ${resetPasswordUser.lastName}.`,
            });
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to reset password.' });
        } finally {
            setResetLoading(false);
        }
    };

    const handleToggleSuperAdmin = async (target: AdminUserItem) => {
        const action = target.isSuperAdmin ? 'demote' : 'promote';
        if (
            !confirm(
                `Are you sure you want to ${action} ${target.firstName} ${target.lastName} ${
                    target.isSuperAdmin ? 'from Super Administrator?' : 'to Super Administrator?'
                }`,
            )
        ) {
            return;
        }

        try {
            await api.adminToggleSuperAdmin(target.id);
            setActionBanner({
                type: 'success',
                text: `Super Admin status updated for ${target.firstName} ${target.lastName}.`,
            });
            loadUsers();
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to update super admin status.' });
        }
    };

    const handleSendVerification = async (target: AdminUserItem) => {
        try {
            await api.adminSendVerification(target.id);
            setActionBanner({
                type: 'success',
                text: `Verification link sent to ${target.email}.`,
            });
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to send verification link.' });
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteUser) return;
        setDeleteLoading(true);

        try {
            await api.adminDeleteUser(deleteUser.id);
            setActionBanner({
                type: 'success',
                text: `User ${deleteUser.firstName} ${deleteUser.lastName} deleted successfully.`,
            });
            setDeleteUser(null);
            loadUsers();
        } catch (err: any) {
            setActionBanner({ type: 'error', text: err.message || 'Failed to delete user.' });
        } finally {
            setDeleteLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
    };

    return (
        <div className="space-y-6 pb-16">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Registered User Management
                                {currentUser.isSuperAdmin && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">
                                        Super Admin
                                    </span>
                                )}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Global directory of all registered athletes, club managers, referees, coaches, and administrators.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadUsers}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Action Banner */}
            {actionBanner && (
                <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
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

            {/* View Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab('directory')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        activeTab === 'directory'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>{t('duplicates.tabDirectory') || 'User Directory'}</span>
                    <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            activeTab === 'directory'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                        {total}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('duplicates');
                        if (!hasScannedDuplicates) {
                            loadDuplicates();
                        }
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                        activeTab === 'duplicates'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t('duplicates.tabDuplicates') || 'Possible Duplicates'}</span>
                    {duplicateClusters.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                            {duplicateClusters.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'directory' && (
                <>
                    {/* Top Statistics Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Total Registered
                            </span>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                {stats.totalUsers}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 shadow-sm space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-400 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Super Admins
                            </span>
                            <div className="text-2xl font-black text-red-600 dark:text-red-400">
                                {stats.superAdmins}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-sm space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Verified Emails
                            </span>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {stats.verifiedUsers}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 shadow-sm space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending Verification
                            </span>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {stats.unverifiedUsers}
                            </div>
                        </div>
                    </div>

                    {/* Users Interactive DataTable */}
                    <DataTable
                        columns={[
                    {
                        id: 'name',
                        accessorFn: (u) => `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`,
                        header: ({ column }) => <DataTableColumnHeader column={column} title="User & Email" />,
                        cell: ({ row }) => {
                            const u = row.original;
                            const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
                            return (
                                <Link
                                    href={`${userPrefix}/${u.id}`}
                                    className="flex items-center gap-3 group"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-rose-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                        {initials}
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                            <span className="truncate">
                                                {u.firstName} {u.lastName}
                                            </span>
                                            {u.isSuperAdmin && (
                                                <span className="p-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30" title="Super Administrator">
                                                    <Shield className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            <span className="truncate">{u.email}</span>
                                            {u.emailVerified ? (
                                                <span
                                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded"
                                                    title="Email Verified"
                                                >
                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span
                                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded"
                                                    title="Verification Pending"
                                                >
                                                    <Clock className="w-2.5 h-2.5" />
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        },
                    },
                    {
                        id: 'roles',
                        accessorFn: (u) =>
                            `${u.associationRoles?.map((r) => r.role).join(' ')} ${u.clubRoles?.map((r) => r.role).join(' ')}`,
                        header: ({ column }) => <DataTableColumnHeader column={column} title="Roles & Licenses" />,
                        cell: ({ row }) => {
                            const u = row.original;
                            return (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                    {u.isSuperAdmin && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 flex items-center gap-1">
                                            <Shield className="w-2.5 h-2.5" />
                                            Super Admin
                                        </span>
                                    )}

                                    {u.associationRoles?.map((ar) => (
                                        <span
                                            key={ar.id}
                                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1"
                                        >
                                            <Building2 className="w-2.5 h-2.5" />
                                            {ar.association?.code || 'AS'}: {ar.role}
                                        </span>
                                    ))}

                                    {u.clubRoles?.map((cr) => (
                                        <span
                                            key={cr.id}
                                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1"
                                        >
                                            <Home className="w-2.5 h-2.5" />
                                            {cr.club?.name?.split(' ')[0]}: {cr.role}
                                        </span>
                                    ))}

                                    {u.licenses?.map((lic) => (
                                        <span
                                            key={lic.id}
                                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                                        >
                                            <Award className="w-2.5 h-2.5" />
                                            {lic.type} ({lic.status})
                                        </span>
                                    ))}

                                    {!u.isSuperAdmin &&
                                        (!u.associationRoles || u.associationRoles.length === 0) &&
                                        (!u.clubRoles || u.clubRoles.length === 0) &&
                                        (!u.licenses || u.licenses.length === 0) && (
                                            <span className="text-[10px] text-slate-400 italic">
                                                Member Account
                                            </span>
                                        )}
                                </div>
                            );
                        },
                    },
                    {
                        id: 'location',
                        accessorFn: (u) => `${u.city || ''} ${u.phone || ''}`,
                        header: ({ column }) => <DataTableColumnHeader column={column} title="Location & Contact" />,
                        cell: ({ row }) => {
                            const u = row.original;
                            return (
                                <div className="space-y-0.5 text-slate-600 dark:text-slate-400 text-xs">
                                    <div>{u.city ? `${u.city}, ${u.country || 'CH'}` : 'Switzerland'}</div>
                                    <div className="font-mono text-[10px] text-slate-500">{u.phone ? formatPhoneNumber(u.phone) : '—'}</div>
                                </div>
                            );
                        },
                    },
                    {
                        id: 'rating',
                        accessorFn: (u) => String(u.eloPoints || 1000),
                        header: ({ column }) => <DataTableColumnHeader column={column} title="Rating / License ID" />,
                        cell: ({ row }) => {
                            const u = row.original;
                            return (
                                <div className="space-y-0.5 text-xs">
                                    <div className="font-bold text-slate-900 dark:text-white">
                                        ELO {u.eloPoints || 1000}{' '}
                                        {u.rank && (
                                            <span className="text-[10px] text-slate-400 font-normal">
                                                (#{u.rank})
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-500">
                                        ID: {u.licenseId || '—'}
                                    </div>
                                </div>
                            );
                        },
                    },
                    {
                        id: 'actions',
                        header: () => <div className="text-right">Actions</div>,
                        cell: ({ row }) => {
                            const u = row.original;
                            return (
                                <div className="flex items-center justify-end gap-1">
                                    {/* View / Edit User Details Page Link */}
                                    <Link
                                        href={`${userPrefix}/${u.id}`}
                                        title="View & Edit User Profile, Settings, and Licenses"
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-red-500/50 hover:text-red-500 transition"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </Link>

                                    {/* Reset Password Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setResetPasswordUser(u);
                                            setResetResult(null);
                                            setCustomPassword('');
                                            setAutoGeneratePass(true);
                                        }}
                                        title="Reset Password"
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-amber-500/50 hover:text-amber-500 transition"
                                    >
                                        <KeyRound className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Resend Verification (if unverified) */}
                                    {!u.emailVerified && (
                                        <button
                                            type="button"
                                            onClick={() => handleSendVerification(u)}
                                            title="Send Verification Email"
                                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-indigo-500/50 hover:text-indigo-500 transition"
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    {/* SuperAdmin Toggle */}
                                    {currentUser.isSuperAdmin && (
                                        <button
                                            type="button"
                                            disabled={u.id === currentUser.id}
                                            onClick={() => handleToggleSuperAdmin(u)}
                                            title={
                                                u.id === currentUser.id
                                                    ? 'Cannot revoke your own administrator privileges'
                                                    : u.isSuperAdmin
                                                    ? 'Revoke Super Administrator'
                                                    : 'Grant Super Administrator'
                                            }
                                            className={`p-1.5 rounded-lg border transition ${
                                                u.id === currentUser.id
                                                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed opacity-60'
                                                    : u.isSuperAdmin
                                                    ? 'border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-red-500 hover:border-red-500/40'
                                            }`}
                                        >
                                            <Shield className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    {/* Delete Button (cannot delete self) */}
                                    {u.id !== currentUser.id && (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteUser(u)}
                                            title="Delete User Account"
                                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:border-red-500/50 hover:text-red-500 transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        },
                    },
                ]}
                data={users}
                loading={loading}
                showSearch={false}
                searchSlot={
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between w-full">
                        {/* Unified Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, license ID, phone, city..."
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
                                {(
                                    [
                                        { id: 'ALL', label: 'All Users' },
                                        { id: 'SUPER_ADMIN', label: 'Super Admins' },
                                        { id: 'FEDERATION', label: 'Federation' },
                                        { id: 'CLUB', label: 'Club Admins' },
                                        { id: 'ATHLETE', label: 'Athletes' },
                                        { id: 'COACH', label: 'Coaches' },
                                        { id: 'REFEREE', label: 'Referees' },
                                        { id: 'UNVERIFIED', label: 'Unverified' },
                                    ] as const
                                ).map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedRole(tab.id);
                                            setPage(1);
                                        }}
                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                                            selectedRole === tab.id
                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {assocId ? (
                                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                    <Building2 className="h-3 w-3 text-red-500" />
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
                totalCount={total}
                totalUnfilteredCount={stats.totalUsers}
                pageCount={totalPages}
                pageIndex={page - 1}
                pageSize={pageSize}
                pageSizeOptions={[15, 25, 50, 100]}
                onPaginationChange={(nextPageIndex, nextPageSize) => {
                    setPage(nextPageIndex + 1);
                    setPageSize(nextPageSize);
                }}
                emptyMessage="No registered users match your search criteria."
            />
        </>
    )}

            {/* ========================================================================= */}
            {/* View: Possible Duplicate Accounts Scanner */}
            {/* ========================================================================= */}
            {activeTab === 'duplicates' && (
                <div className="space-y-6">
                    {/* Duplicate Scanner Header Card */}
                    <div className="p-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <span>{t('duplicates.title') || 'Possible Duplicate Accounts'}</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                                    {t('duplicates.subtitle') ||
                                        'Detect, review, and merge potential duplicate athlete and official accounts across the system.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={loadDuplicates}
                                disabled={scanningDuplicates}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50 transition shrink-0"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${scanningDuplicates ? 'animate-spin' : ''}`} />
                                <span>
                                    {scanningDuplicates
                                        ? t('duplicates.scanning') || 'Scanning Database...'
                                        : t('duplicates.scanButton') || 'Scan for Duplicates'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Results or Empty State */}
                    {scanningDuplicates ? (
                        <div className="p-12 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 text-center space-y-3">
                            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('duplicates.scanning') || 'Analyzing user database and computing similarity scores...'}
                            </p>
                        </div>
                    ) : hasScannedDuplicates && duplicateClusters.length === 0 ? (
                        <div className="p-12 rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                {t('duplicates.noDuplicatesFound') || 'No duplicate user accounts detected across the system.'}
                            </h4>
                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70 max-w-md mx-auto">
                                All athlete profiles, dates of birth, and licensing records are unique.
                            </p>
                        </div>
                    ) : !hasScannedDuplicates ? (
                        <div className="p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-center space-y-3">
                            <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {t('duplicates.scanButton') || 'Scan for Duplicates'}
                            </h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Click the scan button to run fuzzy matching across all users based on first name, last name, and date of birth.
                            </p>
                            <button
                                type="button"
                                onClick={loadDuplicates}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
                            >
                                <Search className="w-3.5 h-3.5" />
                                <span>{t('duplicates.scanButton') || 'Scan for Duplicates'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                                <span className="font-semibold">
                                    {t('duplicates.duplicatesFoundCount', { count: duplicateClusters.length }) ||
                                        `${duplicateClusters.length} potential duplicate clusters found.`}
                                </span>
                            </div>

                            {duplicateClusters.map((cluster) => {
                                const u1 = cluster.users[0];
                                const u2 = cluster.users[1];

                                return (
                                    <div
                                        key={cluster.clusterId}
                                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
                                    >
                                        {/* Cluster header */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                        cluster.confidence === 'HIGH'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                                                    }`}
                                                >
                                                    {cluster.similarity}% {t('duplicates.similarityMatch') || 'Match'} (
                                                    {cluster.confidence === 'HIGH'
                                                        ? t('duplicates.highConfidence') || 'High Confidence'
                                                        : t('duplicates.mediumConfidence') || 'Medium Confidence'}
                                                    )
                                                </span>

                                                {cluster.reasons?.map((r: any, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                    >
                                                        {r.description}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenMerge(cluster)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <span>{t('duplicates.confirmMerge') || 'Merge Accounts'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Side by side comparison */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[u1, u2].map((u, idx) => {
                                                if (!u) return null;
                                                const clubName =
                                                    u.licenses?.[0]?.club?.name ||
                                                    u.clubRoles?.[0]?.club?.name ||
                                                    '—';

                                                return (
                                                    <div
                                                        key={u.id || idx}
                                                        className={`p-4 rounded-xl border ${
                                                            idx === 0
                                                                ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10'
                                                                : 'border-purple-200 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/10'
                                                        } space-y-3`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                    {idx === 0 ? 'Candidate Profile A' : 'Candidate Profile B'}
                                                                </span>
                                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                                                    {u.firstName} {u.lastName}
                                                                </h4>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                {u.canLogin ? (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                                        {t('duplicates.activeAccount') || 'Active Account'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                                        {t('duplicates.unclaimedProfile') || 'Unclaimed'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block">{t('common.email') || 'Email'}</span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                                                    {u.email || '—'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block">{t('profile.birthDate') || 'DOB'}</span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                    {u.birthDate ? new Date(u.birthDate).toLocaleDateString() : '—'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block">{t('clubs.club') || 'Club'}</span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                                                    {clubName}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 block">{t('profile.licenseNumber') || 'License'} / ELO</span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                    {u.licenseId || '—'} ({u.eloPoints || 1000})
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                                            <Link
                                                                href={`/profile/${u.id}`}
                                                                target="_blank"
                                                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                                            >
                                                                <span>View Profile</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteUser(u)}
                                                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                                                            >
                                                                {t('duplicates.deleteDuplicate') || 'Delete'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* Modal: Reset User Password */}
            {/* ========================================================================= */}
            <Modal
                isOpen={Boolean(resetPasswordUser)}
                onClose={() => setResetPasswordUser(null)}
                title={resetPasswordUser ? `Reset Password: ${resetPasswordUser.firstName} ${resetPasswordUser.lastName}` : ''}
                subtitle="Issue temporary login credentials or set manual password"
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
                                onClick={() => setResetPasswordUser(null)}
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
                                onClick={() => setResetPasswordUser(null)}
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
                isOpen={Boolean(deleteUser)}
                onClose={() => setDeleteUser(null)}
                title="Delete User Account"
                subtitle="Permanent and irreversible account deletion"
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                size="sm"
            >
                <div className="space-y-4 text-xs">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Are you sure you want to permanently delete{' '}
                        <strong className="text-slate-900 dark:text-white">
                            {deleteUser?.firstName} {deleteUser?.lastName}
                        </strong>{' '}
                        (<span className="font-mono">{deleteUser?.email}</span>)? All associated club and federation roles will be revoked.
                    </p>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setDeleteUser(null)}
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

            {/* ========================================================================= */}
            {/* Modal: Merge Accounts Confirmation */}
            {/* ========================================================================= */}
            <Modal
                isOpen={Boolean(mergeCluster)}
                onClose={() => setMergeCluster(null)}
                title={t('duplicates.mergeModalTitle') || 'Merge User Accounts'}
                subtitle={
                    t('duplicates.mergeModalSubtitle') ||
                    'Consolidate licenses, memberships, and records into one unified account.'
                }
                icon={<Sparkles className="w-5 h-5 text-red-500" />}
                size="lg"
            >
                {mergeCluster && mergeCluster.users && mergeCluster.users.length >= 2 && (
                    <div className="space-y-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>{t('duplicates.mergeWarning') || 'Important Notice'}</span>
                            </p>
                            <p className="text-[11px] leading-relaxed opacity-90">
                                {t('duplicates.mergeWarning') ||
                                    'All tournament registrations, licenses, club affiliations, and match history from the duplicate account will be migrated to the primary account. The duplicate account will then be permanently deleted.'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="font-bold text-slate-800 dark:text-slate-200 block">
                                {t('duplicates.selectPrimary') || 'Select which account to keep as the primary profile:'}
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {mergeCluster.users.map((u: any) => {
                                    const isSelected = primaryUserId === u.id;
                                    const clubName =
                                        u.licenses?.[0]?.club?.name ||
                                        u.clubRoles?.[0]?.club?.name ||
                                        '—';

                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                setPrimaryUserId(u.id);
                                                const other = mergeCluster.users.find((o: any) => o.id !== u.id);
                                                if (other) setDuplicateUserId(other.id);
                                            }}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition ${
                                                isSelected
                                                    ? 'border-red-600 bg-red-500/5 dark:bg-red-950/30 shadow-xs ring-2 ring-red-600/30'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {u.firstName} {u.lastName}
                                                </span>
                                                <input
                                                    type="radio"
                                                    name="primaryUserSelection"
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    className="text-red-600 focus:ring-red-500"
                                                />
                                            </div>
                                            <div className="mt-1 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                <p>
                                                    Email:{' '}
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {u.email || 'None'}
                                                    </span>
                                                </p>
                                                <p>
                                                    DOB:{' '}
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {u.birthDate
                                                            ? new Date(u.birthDate).toLocaleDateString()
                                                            : '—'}
                                                    </span>
                                                </p>
                                                <p>
                                                    Club:{' '}
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {clubName}
                                                    </span>
                                                </p>
                                                <p>
                                                    Status:{' '}
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {u.canLogin ? 'Active Login' : 'Unclaimed Profile'}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="mt-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        isSelected
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                    }`}
                                                >
                                                    {isSelected
                                                        ? t('duplicates.primaryAccount') || 'Primary (Keep)'
                                                        : t('duplicates.duplicateAccount') || 'Duplicate (Delete)'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={keepDuplicateEmail}
                                    onChange={(e) => setKeepDuplicateEmail(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                />
                                <span>
                                    {t('duplicates.keepDuplicateEmail') ||
                                        'Transfer email address to primary profile if primary has none'}
                                </span>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setMergeCluster(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                type="button"
                                disabled={merging || !primaryUserId || !duplicateUserId}
                                onClick={handleExecuteMerge}
                                className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition shadow"
                            >
                                {merging
                                    ? t('duplicates.merging') || 'Merging...'
                                    : t('duplicates.confirmMerge') || 'Confirm & Merge Accounts'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
