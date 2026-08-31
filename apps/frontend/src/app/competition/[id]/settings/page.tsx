'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Settings,
    ChevronLeft,
    Save,
    AlertCircle,
    CheckCircle2,
    Calendar,
    MapPin,
    DollarSign,
    Shield,
    Flame,
    ShieldCheck,
} from 'lucide-react';

export default function CompetitionSettingsPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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
            setErrorMessage(err.message || 'Failed to load settings');
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
            setSuccessMessage('Competition settings updated successfully.');
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleApproval = async (approved: boolean) => {
        try {
            await api.approveCompetition(competitionId, { status: approved ? 'APPROVED' : 'REJECTED' });
            setSuccessMessage(`Competition ${approved ? 'approved' : 'rejected'} successfully.`);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Approval action failed');
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6 md:p-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/competition/${competitionId}`}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 hover:border-zinc-700 hover:text-white transition"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-wider">
                            <span>Competition Workspace</span>
                            <span>•</span>
                            <span>{competition?.name}</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl flex items-center gap-2.5 mt-0.5">
                            <Settings className="h-7 w-7 text-orange-400" />
                            General Settings & Governance
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/competition/${competitionId}`}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                        Dashboard Overview
                    </Link>
                </div>
            </div>


            {competition?.approvalStatus === 'PENDING_APPROVAL' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-amber-200">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">This competition is pending Main Association Approval</p>
                            <p className="text-xs text-amber-300/80">
                                Current approval status: <strong>{competition.approvalStatus}</strong>
                            </p>
                        </div>
                    </div>
                    {(isSuperAdmin || isAssocAdmin) && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleApproval(true)}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30"
                            >
                                Approve Competition
                            </button>
                            <button
                                onClick={() => handleApproval(false)}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20"
                            >
                                Reject
                            </button>
                        </div>
                    )}
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-400">
                    {errorMessage}
                </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
                <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Competition Name
                            </label>
                            <input
                                type="text"
                                value={settingsForm.name}
                                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                                required
                                disabled={!hasAdminRole}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={settingsForm.startDate}
                                onChange={(e) => setSettingsForm({ ...settingsForm, startDate: e.target.value })}
                                required
                                disabled={!hasAdminRole}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={settingsForm.endDate}
                                onChange={(e) => setSettingsForm({ ...settingsForm, endDate: e.target.value })}
                                required
                                disabled={!hasAdminRole}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Venue / Playing Hall Location
                            </label>
                            <input
                                type="text"
                                value={settingsForm.location}
                                onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                                placeholder="e.g. St. Jakobshalle, Basel"
                                disabled={!hasAdminRole}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Entry Fee (CHF per Player / Team)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={settingsForm.entryFee}
                                onChange={(e) => setSettingsForm({ ...settingsForm, entryFee: parseFloat(e.target.value) || 0 })}
                                disabled={!hasAdminRole}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Competition Lifecycle Status
                            </label>
                            <select
                                value={settingsForm.status}
                                onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                                disabled={!hasAdminRole}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            >
                                <option value="DRAFT">DRAFT</option>
                                <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
                                <option value="REGISTRATION_CLOSED">REGISTRATION_CLOSED</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="CANCELLED">CANCELLED</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Description & Tournament Regulations
                            </label>
                            <textarea
                                rows={4}
                                value={settingsForm.description}
                                onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                                disabled={!hasAdminRole}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-4 rounded-xl border border-zinc-800 bg-black/40 p-5">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <Shield className="h-4 w-4 text-orange-400" />
                                Official Ranking & ELO Ratings Configuration
                            </h4>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isOfficial"
                                    checked={settingsForm.isOfficial}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, isOfficial: e.target.checked })}
                                    disabled={!hasAdminRole}
                                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                                />
                                <label htmlFor="isOfficial" className="text-sm text-zinc-200">
                                    <strong>Official Competition</strong> (Recognized by Main Association)
                                </label>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="countsForElo"
                                    checked={settingsForm.countsForElo}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, countsForElo: e.target.checked })}
                                    disabled={!hasAdminRole}
                                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                                />
                                <label htmlFor="countsForElo" className="text-sm text-zinc-200">
                                    <strong>Calculate ELO Rating Points</strong> (Matches affect player national/association rating points)
                                </label>
                            </div>
                        </div>
                    </div>

                    {hasAdminRole && (
                        <div className="flex justify-end pt-4 border-t border-zinc-800">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500 disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
