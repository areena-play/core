'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { api } from '@/lib/api';
import {
    ShieldAlert,
    Settings,
    Users,
    Building2,
    Shield,
    Trophy,
    Award,
    Receipt,
    Server,
    Database,
    Mail,
    Activity,
    CheckCircle2,
    AlertTriangle,
    ChevronRight,
    ArrowUpRight,
    RefreshCw,
    Zap,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMetrics = async () => {
        try {
            const data = await api.getAdminDashboard();
            setMetrics(data);
        } catch (err) {
            console.error('Failed to load admin metrics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.isSuperAdmin) {
            fetchMetrics();
        }
    }, [user]);

    if (!user) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (!user.isSuperAdmin) {
        return (
            <AccessDenied
                title="Super Admin Access Restricted"
                description="This section is strictly reserved for platform Super Administrators."
                requiredRole="Super Administrator"
                returnHref="/"
            />
        );
    }

    return (
        <div className="space-y-8 pb-16 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/40 text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-red-400">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>Platform Root Control</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                            {t('nav.adminDashboard')}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Global Super Administrator workspace. Configure installation-wide credentials (Mailgun REST API), inspect infrastructure health, and review cross-tenant audit trails.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setRefreshing(true);
                                fetchMetrics();
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-white transition"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                        <Link
                            href="/admin/settings"
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow transition"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            <span>{t('nav.systemSettings')}</span>
                        </Link>
                    </div>
                </div>
                <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
            </div>

            {/* Infrastructure & Services Status Matrix */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Server className="h-4 w-4 text-red-500" />
                    <span>Core Services Health</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Database */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                <Database className="h-4 w-4 text-blue-500" />
                                <span>PostgreSQL DB</span>
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Healthy
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Prisma multi-schema ORM with pooling.</p>
                    </div>

                    {/* Mailgun Gateway */}
                    <Link
                        href="/admin/settings"
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-sm space-y-2 hover:border-red-500/40 transition group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                <Mail className="h-4 w-4 text-red-500" />
                                <span>Mailgun REST</span>
                            </span>
                            {metrics?.services?.mailgun?.status === 'configured' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Active
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Unset
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {metrics?.services?.mailgun?.domain || 'Configure in Settings →'}
                        </p>
                    </Link>

                    {/* SMTP Relay */}
                    <Link
                        href="/admin/settings"
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-sm space-y-2 hover:border-blue-500/40 transition group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                <Server className="h-4 w-4 text-blue-500" />
                                <span>SMTP Relay</span>
                            </span>
                            {metrics?.services?.smtp?.status === 'configured' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Active
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    Optional
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {metrics?.services?.smtp?.host ? `${metrics.services.smtp.host}:${metrics.services.smtp.port}` : 'Configure in Settings →'}
                        </p>
                    </Link>

                    {/* Redis & Ingress Guard */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span>Token Bucket</span>
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Active
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">120 req/min user guard.</p>
                    </div>

                    {/* S3 Object Storage */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                <Server className="h-4 w-4 text-purple-500" />
                                <span>S3 Storage</span>
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {metrics?.services?.s3?.bucket || 'areena-assets'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Global Metrics Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Users</span>
                    <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : metrics?.users?.total || 0}
                    </div>
                    <span className="text-[10px] text-red-500 font-bold">{metrics?.users?.superAdmins || 0} Super Admins</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Associations</span>
                    <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : metrics?.associations?.total || 0}
                    </div>
                    <span className="text-[10px] text-slate-400">Hierarchies Active</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Clubs</span>
                    <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : metrics?.clubs?.total || 0}
                    </div>
                    <span className="text-[10px] text-slate-400">Affiliated</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Competitions</span>
                    <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : metrics?.competitions?.total || 0}
                    </div>
                    <span className="text-[10px] text-slate-400">Leagues & Cups</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Licenses</span>
                    <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : metrics?.licenses?.total || 0}
                    </div>
                    <span className="text-[10px] text-slate-400">Passports Issued</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Invoices</span>
                    <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                        {loading ? '...' : metrics?.invoices?.total || 0}
                    </div>
                    <span className="text-[10px] text-slate-400">Bexio / Stripe</span>
                </div>
            </div>

            {/* Super Admin Module Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/admin/settings"
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:shadow-md hover:border-red-500/50 transition group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 group-hover:scale-105 transition">
                            <Settings className="h-5 w-5" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                        {t('nav.systemSettings')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Configure the Mailgun REST API key, domain, regional host, and default sender identity.
                    </p>
                </Link>

                <Link
                    href="/management/users"
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
                            <Users className="h-5 w-5" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        User Governance & SuperAdmins
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Manage all platform users, promote/demote Super Administrators, and reset accounts.
                    </p>
                </Link>

                <Link
                    href="/management/audit-logs"
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:shadow-md hover:border-rose-500/50 transition group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 group-hover:scale-105 transition">
                            <Activity className="h-5 w-5" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-rose-500 transition" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                        Global Audit Trail
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        View cryptographically signed security events, IP access entries, and sensitive updates.
                    </p>
                </Link>
            </div>

            {/* Recent System Activity Stream */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-red-500" />
                        <span>Latest System & Administrative Events</span>
                    </h3>
                    <Link
                        href="/management/audit-logs"
                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                        <span>Audit Log Explorer</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                        ))}
                    </div>
                ) : !metrics?.recentLogs || metrics.recentLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No recent events.</p>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                        {metrics.recentLogs.map((log: any, idx: number) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="flex h-2 w-2 rounded-full bg-red-500 shrink-0" />
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {log.action || 'SYSTEM_ACTION'}
                                    </span>
                                    <span className="text-slate-400 truncate">
                                        {log.user?.email || 'System Operation'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}