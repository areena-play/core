'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { normalizePhoneNumber, formatPhoneNumber } from '@areena/shared';
import { PhoneInput } from '@/components/ui/PhoneInput';
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
    Plus,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ColumnDef } from '@tanstack/react-table';
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

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<'ALL' | 'SUPER_ADMIN' | 'FEDERATION' | 'CLUB' | 'ATHLETE' | 'UNVERIFIED'>('ALL');

    // Modals
    const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserItem | null>(null);
    const [customPassword, setCustomPassword] = useState('');
    const [autoGeneratePass, setAutoGeneratePass] = useState(true);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetResult, setResetResult] = useState<{ message: string; temporaryPassword?: string } | null>(null);
    const [copiedPass, setCopiedPass] = useState(false);

    const [deleteUser, setDeleteUser] = useState<AdminUserItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load users
    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await api.getAdminUsers({
                q: searchQuery,
                role: selectedRole,
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
        if (currentUser?.isSuperAdmin) {
            loadUsers();
        }
    }, [currentUser, page, pageSize, selectedRole]);

    // Handle search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentUser?.isSuperAdmin) {
                setPage(1);
                loadUsers();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Check superadmin permissions
    if (!currentUser || !currentUser.isSuperAdmin) {
        return (
            <AccessDenied
                title="Super Administrator Access Required"
                description="The global User Management portal is restricted to platform Super Administrators. Please sign in with a Super Admin account to inspect, edit, or manage platform users."
                requiredRole="Super Administrator"
            />
        );
    }

    // Modal Handlers
    const openEditModal = (target: AdminUserItem) => {
        setEditingUser(target);
        setEditFormData({
            firstName: target.firstName,
            lastName: target.lastName,
            email: target.email,
            phone: target.phone,
            street: target.street,
            postalCode: target.postalCode,
            city: target.city,
            country: target.country,
            birthDate: target.birthDate ? target.birthDate.split('T')[0] : '',
            gender: target.gender || '',
            isSuperAdmin: target.isSuperAdmin,
            emailVerified: target.emailVerified,
            eloPoints: target.eloPoints,
            licenseId: target.licenseId || '',
        });
        setEditError('');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setEditLoading(true);
        setEditError('');

        try {
            const normalizedPhone = editFormData.phone ? normalizePhoneNumber(editFormData.phone) : editFormData.phone;
            const payload = {
                ...editFormData,
                phone: normalizedPhone || editFormData.phone,
                birthDate: editFormData.birthDate ? editFormData.birthDate : null,
                gender: editFormData.gender ? editFormData.gender : null,
                licenseId: editFormData.licenseId ? editFormData.licenseId : null,
            };
            await api.updateAdminUser(editingUser.id, payload);
            setActionBanner({
                type: 'success',
                text: `User ${editFormData.firstName} ${editFormData.lastName} updated successfully.`,
            });
            setEditingUser(null);
            loadUsers();
        } catch (err: any) {
            setEditError(err.message || 'Failed to update user profile.');
        } finally {
            setEditLoading(false);
        }
    };

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
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">
                                    Super Admin
                                </span>
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
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
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
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-rose-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                        {initials}
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
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
                                </div>
                            );
                        },
                    },
                    {
                        id: 'roles',
                        header: () => <span>Platform Roles & Licenses</span>,
                        cell: ({ row }) => {
                            const u = row.original;
                            return (
                                <div className="flex flex-wrap gap-1">
                                    {u.isSuperAdmin && (
                                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                                            Super Admin
                                        </span>
                                    )}

                                    {u.associationRoles?.map((ar) => (
                                        <span
                                            key={ar.id}
                                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1"
                                        >
                                            <Building2 className="w-2.5 h-2.5" />
                                            {ar.association?.shortName}: {ar.role}
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
                                <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
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
                                <div className="space-y-0.5">
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
                                    {/* Edit Button */}
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(u)}
                                        title="Edit User Profile & Email"
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-blue-500/50 hover:text-blue-500 transition"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>

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
                searchPlaceholder="Search by name, email, license ID, phone, city..."
                searchSlot={
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                        {(
                            [
                                { id: 'ALL', label: 'All Users' },
                                { id: 'SUPER_ADMIN', label: 'Super Admins' },
                                { id: 'FEDERATION', label: 'Federation' },
                                { id: 'CLUB', label: 'Club Admins' },
                                { id: 'ATHLETE', label: 'Athletes' },
                                { id: 'UNVERIFIED', label: 'Unverified' },
                            ] as const
                        ).map((filter) => (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => {
                                    setSelectedRole(filter.id);
                                    setPage(1);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                    selectedRole === filter.id
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                }
                manualPagination={true}
                totalCount={total}
                pageCount={totalPages}
                pageIndex={page - 1}
                pageSize={pageSize}
                pageSizeOptions={[15, 30, 50, 100]}
                onPaginationChange={(nextPageIndex, nextPageSize) => {
                    setPage(nextPageIndex + 1);
                    setPageSize(nextPageSize);
                }}
                emptyMessage="No registered users match your search criteria."
            />

            {/* ========================================================================= */}
            {/* Modal: Edit User Profile */}
            {/* ========================================================================= */}
            <Modal
                isOpen={Boolean(editingUser)}
                onClose={() => setEditingUser(null)}
                title={editingUser ? `Edit User Profile: ${editingUser.firstName} ${editingUser.lastName}` : ''}
                subtitle="Modify personal account details, address, and contact information"
                icon={<Edit3 className="w-5 h-5 text-blue-500" />}
                size="lg"
            >
                {editError && (
                    <div className="p-3 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 text-xs">
                        {editError}
                    </div>
                )}

                <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">First Name</label>
                            <input
                                type="text"
                                required
                                value={editFormData.firstName || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Last Name</label>
                            <input
                                type="text"
                                required
                                value={editFormData.lastName || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                        <input
                            type="email"
                            required
                            value={editFormData.email || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
                            <PhoneInput
                                value={editFormData.phone || ''}
                                onChange={(val) => setEditFormData({ ...editFormData, phone: val })}
                            />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">License ID</label>
                            <input
                                type="text"
                                value={editFormData.licenseId || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, licenseId: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Birth Date</label>
                            <input
                                type="date"
                                value={editFormData.birthDate || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Gender</label>
                            <select
                                value={editFormData.gender || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            >
                                <option value="">Not Specified</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Street & Number</label>
                            <input
                                type="text"
                                value={editFormData.street || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Postal Code</label>
                            <input
                                type="text"
                                value={editFormData.postalCode || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, postalCode: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">City</label>
                            <input
                                type="text"
                                value={editFormData.city || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Country</label>
                            <input
                                type="text"
                                value={editFormData.country || 'Switzerland'}
                                onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">ELO Points</label>
                            <input
                                type="number"
                                value={editFormData.eloPoints || 1000}
                                onChange={(e) => setEditFormData({ ...editFormData, eloPoints: parseInt(e.target.value, 10) || 1000 })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Email Verification Status</label>
                            <select
                                value={editFormData.emailVerified ? 'true' : 'false'}
                                onChange={(e) => setEditFormData({ ...editFormData, emailVerified: e.target.value === 'true' })}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            >
                                <option value="true">Verified</option>
                                <option value="false">Pending Verification</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editLoading}
                            className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition shadow"
                        >
                            {editLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>

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
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter new password (min. 8 chars)"
                                    value={customPassword}
                                    onChange={(e) => setCustomPassword(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none font-mono"
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
        </div>
    );
}
