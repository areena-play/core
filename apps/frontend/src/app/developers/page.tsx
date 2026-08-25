'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { Code2, Key, ShieldCheck, Play, Copy, CheckCircle2, Plus, Lock, ExternalLink, Terminal } from 'lucide-react';

export default function DevelopersPortalPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // App Creation Form
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [appName, setAppName] = useState('');
    const [appDesc, setAppDesc] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<string[]>([
        'read:public',
        'read:calendar',
        'read:competitions',
    ]);
    const [createdSecret, setCreatedSecret] = useState<string | null>(null);
    const [createdClient, setCreatedClient] = useState<any | null>(null);

    // Interactive API Runner
    const [testClientId, setTestClientId] = useState('areena_demo_partner_client');
    const [testSecret, setTestSecret] = useState('sec_demo_partner_secret_123');
    const [activeToken, setActiveToken] = useState('');
    const [tokenResponse, setTokenResponse] = useState<any | null>(null);
    const [selectedEndpoint, setSelectedEndpoint] = useState('/api/v1/competitions');
    const [apiResponse, setApiResponse] = useState<any | null>(null);
    const [apiRunning, setApiRunning] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const fetchClients = async () => {
        try {
            const data = await api.getOAuthClients();
            setClients(data);
        } catch (err) {
            console.error('Failed to load OAuth clients:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchClients();
        else setLoading(false);
    }, [user]);

    const handleCreateApp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.createOAuthClient({
                name: appName,
                description: appDesc,
                requestedScopes: selectedScopes,
            });

            setCreatedClient(res.client);
            setCreatedSecret(res.clientSecret);
            fetchClients();
        } catch (err: any) {
            alert(err.message || 'Failed to create OAuth app');
        }
    };

    const handleGetToken = async () => {
        try {
            const res = await api.requestOAuthToken({
                grant_type: 'client_credentials',
                client_id: testClientId,
                client_secret: testSecret,
            });
            setTokenResponse(res);
            setActiveToken(res.access_token);
        } catch (err: any) {
            alert('Token generation failed: ' + (err.message || 'Check credentials'));
        }
    };

    const handleTestQuery = async () => {
        if (!activeToken) {
            alert('Please generate an access token first.');
            return;
        }
        setApiRunning(true);
        try {
            const res = await api.fetchOAuthApi(selectedEndpoint, activeToken);
            setApiResponse(res);
        } catch (err: any) {
            setApiResponse({ error: err.message });
        } finally {
            setApiRunning(false);
        }
    };

    const copyToClipboard = (text: string, keyName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(keyName);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Code2 className="h-6 w-6 text-red-500" />
                        <span>{t('developers.title')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {t('developers.subtitle')}
                    </p>
                </div>

                {user && (
                    <button
                        onClick={() => {
                            setCreatedClient(null);
                            setCreatedSecret(null);
                            setShowCreateModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow self-start sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('developers.registerClient')}</span>
                    </button>
                )}
            </div>

            {/* Grid: App Registry & Interactive Live API Runner */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Left Column: Registered OAuth Clients */}
                <div className="space-y-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Key className="h-4 w-4 text-red-500" />
                        <span>{t('developers.registeredClients')}</span>
                    </h2>

                    <div className="space-y-3">
                        {clients.map((c) => (
                            <div
                                key={c.id}
                                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm space-y-3 text-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</span>
                                    <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            c.status === 'APPROVED'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40'
                                        }`}
                                    >
                                        {c.status}
                                    </span>
                                </div>

                                {c.description && (
                                    <p className="text-slate-600 dark:text-slate-400">{c.description}</p>
                                )}

                                <div className="space-y-1.5 font-mono text-[11px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5">
                                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                        <span>
                                            Client ID: <strong className="text-red-600 dark:text-red-400">{c.clientId}</strong>
                                        </span>
                                        <button
                                            onClick={() => {
                                                copyToClipboard(c.clientId, c.id);
                                                setTestClientId(c.clientId);
                                            }}
                                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                        >
                                            {copiedKey === c.id ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-slate-500">
                                        Allowed Scopes:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {c.allowedScopes?.map((s: string) => (
                                            <span
                                                key={s}
                                                className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Live Interactive API Tester */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 shadow-xl space-y-6 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-red-500" />
                            <span>{t('developers.apiTester')}</span>
                        </h2>
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/40">
                            Client Credentials Flow
                        </span>
                    </div>

                    {/* Step 1: Token Acquisition */}
                    <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 font-bold text-white text-[10px]">
                                1
                            </span>
                            <span>{t('developers.generateToken')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    Client ID
                                </label>
                                <input
                                    type="text"
                                    value={testClientId}
                                    onChange={(e) => setTestClientId(e.target.value)}
                                    className="mt-1 w-full rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    Client Secret
                                </label>
                                <input
                                    type="password"
                                    value={testSecret}
                                    onChange={(e) => setTestSecret(e.target.value)}
                                    className="mt-1 w-full rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGetToken}
                            className="w-full rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white py-1.5 font-semibold transition border border-slate-300 dark:border-slate-700"
                        >
                            Request Access Token (POST /oauth/token)
                        </button>

                        {activeToken && (
                            <div className="rounded border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 p-2 font-mono text-[10px] text-emerald-800 dark:text-emerald-400 break-all">
                                <strong>Active Token:</strong> {activeToken}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Query Protected Endpoint */}
                    <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 font-bold text-white text-[10px]">
                                2
                            </span>
                            <span>{t('developers.queryEndpoint')}</span>
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={selectedEndpoint}
                                onChange={(e) => setSelectedEndpoint(e.target.value)}
                                className="flex-1 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none font-mono"
                            >
                                <option value="/api/v1/competitions">
                                    GET /api/v1/competitions (Leagues & Tournaments)
                                </option>
                                <option value="/api/v1/calendar">GET /api/v1/calendar (Events Feed)</option>
                                <option value="/api/v1/federation">GET /api/v1/federation (Federation Metadata)</option>
                                <option value="/api/v1/members">GET /api/v1/members (Scope: read:members_full)</option>
                            </select>

                            <button
                                onClick={handleTestQuery}
                                disabled={apiRunning}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow"
                            >
                                <Play className="h-3.5 w-3.5" />
                                <span>Send</span>
                            </button>
                        </div>

                        {/* Response Console */}
                        {apiResponse && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-slate-500">
                                    Response (JSON):
                                </span>
                                <pre className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                    {JSON.stringify(apiResponse, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Register App Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {t('developers.registerClient')}
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {createdSecret ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 p-4 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-white text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span>Application Created Successfully!</span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300">
                                        Save your Client Secret immediately. For security reasons, it will not be
                                        displayed again.
                                    </p>
                                </div>

                                <div className="space-y-2 font-mono rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">Client ID:</span>
                                        <div className="text-slate-900 dark:text-white font-bold text-sm">
                                            {createdClient?.clientId}
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                        <span className="text-red-600 dark:text-red-400 text-[10px]">Client Secret:</span>
                                        <div className="text-emerald-700 dark:text-emerald-400 font-bold text-sm break-all">
                                            {createdSecret}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => {
                                            setTestClientId(createdClient?.clientId);
                                            setTestSecret(createdSecret);
                                            setShowCreateModal(false);
                                        }}
                                        className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 shadow"
                                    >
                                        Load into API Tester & Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateApp} className="space-y-4">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        Application Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. My Regional Sports App"
                                        value={appName}
                                        onChange={(e) => setAppName(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.details')}
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Describe how your client app utilizes AREENA API feeds..."
                                        value={appDesc}
                                        onChange={(e) => setAppDesc(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        Requested API Scopes
                                    </label>
                                    <div className="mt-2 space-y-2">
                                        {[
                                            {
                                                scope: 'read:public',
                                                label: 'read:public',
                                                desc: 'Basic federation metadata (Auto-approved)',
                                            },
                                            {
                                                scope: 'read:calendar',
                                                label: 'read:calendar',
                                                desc: 'Read unified master events schedule (Auto-approved)',
                                            },
                                            {
                                                scope: 'read:competitions',
                                                label: 'read:competitions',
                                                desc: 'Read leagues, categories and standings (Auto-approved)',
                                            },
                                            {
                                                scope: 'read:members_full',
                                                label: 'read:members_full',
                                                desc: 'Enhanced access to member directory (Requires Main Admin Approval)',
                                            },
                                            {
                                                scope: 'write:scores',
                                                label: 'write:scores',
                                                desc: 'Submit live match scores from partner systems (Requires Main Admin Approval)',
                                            },
                                        ].map((s) => (
                                            <label
                                                key={s.scope}
                                                className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedScopes.includes(s.scope)}
                                                    onChange={(e) => {
                                                        if (e.target.checked)
                                                            setSelectedScopes([...selectedScopes, s.scope]);
                                                        else
                                                            setSelectedScopes(
                                                                selectedScopes.filter((x) => x !== s.scope),
                                                            );
                                                    }}
                                                    className="mt-0.5 rounded border-slate-300 bg-slate-100 text-red-600 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-900"
                                                />
                                                <div>
                                                    <strong className="font-mono text-slate-900 dark:text-slate-200">
                                                        {s.label}
                                                    </strong>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        {s.desc}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 shadow"
                                    >
                                        Create Client
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
