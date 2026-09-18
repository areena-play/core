'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { api } from '@/lib/api';
import {
    Database,
    Play,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Shield,
    Users,
    Building2,
    Award,
    FolderCheck,
    RefreshCw,
    X,
    ChevronLeft,
    FileJson,
    ArrowRight,
    Terminal,
    Sparkles,
    Swords,
    TrendingUp,
    Flame,
    Eye,
    EyeOff,
    Check,
    Power,
    Sliders,
    Settings,
    Zap,
    FileText,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';

function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null) return '0';
    return Number(num).toLocaleString('de-CH');
}

export default function AdminClickTTPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const [activeTab, setActiveTab] = useState<'scraper' | 'cronjobs' | 'config'>('scraper');

    // Scraper Status & Logs
    const [scraperStatus, setScraperStatus] = useState<any>(null);
    const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);
    const [autoScrollLogs, setAutoScrollLogs] = useState(true);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Scraper Running State
    const [runningJobType, setRunningJobType] = useState<string | null>(null);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Cronjobs
    const [cronJobs, setCronJobs] = useState<any[]>([]);
    const [cronLoading, setCronLoading] = useState(false);

    // Scraper Config Form
    const [configForm, setConfigForm] = useState({
        baseUrl: '',
        fedNickname: 'STT',
        clientId: '',
        clientSecret: '',
        webBaseUrl: 'https://click-tt.ch',
        clickttUsername: '',
        clickttPassword: '',
        requestDelayMs: 0,
        concurrency: 25,
        excludedClubs: 'T-Card, T-CARD, t-card, T Card',
        tournamentRetroDays: 30,
        hasClientSecret: false,
        hasPassword: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    const [configSaving, setConfigSaving] = useState(false);

    // Initial Scrape Dialog Options
    const [showInitialModal, setShowInitialModal] = useState(false);
    const [initialOptions, setInitialOptions] = useState({
        skipTournaments: false,
        skipElo: false,
        useApi: false,
    });

    // Reset Database Dialog
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // Fetch Scraper Status
    const fetchStatus = async () => {
        try {
            const res = await api.admin.getScraperStatus();
            setScraperStatus(res);
        } catch (err) {
            // Ignore background error
        }
    };

    // Fetch Logs
    const fetchLogs = async () => {
        try {
            const res = await api.admin.getScraperLogs(300);
            if (res && Array.isArray(res.logs)) {
                setLogs(res.logs);
            }
        } catch (err) {
            // Ignore log polling error
        }
    };

    // Fetch Config
    const fetchConfig = async () => {
        setConfigLoading(true);
        try {
            const cfg = await api.admin.getScraperConfig();
            if (cfg) {
                setConfigForm((prev) => ({
                    ...prev,
                    baseUrl: cfg.baseUrl || '',
                    fedNickname: cfg.fedNickname || 'STT',
                    clientId: cfg.clientId || '',
                    webBaseUrl: cfg.webBaseUrl || 'https://click-tt.ch',
                    clickttUsername: cfg.clickttUsername || '',
                    requestDelayMs: cfg.requestDelayMs || 0,
                    concurrency: cfg.concurrency || 25,
                    excludedClubs: cfg.excludedClubs || 'T-Card, T-CARD, t-card, T Card',
                    tournamentRetroDays: cfg.tournamentRetroDays || 30,
                    hasClientSecret: cfg.hasClientSecret,
                    hasPassword: cfg.hasPassword,
                }));
            }
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load scraper config' });
        } finally {
            setConfigLoading(false);
        }
    };

    // Fetch Cronjobs
    const fetchCronJobs = async () => {
        setCronLoading(true);
        try {
            const res = await api.admin.getCronJobs();
            const list = Array.isArray(res) ? res : (res as any)?.jobs || [];
            setCronJobs(list);
        } catch (err) {
            // Ignore
        } finally {
            setCronLoading(false);
        }
    };

    // Initial data load
    useEffect(() => {
        if (user?.isSuperAdmin) {
            fetchStatus();
            fetchLogs();
            fetchConfig();
            fetchCronJobs();
        }
    }, [user]);

    // Polling while scraper is active or on scraper tab
    useEffect(() => {
        if (!user?.isSuperAdmin) return;
        const interval = setInterval(() => {
            fetchStatus();
            fetchLogs();
            if (activeTab === 'cronjobs') {
                fetchCronJobs();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [user, activeTab]);

    // Auto-scroll logs strictly within the container
    useEffect(() => {
        if (autoScrollLogs && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScrollLogs]);

    // Save Scraper Config
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConfigSaving(true);
        setActionMsg(null);
        try {
            const payload: any = {
                baseUrl: configForm.baseUrl,
                fedNickname: configForm.fedNickname,
                clientId: configForm.clientId,
                webBaseUrl: configForm.webBaseUrl,
                clickttUsername: configForm.clickttUsername,
                requestDelayMs: Number(configForm.requestDelayMs) || 0,
                concurrency: Number(configForm.concurrency) || 25,
                excludedClubs: configForm.excludedClubs,
                tournamentRetroDays: Number(configForm.tournamentRetroDays) || 30,
            };

            if (configForm.clientSecret) {
                payload.clientSecret = configForm.clientSecret;
            }
            if (configForm.clickttPassword) {
                payload.clickttPassword = configForm.clickttPassword;
            }

            await api.admin.updateScraperConfig(payload);
            setActionMsg({ type: 'success', text: 'Scraper settings successfully saved to system database.' });
            fetchConfig();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to save scraper config' });
        } finally {
            setConfigSaving(false);
        }
    };

    // Trigger Scraper Job
    const handleRunJob = async (jobType: 'initial' | 'sync' | 'results' | 'players' | 'elo' | 'export' | 'reset-db', options: any = {}) => {
        setRunningJobType(jobType);
        setActionMsg(null);
        try {
            const res = await api.admin.runScraperJob(jobType, options, true);
            setActionMsg({ type: 'success', text: res.message || `Started ${jobType} task in background.` });
            setShowInitialModal(false);
            fetchStatus();
            fetchLogs();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || `Failed to trigger ${jobType}` });
        } finally {
            setRunningJobType(null);
        }
    };

    // Reset Database & Ingest Full Datasets
    const handleResetAndImport = async () => {
        if (resetConfirmText.trim() !== 'RESET') return;
        setResetLoading(true);
        setActionMsg(null);
        try {
            const res = await api.admin.resetAndImportDatabase(true);
            setActionMsg({ type: 'success', text: res.message || 'Launched full database reset and bulk reload in background.' });
            setShowResetModal(false);
            setResetConfirmText('');
            fetchStatus();
            fetchLogs();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to trigger database reset' });
        } finally {
            setResetLoading(false);
        }
    };

    // Toggle Cron Job
    const handleToggleCron = async (name: string, currentEnabled: boolean) => {
        try {
            await api.admin.toggleCronJob(name, !currentEnabled);
            fetchCronJobs();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to toggle cronjob' });
        }
    };

    // Trigger Cron Job Now
    const handleTriggerCron = async (name: string) => {
        try {
            await api.admin.triggerCronJob(name);
            setActionMsg({ type: 'success', text: `Triggered cronjob '${name}' immediately.` });
            fetchCronJobs();
            fetchLogs();
            fetchStatus();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to trigger cronjob' });
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
                description="This Click-TT scraper control plane is strictly reserved for platform Super Administrators."
                requiredRole="Super Administrator"
                returnHref="/"
            />
        );
    }

    const isRunning = scraperStatus?.isRunning;

    return (
        <div className="space-y-8 pb-16">
            {/* Navigation & Header */}
            <div>
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 mb-4 transition"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back to Super Admin Dashboard</span>
                </Link>

                <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/40 text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-red-400">
                                <Zap className="h-3.5 w-3.5" />
                                <span>Click-TT Scraper V2 &amp; Sync Engine</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                                Swiss Table Tennis Sync Center
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                Automated extraction of clubs, players, rating timelines, league encounters, and tournament match brackets directly from Click-TT.
                            </p>
                        </div>

                        {/* Live Status Pill */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3">
                                <div className={`h-3.5 w-3.5 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                                <div className="text-xs font-mono">
                                    <div className="text-slate-400 font-bold uppercase text-[10px]">Scraper Engine Status</div>
                                    <div className="font-bold text-white flex items-center gap-2 mt-0.5">
                                        <span>{isRunning ? `Running: ${scraperStatus?.activeJob?.toUpperCase()}` : 'Idle / Ready'}</span>
                                        {isRunning && <span className="text-amber-300 text-[11px]">({scraperStatus?.elapsedSec || 0}s)</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
                </div>
            </div>

            {/* Notification Banner */}
            {actionMsg && (
                <div
                    className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
                        actionMsg.type === 'success'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                            : 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {actionMsg.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                        <span className="text-xs font-semibold">{actionMsg.text}</span>
                    </div>
                    <button type="button" onClick={() => setActionMsg(null)} className="p-1 hover:opacity-75">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('scraper')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                        activeTab === 'scraper'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Zap className="w-4 h-4" />
                    <span>Scraper Operations</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('cronjobs')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                        activeTab === 'cronjobs'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Scheduled Cronjobs</span>
                    {cronJobs.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 text-white font-mono">
                            {cronJobs.length}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('config')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                        activeTab === 'config'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Sliders className="w-4 h-4" />
                    <span>Scraper Configuration</span>
                </button>
            </div>

            {/* TAB 1: Scraper Operations */}
            {activeTab === 'scraper' && (
                <div className="space-y-6">
                    {/* Quick Trigger Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Incremental Sync */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-red-500/40 transition">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                                        Recommended
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Incremental Delta Sync</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Syncs active match scores, retrospective tournaments, and new player registrations with delta diff exports.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRunJob('sync')}
                                disabled={isRunning}
                                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Run Incremental Sync</span>
                            </button>
                        </div>

                        {/* Results Only */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-red-500/40 transition">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                                        <Swords className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                                        15-Min Cron
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Match Results</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Rapidly extracts newly played league fixtures, tournament sets, and bracket results.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRunJob('results')}
                                disabled={isRunning}
                                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Sync Results Only</span>
                            </button>
                        </div>

                        {/* Players & Clubs */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-red-500/40 transition">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                                        Daily Cron
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Clubs &amp; Athlete Rosters</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Discovers newly affiliated clubs, player license assignments, and profile updates.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRunJob('players')}
                                disabled={isRunning}
                                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Sync Players &amp; Clubs</span>
                            </button>
                        </div>

                        {/* Elo Ratings */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-red-500/40 transition">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                                        Monthly
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Monthly Elo Snapshot</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Checks for new monthly rating publication dates and compiles full player timeline histories.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRunJob('elo')}
                                disabled={isRunning}
                                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Sync Elo Snapshots</span>
                            </button>
                        </div>

                        {/* Re-export JSON Datasets */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-red-500/40 transition">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                                        <FileJson className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                                        Compaction
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Re-export V2 JSON Datasets</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Compacts streaming JSONL storage and compiles all 9 canonical normalized JSON files.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRunJob('export')}
                                disabled={isRunning}
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Export Normalized JSON</span>
                            </button>
                        </div>

                        {/* Full Initial Scrape */}
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-red-500 transition">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 font-bold">
                                        <Flame className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-500 font-mono">
                                        Full Ingestion
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-red-950 dark:text-red-200">Full Initial Scrape / Reset</h3>
                                <p className="text-xs text-red-700/80 dark:text-red-400/80 leading-relaxed">
                                    Executes complete multi-year historical scrape across seasons, championships, clubs, and Elo timelines.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInitialModal(true)}
                                disabled={isRunning}
                                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Configure &amp; Launch Full Run</span>
                            </button>
                        </div>

                        {/* Full Database Reset & Bulk Ingest (Danger Zone) */}
                        <div className="rounded-2xl border border-rose-500/50 bg-rose-950/20 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-rose-500 transition">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 font-bold">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 font-mono">
                                        Danger Zone
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-rose-200">Reset DB &amp; Load Full Datasets</h3>
                                <p className="text-xs text-rose-300/80 leading-relaxed">
                                    Wipes all sports database records and bulk-ingests all 9 normalized Click-TT datasets from disk.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowResetModal(true)}
                                disabled={isRunning || resetLoading}
                                className="w-full py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md"
                            >
                                <Database className="w-3.5 h-3.5" />
                                <span>Reset Database &amp; Import</span>
                            </button>
                        </div>
                    </div>

                    {/* Checkpoint Statistics & Metadata */}
                    {scraperStatus?.summary && (
                        <div className="space-y-6">
                            {/* Normalized JSON Datasets */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <FileJson className="w-4 h-4 text-red-500" />
                                            <span>Normalized Click-TT Datasets</span>
                                            <span className="text-[11px] font-mono font-normal text-slate-400">
                                                (storage/clicktt_storage/data/*.json)
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Aggregated and compacted primary records exported from Click-TT.
                                        </p>
                                    </div>
                                    {scraperStatus.summary.meta?.lastExportAt && (
                                        <div className="text-[11px] font-mono text-slate-400">
                                            Last Export:{' '}
                                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                                                {new Date(scraperStatus.summary.meta.lastExportAt).toLocaleString('de-CH')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
                                    {[
                                        { id: 'matches', label: 'Matches', icon: Swords },
                                        { id: 'encounters', label: 'Encounters', icon: FolderCheck },
                                        { id: 'groups', label: 'Groups & Divisions', icon: Award },
                                        { id: 'categories', label: 'Categories', icon: Award },
                                        { id: 'competitions', label: 'Competitions', icon: Award },
                                        { id: 'players', label: 'Players', icon: Users },
                                        { id: 'player_histories', label: 'Player Histories', icon: TrendingUp },
                                        { id: 'clubs', label: 'Clubs', icon: Building2 },
                                        { id: 'seasons', label: 'Seasons', icon: Clock },
                                    ].map((item) => {
                                        const datasetInfo = scraperStatus.summary.datasets?.[item.id];
                                        const count = datasetInfo?.count ?? scraperStatus.summary.counts?.[item.id] ?? scraperStatus.summary.meta?.counts?.[item.id] ?? 0;
                                        const sizeStr = datasetInfo?.sizeBytes ? formatBytes(datasetInfo.sizeBytes) : null;
                                        const Icon = item.icon;

                                        return (
                                            <div
                                                key={item.id}
                                                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between text-slate-400">
                                                    <span className="text-[10px] font-bold uppercase truncate">{item.label}</span>
                                                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                                                </div>
                                                <div className="mt-2">
                                                    <div className="text-lg font-black text-slate-900 dark:text-white">
                                                        {formatNumber(count)}
                                                    </div>
                                                    {sizeStr && (
                                                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                            {sizeStr}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Scraper Checkpoints */}
                            {scraperStatus.summary.checkpoints && (
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-emerald-500" />
                                                <span>Scraper Progression Checkpoints</span>
                                                <span className="text-[11px] font-mono font-normal text-slate-400">
                                                    (storage/clicktt_storage/checkpoints/*.txt)
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Unique deduplicated entity IDs tracked across initial &amp; sync pipelines.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 font-mono">
                                        {Object.entries(scraperStatus.summary.checkpoints).map(([key, val]: any) => {
                                            const label = key
                                                .replace('completed_', '')
                                                .replace(/_/g, ' ')
                                                .replace(/\b\w/g, (l: string) => l.toUpperCase());

                                            return (
                                                <div
                                                    key={key}
                                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                                                >
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase truncate">{label}</div>
                                                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                                                        {formatNumber(val)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Scraper Metadata */}
                            {scraperStatus.summary.meta && (
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 font-mono text-xs flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 dark:text-slate-400">
                                    <div>
                                        Version: <span className="font-bold text-slate-700 dark:text-slate-200">{scraperStatus.summary.meta.version || '2.0.0'}</span>
                                    </div>
                                    {scraperStatus.summary.meta.latestSeason && (
                                        <div>
                                            Latest Season: <span className="font-bold text-red-500">{scraperStatus.summary.meta.latestSeason}</span>
                                        </div>
                                    )}
                                    {scraperStatus.summary.meta.lastEloRankingDate && (
                                        <div>
                                            Last ELO Date: <span className="font-bold text-slate-700 dark:text-slate-200">{scraperStatus.summary.meta.lastEloRankingDate}</span>
                                        </div>
                                    )}
                                    {scraperStatus.summary.meta.lastSyncAt && (
                                        <div>
                                            Last Sync: <span className="font-bold text-slate-700 dark:text-slate-200">{new Date(scraperStatus.summary.meta.lastSyncAt).toLocaleString('de-CH')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Scheduled Cronjobs */}
            {activeTab === 'cronjobs' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-500" />
                                <span>Automated Cluster Cron Tasks</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Cluster-safe background schedulers protected by PostgreSQL advisory locking.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={fetchCronJobs}
                            disabled={cronLoading}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-500 transition"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${cronLoading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {Array.isArray(cronJobs) && cronJobs.map((job) => (
                            <div key={job.name} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-slate-900 dark:text-white">{job.title}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${job.enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                            {job.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{job.description}</p>
                                    <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-0.5">
                                        <span>Interval: {Math.round(job.intervalMs / 1000 / 60)}m</span>
                                        <span>Last Run: {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}</span>
                                        <span>Next Run: {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'Pending'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleCron(job.name, job.enabled)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${job.enabled ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                    >
                                        <Power className="w-3.5 h-3.5" />
                                        <span>{job.enabled ? 'Disable' : 'Enable'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleTriggerCron(job.name)}
                                        disabled={isRunning}
                                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-white" />
                                        <span>Run Now</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: Scraper Configuration (.env direct editor) */}
            {activeTab === 'config' && (
                <form onSubmit={handleSaveConfig} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Settings className="w-4 h-4 text-red-500" />
                                <span>Click-TT Scraper Credentials &amp; Variables</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Values configured here are persisted to the database and override <code>.env</code> file defaults.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={configSaving}
                            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md disabled:opacity-50"
                        >
                            {configSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Save Settings</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Section A: Web Portal Credentials */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Web Portal Authentication (HTML Scraper)</h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Click-TT Web Base URL
                                </label>
                                <input
                                    type="text"
                                    value={configForm.webBaseUrl}
                                    onChange={(e) => setConfigForm({ ...configForm, webBaseUrl: e.target.value })}
                                    placeholder="https://click-tt.ch"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Click-TT Username
                                </label>
                                <input
                                    type="text"
                                    value={configForm.clickttUsername}
                                    onChange={(e) => setConfigForm({ ...configForm, clickttUsername: e.target.value })}
                                    placeholder="e.g. your_username"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                    <span>Click-TT Password {configForm.hasPassword && !configForm.clickttPassword && <span className="text-emerald-500 text-[10px] font-normal">(Password Configured)</span>}</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                    >
                                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                                    </button>
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={configForm.clickttPassword}
                                    onChange={(e) => setConfigForm({ ...configForm, clickttPassword: e.target.value })}
                                    placeholder={configForm.hasPassword ? '•••••••••••• (Leave blank to keep unchanged)' : 'Enter password'}
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Section B: REST API Credentials */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">REST API / nuPortalRS Integration</h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    REST API Base URL
                                </label>
                                <input
                                    type="text"
                                    value={configForm.baseUrl}
                                    onChange={(e) => setConfigForm({ ...configForm, baseUrl: e.target.value })}
                                    placeholder="https://ttch-portal.liga.nu/rs"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Federation Nickname
                                    </label>
                                    <input
                                        type="text"
                                        value={configForm.fedNickname}
                                        onChange={(e) => setConfigForm({ ...configForm, fedNickname: e.target.value })}
                                        placeholder="STT"
                                        className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Client ID
                                    </label>
                                    <input
                                        type="text"
                                        value={configForm.clientId}
                                        onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                                        placeholder="API Client ID"
                                        className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                    <span>Client Secret {configForm.hasClientSecret && !configForm.clientSecret && <span className="text-emerald-500 text-[10px] font-normal">(Secret Configured)</span>}</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowSecret(!showSecret)}
                                        className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                    >
                                        {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        <span>{showSecret ? 'Hide' : 'Show'}</span>
                                    </button>
                                </label>
                                <input
                                    type={showSecret ? 'text' : 'password'}
                                    value={configForm.clientSecret}
                                    onChange={(e) => setConfigForm({ ...configForm, clientSecret: e.target.value })}
                                    placeholder={configForm.hasClientSecret ? '•••••••••••• (Leave blank to keep unchanged)' : 'Enter client secret'}
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Section C: Scraper Concurrency & Delays */}
                        <div className="space-y-4 md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Worker Tuning &amp; Filters</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Concurrency (1–60 workers)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={configForm.concurrency}
                                        onChange={(e) => setConfigForm({ ...configForm, concurrency: parseInt(e.target.value, 10) || 15 })}
                                        className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Request Delay (ms)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5000"
                                        value={configForm.requestDelayMs}
                                        onChange={(e) => setConfigForm({ ...configForm, requestDelayMs: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Tournament Retro Days
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={configForm.tournamentRetroDays}
                                        onChange={(e) => setConfigForm({ ...configForm, tournamentRetroDays: parseInt(e.target.value, 10) || 30 })}
                                        className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Excluded Synthetic Clubs (Filtered out)
                                </label>
                                <input
                                    type="text"
                                    value={configForm.excludedClubs}
                                    onChange={(e) => setConfigForm({ ...configForm, excludedClubs: e.target.value })}
                                    placeholder="T-Card, T-CARD, t-card, T Card"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* Live Streaming Terminal Log Viewer */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-5 shadow-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 font-bold">
                        <Terminal className="h-4 w-4 text-emerald-400" />
                        <span>Live Scraper Stream</span>
                        {isRunning && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                Live Executing
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoScrollLogs}
                                onChange={(e) => setAutoScrollLogs(e.target.checked)}
                                className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-0 h-3 w-3"
                            />
                            <span>Auto-scroll</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => setLogs([])}
                            className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                        >
                            Clear Logs
                        </button>
                    </div>
                </div>

                <div ref={logContainerRef} className="space-y-1 max-h-72 overflow-y-auto pr-2 font-mono text-[11px]">
                    {logs.length === 0 ? (
                        <p className="text-slate-600 italic">No scraper output recorded yet. Launch a sync task above to view real-time logs.</p>
                    ) : (
                        logs.map((log, idx) => (
                            <div
                                key={idx}
                                className={`leading-relaxed ${
                                    log.level === 'error'
                                        ? 'text-red-400 font-bold'
                                        : log.level === 'warn'
                                        ? 'text-amber-300'
                                        : log.level === 'success'
                                        ? 'text-emerald-400 font-bold'
                                        : 'text-slate-300'
                                }`}
                            >
                                <span className="text-slate-600 mr-2">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'LOG'}]</span>
                                <span>{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Initial Scrape Modal */}
            {showInitialModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-600">
                                <Flame className="w-5 h-5" />
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Full Initial Historical Scrape</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInitialModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            This will perform a full multi-season crawl across all Swiss Table Tennis leagues, clubs, players, tournaments, and Elo history records.
                        </p>

                        <div className="space-y-3">
                            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    checked={initialOptions.skipTournaments}
                                    onChange={(e) => setInitialOptions({ ...initialOptions, skipTournaments: e.target.checked })}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5"
                                />
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white">Skip Tournaments</span>
                                    <p className="text-[11px] text-slate-500">Only scrape official league and cup championships.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    checked={initialOptions.skipElo}
                                    onChange={(e) => setInitialOptions({ ...initialOptions, skipElo: e.target.checked })}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5"
                                />
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white">Skip Elo Timelines</span>
                                    <p className="text-[11px] text-slate-500">Bypasses player ranking snapshots (faster initial test).</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    checked={initialOptions.useApi}
                                    onChange={(e) => setInitialOptions({ ...initialOptions, useApi: e.target.checked })}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5"
                                />
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white">Use REST API Player Fallback</span>
                                    <p className="text-[11px] text-slate-500">Query REST API if web HTML roster has missing licences.</p>
                                </div>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowInitialModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRunJob('initial', initialOptions)}
                                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg"
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Start Full Scrape</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Database Reset & Bulk Ingest Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/50 p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-rose-600">
                                <AlertTriangle className="w-5 h-5" />
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Danger Zone: Full Database Reset</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowResetModal(false);
                                    setResetConfirmText('');
                                }}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs space-y-2 leading-relaxed">
                            <p className="font-bold">⚠️ This will delete ALL existing database records for:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 dark:text-rose-300">
                                <li>Clubs &amp; Associations</li>
                                <li>All Athletes &amp; Licenses (except Super Admins)</li>
                                <li>Competitions, Categories &amp; Groups</li>
                                <li>Teams &amp; Team Members</li>
                                <li>Encounters, Matches &amp; Match Cards</li>
                            </ul>
                            <p className="pt-1 text-[11px]">
                                After purging, the database will be re-populated directly from the 9 normalized datasets stored in <code>storage/clicktt_storage/data/</code>.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Type <span className="font-mono text-rose-600 font-black">RESET</span> to confirm:
                            </label>
                            <input
                                type="text"
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value)}
                                placeholder="RESET"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3 py-2 text-xs font-mono font-bold text-rose-600 focus:border-rose-500 focus:outline-none tracking-wider"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowResetModal(false);
                                    setResetConfirmText('');
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleResetAndImport}
                                disabled={resetConfirmText.trim() !== 'RESET' || resetLoading || isRunning}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg disabled:opacity-40"
                            >
                                <Database className="w-3.5 h-3.5" />
                                <span>{resetLoading ? 'Starting Reset...' : 'Confirm Full Reset & Reload'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
