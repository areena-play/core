'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
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
    ExternalLink,
    Filter,
} from 'lucide-react';

interface ClickTTImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ClickTTImportModal({ isOpen, onClose, onSuccess }: ClickTTImportModalProps) {
    const [dataPath, setDataPath] = useState('C:\\Users\\DominicSonderegger\\Workspace\\clicktt-scraper\\clicktt_data');
    const [dryRun, setDryRun] = useState(false);
    const [importLicenses, setImportLicenses] = useState(true);

    const [datasetStatus, setDatasetStatus] = useState<any>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        if (isOpen) {
            checkDataset();
            setResult(null);
            setErrorMsg(null);
        }
    }, [isOpen]);

    const handleRunImport = async () => {
        setImporting(true);
        setErrorMsg(null);
        setResult(null);

        try {
            const res = await api.importClickTT({
                dataPath,
                dryRun,
                importLicenses,
            });
            setResult(res);
            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'ClickTT data import failed to execute.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!importing) onClose();
            }}
            title="ClickTT Data Migration Engine"
            subtitle="Import Swiss table tennis clubs, regional federations, player profiles, and licenses"
            icon={<Database className="w-5 h-5 text-red-500" />}
            size="lg"
        >
            <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                        <button type="button" onClick={() => setErrorMsg(null)} className="p-1 hover:opacity-75">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Directory Status Check */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-red-500" />
                            <span>Source Dataset Directory</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => checkDataset(dataPath)}
                            disabled={checkingStatus || importing}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-red-500 transition"
                        >
                            <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                            <span>Re-scan Directory</span>
                        </button>
                    </div>

                    <input
                        type="text"
                        value={dataPath}
                        onChange={(e) => setDataPath(e.target.value)}
                        placeholder="C:\path\to\clicktt_data"
                        disabled={importing}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                    />

                    {datasetStatus && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                {datasetStatus.files?.clubs ? (
                                    <FolderCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                    <FolderX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">clubs_and_teams.json</span>
                            </div>

                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                {datasetStatus.files?.players ? (
                                    <FolderCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                    <FolderX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">players.json</span>
                            </div>

                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                {datasetStatus.files?.portraits ? (
                                    <FolderCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                    <FolderX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">player_portraits.json</span>
                            </div>

                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                {datasetStatus.available ? (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                        Ready for Import
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                        Files Not Found
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Import Rules Notice (T-Card Explanation) */}
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 space-y-1.5">
                    <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Special ClickTT T-Card Architecture Handling</span>
                    </div>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                        In ClickTT, &quot;T-Card&quot; and &quot;Para T-Card&quot; (#9999 &amp; #10000) are fake placeholder clubs. The Areena engine automatically filters them out so <strong>no fake club records are created</strong>. T-Card holders are imported as managed athlete profiles with direct national federation licenses.
                    </p>
                </div>

                {/* Import Configuration Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={dryRun}
                            disabled={importing}
                            onChange={(e) => setDryRun(e.target.checked)}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5"
                        />
                        <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                Dry Run (Simulation Mode)
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Parses and validates all files without writing records to the database.
                            </div>
                        </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={importLicenses}
                            disabled={importing}
                            onChange={(e) => setImportLicenses(e.target.checked)}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5"
                        />
                        <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                Issue Active Player Licenses
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Creates approved season licenses for club players and T-Card athletes.
                            </div>
                        </div>
                    </label>
                </div>

                {/* Live Result Report */}
                {result && (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span>
                                    {result.dryRun ? 'Dry Run Simulation Complete' : 'ClickTT Import Successfully Completed'}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                {(result.durationMs / 1000).toFixed(2)}s
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20">
                                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-purple-500" />
                                    Associations
                                </div>
                                <div className="text-base font-bold text-slate-900 dark:text-white">
                                    {result.associationsProcessed} Synced
                                </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20">
                                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-blue-500" />
                                    Real Clubs
                                </div>
                                <div className="text-base font-bold text-slate-900 dark:text-white">
                                    {result.clubsProcessed} Created
                                </div>
                                <div className="text-[9px] text-slate-400">
                                    ({result.clubsSkippedFakeTCard} fake T-Card bypassed)
                                </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20">
                                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                    <Users className="w-3 h-3 text-emerald-500" />
                                    Players &amp; Users
                                </div>
                                <div className="text-base font-bold text-slate-900 dark:text-white">
                                    {result.playersProcessed} Imported
                                </div>
                                <div className="text-[9px] text-slate-400">
                                    ({result.tcardPlayersProcessed} T-Card athletes)
                                </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20">
                                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                    <Award className="w-3 h-3 text-amber-500" />
                                    Licenses Issued
                                </div>
                                <div className="text-base font-bold text-slate-900 dark:text-white">
                                    {result.licensesCreated} Passes
                                </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20 sm:col-span-2">
                                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-500" />
                                    Status
                                </div>
                                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                    {result.dryRun
                                        ? 'Ready to execute live database import'
                                        : 'Database populated and synchronized with ClickTT registry'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={importing}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-semibold"
                    >
                        {result ? 'Close' : 'Cancel'}
                    </button>

                    <button
                        type="button"
                        onClick={handleRunImport}
                        disabled={importing || (datasetStatus && !datasetStatus.available)}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition shadow"
                    >
                        {importing ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Importing ClickTT Registry...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-white" />
                                <span>{dryRun ? 'Run Simulation' : 'Execute Import'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

