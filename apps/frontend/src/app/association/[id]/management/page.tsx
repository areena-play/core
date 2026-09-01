'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { api } from '@/lib/api';
import {
    LayoutDashboard,
    Sliders,
    Users,
    Mail,
    Award,
    Activity,
    Receipt,
    Shield,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Sparkles,
    Building2,
    ArrowUpRight,
    Search,
    ShieldAlert,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';

export default function ManagementDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const [stats, setStats] = useState<any>({
        userCount: 0,
        clubCount: 0,
        licenseCount: 0,
        pendingApprovals: 0,
        invoiceCount: 0,
    });
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    useEffect(() => {
        if (!isAssocAdmin) {
            setLoading(false);
            return;
        }

        async function loadDashboardData() {
            try {
                const [usersRes, clubsRes, licensesRes, invoicesRes, auditRes] = await Promise.allSettled([
                    api.getUsers(''),
                    api.getClubs(),
                    api.getLicenses(),
                    api.getInvoices().catch(() => []),
                    api.getAuditLogs({ limit: '5' }).catch(() => ({ logs: [] })),
                ]);

                const userList = usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value) ? usersRes.value : usersRes.value?.users || []) : [];
                const userCount = userList.length || (usersRes.status === 'fulfilled' ? usersRes.value?.pagination?.total || 0 : 0);
                const clubCount = clubsRes.status === 'fulfilled' ? (Array.isArray(clubsRes.value) ? clubsRes.value.length : 0) : 0;
                const licenses = licensesRes.status === 'fulfilled' ? (Array.isArray(licensesRes.value) ? licensesRes.value : []) : [];
                const invoices = invoicesRes.status === 'fulfilled' ? (Array.isArray(invoicesRes.value) ? invoicesRes.value : []) : [];
                const auditLogs = auditRes.status === 'fulfilled' ? (auditRes.value?.logs || auditRes.value || []) : [];

                const pendingApprovals = licenses.filter((l: any) => l.status === 'PENDING').length;

                setStats({
                    userCount,
                    clubCount,
                    licenseCount: licenses.length,
                    pendingApprovals,
                    invoiceCount: invoices.length,
                });
                setRecentLogs(Array.isArray(auditLogs) ? auditLogs.slice(0, 5) : []);
            } catch (err) {
                console.error('Failed to load management dashboard metrics:', err);
            } finally {
                setLoading(false);
            }
        }

        loadDashboardData();
    }, [isAssocAdmin]);

    if (authLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (!isAssocAdmin) {
        return <AccessDenied description="Only Federation & Association Administrators have access to Operations & Governance." />;
    }

    const modules = [
        {
            title: t('nav.federationSettings'),
            description: 'Federation identity, official logo assets, license ID template generator & rule inheritance.',
            href: '/management/settings',
            icon: Sliders,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
            tag: 'Governance',
        },
        {
            title: t('nav.users'),
            description: 'Manage users, grant administrator roles, inspect Elo points, and update contact profiles.',
            href: '/management/users',
            icon: Users,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
            tag: `${stats.userCount} Accounts`,
        },
        {
            title: t('nav.communications'),
            description: 'Publish platform-wide bulletins, regional notices, and dispatch automated batch email campaigns.',
            href: '/management/communications',
            icon: Mail,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40',
            tag: 'Broadcasts',
        },
        {
            title: t('nav.licensingHub'),
            description: 'Player license passes, referee certifications, course attestations & approval workflows.',
            href: '/management/licenses',
            icon: Award,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
            tag: stats.pendingApprovals > 0 ? `${stats.pendingApprovals} Pending` : 'All Approved',
        },
        {
            title: t('nav.auditLogs'),
            description: 'Cryptographically timestamped audit trail, security events, IP tracking, and role modifications.',
            href: '/management/audit-logs',
            icon: Activity,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40',
            tag: 'Security Log',
        },
        {
            title: t('nav.financingHub'),
            description: 'Automated Bexio ERP integration, club license invoices, Stripe receipts & payment ledgers.',
            href: '/management/finances',
            icon: Receipt,
            color: 'text-cyan-600 dark:text-cyan-400',
            bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40',
            tag: 'Bexio & Stripe',
        },
    ];

    return (
        <div className="space-y-8 pb-16 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-2 max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Operations & Governance</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                        {t('nav.managementDashboard')}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Central administrative control plane for Swiss & International Sports Federations. Manage identity policies, user rosters, license passes, financial sync, and security logs.
                    </p>
                </div>
                <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Link
                    href="/management/users"
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:border-emerald-500/40 transition group"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Total Users</span>
                        <Users className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition" />
                    </div>
                    <div className="mt-2 font-mono font-black text-2xl text-slate-900 dark:text-white">
                        {loading ? '...' : stats.userCount}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        View Directory →
                    </div>
                </Link>

                <Link
                    href="/clubs"
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:border-blue-500/40 transition group"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Affiliated Clubs</span>
                        <Shield className="h-4 w-4 text-blue-500 group-hover:scale-110 transition" />
                    </div>
                    <div className="mt-2 font-mono font-black text-2xl text-slate-900 dark:text-white">
                        {loading ? '...' : stats.clubCount}
                    </div>
                    <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        Clubs Overview →
                    </div>
                </Link>

                <Link
                    href="/management/licenses"
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:border-amber-500/40 transition group"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Active Licenses</span>
                        <Award className="h-4 w-4 text-amber-500 group-hover:scale-110 transition" />
                    </div>
                    <div className="mt-2 font-mono font-black text-2xl text-slate-900 dark:text-white">
                        {loading ? '...' : stats.licenseCount}
                    </div>
                    <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        {stats.pendingApprovals > 0 ? `⚠️ ${stats.pendingApprovals} Pending Approval` : 'Licensing Hub →'}
                    </div>
                </Link>

                <Link
                    href="/management/finances"
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:border-cyan-500/40 transition group"
                >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Billing Ledgers</span>
                        <Receipt className="h-4 w-4 text-cyan-500 group-hover:scale-110 transition" />
                    </div>
                    <div className="mt-2 font-mono font-black text-2xl text-slate-900 dark:text-white">
                        {loading ? '...' : stats.invoiceCount}
                    </div>
                    <div className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                        Bexio & Invoicing →
                    </div>
                </Link>
            </div>

            {/* Management Modules Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-red-500" />
                    <span>Administrative Modules</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {modules.map((mod, idx) => {
                        const Icon = mod.icon;
                        return (
                            <Link
                                key={idx}
                                href={mod.href}
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group hover:border-slate-300 dark:hover:border-slate-700"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${mod.bg} ${mod.color} border shadow-xs group-hover:scale-105 transition`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                            {mod.tag}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition flex items-center justify-between">
                                            <span>{mod.title}</span>
                                            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            {mod.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-red-600 dark:text-red-400">
                                    <span>Configure Module</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Audit & Activity Trail */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-red-500" />
                        <span>Recent Federation Activity & Audit Trail</span>
                    </h3>
                    <Link
                        href="/management/audit-logs"
                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                        <span>View Full Trail</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                        ))}
                    </div>
                ) : recentLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3">No recent security or governance events logged.</p>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                        {recentLogs.map((log: any, idx: number) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {log.action || log.event || 'GOVERNANCE_EVENT'}
                                    </span>
                                    <span className="text-slate-400 truncate">
                                        {log.details || log.user?.email || 'System Operation'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}