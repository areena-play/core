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
    StopCircle,
    Square,
    Loader2,
    Upload,
    Download,
    Package,
    Server,
    HardDrive,
    FileArchive,
    FileCheck,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Modal } from '@/components/ui/Modal';

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

    const [activeTab, setActiveTab] = useState<'scraper' | 'cronjobs' | 'config' | 'transfer'>('scraper');

    // Scraper Status & Logs
    const [scraperStatus, setScraperStatus] = useState<any>(null);
    const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);
    const [autoScrollLogs, setAutoScrollLogs] = useState(true);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Data Transfer (Import / Export Scraped Archive)
    const [exportingArchive, setExportingArchive] = useState(false);
    const [includeCacheInExport, setIncludeCacheInExport] = useState(false);
    const [importingArchive, setImportingArchive] = useState(false);
    const [importTriggerIngest, setImportTriggerIngest] = useState(true);
    const [importResult, setImportResult] = useState<any | null>(null);
    const [selectedArchiveFile, setSelectedArchiveFile] = useState<File | null>(null);
    const archiveFileInputRef = useRef<HTMLInputElement>(null);

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
    const [stoppingJob, setStoppingJob] = useState(false);

    // Fetch Scraper Status (silent to prevent top loading bar distraction)
    const fetchStatus = async (silent: boolean = true) => {
        try {
            const res = await api.admin.getScraperStatus(silent);
            setScraperStatus(res);
        } catch (err) {
            // Ignore background error
        }
    };

    // Fetch Logs (silent)
    const fetchLogs = async (silent: boolean = true) => {
        try {
            const res = await api.admin.getScraperLogs(300, silent);
            if (res && Array.isArray(res.logs)) {
                setLogs(res.logs);
            }
        } catch (err) {
            // Ignore log polling error
        }
    };

    // Fetch Config
    const fetchConfig = async (silent: boolean = false) => {
        setConfigLoading(true);
        try {
            const cfg = await api.admin.getScraperConfig(silent);
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

    // Fetch Cronjobs (silent)
    const fetchCronJobs = async (silent: boolean = true) => {
        setCronLoading(true);
        try {
            const res = await api.admin.getCronJobs(silent);
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
            fetchStatus(true);
            fetchLogs(true);
            fetchConfig(false);
            fetchCronJobs(true);
        }
    }, [user]);

    // Polling while scraper is active or on scraper tab (all silent)
    useEffect(() => {
        if (!user?.isSuperAdmin) return;
        const pollInterval = scraperStatus?.isRunning ? 1000 : 3000;
        const interval = setInterval(() => {
            fetchStatus(true);
            fetchLogs(true);
            if (activeTab === 'cronjobs') {
                fetchCronJobs(true);
            }
        }, pollInterval);
        return () => clearInterval(interval);
    }, [user, activeTab, scraperStatus?.isRunning]);

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

    // Stop currently running Scraper / Ingestion Job
    const handleStopJob = async () => {
        if (!isRunning) return;
        setStoppingJob(true);
        setActionMsg(null);
        try {
            const res = await api.admin.stopScraperJob(false);
            if (res.success) {
                setActionMsg({ type: 'success', text: res.message || 'Scraper / DB ingestion task stopped.' });
            } else {
                setActionMsg({ type: 'error', text: res.message || 'No active task found to stop.' });
            }
            await fetchStatus(true);
            await fetchLogs(true);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to stop task.' });
        } finally {
            setStoppingJob(false);
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

    // Export Scraped Archive (.tar.gz)
    const handleExportArchive = async () => {
        setExportingArchive(true);
        setActionMsg(null);
        try {
            const token = localStorage.getItem('areena_token') || '';
            const downloadUrl = `/api/v1/admin/scraper/export-archive?token=${encodeURIComponent(token)}${includeCacheInExport ? '&cache=true' : ''}`;

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `clicktt_scraped_data_${new Date().toISOString().slice(0, 10)}.tar.gz`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setActionMsg({
                type: 'success',
                text: 'Archive generation and stream download started in your browser. Check your browser download bar for progress.'
            });
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to export scraped archive.' });
        } finally {
            setTimeout(() => setExportingArchive(false), 2000);
        }
    };

    // Import Scraped Archive (.tar.gz)
    const handleImportArchive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArchiveFile) {
            setActionMsg({ type: 'error', text: 'Please select an archive file to upload.' });
            return;
        }
        setImportingArchive(true);
        setActionMsg(null);
        setImportResult(null);
        try {
            const res = await api.admin.importScrapedArchive(selectedArchiveFile, { triggerIngest: importTriggerIngest });
            setImportResult(res);
            setActionMsg({
                type: 'success',
                text: res.message || 'Archive successfully uploaded and extracted.'
            });
            if (archiveFileInputRef.current) {
                archiveFileInputRef.current.value = '';
            }
            setSelectedArchiveFile(null);
            if (importTriggerIngest) {
                fetchStatus();
                fetchLogs();
            }
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to upload archive: ' + err.message });
        } finally {
            setImportingArchive(false);
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
    const progress = scraperStatus?.progress;
    const currentPhase = progress?.phase || 'cleanup';
    const progressPercentage = typeof progress?.percentage === 'number' ? Math.min(100, Math.max(0, progress.percentage)) : isRunning ? 5 : 0;

    const INGESTION_STEPS = [
        { key: 'cleanup', label: '1. Cleanup', phases: ['cleanup'] },
        { key: 'associations', label: '2. Hierarchy', phases: ['associations'] },
        { key: 'seasons', label: '3. Seasons', phases: ['seasons'] },
        { key: 'clubs', label: '4. Clubs & Athletes', phases: ['clubs', 'players'] },
        { key: 'snapshots', label: '5. Rating Timeline', phases: ['snapshots'] },
        { key: 'hierarchy', label: '6. Competitions', phases: ['hierarchy'] },
        { key: 'encounters', label: '7. Encounters', phases: ['encounters'] },
        { key: 'matches', label: '8. Matches', phases: ['matches'] },
    ];

    const getStepStatus = (stepPhases: string[]) => {
        if (currentPhase === 'done' || progressPercentage === 100) return 'completed';
        if (stepPhases.includes(currentPhase)) return 'active';

        const phaseOrder = ['cleanup', 'associations', 'seasons', 'clubs', 'players', 'snapshots', 'hierarchy', 'encounters', 'matches', 'done'];
        const currentIdx = phaseOrder.indexOf(currentPhase);
        const maxStepIdx = Math.max(...stepPhases.map((p) => phaseOrder.indexOf(p)));

        if (currentIdx > maxStepIdx) return 'completed';
        return 'pending';
    };

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

                        {/* Live Status Pill & Stop Button */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3">
                                <div className={`h-3.5 w-3.5 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                                <div className="text-xs font-mono">
                                    <div className="text-slate-400 font-bold uppercase text-[10px]">Scraper Engine Status</div>
                                    <div className="font-bold text-white flex items-center gap-2 mt-0.5">
                                        <span>{isRunning ? `Running: ${scraperStatus?.activeJob?.toUpperCase()}` : 'Idle / Ready'}</span>
                                        {isRunning && <span className="text-amber-300 text-[11px]">({scraperStatus?.elapsedSec || 0}s)</span>}
                                        {isRunning && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono text-[11px] border border-amber-500/30">
                                                {progressPercentage}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Transfer Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportArchive}
                                    disabled={exportingArchive || isRunning}
                                    className="px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/15 transition disabled:opacity-50"
                                    title="Export and download scraped Click-TT data archive (.tar.gz)"
                                >
                                    {exportingArchive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-purple-400" />}
                                    <span className="hidden sm:inline">Export Cache</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('transfer')}
                                    className="px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/15 transition"
                                    title="Open Upload / Import Data Transfer tab"
                                >
                                    <Upload className="w-4 h-4 text-blue-400" />
                                    <span className="hidden sm:inline">Upload Cache</span>
                                </button>
                            </div>

                            {isRunning && (
                                <button
                                    type="button"
                                    onClick={handleStopJob}
                                    disabled={stoppingJob}
                                    className="px-4 py-3.5 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-red-600/30 border border-red-500/40 transition active:scale-95 disabled:opacity-50 shrink-0"
                                >
                                    {stoppingJob ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <StopCircle className="w-4 h-4 text-white" />
                                    )}
                                    <span>Stop Task</span>
                                </button>
                            )}
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

                <button
                    type="button"
                    onClick={() => setActiveTab('transfer')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                        activeTab === 'transfer'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Package className="w-4 h-4" />
                    <span>Data Transfer &amp; Sync</span>
                </button>
            </div>

            {/* TAB 1: Scraper Operations */}
            {activeTab === 'scraper' && (
                <div className="space-y-6">
                    {/* Live Ingestion & Sync Progress Card */}
                    {(isRunning || (progress && progress.phase !== 'done' && progress.phase !== 'error')) && (
                        <div className="rounded-3xl border border-red-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/40 p-6 sm:p-7 text-white shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-mono font-bold uppercase tracking-wider border border-red-500/30">
                                            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                                            {scraperStatus?.activeJob ? `Task: ${scraperStatus.activeJob.toUpperCase()}` : 'Active Ingestion'}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-300">
                                            {progress?.phaseTitle || 'Processing Pipeline'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {progress?.message || 'Streaming records into PostgreSQL database...'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {progress?.ratePerSec ? (
                                        <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-right">
                                            <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Speed</div>
                                            <div className="text-xs font-mono font-bold text-amber-300">
                                                ⚡ {formatNumber(progress.ratePerSec)}/s
                                            </div>
                                        </div>
                                    ) : null}

                                    {progress?.etaSec ? (
                                        <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-right">
                                            <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">ETA</div>
                                            <div className="text-xs font-mono font-bold text-slate-200">
                                                ~{Math.floor(progress.etaSec / 60)}m {progress.etaSec % 60}s
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right">
                                        <div className="text-[10px] text-amber-400 uppercase font-mono font-black">Progress</div>
                                        <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                                            {progressPercentage}%
                                        </div>
                                    </div>

                                    {isRunning && (
                                        <button
                                            type="button"
                                            onClick={handleStopJob}
                                            disabled={stoppingJob}
                                            className="px-3.5 py-2.5 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 border border-red-500/50 transition active:scale-95 disabled:opacity-50 shrink-0"
                                            title="Stop current scraper or ingestion pipeline"
                                        >
                                            {stoppingJob ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <StopCircle className="w-4 h-4 text-white" />
                                            )}
                                            <span>Stop Pipeline</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Animated Progress Bar Track */}
                            <div className="space-y-2 relative z-10">
                                <div className="h-4 w-full rounded-full bg-slate-900/90 p-0.5 border border-white/10 overflow-hidden shadow-inner relative">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-300 relative shadow-md"
                                        style={{ width: `${Math.max(2, progressPercentage)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                    <span>
                                        Processed: <strong className="text-white">{formatNumber(progress?.processed)}</strong>
                                        {progress?.total ? <> / {formatNumber(progress.total)}</> : null}
                                    </span>
                                    <span>Elapsed: <strong className="text-white">{scraperStatus?.elapsedSec || 0}s</strong></span>
                                </div>
                            </div>

                            {/* Stage Stepper Badges */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-white/10 relative z-10">
                                {INGESTION_STEPS.map((step) => {
                                    const status = getStepStatus(step.phases);
                                    return (
                                        <div
                                            key={step.key}
                                            className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center gap-1 ${
                                                status === 'completed'
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                    : status === 'active'
                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-2 ring-amber-500/30 animate-pulse'
                                                    : 'bg-white/5 border-white/5 text-slate-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                                                {status === 'completed' && <Check className="w-3 h-3 text-emerald-400" />}
                                                {status === 'active' && <RefreshCw className="w-3 h-3 text-amber-300 animate-spin" />}
                                                <span>{step.label}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
                        </div>
                    )}

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
                            onClick={() => fetchCronJobs(true)}
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

            {/* TAB 4: Data Transfer & Cache Sync */}
            {activeTab === 'transfer' && (
                <div className="space-y-6">
                    {/* Header Banner */}
                    <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 dark:border-blue-900/40 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/40 p-6 sm:p-7 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                                <HardDrive className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                    Click-TT Scraped Data & Cache Transfer
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Transfer scraped cache, raw JSONL records, and normalized datasets between local dev and remote servers without re-scraping.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Transfer Grid: Export & Import Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Export Card */}
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                        <Download className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            Export Scraped Data Archive
                                        </h3>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            Target: .tar.gz compressed package
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Packs all raw scraped entity streams (<code>*.jsonl</code>), normalized datasets (<code>data/*.json</code>), and pipeline checkpoints into a single compressed tarball.
                                </p>

                                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                                    <div className="font-bold text-slate-700 dark:text-slate-300">Archive Contents:</div>
                                    <ul className="list-disc list-inside space-y-0.5 font-mono text-[10px]">
                                        <li>storage/clicktt_storage/*.jsonl (clubs, players, leagues, elo)</li>
                                        <li>storage/clicktt_storage/data/*.json (9 normalized datasets)</li>
                                        <li>storage/clicktt_storage/checkpoints/ (pipeline checkpoint state)</li>
                                    </ul>
                                </div>

                                <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-1">
                                    <input
                                        type="checkbox"
                                        checked={includeCacheInExport}
                                        onChange={(e) => setIncludeCacheInExport(e.target.checked)}
                                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5"
                                    />
                                    <div>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            Include Raw Web HTML Cache
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                            Includes ~39,000 raw crawled HTML pages (~830MB). Leave unchecked for fastest export (datasets and records only).
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <button
                                type="button"
                                onClick={handleExportArchive}
                                disabled={exportingArchive}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white py-3 text-xs font-bold transition shadow-sm disabled:opacity-50"
                            >
                                {exportingArchive ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span>Compressing & Downloading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        <span>Download Scraped Archive (.tar.gz)</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 2. Import Card */}
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                        <Upload className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            Upload Scraped Data Archive
                                        </h3>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            Extracts directly into storage directory
                                        </span>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Upload an archive generated from your local dev environment to restore datasets on this server instantly.
                                </p>

                                <form id="importArchiveForm" onSubmit={handleImportArchive} className="space-y-3">
                                    <input
                                        ref={archiveFileInputRef}
                                        type="file"
                                        accept=".tar.gz,.gz,.tgz,.zip"
                                        onChange={(e) => setSelectedArchiveFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                                    />

                                    {selectedArchiveFile && (
                                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                                            <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                                            <span>Selected: <strong>{selectedArchiveFile.name}</strong> ({formatBytes(selectedArchiveFile.size)})</span>
                                        </div>
                                    )}

                                    <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-1">
                                        <input
                                            type="checkbox"
                                            checked={importTriggerIngest}
                                            onChange={(e) => setImportTriggerIngest(e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                                        />
                                        <div>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                Automatically Run Database Ingestion (reset-db)
                                            </span>
                                            <p className="text-[11px] text-slate-500">
                                                Immediately loads extracted datasets into PostgreSQL after upload finishes.
                                            </p>
                                        </div>
                                    </label>
                                </form>
                            </div>

                            <button
                                type="submit"
                                form="importArchiveForm"
                                disabled={importingArchive || !selectedArchiveFile}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-bold transition shadow-sm disabled:opacity-50"
                            >
                                {importingArchive ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span>Uploading & Extracting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        <span>Upload & Extract Data Archive</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Extraction Summary Card (if just imported) */}
                    {importResult?.summary && (
                        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <span>Archive Extracted Successfully</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                                    <div className="text-[10px] text-slate-400 uppercase">Total Files</div>
                                    <div className="text-base font-bold text-slate-900 dark:text-white">
                                        {importResult.summary.totalFiles}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                                    <div className="text-[10px] text-slate-400 uppercase">Extracted Size</div>
                                    <div className="text-base font-bold text-slate-900 dark:text-white">
                                        {formatBytes(importResult.summary.totalSizeBytes)}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                                    <div className="text-[10px] text-slate-400 uppercase">Checkpoints</div>
                                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                        {importResult.summary.hasCheckpoints ? 'Available' : 'None'}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                                    <div className="text-[10px] text-slate-400 uppercase">Datasets</div>
                                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                        {importResult.summary.hasNormalizedData ? 'Normalized (9)' : 'None'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CLI Automation Guide */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-6 shadow-sm space-y-4 font-mono text-xs">
                        <div className="flex items-center gap-2 text-amber-400 font-bold">
                            <Terminal className="h-4 w-4" />
                            <span>Command-Line & Automation Workflow</span>
                        </div>

                        <p className="text-slate-400 text-xs leading-relaxed">
                            You can also export and upload data directly from your terminal or CI/CD pipelines using our CLI scripts:
                        </p>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <div className="text-slate-400 text-[11px]"># 1. Export local scraped cache into archive (.tar.gz):</div>
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs select-all">
                                    npm run clicktt:export
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="text-slate-400 text-[11px]"># 2. Upload archive directly to dev/prod server:</div>
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs select-all">
                                    npm run clicktt:upload -- --url https://dev.areena.ch --token &lt;YOUR_SUPER_ADMIN_TOKEN&gt; --ingest
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                        {isRunning && (
                            <button
                                type="button"
                                onClick={handleStopJob}
                                disabled={stoppingJob}
                                className="px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                            >
                                {stoppingJob ? <Loader2 className="w-3 h-3 animate-spin" /> : <StopCircle className="w-3 h-3" />}
                                <span>Stop Task</span>
                            </button>
                        )}
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
            <Modal
                isOpen={showInitialModal}
                onClose={() => setShowInitialModal(false)}
                title="Full Initial Historical Scrape"
                subtitle="Multi-season crawl across Swiss Table Tennis leagues, clubs, players, and tournaments"
                icon={<Flame className="w-5 h-5 text-red-500" />}
                size="md"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setShowInitialModal(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                    </>
                }
            >
                <div className="space-y-4">
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
                </div>
            </Modal>

            {/* Full Database Reset & Bulk Ingest Confirmation Modal */}
            <Modal
                isOpen={showResetModal}
                onClose={() => {
                    setShowResetModal(false);
                    setResetConfirmText('');
                }}
                title="Danger Zone: Full Database Reset"
                subtitle="Wipe all sports records and load normalized datasets"
                icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
                size="md"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setShowResetModal(false);
                                setResetConfirmText('');
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                    </>
                }
            >
                <div className="space-y-4">
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
                </div>
            </Modal>
        </div>
    );
}
