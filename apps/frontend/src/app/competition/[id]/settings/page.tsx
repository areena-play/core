'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Sliders,
    ChevronRight,
    Save,
    AlertCircle,
    CheckCircle2,
    Calendar,
    MapPin,
    DollarSign,
    Shield,
    Flame,
    Check,
    XCircle,
    ArrowLeft,
    Trophy,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';

export default function CompetitionSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [settingsForm, setSettingsForm] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        entryFee: 0,
        isOfficial: true,
        countsForElo: true,
        status: 'DRAFT',
    });

    const fetchData = async () => {
        try {
            const comp = await api.getCompetition(competitionId);
            setCompetition(comp);
            setSettingsForm({
                name: comp.name || '',
                description: comp.description || '',
                startDate: comp.startDate ? comp.startDate.substring(0, 10) : '',
                endDate: comp.endDate ? comp.endDate.substring(0, 10) : '',
                location: comp.location || '',
                entryFee: comp.entryFee || 0,
                isOfficial: comp.isOfficial !== false,
                countsForElo: comp.countsForElo !== false,
                status: comp.status || 'DRAFT',
            });
            const r = await api.getCompetitionRoles(competitionId).catch(() => []);
            setRoles(r || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    const isAssocAdmin = user?.associationRoles?.some(
        (r) => r.role === 'ADMIN' && r.associationId === competition?.associationId
    );
    const hasAdminRole = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && r.role === 'ADMIN');

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updateCompetition(competitionId, settingsForm);
            setActionMsg({ type: 'success', text: 'Competition settings updated successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to update settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleApproval = async (approved: boolean) => {
        try {
            await api.approveCompetition(competitionId, { status: approved ? 'APPROVED' : 'REJECTED' });
            setActionMsg({ type: 'success', text: `Competition ${approved ? 'approved' : 'rejected'} successfully.` });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Approval action failed' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!hasAdminRole) {
        return (
            <AccessDenied
                title="Tournament Settings Restricted"
                description="Modifying competition configurations and sanctioning approvals is restricted to tournament directors and federation administrators."
                requiredRole="Competition Administrator"
                returnHref={`/competition/${competitionId}`}
            />
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                {competition?.type}
                            </span>
                            <span className="font-mono text-xs text-slate-400">Governance Console</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Sliders className="h-6 w-6 text-red-500" />
                            <span>Tournament Configuration</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Configure competition dates, official licensing tier, ELO calculation rules, and approval status
                        </p>
                    </div>

                    <Link
                        href={`/competition/${competitionId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Dashboard</span>
                    </Link>
                </div>
            </div>

            {/* Feedback Banner */}
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

            {/* Association Approval Banner */}
            {competition?.requiresApproval && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="h-4 w-4 text-red-500" />
                                <span>Main Association Approval Status</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Current Status: <strong className="text-slate-900 dark:text-white uppercase font-mono">{competition.approvalStatus}</strong>
                            </p>
                        </div>
                        {isAssocAdmin && competition.approvalStatus === 'PENDING_APPROVAL' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleApproval(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
                                >
                                    <Check className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleApproval(false)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
                                >
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Form Card */}
            <form onSubmit={handleSaveSettings} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Competition Name</label>
                        <input
                            type="text"
                            required
                            disabled={!hasAdminRole}
                            value={settingsForm.name}
                            onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition disabled:opacity-60"
                        />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Description & Rules Summary</label>
                        <textarea
                            rows={3}
                            disabled={!hasAdminRole}
                            value={settingsForm.description}
                            onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition disabled:opacity-60"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Start Date</label>
                        <input
                            type="date"
                            required
                            disabled={!hasAdminRole}
                            value={settingsForm.startDate}
                            onChange={(e) => setSettingsForm({ ...settingsForm, startDate: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition disabled:opacity-60"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">End Date</label>
                        <input
                            type="date"
                            required
                            disabled={!hasAdminRole}
                            value={settingsForm.endDate}
                            onChange={(e) => setSettingsForm({ ...settingsForm, endDate: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition disabled:opacity-60"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Location / Venue</label>
                        <input
                            type="text"
                            disabled={!hasAdminRole}
                            value={settingsForm.location}
                            onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                            placeholder="e.g. Sporthalle Wankdorf, Bern"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition disabled:opacity-60"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Entry Fee (CHF)</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            disabled={!hasAdminRole}
                            value={settingsForm.entryFee}
                            onChange={(e) => setSettingsForm({ ...settingsForm, entryFee: Number(e.target.value) })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition disabled:opacity-60"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Lifecycle Status</label>
                        <select
                            disabled={!hasAdminRole}
                            value={settingsForm.status}
                            onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition disabled:opacity-60"
                        >
                            <option value="DRAFT">DRAFT (Setup)</option>
                            <option value="REGISTRATION_OPEN">REGISTRATION OPEN</option>
                            <option value="IN_PROGRESS">IN PROGRESS (Live)</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                        </select>
                    </div>

                    {/* Governance Toggles */}
                    <div className="sm:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-4">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Official Classification & ELO Rules</h4>

                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                            <input
                                type="checkbox"
                                disabled={!hasAdminRole}
                                checked={settingsForm.isOfficial}
                                onChange={(e) => setSettingsForm({ ...settingsForm, isOfficial: e.target.checked })}
                                className="h-4 w-4 rounded accent-red-600"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Official Federation Competition</span>
                                <span className="text-[11px] text-slate-500">Recognized by the national table tennis association with official certification.</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                            <input
                                type="checkbox"
                                disabled={!hasAdminRole}
                                checked={settingsForm.countsForElo}
                                onChange={(e) => setSettingsForm({ ...settingsForm, countsForElo: e.target.checked })}
                                className="h-4 w-4 rounded accent-red-600"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">Calculate Match ELO Rating Points</span>
                                <span className="text-[11px] text-slate-500">When disabled, encounters are treated as inofficial and do not affect official player ELO ratings.</span>
                            </div>
                        </label>
                    </div>
                </div>

                {hasAdminRole && (
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
