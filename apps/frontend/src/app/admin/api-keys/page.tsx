'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { api } from '@/lib/api';
import {
    Key,
    ShieldAlert,
    CheckCircle2,
    AlertCircle,
    Copy,
    ChevronLeft,
    Search,
    ShieldCheck,
    Lock,
    Trash2,
    RefreshCw,
    Sliders,
    Eye,
    User,
    Calendar,
    FileText,
    ExternalLink,
    Clock,
    XCircle,
    Check,
    Gauge,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Modal } from '@/components/ui/Modal';

const AVAILABLE_SCOPES = [
    {
        scope: 'read:public',
        label: 'read:public',
        description: 'Read basic public federation metadata and hierarchy',
        isDefault: true,
    },
    {
        scope: 'read:calendar',
        label: 'read:calendar',
        description: 'Read public event feeds and schedule calendars',
        isDefault: true,
    },
    {
        scope: 'read:competitions',
        label: 'read:competitions',
        description: 'Read leagues, categories, rankings, and match results',
        isDefault: true,
    },
    {
        scope: 'read:members_full',
        label: 'read:members_full',
        description: 'Enhanced access to member directory, contact details, and license records',
        isElevated: true,
    },
    {
        scope: 'write:scores',
        label: 'write:scores',
        description: 'Submit live match scores and set outcomes from partner systems',
        isElevated: true,
    },
];

export default function AdminApiKeysPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REVOKED'>('ALL');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Review & Approval Modal State
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [modalScopes, setModalScopes] = useState<string[]>([]);
    const [modalRateLimitEnabled, setModalRateLimitEnabled] = useState(false);
    const [modalCapacity, setModalCapacity] = useState(120);
    const [modalRefillRate, setModalRefillRate] = useState(2.0);
    const [processing, setProcessing] = useState(false);
    const [actionSuccess, setActionSuccess] = useState('');
    const [actionError, setActionError] = useState('');

    const fetchClients = async () => {
        try {
            const data = await api.getOAuthClients({ all: true });
            setClients(data);
        } catch (err) {
            console.error('Failed to load OAuth clients:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.isSuperAdmin) {
            fetchClients();
        }
    }, [user]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleOpenReview = (client: any) => {
        setSelectedClient(client);
        setModalScopes(client.allowedScopes || ['read:public']);
        setModalRateLimitEnabled(client.customRateLimitEnabled ?? false);
        setModalCapacity(client.rateLimitCapacity ?? 120);
        setModalRefillRate(client.rateLimitRefillRate ?? 2.0);
        setActionSuccess('');
        setActionError('');
    };

    const handleApprove = async (client: any, scopesToGrant?: string[]) => {
        setProcessing(true);
        setActionError('');
        try {
            await api.approveOAuthClient(client.id, {
                status: 'APPROVED',
                approvedScopes: scopesToGrant || modalScopes,
                customRateLimitEnabled: modalRateLimitEnabled,
                rateLimitCapacity: Number(modalCapacity),
                rateLimitRefillRate: Number(modalRefillRate),
            });
            await fetchClients();
            setActionSuccess(`Client application "${client.name}" approved successfully!`);
            if (selectedClient?.id === client.id) {
                setSelectedClient(null);
            }
        } catch (err: any) {
            setActionError(err.message || 'Failed to approve OAuth client');
        } finally {
            setProcessing(false);
        }
    };

    const handleRevoke = async (client: any) => {
        const confirmRevoke = window.confirm(
            `Are you sure you want to revoke API access for "${client.name}"? Active bearer tokens for this client will be immediately invalidated.`
        );
        if (!confirmRevoke) return;

        setProcessing(true);
        setActionError('');
        try {
            await api.revokeOAuthClient(client.id);
            await fetchClients();
            setActionSuccess(`Client "${client.name}" has been revoked.`);
            if (selectedClient?.id === client.id) {
                setSelectedClient(null);
            }
        } catch (err: any) {
            setActionError(err.message || 'Failed to revoke OAuth client');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (client: any) => {
        const confirmDelete = window.confirm(
            `Are you sure you want to permanently delete "${client.name}" (${client.clientId})? This action cannot be undone.`
        );
        if (!confirmDelete) return;

        setProcessing(true);
        setActionError('');
        try {
            await api.deleteOAuthClient(client.id);
            await fetchClients();
            setActionSuccess(`Client "${client.name}" deleted.`);
            if (selectedClient?.id === client.id) {
                setSelectedClient(null);
            }
        } catch (err: any) {
            setActionError(err.message || 'Failed to delete OAuth client');
        } finally {
            setProcessing(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (!user || !user.isSuperAdmin) {
        return (
            <AccessDenied
                title="Super Admin Access Restricted"
                description="OAuth Client application and API Key management is restricted to Super Administrators."
                requiredRole="Super Administrator"
                returnHref="/"
            />
        );
    }

    const pendingCount = clients.filter((c) => c.status === 'PENDING_APPROVAL').length;
    const approvedCount = clients.filter((c) => c.status === 'APPROVED').length;
    const revokedCount = clients.filter((c) => c.status === 'REVOKED').length;

    const filteredClients = clients.filter((c) => {
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchName = c.name?.toLowerCase().includes(q);
            const matchId = c.clientId?.toLowerCase().includes(q);
            const matchOwner = `${c.owner?.firstName || ''} ${c.owner?.lastName || ''} ${c.owner?.email || ''}`
                .toLowerCase()
                .includes(q);
            const matchReason = c.requestReason?.toLowerCase().includes(q);
            return matchName || matchId || matchOwner || matchReason;
        }
        return true;
    });

    return (
        <div className="w-full space-y-6 pb-16">
            {/* Back Link */}
            <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Admin Dashboard</span>
            </Link>

            {/* Header Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider border border-red-500/20">
                    <Key className="h-3.5 w-3.5" />
                    <span>OAuth 2.0 API Key Governance</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span>OAuth API Keys & Approvals</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Review partner developer justifications, approve or adjust granted API scopes, and manage active client tokens.
                        </p>
                    </div>

                    <Link
                        href="/developers"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition shrink-0"
                    >
                        <ExternalLink className="h-4 w-4 text-red-500" />
                        <span>Developers Portal & Sandbox</span>
                    </Link>
                </div>
            </div>

            {/* Stats Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Registered Apps</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{clients.length}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('PENDING_APPROVAL')}
                    className={`cursor-pointer rounded-2xl border p-4 shadow-sm space-y-1 transition ${
                        statusFilter === 'PENDING_APPROVAL'
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Pending Review</span>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`cursor-pointer rounded-2xl border p-4 shadow-sm space-y-1 transition ${
                        statusFilter === 'APPROVED'
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Approved & Active</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('REVOKED')}
                    className={`cursor-pointer rounded-2xl border p-4 shadow-sm space-y-1 transition ${
                        statusFilter === 'REVOKED'
                            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/40'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">Revoked / Suspended</span>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">{revokedCount}</div>
                </div>
            </div>

            {/* Notification Messages */}
            {actionSuccess && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{actionSuccess}</span>
                </div>
            )}
            {actionError && (
                <div className="flex items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-950/60 p-4 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{actionError}</span>
                </div>
            )}

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by app name, client ID, developer name, email, or reason..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                    {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REVOKED'] as const).map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`rounded-lg px-3 py-1.5 transition ${
                                statusFilter === st
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                                    : 'hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {st === 'ALL'
                                ? 'All Applications'
                                : st === 'PENDING_APPROVAL'
                                ? `Pending (${pendingCount})`
                                : st === 'APPROVED'
                                ? 'Approved'
                                : 'Revoked'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Clients List */}
            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-12 text-center">
                    <Key className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">No client applications found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {searchQuery ? 'Try adjusting your search query or status filter.' : 'Developers can register client apps via the /developers portal.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredClients.map((client) => {
                        const isPending = client.status === 'PENDING_APPROVAL';
                        const isApproved = client.status === 'APPROVED';
                        const isRevoked = client.status === 'REVOKED';

                        return (
                            <div
                                key={client.id}
                                className={`rounded-3xl border bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition space-y-4 ${
                                    isPending
                                        ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/10'
                                        : isApproved
                                        ? 'border-slate-200 dark:border-slate-800'
                                        : 'border-slate-200 dark:border-slate-800 opacity-75'
                                }`}
                            >
                                {/* Row Top: Title, Developer Info, Status & Actions */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                                {client.name}
                                            </h3>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                                    isApproved
                                                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                                        : isPending
                                                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800 animate-pulse'
                                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                {client.status.replace('_', ' ')}
                                            </span>

                                            {client.customRateLimitEnabled ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 px-2.5 py-0.5 text-[10px] font-bold">
                                                    <Gauge className="h-3 w-3" />
                                                    Custom Quota: {client.rateLimitCapacity || 120} cap • {client.rateLimitRefillRate || 2}/s
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-medium">
                                                    <Gauge className="h-3 w-3 text-slate-400" />
                                                    Rate Limit: Standard (Unlimited)
                                                </span>
                                            )}
                                        </div>

                                        {client.description && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {client.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleOpenReview(client)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                                        >
                                            <Sliders className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Review & Quotas</span>
                                        </button>

                                        {isPending && (
                                            <button
                                                onClick={() => handleApprove(client)}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow transition"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                <span>Quick Approve</span>
                                            </button>
                                        )}

                                        {isApproved && (
                                            <button
                                                onClick={() => handleRevoke(client)}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 transition"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                                <span>Revoke</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(client)}
                                            title="Delete application"
                                            className="rounded-xl p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Developer & Client ID Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800 space-y-1">
                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                            <User className="h-3.5 w-3.5" />
                                            <span>Developer / Owner</span>
                                        </div>
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            {client.owner ? `${client.owner.firstName} ${client.owner.lastName}` : 'System / Demo'}
                                        </div>
                                        <div className="text-slate-500 font-mono text-[11px] truncate">
                                            {client.owner?.email || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800 space-y-1">
                                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5">
                                                <Key className="h-3.5 w-3.5 text-red-500" />
                                                <span>Client ID</span>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(client.clientId, client.id)}
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                            >
                                                {copiedId === client.id ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="font-mono text-xs font-bold text-red-600 dark:text-red-400 break-all">
                                            {client.clientId}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            Created: {new Date(client.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2 lg:col-span-1 rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800 space-y-1">
                                        <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                            Granted API Scopes
                                        </div>
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {client.allowedScopes?.map((scope: string) => (
                                                <span
                                                    key={scope}
                                                    className="rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300"
                                                >
                                                    {scope}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Justification / Reason */}
                                {client.requestReason ? (
                                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 text-xs space-y-1">
                                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-bold text-[11px]">
                                            <FileText className="h-3.5 w-3.5" />
                                            <span>Developer Request Reason & Justification</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                            "{client.requestReason}"
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-[11px] text-slate-500 italic">
                                        No explicit justification provided (Legacy application)
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Scope Review & Approval Modal */}
            <Modal
                isOpen={Boolean(selectedClient)}
                onClose={() => setSelectedClient(null)}
                title={`Review Application: ${selectedClient?.name}`}
                subtitle={`Client ID: ${selectedClient?.clientId}`}
                icon={<Sliders className="h-5 w-5 text-red-500" />}
                size="lg"
            >
                {selectedClient && (
                    <div className="space-y-5 text-xs">
                        {/* Developer Summary */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                    <span className="text-slate-500">Developer:</span>
                                    <div className="font-bold text-slate-900 dark:text-white">
                                        {selectedClient.owner
                                            ? `${selectedClient.owner.firstName} ${selectedClient.owner.lastName}`
                                            : 'System'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-slate-500">Email:</span>
                                    <div className="font-bold text-slate-900 dark:text-white truncate">
                                        {selectedClient.owner?.email || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Request Justification */}
                        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                Justification for API Access
                            </span>
                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                {selectedClient.requestReason || 'No justification specified.'}
                            </p>
                        </div>

                        {/* Scope Checklist */}
                        <div className="space-y-3">
                            <label className="font-bold text-slate-900 dark:text-white block text-sm">
                                Configure Granted Scopes
                            </label>
                            <div className="space-y-2">
                                {AVAILABLE_SCOPES.map((s) => {
                                    const isChecked = modalScopes.includes(s.scope);

                                    return (
                                        <label
                                            key={s.scope}
                                            className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                                                isChecked
                                                    ? 'border-red-500/50 bg-red-50/20 dark:bg-red-950/20'
                                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setModalScopes([...modalScopes, s.scope]);
                                                    } else {
                                                        setModalScopes(modalScopes.filter((x) => x !== s.scope));
                                                    }
                                                }}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                            />
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                                        {s.label}
                                                    </span>
                                                    {s.isElevated && (
                                                        <span className="rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                                                            Elevated Partner Scope
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {s.description}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Rate Limiting & Traffic Quota Configuration */}
                        <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                                        <Gauge className="h-4 w-4 text-amber-500" />
                                        <span>Custom Rate Limit & Traffic Quota</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Enforce dedicated token-bucket rate limits specifically for this OAuth client application.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={modalRateLimitEnabled}
                                        onChange={(e) => setModalRateLimitEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                                </label>
                            </div>

                            {modalRateLimitEnabled ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                                    <div className="space-y-1">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                                            Burst Capacity (Tokens)
                                        </label>
                                        <input
                                            type="number"
                                            min={5}
                                            max={5000}
                                            value={modalCapacity}
                                            onChange={(e) => setModalCapacity(Number(e.target.value))}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            Max burst of requests allowed before throttling (Default: 120).
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                                            Refill Rate (Tokens / Second)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min={0.1}
                                            max={500}
                                            value={modalRefillRate}
                                            onChange={(e) => setModalRefillRate(Number(e.target.value))}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                        <p className="text-[10px] text-slate-400">
                                            Sustained throughput (e.g. 2.0 = 120 req/min, 10.0 = 600 req/min).
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-2 text-[11px] text-slate-500 italic">
                                    Custom throttling disabled. This client will bypass standard rate limiting.
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {selectedClient.status === 'APPROVED' ? (
                                <button
                                    type="button"
                                    onClick={() => handleRevoke(selectedClient)}
                                    disabled={processing}
                                    className="rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/50 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                                >
                                    Revoke Access
                                </button>
                            ) : (
                                <span />
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedClient(null)}
                                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleApprove(selectedClient, modalScopes)}
                                    disabled={processing || modalScopes.length === 0}
                                    className="rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {processing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    <span>Save Scopes & Approve</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

