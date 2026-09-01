'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { api } from '@/lib/api';
import {
    Database,
    Download,
    Upload,
    FileJson,
    Settings,
    Mail,
    Key,
    Globe,
    Server,
    CheckCircle2,
    AlertCircle,
    Send,
    Eye,
    EyeOff,
    ChevronLeft,
    Sparkles,
    ShieldAlert,
    RefreshCw,
    Lock,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { ModalPortal } from '@/components/ui/ModalPortal';

export default function AdminSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const [loading, setLoading] = useState(true);

    // Database Dump / Import State
    const [dbExporting, setDbExporting] = useState(false);
    const [dbImporting, setDbImporting] = useState(false);
    const [dbSuccess, setDbSuccess] = useState('');
    const [dbError, setDbError] = useState('');

    // Mailgun State
    const [mgApiKey, setMgApiKey] = useState('');
    const [mgHasApiKey, setMgHasApiKey] = useState(false);
    const [mgShowKey, setMgShowKey] = useState(false);
    const [mgDomain, setMgDomain] = useState('');
    const [mgUrl, setMgUrl] = useState('https://api.mailgun.net');
    const [mgFromEmail, setMgFromEmail] = useState('noreply@areena.ch');
    const [mgFromName, setMgFromName] = useState('AREENA Sports Platform');
    const [mgIsConfigured, setMgIsConfigured] = useState(false);
    const [mgSaving, setMgSaving] = useState(false);
    const [mgSuccess, setMgSuccess] = useState('');
    const [mgError, setMgError] = useState('');

    // SMTP State
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState(587);
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPass, setSmtpPass] = useState('');
    const [smtpHasPass, setSmtpHasPass] = useState(false);
    const [smtpShowPass, setSmtpShowPass] = useState(false);
    const [smtpSecure, setSmtpSecure] = useState(false);
    const [smtpFrom, setSmtpFrom] = useState('noreply@areena.ch');
    const [smtpIsConfigured, setSmtpIsConfigured] = useState(false);
    const [smtpSaving, setSmtpSaving] = useState(false);
    const [smtpSuccess, setSmtpSuccess] = useState('');
    const [smtpError, setSmtpError] = useState('');

    // Test Modal State
    const [testMode, setTestMode] = useState<'mailgun' | 'smtp' | null>(null);
    const [testRecipient, setTestRecipient] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

    const handleExportDatabase = async () => {
        setDbExporting(true);
        setDbError('');
        setDbSuccess('');
        try {
            const dump = await api.exportDatabase();
            const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `areena-database-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDbSuccess(`Database successfully dumped and downloaded (${Object.values(dump.counts || {}).reduce((x: any, y: any) => x + y, 0)} total records).`);
        } catch (err: any) {
            setDbError(err.message || 'Failed to export database.');
        } finally {
            setDbExporting(false);
        }
    };

    const handleImportDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const confirmProceed = window.confirm(
            '⚠️ WARNING: Importing a database backup will overwrite existing records in the database with the contents of the dump file. Are you sure you want to proceed?'
        );
        if (!confirmProceed) {
            e.target.value = '';
            return;
        }

        setDbImporting(true);
        setDbError('');
        setDbSuccess('');

        try {
            const text = await file.text();
            const dumpData = JSON.parse(text);
            const res = await api.importDatabase(dumpData);
            const totalRestored = Object.values(res.importedCounts || {}).reduce((x: any, y: any) => x + y, 0);
            setDbSuccess(`Database backup successfully restored! Total records imported: ${totalRestored}.`);
        } catch (err: any) {
            setDbError(err.message || 'Failed to import database file. Please ensure it is a valid AREENA JSON dump.');
        } finally {
            setDbImporting(false);
            e.target.value = '';
        }
    };

    const loadSettings = async () => {
        try {
            const data = await api.getAdminSettings();
            if (data?.mailgun) {
                setMgDomain(data.mailgun.domain || '');
                setMgUrl(data.mailgun.url || 'https://api.mailgun.net');
                setMgFromEmail(data.mailgun.fromEmail || 'noreply@areena.ch');
                setMgFromName(data.mailgun.fromName || 'AREENA Sports Platform');
                setMgHasApiKey(data.mailgun.hasApiKey);
                setMgIsConfigured(data.mailgun.isConfigured);
                if (data.mailgun.hasApiKey) {
                    setMgApiKey(data.mailgun.apiKey || '');
                }
            }
            if (data?.smtp) {
                setSmtpHost(data.smtp.host || '');
                setSmtpPort(data.smtp.port || 587);
                setSmtpUser(data.smtp.user || '');
                setSmtpHasPass(data.smtp.hasPassword);
                setSmtpSecure(data.smtp.secure || false);
                setSmtpFrom(data.smtp.from || 'noreply@areena.ch');
                setSmtpIsConfigured(data.smtp.isConfigured);
            }
            if (user?.email && !testRecipient) {
                setTestRecipient(user.email);
            }
        } catch (err: any) {
            console.error('Failed to load admin settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.isSuperAdmin) {
            loadSettings();
        }
    }, [user]);

    const handleSaveMailgun = async (e: React.FormEvent) => {
        e.preventDefault();
        setMgSaving(true);
        setMgError('');
        setMgSuccess('');
        try {
            const payload: any = {
                domain: mgDomain,
                url: mgUrl,
                fromEmail: mgFromEmail,
                fromName: mgFromName,
            };
            if (mgApiKey && !mgApiKey.includes('••••••••')) {
                payload.apiKey = mgApiKey;
            }
            const res = await api.updateMailgunSettings(payload);
            setMgSuccess(res.message || 'Mailgun settings saved successfully.');
            setMgHasApiKey(res.mailgun?.hasApiKey);
            setMgIsConfigured(res.mailgun?.isConfigured);
            if (payload.apiKey) {
                setMgApiKey('••••••••••••••••••••••••');
            }
        } catch (err: any) {
            setMgError(err.message || 'Failed to save Mailgun settings');
        } finally {
            setMgSaving(false);
        }
    };

    const handleSaveSmtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSmtpSaving(true);
        setSmtpError('');
        setSmtpSuccess('');
        try {
            const payload: any = {
                host: smtpHost,
                port: Number(smtpPort),
                user: smtpUser,
                secure: smtpSecure,
                from: smtpFrom,
            };
            if (smtpPass && !smtpPass.includes('••••••••')) {
                payload.pass = smtpPass;
            }
            const res = await api.updateSmtpSettings(payload);
            setSmtpSuccess(res.message || 'SMTP settings saved successfully.');
            setSmtpHasPass(res.smtp?.hasPassword);
            setSmtpIsConfigured(res.smtp?.isConfigured);
            if (payload.pass) {
                setSmtpPass('••••••••••••••••••••••••');
            }
        } catch (err: any) {
            setSmtpError(err.message || 'Failed to save SMTP settings');
        } finally {
            setSmtpSaving(false);
        }
    };

    const handleDispatchTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setTesting(true);
        setTestResult(null);
        try {
            let res: any;
            if (testMode === 'mailgun') {
                res = await api.testMailgunSettings(testRecipient);
            } else {
                res = await api.testSmtpSettings(testRecipient);
            }
            setTestResult({ success: true, message: res.message });
        } catch (err: any) {
            setTestResult({ success: false, error: err.message || 'Test delivery failed.' });
        } finally {
            setTesting(false);
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
                description="System configuration settings are strictly reserved for platform Super Administrators."
                requiredRole="Super Administrator"
                returnHref="/"
            />
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-16">
            {/* Back Link */}
            <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Admin Dashboard</span>
            </Link>

            {/* Header Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider border border-red-500/20">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Global Platform Configuration</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="h-6 w-6 text-red-500" />
                    <span>{t('nav.systemSettings')}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Manage installation-wide email delivery credentials stored securely in the database (Mailgun REST API & Standard SMTP). Different server deployments configure their own keys directly here without needing changes to raw <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-red-500">.env</code> files.
                </p>
            </div>

            {/* 1. MAILGUN REST API GATEWAY */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                Mailgun REST API Delivery Service
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                High-volume batch newsletter & transactional delivery engine (Primary).
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {mgIsConfigured ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Configured & Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3.5 w-3.5" /> Not Configured
                            </span>
                        )}
                        {mgIsConfigured && (
                            <button
                                type="button"
                                onClick={() => {
                                    setTestMode('mailgun');
                                    setTestResult(null);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                            >
                                <Send className="h-3.5 w-3.5 text-red-500" />
                                <span>Test Mailgun</span>
                            </button>
                        )}
                    </div>
                </div>

                {mgError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>{mgError}</div>
                    </div>
                )}
                {mgSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>{mgSuccess}</div>
                    </div>
                )}

                <form onSubmit={handleSaveMailgun} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Mailgun REST API Key *
                        </label>
                        <div className="relative">
                            <input
                                type={mgShowKey ? 'text' : 'password'}
                                required={!mgHasApiKey}
                                placeholder={mgHasApiKey ? '•••••••••••••••••••••••• (Leave blank to keep existing key)' : 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                                value={mgApiKey}
                                onChange={(e) => setMgApiKey(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pr-10 pl-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setMgShowKey(!mgShowKey)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                            >
                                {mgShowKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Mailgun Sending Domain *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. mail.areena.ch"
                                value={mgDomain}
                                onChange={(e) => setMgDomain(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Mailgun API Regional Host *
                            </label>
                            <select
                                value={mgUrl}
                                onChange={(e) => setMgUrl(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none font-medium"
                            >
                                <option value="https://api.mailgun.net">US Region (https://api.mailgun.net)</option>
                                <option value="https://api.eu.mailgun.net">EU Region (https://api.eu.mailgun.net)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Default Sender Email Address *
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="noreply@areena.ch"
                                value={mgFromEmail}
                                onChange={(e) => setMgFromEmail(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Default Sender Display Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="AREENA Sports Platform"
                                value={mgFromName}
                                onChange={(e) => setMgFromName(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={mgSaving}
                            className="rounded-xl bg-red-600 hover:bg-red-700 px-6 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {mgSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                            <span>{mgSaving ? 'Saving...' : 'Save Mailgun Settings'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* 2. SMTP EMAIL RELAY */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Server className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                Standard SMTP Email Relay
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Direct SMTP connection (STARTTLS on port 587, SSL/TLS on port 465).
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {smtpIsConfigured ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 text-xs font-bold">
                                Optional / Unset
                            </span>
                        )}
                        {smtpIsConfigured && (
                            <button
                                type="button"
                                onClick={() => {
                                    setTestMode('smtp');
                                    setTestResult(null);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                            >
                                <Send className="h-3.5 w-3.5 text-blue-500" />
                                <span>Test SMTP</span>
                            </button>
                        )}
                    </div>
                </div>

                {smtpError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>{smtpError}</div>
                    </div>
                )}
                {smtpSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>{smtpSuccess}</div>
                    </div>
                )}

                <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                SMTP Server Host
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. smtp.mailgun.org, smtp.sendgrid.net, mail.areena.ch"
                                value={smtpHost}
                                onChange={(e) => setSmtpHost(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                SMTP Port
                            </label>
                            <input
                                type="number"
                                placeholder="587"
                                value={smtpPort}
                                onChange={(e) => setSmtpPort(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                SMTP Username
                            </label>
                            <input
                                type="text"
                                placeholder="postmaster@mail.areena.ch"
                                value={smtpUser}
                                onChange={(e) => setSmtpUser(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                SMTP Password
                            </label>
                            <div className="relative">
                                <input
                                    type={smtpShowPass ? 'text' : 'password'}
                                    placeholder={smtpHasPass ? '•••••••••••••••• (Leave blank to keep)' : 'Enter SMTP password'}
                                    value={smtpPass}
                                    onChange={(e) => setSmtpPass(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pr-10 pl-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSmtpShowPass(!smtpShowPass)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                >
                                    {smtpShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Sender 'From' Address
                            </label>
                            <input
                                type="text"
                                placeholder="noreply@areena.ch"
                                value={smtpFrom}
                                onChange={(e) => setSmtpFrom(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={smtpSecure}
                                    onChange={(e) => setSmtpSecure(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Require Direct SSL/TLS (Port 465)
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={smtpSaving}
                            className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-6 py-2.5 text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {smtpSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                            <span>{smtpSaving ? 'Saving...' : 'Save SMTP Settings'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Database Management & JSON Dump / Import */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Database className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Database Backup & JSON Dump / Import
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Complete platform database export and restore functionality. Dump all records to a structured JSON file or import a backup.
                            </p>
                        </div>
                    </div>
                    <span className="rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                        Full Snapshot
                    </span>
                </div>

                {dbSuccess && (
                    <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{dbSuccess}</span>
                    </div>
                )}

                {dbError && (
                    <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{dbError}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-5 space-y-3">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                            <Download className="h-4 w-4 text-purple-500" />
                            <span>Export Full Database (JSON)</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Generates a complete JSON backup containing all platform entities (users, associations, clubs, competitions, licenses, encounters, matches, invoices, and settings).
                        </p>
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleExportDatabase}
                                disabled={dbExporting}
                                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {dbExporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                <span>{dbExporting ? 'Generating JSON Dump...' : 'Download Database JSON Dump'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Import Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-5 space-y-3">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                            <Upload className="h-4 w-4 text-amber-500" />
                            <span>Import Database (JSON)</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Restore the platform database from an exported JSON file. <strong className="text-red-500">Warning:</strong> Importing replaces existing records with the data from the dump file.
                        </p>
                        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <label className={`cursor-pointer rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-5 py-2.5 text-xs font-bold shadow transition flex items-center gap-2 ${dbImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                                {dbImporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
                                <span>{dbImporting ? 'Importing...' : 'Select JSON File & Restore'}</span>
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleImportDatabase}
                                    disabled={dbImporting}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Email Modal */}
            {testMode && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                    <Send className="h-4 w-4 text-red-500" />
                                    <span>Dispatch {testMode === 'mailgun' ? 'Mailgun' : 'SMTP'} Test Email</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTestMode(null);
                                        setTestResult(null);
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    ✕
                                </button>
                            </div>

                            {testResult && (
                                <div
                                    className={`rounded-2xl p-3 text-xs font-semibold ${
                                        testResult.success
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                            : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                                    }`}
                                >
                                    {testResult.success ? testResult.message : testResult.error}
                                </div>
                            )}

                            <form onSubmit={handleDispatchTest} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Target Recipient Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="admin@example.com"
                                        value={testRecipient}
                                        onChange={(e) => setTestRecipient(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTestMode(null);
                                            setTestResult(null);
                                        }}
                                        className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={testing}
                                        className="rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        <span>{testing ? 'Dispatching...' : 'Send Live Test'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}