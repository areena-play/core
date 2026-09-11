'use client';

import React, { useState, useEffect } from 'react';
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
    FolderX,
    RefreshCw,
    X,
    ChevronLeft,
    Filter,
    ShieldAlert,
    FileJson,
    ArrowRight,
    Terminal,
    Sparkles,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';

export default function AdminClickTTPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const [dataPath, setDataPath] = useState('C:\\Users\\DominicSonderegger\\Workspace\\clicktt-scraper\\clicktt_data');
    const [dryRun, setDryRun] = useState(false);
    const [importLicenses, setImportLicenses] = useState(true);

    const [datasetStatus, setDatasetStatus] = useState<any>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const checkDataset = async (pathToCheck?: string) => {
        setCheckingStatus(true);
        setErrorMsg(null);
        try {
            const res = await api.getClickTTStatus(pathToCheck || dataPath);
            setDatasetStatus(res);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to inspect dataset directory');
        } finally {
            setCheckingStatus(false);
        }
    };

    useEffect(() => {
        if (user?.isSuperAdmin) {
            checkDataset();
        }
    }, [user]);

    const handleRunImport = async () => {
        setImporting(true);
        setErrorMsg(null);
        setResult(null);
        setLogs((prev) => [
            `[${new Date().toLocaleTimeString()}] Starting ClickTT Data Migration (${dryRun ? 'DRY-RUN / Simulation' : 'LIVE DATABASE WRITE'})...`,
            `[${new Date().toLocaleTimeString()}] Reading dataset from: ${dataPath}`,
            ...prev,
        ]);

        try {
            const res = await api.importClickTT({
                dataPath,
                dryRun,
                importLicenses,
            });
            setResult(res);
            setLogs((prev) => [
                `[${new Date().toLocaleTimeString()}] ✓ Migration successfully finished in ${(res.durationMs / 1000).toFixed(2)}s.`,
                `[${new Date().toLocaleTimeString()}] Summary: ${res.associationsProcessed} Associations, ${res.seasonsProcessed || 0} Seasons, ${res.clubsProcessed} Real Clubs, ${res.competitionsProcessed || 0} Competitions, ${res.categoriesProcessed || 0} Categories, ${res.playersProcessed} Athletes, ${res.licensesCreated} Licenses.`,
                ...prev,
            ]);
        } catch (err: any) {
            const msg = err.message || 'ClickTT data import failed to execute.';
            setErrorMsg(msg);
            setLogs((prev) => [
                `[${new Date().toLocaleTimeString()}] ❌ Migration failed: ${msg}`,
                ...prev,
            ]);
        } finally {
            setImporting(false);
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
                description="This migration control plane is strictly reserved for platform Super Administrators."
                requiredRole="Super Administrator"
                returnHref="/"
            />
        );
    }

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
                    <div className="relative z-10 space-y-2 max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-red-400">
                            <Database className="h-3.5 w-3.5" />
                            <span>ClickTT Data Ingestion Pipeline</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                            ClickTT Registry Migration Engine
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Ingest official Swiss Table Tennis (STT) and regional association datasets directly from clicktt-scraper JSON dumps. Creates clubs, athletes, national licensing passports, and ranking profiles without fake club clutter.
                        </p>
                    </div>
                    <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
                </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
                <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <span className="text-xs font-semibold">{errorMsg}</span>
                    </div>
                    <button type="button" onClick={() => setErrorMsg(null)} className="p-1 hover:opacity-75">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Main Grid: Source & Configuration / Rules */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2 cols): Source Configuration & Execution */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Source Dataset Directory */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Database className="w-4 h-4 text-red-500" />
                                <span>Dataset Source Configuration</span>
                            </h2>
                            <button
                                type="button"
                                onClick={() => checkDataset(dataPath)}
                                disabled={checkingStatus || importing}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-500 transition"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                                <span>Scan Directory</span>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Local Directory Path (clicktt-scraper output)
                            </label>
                            <input
                                type="text"
                                value={dataPath}
                                onChange={(e) => setDataPath(e.target.value)}
                                placeholder="C:\path\to\clicktt_data"
                                disabled={importing}
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        {/* Files Status */}
                        {datasetStatus && (
                            <div className="space-y-2 pt-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Discovered JSON Datasets
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {datasetStatus.files?.clubs ? (
                                                <FolderCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                            ) : (
                                                <FolderX className="w-4 h-4 text-slate-400 shrink-0" />
                                            )}
                                            <span className="font-mono text-xs truncate">clubs_and_teams.json</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {datasetStatus.files?.players ? (
                                                <FolderCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                            ) : (
                                                <FolderX className="w-4 h-4 text-slate-400 shrink-0" />
                                            )}
                                            <span className="font-mono text-xs truncate">players.json</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {datasetStatus.files?.portraits ? (
                                                <FolderCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                            ) : (
                                                <FolderX className="w-4 h-4 text-slate-400 shrink-0" />
                                            )}
                                            <span className="font-mono text-xs truncate">player_portraits.json</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Migration Options & Launch */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>Execution Mode &amp; Options</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                                <input
                                    type="checkbox"
                                    checked={dryRun}
                                    disabled={importing}
                                    onChange={(e) => setDryRun(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-1 h-4 w-4"
                                />
                                <div className="space-y-0.5">
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                                        Dry Run Simulation Mode
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Parses all JSON files and validates records without committing any mutations to PostgreSQL.
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                                <input
                                    type="checkbox"
                                    checked={importLicenses}
                                    disabled={importing}
                                    onChange={(e) => setImportLicenses(e.target.checked)}
                                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-1 h-4 w-4"
                                />
                                <div className="space-y-0.5">
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                                        Issue Player Licenses
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Automatically creates and attaches active seasonal license passports for all athletes.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {datasetStatus?.available ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4" /> Ready to process ~12,500 player profiles
                                    </span>
                                ) : (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                                        <AlertTriangle className="h-4 w-4" /> Directory scan pending or files missing
                                    </span>
                                )}
                            </span>

                            <button
                                type="button"
                                onClick={handleRunImport}
                                disabled={importing || (datasetStatus && !datasetStatus.available)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-50 transition shadow-lg"
                            >
                                {importing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Processing ClickTT Registry...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 fill-white" />
                                        <span>{dryRun ? 'Start Simulation Run' : 'Execute ClickTT Migration'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Architectural Rules & Safeguards */}
                <div className="space-y-6">
                    {/* T-Card Architecture Notice */}
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-5 space-y-3">
                        <div className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            <span>T-Card Fake Club Filtration</span>
                        </div>
                        <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                            In ClickTT, <strong>&quot;T-Card&quot; (#9999)</strong> and <strong>&quot;Para T-Card&quot; (#10000)</strong> are synthetic placeholder clubs used to attach player licenses.
                        </p>
                        <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                            Areena&apos;s migration engine automatically filters these dummy clubs out. T-Card holders are imported as managed athlete profiles with direct national licenses attached to the Swiss federation.
                        </p>
                    </div>

                    {/* Migration Highlights Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-3 text-xs">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500" />
                            <span>Preserved Data Points</span>
                        </h3>
                        <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                <span>Official STT license numbers (e.g. <code>#123456</code>)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                <span>Elo ranking points and Swiss classified levels (D1–A20)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                <span>Complete 9-Association regional hierarchy mappings</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                <span>High-resolution player portraits &amp; profile avatars</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Results Overview (When completed) */}
            {result && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 p-6 space-y-4 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="font-bold text-base text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span>
                                {result.dryRun ? 'Dry Run Simulation Complete' : 'ClickTT Registry Ingestion Succeeded'}
                            </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
                            Executed in {(result.durationMs / 1000).toFixed(2)}s
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-purple-500" />
                                Associations
                            </div>
                            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                                {result.associationsProcessed}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Synchronized</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                Seasons
                            </div>
                            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                                {result.seasonsProcessed || 0}
                            </div>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Bundled</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                Real Clubs
                            </div>
                            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                                {result.clubsProcessed}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Imported</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                Competitions
                            </div>
                            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                                {result.competitionsProcessed || 0}
                            </div>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Leagues &amp; Cups</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <FolderCheck className="w-3.5 h-3.5 text-emerald-500" />
                                Categories
                            </div>
                            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                                {result.categoriesProcessed || 0}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Divisions</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-emerald-500" />
                                Athletes
                            </div>
                            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                                {result.playersProcessed}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Active Roster</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-cyan-500" />
                                Licenses
                            </div>
                            <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                                {result.licensesCreated}
                            </div>
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">Passports</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                            href="/competitions"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                        >
                            <span>Explore Competitions &amp; Leagues</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href="/admin/users"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition"
                        >
                            <span>Inspect Users Directory</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href="/clubs"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                            <span>View Affiliated Clubs</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Execution Console & Live Terminal Log */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-5 shadow-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 font-bold">
                        <Terminal className="h-4 w-4 text-emerald-400" />
                        <span>Migration Terminal Log</span>
                    </div>
                    {logs.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setLogs([])}
                            className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                        >
                            Clear Console
                        </button>
                    )}
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
                    {logs.length === 0 ? (
                        <p className="text-slate-600 italic">No migration runs initiated yet. Press &quot;Execute ClickTT Migration&quot; above to begin.</p>
                    ) : (
                        logs.map((log, idx) => (
                            <div key={idx} className="text-slate-300 leading-relaxed">
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

