'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import { Modal } from '@/components/ui/Modal';
import {
    Activity,
    Shield,
    Search,
    Download,
    Filter,
    Calendar,
    Globe,
    Laptop,
    Smartphone,
    User,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Eye,
    RefreshCw,
    X,
    FileText,
    Copy,
    Check,
    Layers,
    DollarSign,
    Mail,
    Award,
    Trophy,
    Building2,
    Code2,
    Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { AccessDenied } from '@/components/auth/AccessDenied';

interface AuditTrailViewerProps {
    associationId?: string;
    clubId?: string;
    category?: string;
    title?: string;
    subtitle?: string;
    isSubAssociation?: boolean;
    compact?: boolean;
}

export function AuditTrailViewer({
    associationId,
    clubId,
    category: initialCategory,
    title,
    subtitle,
    isSubAssociation = false,
    compact = false,
}: AuditTrailViewerProps) {
    const { t } = useI18n();
    const { user } = useAuth();

    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [exporting, setExporting] = useState(false);

    // Inspection Modal
    const [inspectLog, setInspectLog] = useState<any | null>(null);
    const [copiedId, setCopiedId] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Stats
    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const params: Record<string, string> = {};
            if (associationId) params.associationId = associationId;
            if (clubId) params.clubId = clubId;
            const data = await api.getAuditStats(params);
            setStats(data);
        } catch (err) {
            console.error('Failed to load audit stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    // Fetch Logs
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = {
                page,
                limit: compact ? 20 : 50,
            };
            if (associationId) params.associationId = associationId;
            if (clubId) params.clubId = clubId;
            if (selectedCategory && selectedCategory !== 'ALL') params.category = selectedCategory;
            if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;
            if (debouncedSearch) params.search = debouncedSearch;

            const res = await api.getAuditLogs(params);
            setLogs(res.data || []);
            setTotalPages(res.pagination?.totalPages || 1);
            setTotalCount(res.pagination?.total || 0);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [associationId, clubId, selectedCategory, selectedStatus, debouncedSearch, page]);

    useEffect(() => {
        fetchStats();
    }, [associationId, clubId]);

    const handleExport = async (formatType: 'csv' | 'json') => {
        try {
            setExporting(true);
            const params: Record<string, string> = {};
            if (associationId) params.associationId = associationId;
            if (clubId) params.clubId = clubId;
            if (selectedCategory && selectedCategory !== 'ALL') params.category = selectedCategory;
            if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;
            if (debouncedSearch) params.search = debouncedSearch;
            await api.exportAuditLogs(params, formatType);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    // Role check
    const isAuthorized =
        user?.isSuperAdmin ||
        (user?.associationRoles && user.associationRoles.length > 0) ||
        (clubId && user?.clubRoles?.some((r) => r.clubId === clubId));

    if (!user || !isAuthorized) {
        return (
            <AccessDenied
                title="Audit Trail Restricted"
                description="Administrative authority is required to inspect federation activity logs, user agent records, and forensic audit trails."
                requiredRole="Association Administrator"
                returnHref="/"
            />
        );
    }

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'AUTH':
                return { label: 'Auth & Login', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
            case 'GOVERNANCE':
                return { label: 'Governance', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
            case 'FINANCE':
                return { label: 'Finance & Invoicing', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
            case 'COMMUNICATION':
                return { label: 'Communications', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
            case 'LICENSING':
                return { label: 'Licensing', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
            case 'TOURNAMENT':
                return { label: 'Tournament', color: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800' };
            case 'CLUB':
                return { label: 'Club Portal', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
            case 'DEVELOPER':
                return { label: 'Developer / API', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
            case 'SECURITY':
                return { label: 'Security Alert', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold' };
            default:
                return { label: category, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
        }
    };

    const parseDevice = (userAgent: string) => {
        if (!userAgent) return { type: 'Unknown', isMobile: false };
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return { type: 'Mobile Phone', isMobile: true };
        }
        if (ua.includes('ipad') || ua.includes('tablet')) {
            return { type: 'Tablet', isMobile: true };
        }
        return { type: 'Desktop PC', isMobile: false };
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Activity className="h-6 w-6 text-red-600 animate-pulse" />
                        <span>{title || t('audit.title')}</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {subtitle || t('audit.subtitle')}
                    </p>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => {
                            fetchLogs();
                            fetchStats();
                        }}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <Download className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{t('audit.exportCsv')}</span>
                    </button>

                    <button
                        onClick={() => handleExport('json')}
                        disabled={exporting}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span>{t('audit.exportJson')}</span>
                    </button>
                </div>
            </div>

            {/* KPI Metric Summary Cards */}
            {!compact && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.totalEvents')}</span>
                            <Activity className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {statsLoading ? '...' : (stats?.totalLogs || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Total recorded audit trail</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.todayEvents')}</span>
                            <Calendar className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {statsLoading ? '...' : (stats?.todayLogs || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Recorded since midnight</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.securityEvents')}</span>
                            <Shield className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {statsLoading
                                ? '...'
                                : (
                                      (stats?.categoryBreakdown?.['AUTH'] || 0) +
                                      (stats?.categoryBreakdown?.['SECURITY'] || 0)
                                  ).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Logins, passwords & auth</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.financialEvents')}</span>
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {statsLoading
                                ? '...'
                                : (stats?.categoryBreakdown?.['FINANCE'] || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Bills, Bexio & payments</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.commEvents')}</span>
                            <Mail className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
                            {statsLoading
                                ? '...'
                                : (stats?.categoryBreakdown?.['COMMUNICATION'] || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Dispatched circulars</div>
                    </div>
                </div>
            )}

            {/* Filter and Search Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('audit.searchPlaceholder')}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Category Selector */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                        >
                            <option value="ALL">{t('audit.filterCategory')}</option>
                            <option value="AUTH">Auth & Logins</option>
                            <option value="GOVERNANCE">Governance & Settings</option>
                            <option value="FINANCE">Finances & Bexio</option>
                            <option value="COMMUNICATION">Communications & Emails</option>
                            <option value="LICENSING">Licensing & Approvals</option>
                            <option value="TOURNAMENT">Tournaments & Scoring</option>
                            <option value="CLUB">Club Management</option>
                            <option value="SECURITY">Security Alerts</option>
                        </select>

                        {/* Status Pills */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {['ALL', 'SUCCESS', 'FAILURE', 'WARNING'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => {
                                        setSelectedStatus(st);
                                        setPage(1);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                        selectedStatus === st
                                            ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                                >
                                    {st === 'ALL' ? 'All' : st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3">{t('audit.timestamp')}</th>
                                <th className="px-4 py-3">{t('audit.actor')}</th>
                                <th className="px-4 py-3">{t('audit.category')}</th>
                                <th className="px-4 py-3">{t('audit.action')}</th>
                                <th className="px-4 py-3">{t('audit.description')}</th>
                                <th className="px-4 py-3">{t('audit.clientIp')}</th>
                                <th className="px-4 py-3">{t('audit.status')}</th>
                                <th className="px-4 py-3 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-red-500" />
                                        <span>Loading audit events...</span>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                                        <div className="font-semibold text-slate-600 dark:text-slate-300">
                                            {t('audit.emptyLogs')}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const catBadge = getCategoryBadge(log.category);
                                    const device = parseDevice(log.userAgent);

                                    return (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                                            onClick={() => setInspectLog(log)}
                                        >
                                            {/* Timestamp */}
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                                {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                                            </td>

                                            {/* Operator Identity */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-800 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                                                        {log.userName ? log.userName[0] : (log.userEmail?.[0] || 'U').toUpperCase()}
                                                    </div>
                                                    <div className="max-w-[150px] truncate">
                                                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                            {log.userName || log.userEmail}
                                                        </div>
                                                        {log.userName && (
                                                            <div className="text-[10px] text-slate-400 truncate">
                                                                {log.userEmail}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span
                                                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-tight ${catBadge.color}`}
                                                >
                                                    {catBadge.label}
                                                </span>
                                            </td>

                                            {/* Action Code */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {log.action}
                                                </span>
                                            </td>

                                            {/* Description */}
                                            <td className="px-4 py-3 max-w-xs xl:max-w-md">
                                                <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                                                    {log.description}
                                                </div>
                                            </td>

                                            {/* IP Address & User Agent */}
                                            <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                    <Globe className="h-3 w-3 text-slate-400" />
                                                    <span className="font-mono">{log.ipAddress}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                                    {device.isMobile ? (
                                                        <Smartphone className="h-2.5 w-2.5" />
                                                    ) : (
                                                        <Laptop className="h-2.5 w-2.5" />
                                                    )}
                                                    <span>{device.type}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {log.status === 'SUCCESS' ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span>OK</span>
                                                    </span>
                                                ) : log.status === 'FAILURE' ? (
                                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[11px]">
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        <span>FAIL</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        <span>WARN</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Details Button */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setInspectLog(log);
                                                    }}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                                                    title="Inspect Forensic Metadata"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <div>
                            Showing page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{' '}
                            <span className="font-bold">{totalPages}</span> ({totalCount} entries)
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Forensic Metadata Inspection Modal */}
            <Modal
                isOpen={Boolean(inspectLog)}
                onClose={() => setInspectLog(null)}
                title={t('audit.inspectModalTitle')}
                subtitle={inspectLog ? `${inspectLog.category} • ${inspectLog.action}` : undefined}
                icon={<Activity className="h-5 w-5 text-red-500" />}
                size="xl"
            >
                {inspectLog && (
                    <div className="space-y-5 text-xs">
                        {/* Event Overview Card */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                                <span className="text-slate-500 font-mono">Event ID:</span>
                                <button
                                    onClick={() => copyToClipboard(inspectLog.id)}
                                    className="flex items-center gap-1 font-mono text-[11px] text-red-600 dark:text-red-400 hover:underline"
                                >
                                    <span>{inspectLog.id}</span>
                                    {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                            </div>

                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                {inspectLog.description}
                            </div>
                        </div>

                        {/* Two Columns: Operator Identity & Client Fingerprint */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {/* Operator Identity */}
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2 bg-white dark:bg-slate-900">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                                    <User className="h-3.5 w-3.5 text-red-500" />
                                    <span>{t('audit.operatorIdentity')}</span>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">Name / Account:</div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                        {inspectLog.userName || 'Unknown'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">Email Address:</div>
                                    <div className="font-mono text-slate-800 dark:text-slate-200">
                                        {inspectLog.userEmail}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">User ID:</div>
                                    <div className="font-mono text-[11px] text-slate-500">
                                        {inspectLog.userId || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* Client & Network */}
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2 bg-white dark:bg-slate-900">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                                    <span>{t('audit.networkClient')}</span>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">IP Address:</div>
                                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                        {inspectLog.ipAddress}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">Device Type:</div>
                                    <div className="text-slate-800 dark:text-slate-200">
                                        {parseDevice(inspectLog.userAgent).type}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">User-Agent:</div>
                                    <div className="font-mono text-[10px] text-slate-500 break-all line-clamp-2" title={inspectLog.userAgent}>
                                        {inspectLog.userAgent}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metadata Payload JSON Viewer */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {t('audit.metadataDiff')}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(JSON.stringify(inspectLog.metadata, null, 2))}
                                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                >
                                    <Copy className="h-3 w-3" />
                                    <span>Copy JSON</span>
                                </button>
                            </div>
                            <pre className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 scrollbar-thin">
                                {JSON.stringify(inspectLog.metadata, null, 2)}
                            </pre>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setInspectLog(null)}
                                className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow hover:bg-slate-800 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
