'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

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
    const { user, loading: authLoading } = useAuth();

    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(compact ? 20 : 50);
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
            if (associationId && associationId.trim() !== '') params.associationId = associationId.trim();
            if (clubId && clubId.trim() !== '') params.clubId = clubId.trim();
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
                limit: pageSize,
            };
            if (associationId && associationId.trim() !== '') params.associationId = associationId.trim();
            if (clubId && clubId.trim() !== '') params.clubId = clubId.trim();
            if (selectedCategory && selectedCategory !== 'ALL') params.category = selectedCategory;
            if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;
            if (debouncedSearch && debouncedSearch.trim() !== '') params.search = debouncedSearch.trim();

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
    }, [associationId, clubId, selectedCategory, selectedStatus, debouncedSearch, page, pageSize]);

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

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'AUTH':
                return { label: 'Auth & Login', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
            case 'GOVERNANCE':
                return { label: 'Governance', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
            case 'FINANCE':
                return { label: 'Finances', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
            case 'COMMUNICATION':
                return { label: 'Communications', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
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

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'timestamp',
                accessorKey: 'createdAt',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('audit.timestamp')} />,
                cell: ({ row }) => (
                    <span className="whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {format(new Date(row.original.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                    </span>
                ),
            },
            {
                id: 'actor',
                accessorFn: (log) => `${log.userName || ''} ${log.userEmail || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('audit.actor')} />,
                cell: ({ row }) => {
                    const log = row.original;
                    return (
                        <div className="flex items-center gap-2 whitespace-nowrap">
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
                    );
                },
            },
            {
                id: 'category',
                accessorKey: 'category',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('audit.category')} />,
                cell: ({ row }) => {
                    const catBadge = getCategoryBadge(row.original.category);
                    return (
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-tight whitespace-nowrap ${catBadge.color}`}>
                            {catBadge.label}
                        </span>
                    );
                },
            },
            {
                id: 'action',
                accessorKey: 'action',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('audit.action')} />,
                cell: ({ row }) => (
                    <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {row.original.action}
                    </span>
                ),
            },
            {
                id: 'description',
                accessorKey: 'description',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('audit.description')} />,
                cell: ({ row }) => (
                    <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 max-w-xs xl:max-w-md">
                        {row.original.description}
                    </div>
                ),
            },
            {
                id: 'clientIp',
                accessorKey: 'ipAddress',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('audit.clientIp')} />,
                cell: ({ row }) => {
                    const log = row.original;
                    const device = parseDevice(log.userAgent);
                    return (
                        <div className="whitespace-nowrap text-[11px]">
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
                        </div>
                    );
                },
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: ({ column }) => <DataTableColumnHeader column={column} title={t('audit.status')} />,
                cell: ({ row }) => {
                    const log = row.original;
                    return log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>OK</span>
                        </span>
                    ) : log.status === 'FAILURE' ? (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[11px] whitespace-nowrap">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>FAIL</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px] whitespace-nowrap">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>WARN</span>
                        </span>
                    );
                },
            },
            {
                id: 'details',
                header: () => <div className="text-right">Details</div>,
                cell: ({ row }) => (
                    <div className="text-right whitespace-nowrap">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setInspectLog(row.original);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                            title="Inspect Forensic Metadata"
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                    </div>
                ),
            },
        ],
        [t]
    );

    if (authLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    const isAuthorized =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER'].includes(r.role)
        ) ||
        user?.clubRoles?.some((r: any) => ['ADMIN', 'PRESIDENT'].includes(r.role));

    if (!user || !isAuthorized) {
        return (
            <AccessDenied
                title="Audit Trail Restricted"
                description="Forensic security and change logs are strictly confidential and restricted to authorized federation and club administrators."
                requiredRole="Federation / Club Administrator"
                returnHref={
                    associationId
                        ? `/association/${associationId}`
                        : clubId
                        ? `/club/${clubId}`
                        : '/'
                }
            />
        );
    }

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
                </div>
            </div>

            {/* Metrics Overview Cards */}
            {!compact && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.totalLogs')}</span>
                            <Layers className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {statsLoading ? '...' : (stats?.totalEvents || totalCount || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Total immutable traces</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.todayLogs')}</span>
                            <Calendar className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-red-600 dark:text-red-400">
                            {statsLoading ? '...' : (stats?.todayEvents || 0).toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Activity in last 24h</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{t('audit.securityEvents')}</span>
                            <Shield className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
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

            {/* Audit Log DataTable */}
            <DataTable
                columns={columns}
                data={logs}
                loading={loading}
                searchPlaceholder={t('audit.searchPlaceholder')}
                onRowClick={(log) => setInspectLog(log)}
                searchSlot={
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Category Selector */}
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
                                    type="button"
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
                }
                manualPagination={true}
                totalCount={totalCount}
                pageCount={totalPages}
                pageIndex={page - 1}
                pageSize={pageSize}
                pageSizeOptions={[20, 50, 100]}
                onPaginationChange={(nextPageIndex, nextPageSize) => {
                    setPage(nextPageIndex + 1);
                    setPageSize(nextPageSize);
                }}
                emptyMessage={t('audit.emptyLogs')}
            />

            {/* Forensic Metadata Inspection Modal */}
            <Modal
                isOpen={Boolean(inspectLog)}
                onClose={() => setInspectLog(null)}
                title={t('audit.inspectModalTitle')}
                subtitle={inspectLog ? `${inspectLog.category} • ${inspectLog.action}` : undefined}
                icon={<Code2 className="h-5 w-5 text-red-600" />}
                size="lg"
            >
                {inspectLog && (
                    <div className="space-y-4 text-xs">
                        {/* Summary Info Header */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    Timestamp
                                </span>
                                <div className="font-mono text-slate-700 dark:text-slate-200 mt-0.5">
                                    {format(new Date(inspectLog.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    Operator
                                </span>
                                <div className="font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                                    {inspectLog.userName || inspectLog.userEmail || 'System'}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    IP Address
                                </span>
                                <div className="font-mono text-slate-700 dark:text-slate-200 mt-0.5">
                                    {inspectLog.ipAddress}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    Audit Result
                                </span>
                                <div className="mt-0.5 font-bold">
                                    {inspectLog.status === 'SUCCESS' ? (
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                            ✓ SUCCESS
                                        </span>
                                    ) : (
                                        <span className="text-red-600 dark:text-red-400">
                                            ✗ FAILURE
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Description
                            </span>
                            <div className="mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                                {inspectLog.description}
                            </div>
                        </div>

                        {/* Raw Metadata JSON Inspector */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    Forensic Payload (Metadata & Diff)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(JSON.stringify(inspectLog.metadata, null, 2))}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                                >
                                    {copiedId ? (
                                        <>
                                            <Check className="h-3 w-3" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            <span>Copy JSON</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="p-3.5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                                {inspectLog.metadata
                                    ? JSON.stringify(inspectLog.metadata, null, 2)
                                    : '// No additional forensic JSON payload recorded.'}
                            </pre>
                        </div>

                        {/* User Agent / Hardware Tracing */}
                        <div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Client User-Agent Header
                            </span>
                            <div className="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[10px] break-all">
                                {inspectLog.userAgent || 'None reported'}
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setInspectLog(null)}
                                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
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
