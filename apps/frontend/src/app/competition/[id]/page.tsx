'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Trophy,
    Calendar,
    MapPin,
    Shield,
    Users,
    ChevronRight,
    Layers,
    Sliders,
    Flame,
    Key,
    UserCheck,
    Mic,
    DollarSign,
    BarChart3,
    MessageSquare,
    Activity,
    Download,
    Check,
    XCircle,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    Play,
    Eye,
    Plus,
    Clock,
    FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { LiveTicker } from '@/components/layout/LiveTicker';
import { generateTournamentInvitationPdf } from '@/lib/pdfInvitation';
import { JsonLd, generateCompetitionJsonLd } from '@/components/seo/JsonLd';

export default function CompetitionDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const competitionId = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [speakerCallouts, setSpeakerCallouts] = useState<any[]>([]);
    const [stats, setStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const comp = await api.getCompetition(competitionId);
            setCompetition(comp);
            setEntityMeta({
                id: comp.id,
                title: comp.name,
                code: comp.seriesSlug || comp.slug || 'COMP',
                badge: comp.type,
                subtitle: `${comp.type} • ${comp.association?.name || 'Federation'}`,
            });

            const [rolesData, playersData, calloutsData, statsData] = await Promise.all([
                api.getCompetitionRoles(competitionId).catch(() => []),
                api.getCompetitionPlayers(competitionId).catch(() => []),
                api.getCompetitionSpeakerCallouts(competitionId).catch(() => []),
                api.getCompetitionStatistics(competitionId).catch(() => null),
            ]);

            setRoles(rolesData || []);
            setPlayers(playersData || []);
            setSpeakerCallouts(calloutsData || []);
            setStats(statsData);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load tournament data' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (competitionId) {
            loadDashboardData();
        }
        return () => setEntityMeta(null);
    }, [competitionId]);

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some(
            (r: any) => r.associationId === competition?.associationId && ['ADMIN', 'PRESIDENT'].includes(r.role)
        );

    const handleApproval = async (approved: boolean) => {
        try {
            await api.approveCompetition(competitionId, { status: approved ? 'APPROVED' : 'REJECTED' });
            setActionMsg({ type: 'success', text: `Competition ${approved ? 'approved' : 'rejected'} successfully.` });
            loadDashboardData();
            setTimeout(() => setActionMsg(null), 3500);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Approval action failed' });
        }
    };

    const handleBackup = async () => {
        try {
            const data = await api.backupCompetition(competitionId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${competition?.slug || 'competition'}-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setActionMsg({ type: 'success', text: 'Snapshot database backup downloaded successfully.' });
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Backup failed' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!competition) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-8 text-center text-slate-700 dark:text-slate-300">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
                <h2 className="text-xl font-bold">Competition Not Found</h2>
                <p className="text-xs text-slate-500 mt-1">The requested tournament does not exist or has been removed.</p>
                <Link href="/competitions" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition">
                    Back to Competitions
                </Link>
            </div>
        );
    }

    // Encounters calculation
    const allEncounters: any[] = [];
    competition.categories?.forEach((cat: any) => {
        cat.encounters?.forEach((enc: any) => {
            allEncounters.push({ ...enc, categoryName: cat.name });
        });
    });

    const liveEncounters = allEncounters.filter((e) => e.status === 'LIVE');
    const scheduledEncounters = allEncounters.filter((e) => e.status === 'SCHEDULED');
    const finishedEncounters = allEncounters.filter((e) => e.status === 'FINISHED');

    const totalPaidAmount = players.filter((p) => p.paymentStatus === 'PAID').reduce((acc, p) => acc + (p.paidAmount || competition.entryFee || 20), 0);
    const checkedInCount = players.filter((p) => p.isCheckedIn).length;

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Schema.org SportsEvent Structured Data */}
            <JsonLd data={generateCompetitionJsonLd(competition)} />

            {/* Live Scoring Ticker */}
            <LiveTicker />

            {/* Main Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                {competition.type}
                            </span>
                            {competition.isOfficial ? (
                                <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50 flex items-center gap-1">
                                    <Shield className="h-3 w-3" /> Official Tier
                                </span>
                            ) : (
                                <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/50 flex items-center gap-1">
                                    <Shield className="h-3 w-3" /> Inofficial (No ELO)
                                </span>
                            )}
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                {competition.status}
                            </span>
                            {competition.approvalStatus === 'PENDING_APPROVAL' && (
                                <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-amber-500 text-white animate-pulse">
                                    Approval Pending
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {competition.name}
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-red-500" />
                                {format(new Date(competition.startDate), 'dd.MM.yyyy')} – {format(new Date(competition.endDate), 'dd.MM.yyyy')}
                            </span>
                            {competition.location && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-rose-500" />
                                    {competition.location}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Shield className="h-4 w-4 text-blue-500" />
                                {competition.association?.name || 'National Federation'}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                Entry: CHF {competition.entryFee || 0}
                            </span>
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() =>
                                generateTournamentInvitationPdf({
                                    competition,
                                    roles,
                                    players,
                                    categories: competition.categories || [],
                                })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 shadow-xs transition"
                            title="Download Tournament Invitation PDF"
                        >
                            <FileText className="h-3.5 w-3.5 text-red-500" />
                            <span>Download Invitation (PDF)</span>
                        </button>
                        <Link
                            href={`/competition/${competitionId}/settings`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <Sliders className="h-3.5 w-3.5 text-slate-500" />
                            <span>Settings</span>
                        </Link>
                        <button
                            type="button"
                            onClick={handleBackup}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <Download className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Export Backup</span>
                        </button>
                    </div>
                </div>

                {/* Association Admin Approval Alert Banner */}
                {competition.approvalStatus === 'PENDING_APPROVAL' && isAssocAdmin && (
                    <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                            <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium">
                                This competition is awaiting official validation & approval from the main association administration.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleApproval(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
                            >
                                <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApproval(false)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
                            >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Flash Feedback Banner */}
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

            {/* 4 Core Metric KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Categories</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                            <Layers className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {competition.categories?.length || 0}
                    </div>
                    <p className="text-[11px] text-slate-500">{allEncounters.length} total fixtures</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Athletes Roster</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {players.length}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {checkedInCount} checked in ({players.length > 0 ? Math.round((checkedInCount / players.length) * 100) : 0}%)
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Encounters</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <Flame className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {liveEncounters.length} <span className="text-xs text-slate-400 font-normal">Live</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{finishedEncounters.length} completed / {scheduledEncounters.length} pending</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cashier Ledger</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        CHF {totalPaidAmount}
                    </div>
                    <p className="text-[11px] text-slate-500">Entry fee collections</p>
                </div>
            </div>

            {/* Quick Live Fixtures Bar */}
            {liveEncounters.length > 0 && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-500/5 dark:bg-red-950/20 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                            <span>Live Match Center ({liveEncounters.length} Ongoing Encounters)</span>
                        </h3>
                        <Link href={`/competition/${competitionId}/results`} className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                            <span>Open Scorekeeper Desk</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {liveEncounters.slice(0, 6).map((enc) => (
                            <Link
                                key={enc.id}
                                href={`/competition/${competitionId}/encounter/${enc.id}`}
                                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500 transition shadow-xs space-y-2 block group"
                            >
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-red-600 dark:text-red-400">{enc.categoryName}</span>
                                    <span className="font-mono text-slate-400">{enc.location || 'Main Hall'}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                    <span>{enc.homeTeam?.name || 'TBD'}</span>
                                    <span className="font-mono text-base text-red-600 dark:text-red-400">{enc.homeScore ?? 0} : {enc.awayScore ?? 0}</span>
                                    <span>{enc.awayTeam?.name || 'TBD'}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* 12-Module Workspace Launchpad Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tournament Workspace Modules</h2>
                        <p className="text-xs text-slate-500">Dedicated management consoles and operational tools</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[
                        {
                            title: 'Categories & Draws',
                            desc: 'Manage divisions, team entries, and generate round-robin groups.',
                            href: `/competition/${competitionId}/categories`,
                            icon: Layers,
                            color: 'text-amber-500',
                            bg: 'bg-amber-500/10',
                            badge: `${competition.categories?.length || 0} Categories`,
                        },
                        {
                            title: 'Result Entering',
                            desc: 'Live table scorekeeper desk and match completion sheets.',
                            href: `/competition/${competitionId}/results`,
                            icon: Flame,
                            color: 'text-red-500',
                            bg: 'bg-red-500/10',
                            badge: `${liveEncounters.length} Live`,
                        },
                        {
                            title: 'Players Roster',
                            desc: 'Athlete check-in, licensing validation, and ELO ratings.',
                            href: `/competition/${competitionId}/players`,
                            icon: Users,
                            color: 'text-blue-500',
                            bg: 'bg-blue-500/10',
                            badge: `${players.length} Players`,
                        },
                        {
                            title: 'Speaker Console',
                            desc: 'Announcer audio chimes, table match callouts, and summon queue.',
                            href: `/competition/${competitionId}/speaker`,
                            icon: Mic,
                            color: 'text-purple-500',
                            bg: 'bg-purple-500/10',
                            badge: `${speakerCallouts.filter(c => c.status === 'ACTIVE').length} Active`,
                        },
                        {
                            title: 'Cashier Desk',
                            desc: 'Entry fee collection ledger, Cash, TWINT, and Card settlements.',
                            href: `/competition/${competitionId}/cashier`,
                            icon: DollarSign,
                            color: 'text-emerald-500',
                            bg: 'bg-emerald-500/10',
                            badge: `CHF ${totalPaidAmount}`,
                        },
                        {
                            title: 'Locations & Units',
                            desc: 'Hall venues, unit allocation, and playing table assignments.',
                            href: `/competition/${competitionId}/locations`,
                            icon: MapPin,
                            color: 'text-rose-500',
                            bg: 'bg-rose-500/10',
                            badge: 'Facility Map',
                        },
                        {
                            title: 'Access Rights',
                            desc: 'Grant granular roles for referees, cashiers, speakers, and scorekeepers.',
                            href: `/competition/${competitionId}/access`,
                            icon: Key,
                            color: 'text-indigo-500',
                            bg: 'bg-indigo-500/10',
                            badge: `${roles.length} Staff`,
                        },
                        {
                            title: 'Referees & Umpires',
                            desc: 'Head referee designation and table umpire roster management.',
                            href: `/competition/${competitionId}/referees`,
                            icon: UserCheck,
                            color: 'text-cyan-500',
                            bg: 'bg-cyan-500/10',
                            badge: 'Official Staff',
                        },
                        {
                            title: 'Communication',
                            desc: 'Broadcast tournament announcements and email notices to captains.',
                            href: `/competition/${competitionId}/communication`,
                            icon: MessageSquare,
                            color: 'text-sky-500',
                            bg: 'bg-sky-500/10',
                            badge: 'Broadcasts',
                        },
                        {
                            title: 'Actions & Backups',
                            desc: 'Snapshot JSON database backups and audit trail history.',
                            href: `/competition/${competitionId}/actions`,
                            icon: Activity,
                            color: 'text-orange-500',
                            bg: 'bg-orange-500/10',
                            badge: 'Snapshots',
                        },
                        {
                            title: 'Statistics & Reports',
                            desc: 'Real-time completion metrics, win rates, and tournament analytics.',
                            href: `/competition/${competitionId}/statistics`,
                            icon: BarChart3,
                            color: 'text-violet-500',
                            bg: 'bg-violet-500/10',
                            badge: 'Analytics',
                        },
                        {
                            title: 'Settings & Approval',
                            desc: 'Dates, venue, entry fee, official tier, and federation governance.',
                            href: `/competition/${competitionId}/settings`,
                            icon: Sliders,
                            color: 'text-slate-500',
                            bg: 'bg-slate-500/10',
                            badge: 'Configuration',
                        },
                    ].map((mod) => {
                        const Icon = mod.icon;
                        return (
                            <Link
                                key={mod.title}
                                href={mod.href}
                                className="group rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm hover:border-red-500/50 dark:hover:border-red-500/50 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                            >
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${mod.bg} ${mod.color}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                            {mod.badge}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors flex items-center justify-between">
                                        <span>{mod.title}</span>
                                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {mod.desc}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
