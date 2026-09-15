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
    Gauge,
    CreditCard,
    Bot,
    Volume2,
    Play,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Modal } from '@/components/ui/Modal';

export default function AdminSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const [loading, setLoading] = useState(true);

    // Database Dump / Import State
    const [dbExporting, setDbExporting] = useState(false);
    const [dbImporting, setDbImporting] = useState(false);
    const [dbSuccess, setDbSuccess] = useState('');
    const [dbError, setDbError] = useState('');

    // Gemini AI State
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [geminiHasApiKey, setGeminiHasApiKey] = useState(false);
    const [geminiShowKey, setGeminiShowKey] = useState(false);
    const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
    const [availableGeminiModels, setAvailableGeminiModels] = useState<Array<{ id: string; displayName: string; description?: string }>>([]);
    const [fetchingGeminiModels, setFetchingGeminiModels] = useState(false);
    const [isCustomModel, setIsCustomModel] = useState(false);
    const [geminiEnabled, setGeminiEnabled] = useState(true);
    const [geminiIsConfigured, setGeminiIsConfigured] = useState(false);
    const [geminiSaving, setGeminiSaving] = useState(false);
    const [geminiTesting, setGeminiTesting] = useState(false);
    const [geminiSuccess, setGeminiSuccess] = useState('');
    const [geminiError, setGeminiError] = useState('');
    const [geminiTestResponse, setGeminiTestResponse] = useState('');

    // Google Cloud Text-to-Speech State
    const [ttsApiKey, setTtsApiKey] = useState('');
    const [ttsHasApiKey, setTtsHasApiKey] = useState(false);
    const [ttsShowKey, setTtsShowKey] = useState(false);
    const [ttsLanguageCode, setTtsLanguageCode] = useState('de-CH');
    const [ttsVoiceName, setTtsVoiceName] = useState('de-CH-Wavenet-A');
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [ttsIsConfigured, setTtsIsConfigured] = useState(false);
    const [ttsSaving, setTtsSaving] = useState(false);
    const [ttsTesting, setTtsTesting] = useState(false);
    const [ttsSuccess, setTtsSuccess] = useState('');
    const [ttsError, setTtsError] = useState('');
    const [ttsPlaying, setTtsPlaying] = useState(false);

    // Stripe State
    const [stripeSecretKey, setStripeSecretKey] = useState('');
    const [stripePublishableKey, setStripePublishableKey] = useState('');
    const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
    const [stripeProMonthlyPriceId, setStripeProMonthlyPriceId] = useState('');
    const [stripeProYearlyPriceId, setStripeProYearlyPriceId] = useState('');
    const [stripeHasSecretKey, setStripeHasSecretKey] = useState(false);
    const [stripeHasWebhookSecret, setStripeHasWebhookSecret] = useState(false);
    const [stripeShowSecret, setStripeShowSecret] = useState(false);
    const [stripeShowWebhook, setStripeShowWebhook] = useState(false);
    const [stripeIsConfigured, setStripeIsConfigured] = useState(false);
    const [stripeSaving, setStripeSaving] = useState(false);
    const [stripeTesting, setStripeTesting] = useState(false);
    const [stripeSuccess, setStripeSuccess] = useState('');
    const [stripeError, setStripeError] = useState('');

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

    // Rate Limiting State
    const [rlEnabled, setRlEnabled] = useState(true);
    const [rlCapacity, setRlCapacity] = useState(120);
    const [rlRefillRate, setRlRefillRate] = useState(2);
    const [rlBlockAnonymous, setRlBlockAnonymous] = useState(true);
    const [rlSaving, setRlSaving] = useState(false);
    const [rlSuccess, setRlSuccess] = useState('');
    const [rlError, setRlError] = useState('');
    const [oauthClients, setOauthClients] = useState<any[]>([]);

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

    const fetchGeminiModels = async (keyOverride?: string) => {
        setFetchingGeminiModels(true);
        try {
            const key = keyOverride !== undefined ? keyOverride : (geminiApiKey && !geminiApiKey.includes('••••••••') ? geminiApiKey : undefined);
            const res = await api.admin.getGeminiModels(key);
            if (res?.models && res.models.length > 0) {
                setAvailableGeminiModels(res.models);
            }
        } catch (err: any) {
            console.warn('Failed to fetch available Gemini models:', err);
        } finally {
            setFetchingGeminiModels(false);
        }
    };

    const loadSettings = async () => {
        try {
            const [data, clientsData] = await Promise.all([
                api.getAdminSettings(),
                api.getOAuthClients({ all: true }).catch(() => []),
            ]);
            setOauthClients(clientsData || []);
            if (data?.gemini) {
                setGeminiModel(data.gemini.model || 'gemini-2.0-flash');
                setGeminiEnabled(data.gemini.enabled !== false);
                setGeminiHasApiKey(data.gemini.hasApiKey);
                setGeminiIsConfigured(data.gemini.isConfigured);
                if (data.gemini.hasApiKey) {
                    setGeminiApiKey(data.gemini.apiKey || '');
                }
                // Fetch models dynamically
                fetchGeminiModels();
            }
            if (data?.googleTts) {
                setTtsLanguageCode(data.googleTts.languageCode || 'de-CH');
                setTtsVoiceName(data.googleTts.voiceName || 'de-CH-Wavenet-A');
                setTtsEnabled(data.googleTts.enabled !== false);
                setTtsHasApiKey(data.googleTts.hasApiKey);
                setTtsIsConfigured(data.googleTts.isConfigured);
                if (data.googleTts.hasApiKey) {
                    setTtsApiKey(data.googleTts.apiKey || '');
                }
            }
            if (data?.stripe) {
                setStripePublishableKey(data.stripe.publishableKey || '');
                setStripeProMonthlyPriceId(data.stripe.proMonthlyPriceId || '');
                setStripeProYearlyPriceId(data.stripe.proYearlyPriceId || '');
                setStripeHasSecretKey(data.stripe.hasSecretKey);
                setStripeHasWebhookSecret(data.stripe.hasWebhookSecret);
                setStripeIsConfigured(data.stripe.isConfigured);
                if (data.stripe.hasSecretKey) {
                    setStripeSecretKey(data.stripe.secretKey || '');
                }
                if (data.stripe.hasWebhookSecret) {
                    setStripeWebhookSecret(data.stripe.webhookSecret || '');
                }
            }
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
            if (data?.rateLimit) {
                setRlEnabled(data.rateLimit.enabled ?? true);
                setRlCapacity(data.rateLimit.capacity ?? 120);
                setRlRefillRate(data.rateLimit.refillRatePerSec ?? 2);
                setRlBlockAnonymous(data.rateLimit.blockAnonymousBots ?? true);
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

    const handleSaveGemini = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeminiSaving(true);
        setGeminiError('');
        setGeminiSuccess('');
        try {
            const payload: any = {
                model: geminiModel,
                enabled: geminiEnabled,
            };
            if (geminiApiKey && !geminiApiKey.includes('••••••••')) {
                payload.apiKey = geminiApiKey;
            }
            const res = await api.admin.updateGeminiSettings(payload);
            setGeminiSuccess(res.message || 'Gemini AI settings saved successfully.');
            setGeminiHasApiKey(res.gemini?.hasApiKey);
            setGeminiIsConfigured(res.gemini?.isConfigured);
            if (payload.apiKey) {
                setGeminiApiKey('••••••••••••••••••••••••');
            }
            fetchGeminiModels();
        } catch (err: any) {
            setGeminiError(err.message || 'Failed to save Gemini AI settings');
        } finally {
            setGeminiSaving(false);
        }
    };

    const handleTestGemini = async () => {
        setGeminiTesting(true);
        setGeminiError('');
        setGeminiSuccess('');
        setGeminiTestResponse('');
        try {
            const testKey = geminiApiKey && !geminiApiKey.includes('••••••••') ? geminiApiKey : undefined;
            const res = await api.admin.testGeminiSettings({ apiKey: testKey, model: geminiModel });
            if (res.success) {
                setGeminiSuccess(`Gemini AI connection successful! Model: ${res.model}`);
                setGeminiTestResponse(res.sampleResponse || '');
            } else {
                setGeminiError(res.error || 'Gemini connection test failed.');
            }
        } catch (err: any) {
            setGeminiError(err.message || 'Failed to connect to Google Gemini AI API.');
        } finally {
            setGeminiTesting(false);
        }
    };

    const handleSaveGoogleTts = async (e: React.FormEvent) => {
        e.preventDefault();
        setTtsSaving(true);
        setTtsError('');
        setTtsSuccess('');
        try {
            const payload: any = {
                languageCode: ttsLanguageCode,
                voiceName: ttsVoiceName,
                enabled: ttsEnabled,
            };
            if (ttsApiKey && !ttsApiKey.includes('••••••••')) {
                payload.apiKey = ttsApiKey;
            }
            const res = await api.admin.updateGoogleTtsSettings(payload);
            setTtsSuccess(res.message || 'Google TTS settings saved successfully.');
            setTtsHasApiKey(res.googleTts?.hasApiKey);
            setTtsIsConfigured(res.googleTts?.isConfigured);
            if (payload.apiKey) {
                setTtsApiKey('••••••••••••••••••••••••');
            }
        } catch (err: any) {
            setTtsError(err.message || 'Failed to save Google TTS settings');
        } finally {
            setTtsSaving(false);
        }
    };

    const handleTestGoogleTts = async () => {
        setTtsTesting(true);
        setTtsError('');
        setTtsSuccess('');
        try {
            const res = await api.admin.testGoogleTtsSettings();
            if (res.success && res.audioBase64) {
                setTtsSuccess(`TTS Speech Synthesis test passed (${res.voiceName})! Playing sample...`);
                const audio = new Audio(`data:audio/mp3;base64,${res.audioBase64}`);
                setTtsPlaying(true);
                audio.onended = () => setTtsPlaying(false);
                audio.onerror = () => setTtsPlaying(false);
                await audio.play();
            } else {
                setTtsError(res.error || 'Google TTS test failed.');
            }
        } catch (err: any) {
            setTtsError(err.message || 'Failed to test Google TTS.');
            setTtsPlaying(false);
        } finally {
            setTtsTesting(false);
        }
    };

    const handleSaveStripe = async (e: React.FormEvent) => {
        e.preventDefault();
        setStripeSaving(true);
        setStripeError('');
        setStripeSuccess('');
        try {
            const payload: any = {
                publishableKey: stripePublishableKey,
                proMonthlyPriceId: stripeProMonthlyPriceId,
                proYearlyPriceId: stripeProYearlyPriceId,
            };
            if (stripeSecretKey && !stripeSecretKey.includes('••••••••')) {
                payload.secretKey = stripeSecretKey;
            }
            if (stripeWebhookSecret && !stripeWebhookSecret.includes('••••••••')) {
                payload.webhookSecret = stripeWebhookSecret;
            }
            const res = await api.updateStripeSettings(payload);
            setStripeSuccess(res.message || 'Stripe configuration saved successfully.');
            setStripeHasSecretKey(res.stripe?.hasSecretKey);
            setStripeHasWebhookSecret(res.stripe?.hasWebhookSecret);
            setStripeIsConfigured(res.stripe?.isConfigured);
            if (payload.secretKey) {
                setStripeSecretKey('••••••••••••••••••••••••');
            }
            if (payload.webhookSecret) {
                setStripeWebhookSecret('••••••••••••••••••••••••');
            }
        } catch (err: any) {
            setStripeError(err.message || 'Failed to save Stripe settings');
        } finally {
            setStripeSaving(false);
        }
    };

    const handleTestStripe = async () => {
        setStripeTesting(true);
        setStripeError('');
        setStripeSuccess('');
        try {
            const res = await api.testStripeSettings();
            if (res.success) {
                setStripeSuccess(res.message || 'Stripe connection test successful!');
            } else {
                setStripeError(res.message || 'Stripe connection test failed.');
            }
        } catch (err: any) {
            setStripeError(err.message || 'Failed to connect to Stripe API.');
        } finally {
            setStripeTesting(false);
        }
    };

    const handleSaveRateLimit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRlSaving(true);
        setRlError('');
        setRlSuccess('');
        try {
            const res = await api.updateRateLimitSettings({
                enabled: rlEnabled,
                capacity: Number(rlCapacity),
                refillRatePerSec: Number(rlRefillRate),
                blockAnonymousBots: rlBlockAnonymous,
            });
            setRlSuccess(res.message || 'Rate limit settings saved successfully.');
            if (res.rateLimit) {
                setRlEnabled(res.rateLimit.enabled);
                setRlCapacity(res.rateLimit.capacity);
                setRlRefillRate(res.rateLimit.refillRatePerSec);
                setRlBlockAnonymous(res.rateLimit.blockAnonymousBots);
            }
        } catch (err: any) {
            setRlError(err.message || 'Failed to save rate limit settings');
        } finally {
            setRlSaving(false);
        }
    };

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
        <div className="w-full space-y-6 pb-16">
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
                    Manage installation-wide services stored securely in the database (Gemini AI, Google TTS, Stripe, Mailgun & SMTP). Different server deployments configure their own keys directly here without needing changes to raw <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-red-500">.env</code> files.
                </p>
            </div>

            {/* A. GOOGLE GEMINI AI CONFIGURATION */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                    Google Gemini AI Engine
                                </h2>
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                    <Sparkles className="h-3 w-3" /> Pro Matches & Phonetics
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Powers tactical Pro Match Analysis, athlete phonetic name suggestions, and anti-abuse validation.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {geminiIsConfigured && geminiEnabled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Active & Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3.5 w-3.5" /> {!geminiEnabled ? 'Disabled' : 'API Key Missing'}
                            </span>
                        )}
                        {geminiHasApiKey && (
                            <button
                                type="button"
                                onClick={handleTestGemini}
                                disabled={geminiTesting}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition disabled:opacity-50"
                            >
                                {geminiTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-indigo-500" />}
                                <span>{geminiTesting ? 'Testing...' : 'Test AI Connection'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {geminiError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>{geminiError}</div>
                    </div>
                )}
                {geminiSuccess && (
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>{geminiSuccess}</div>
                        </div>
                        {geminiTestResponse && (
                            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/30 p-3 text-xs text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-1">AI Test Response:</span>
                                <em>"{geminiTestResponse}"</em>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSaveGemini} className="space-y-4 text-xs">
                    {/* Enable Toggle */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                Gemini AI Integration Active
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Master toggle for AI tactical coaching summaries, phonetic spelling assistance, and name moderation.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={geminiEnabled}
                                onChange={(e) => setGeminiEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Google Gemini API Key *
                            </label>
                            <div className="relative">
                                <input
                                    type={geminiShowKey ? 'text' : 'password'}
                                    required={!geminiHasApiKey}
                                    placeholder={geminiHasApiKey ? '•••••••••••••••••••••••• (Leave blank to keep key)' : 'AIzaSy...'}
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pr-10 pl-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setGeminiShowKey(!geminiShowKey)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                >
                                    {geminiShowKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                                Generated from Google AI Studio / Google Cloud Console.
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                                    Default AI Model *
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={fetchingGeminiModels}
                                        onClick={() => fetchGeminiModels()}
                                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                                        title="Query Google Generative Language API for models active on this API key"
                                    >
                                        <RefreshCw className={`h-3 w-3 ${fetchingGeminiModels ? 'animate-spin' : ''}`} />
                                        <span>{fetchingGeminiModels ? 'Discovering...' : 'Discover Models'}</span>
                                    </button>
                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomModel(!isCustomModel)}
                                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    >
                                        {isCustomModel ? 'Pick from List' : 'Custom Model'}
                                    </button>
                                </div>
                            </div>

                            {isCustomModel ? (
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. gemini-2.0-flash, gemini-2.5-flash, gemini-1.5-flash-latest"
                                    value={geminiModel}
                                    onChange={(e) => setGeminiModel(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                                />
                            ) : (
                                <select
                                    value={geminiModel}
                                    onChange={(e) => setGeminiModel(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none font-medium"
                                >
                                    {availableGeminiModels.length > 0 ? (
                                        availableGeminiModels.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.displayName || m.id} ({m.id})
                                            </option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest, High-Precision & Next-Gen - Recommended)</option>
                                            <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental</option>
                                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Cost-Effective)</option>
                                            <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest Release)</option>
                                            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Ultra-Lightweight)</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Strategic Reasoning)</option>
                                            <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro (Latest Release)</option>
                                        </>
                                    )}
                                </select>
                            )}

                            <span className="text-[10px] text-slate-400 mt-1 block">
                                {availableGeminiModels.find((m) => m.id === geminiModel)?.description ||
                                    'Click "Discover Models" to automatically fetch the active models supported by your Google AI account.'}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={geminiSaving}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {geminiSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                            <span>{geminiSaving ? 'Saving...' : 'Save Gemini AI Settings'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* B. GOOGLE CLOUD TEXT-TO-SPEECH (TTS) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                            <Volume2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                    Google Cloud Text-to-Speech (TTS)
                                </h2>
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-300">
                                    Speaker Callouts & Name Pronunciation
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Synthesizes tournament arena loudspeaker match announcements and athlete name pronunciation previews.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {ttsIsConfigured && ttsEnabled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Active & Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3.5 w-3.5" /> {!ttsEnabled ? 'Disabled' : 'API Key Missing'}
                            </span>
                        )}
                        {ttsHasApiKey && (
                            <button
                                type="button"
                                onClick={handleTestGoogleTts}
                                disabled={ttsTesting || ttsPlaying}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/80 dark:hover:bg-teal-900 px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 transition disabled:opacity-50"
                            >
                                {ttsTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-teal-500 fill-current" />}
                                <span>{ttsTesting ? 'Synthesizing...' : ttsPlaying ? 'Playing Audio...' : 'Test Speech Audio'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {ttsError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>{ttsError}</div>
                    </div>
                )}
                {ttsSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>{ttsSuccess}</div>
                    </div>
                )}

                <form onSubmit={handleSaveGoogleTts} className="space-y-4 text-xs">
                    {/* Enable Toggle */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                Text-to-Speech Engine Active
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                When active, tournament speaker callouts and athlete pronunciation previews will use high-fidelity neural voice synthesis.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={ttsEnabled}
                                onChange={(e) => setTtsEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Google Cloud TTS API Key *
                            </label>
                            <div className="relative">
                                <input
                                    type={ttsShowKey ? 'text' : 'password'}
                                    required={!ttsHasApiKey}
                                    placeholder={ttsHasApiKey ? '•••••••••••••••••••••••• (Leave blank to keep key)' : 'AIzaSy...'}
                                    value={ttsApiKey}
                                    onChange={(e) => setTtsApiKey(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pr-10 pl-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setTtsShowKey(!ttsShowKey)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                >
                                    {ttsShowKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Default Language Code *
                            </label>
                            <select
                                value={ttsLanguageCode}
                                onChange={(e) => setTtsLanguageCode(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none font-medium"
                            >
                                <option value="de-CH">German (Switzerland) - de-CH</option>
                                <option value="de-DE">German (Germany) - de-DE</option>
                                <option value="fr-CH">French (Switzerland) - fr-CH</option>
                                <option value="fr-FR">French (France) - fr-FR</option>
                                <option value="it-CH">Italian (Switzerland) - it-CH</option>
                                <option value="en-US">English (US) - en-US</option>
                                <option value="en-GB">English (UK) - en-GB</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Default Neural Voice Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="de-CH-Wavenet-A"
                                value={ttsVoiceName}
                                onChange={(e) => setTtsVoiceName(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={ttsSaving}
                            className="rounded-xl bg-teal-600 hover:bg-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {ttsSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                            <span>{ttsSaving ? 'Saving...' : 'Save Google TTS Settings'}</span>
                        </button>
                    </div>
                </form>
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

            {/* 3. STRIPE PAYMENTS & SUBSCRIPTIONS */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                Stripe Payments & Pro Subscriptions
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configure API credentials, webhooks, and Stripe Price IDs for Pro memberships and direct payments.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {stripeIsConfigured ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 text-xs font-bold">
                                Optional / Unset
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleTestStripe}
                            disabled={stripeTesting || (!stripeSecretKey && !stripeHasSecretKey)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition disabled:opacity-50"
                        >
                            {stripeTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : <Send className="h-3.5 w-3.5 text-indigo-500" />}
                            <span>{stripeTesting ? 'Testing...' : 'Test Stripe API'}</span>
                        </button>
                    </div>
                </div>

                {stripeError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>{stripeError}</div>
                    </div>
                )}
                {stripeSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>{stripeSuccess}</div>
                    </div>
                )}

                <form onSubmit={handleSaveStripe} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Stripe Publishable Key
                            </label>
                            <input
                                type="text"
                                placeholder="pk_test_... or pk_live_..."
                                value={stripePublishableKey}
                                onChange={(e) => setStripePublishableKey(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                                Safe for browser & client-side checkout redirection.
                            </span>
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Stripe Secret Key
                            </label>
                            <div className="relative">
                                <input
                                    type={stripeShowSecret ? 'text' : 'password'}
                                    placeholder={stripeHasSecretKey ? '••••••••••••••••••••••••' : 'sk_test_... or sk_live_...'}
                                    value={stripeSecretKey}
                                    onChange={(e) => setStripeSecretKey(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 pr-10 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setStripeShowSecret(!stripeShowSecret)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    {stripeShowSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                                Kept securely on backend. Used for creating checkouts & customer portal sessions.
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Stripe Webhook Signing Secret
                        </label>
                        <div className="relative">
                            <input
                                type={stripeShowWebhook ? 'text' : 'password'}
                                placeholder={stripeHasWebhookSecret ? '••••••••••••••••••••••••' : 'whsec_...'}
                                value={stripeWebhookSecret}
                                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 pr-10 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setStripeShowWebhook(!stripeShowWebhook)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {stripeShowWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                            <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Webhook URL: </span>
                                <code className="font-mono text-indigo-600 dark:text-indigo-400">https://your-domain.com/api/billing/webhook</code>
                            </div>
                            <span className="text-[10px] text-slate-400">Events: checkout.session.completed, customer.subscription.*, invoice.*</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Pro Monthly Price ID
                            </label>
                            <input
                                type="text"
                                placeholder="price_1Q..."
                                value={stripeProMonthlyPriceId}
                                onChange={(e) => setStripeProMonthlyPriceId(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                                Stripe recurring monthly plan Price ID for AREENA Pro.
                            </span>
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Pro Yearly Price ID
                            </label>
                            <input
                                type="text"
                                placeholder="price_1Q..."
                                value={stripeProYearlyPriceId}
                                onChange={(e) => setStripeProYearlyPriceId(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                                Stripe recurring annual plan Price ID for AREENA Pro.
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={stripeSaving}
                            className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-6 py-2.5 text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {stripeSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                            <span>{stripeSaving ? 'Saving...' : 'Save Stripe Settings'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* 4. API RATE LIMITING & TRAFFIC THROTTLING */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Gauge className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                API Rate Limiting & Traffic Throttling
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Sliding-window token-bucket ingress defense protecting AREENA against traffic surges and malicious scraping.
                            </p>
                        </div>
                    </div>
                    <div>
                        {rlEnabled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Rate Limiter Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                                <AlertCircle className="h-3.5 w-3.5" /> Throttling Disabled
                            </span>
                        )}
                    </div>
                </div>

                {rlError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>{rlError}</div>
                    </div>
                )}
                {rlSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>{rlSuccess}</div>
                    </div>
                )}

                <form onSubmit={handleSaveRateLimit} className="space-y-5 text-xs">
                    {/* Master Switch */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                Rate Limiting Master Switch
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                When enabled, all user sessions and web clients are throttled according to the burst capacity and refill rate.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={rlEnabled}
                                onChange={(e) => setRlEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {/* Parameters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block font-semibold text-slate-700 dark:text-slate-300">
                                Max Burst Capacity per User/IP (Tokens)
                            </label>
                            <input
                                type="number"
                                min={5}
                                max={5000}
                                required
                                value={rlCapacity}
                                onChange={(e) => setRlCapacity(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Maximum concurrent requests allowed in a short burst (Default: 120 tokens).
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="block font-semibold text-slate-700 dark:text-slate-300">
                                Sustained Refill Rate (Tokens / Second)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min={0.1}
                                max={500}
                                required
                                value={rlRefillRate}
                                onChange={(e) => setRlRefillRate(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Rate at which tokens are replenished back to bucket (e.g. 2.0 = 120 req/minute sustained).
                            </p>
                        </div>
                    </div>

                    {/* Bot & Scraper Blocking */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                Block Direct Unauthenticated API Traffic (Bots & Scrapers)
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Enforce 401 Unauthorized on direct curl / scraper calls that lack valid OAuth 2.0 or same-origin web headers.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={rlBlockAnonymous}
                                onChange={(e) => setRlBlockAnonymous(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                        </label>
                    </div>

                    {/* Per-Client OAuth Application Rate Limits Callout & Quick Overview */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                    Per-Client OAuth 2.0 API Quotas & Limits
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Configure individual burst capacity and refill rates for partner and developer client applications.
                                </p>
                            </div>
                            <Link
                                href="/admin/api-keys"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 text-xs font-bold transition shrink-0"
                            >
                                <span>Manage Client Keys & Quotas</span>
                                <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
                            </Link>
                        </div>

                        {oauthClients.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                                {oauthClients.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 text-xs"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 dark:text-white truncate">
                                                {c.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono truncate">
                                                {c.clientId}
                                            </div>
                                        </div>
                                        {c.customRateLimitEnabled ? (
                                            <span className="shrink-0 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 px-2 py-0.5 text-[9px] font-bold">
                                                {c.rateLimitCapacity || 120} cap • {c.rateLimitRefillRate || 2}/s
                                            </span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 text-[9px] font-medium">
                                                Unlimited
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic pt-1">
                                No registered OAuth client applications found.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={rlSaving}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {rlSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                            <span>{rlSaving ? 'Saving...' : 'Save Rate Limiting Configuration'}</span>
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
            <Modal
                isOpen={Boolean(testMode)}
                onClose={() => {
                    setTestMode(null);
                    setTestResult(null);
                }}
                title={`Dispatch ${testMode === 'mailgun' ? 'Mailgun' : 'SMTP'} Test Email`}
                subtitle="Verify live delivery to ensure transactional emails are working properly"
                icon={<Send className="h-5 w-5 text-red-500" />}
                size="md"
            >
                {testResult && (
                    <div
                        className={`rounded-2xl p-3 text-xs font-semibold mb-4 ${
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

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
            </Modal>
        </div>
    );
}