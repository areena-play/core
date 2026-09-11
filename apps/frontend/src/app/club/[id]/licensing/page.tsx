'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import {
    Award,
    Shield,
    CheckCircle2,
    XCircle,
    Clock,
    Plus,
    Users,
    Search,
    ChevronRight,
    AlertCircle,
    UserCheck,
    Check,
    X,
    Calendar,
    Send,
    FileText,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ClubLicensingHubPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [pendingLicenses, setPendingLicenses] = useState<any[]>([]);
    const [allLicenses, setAllLicenses] = useState<any[]>([]);
    const [clubMembers, setClubMembers] = useState<any[]>([]);
    const [unauthorized, setUnauthorized] = useState(false);
    const [error, setError] = useState('');

    // Modal state for "Apply on Behalf"
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [licenseType, setLicenseType] = useState('PLAYER_STANDARD');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [modalMsg, setModalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Active Tab: 'pending' | 'registry'
    const [activeTab, setActiveTab] = useState<'pending' | 'registry'>('pending');
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = async () => {
        setLoading(true);
        setError('');
        setUnauthorized(false);
        try {
            const res = await api.getClubLicensing(clubIdentifier);
            setClub(res.club);
            setPendingLicenses(res.pendingLicenses || []);
            setAllLicenses(res.allLicenses || []);
            setClubMembers(res.clubMembers || []);

            if (res.club) {
                setEntityMeta({
                    id: res.club.id,
                    title: res.club.name,
                    code: res.club.code,
                    badge: 'Club',
                    subtitle: `${res.club.city || 'Switzerland'} • Licensing Hub`,
                });
            }
        } catch (err: any) {
            if (err?.status === 403 || err?.message?.toLowerCase().includes('denied') || err?.message?.toLowerCase().includes('forbidden')) {
                setUnauthorized(true);
            } else {
                setError(err.message || 'Failed to load club licensing hub.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clubIdentifier || authLoading) return;
        loadData();
    }, [clubIdentifier, authLoading]);

    const handleApprove = async (licenseId: string) => {
        try {
            await api.approveClubLicense(clubIdentifier, licenseId);
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to sanction license');
        }
    };

    const handleReject = async (licenseId: string) => {
        const reason = prompt('Please enter a rejection reason (optional):');
        if (reason === null) return;
        try {
            await api.rejectClubLicense(clubIdentifier, licenseId, reason || undefined);
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to reject license');
        }
    };

    const handleApplyOnBehalf = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            setModalMsg({ type: 'error', text: 'Please select an athlete or member.' });
            return;
        }

        setSubmitting(true);
        setModalMsg(null);
        try {
            await api.applyClubLicenseOnBehalf(clubIdentifier, {
                userId: selectedUserId,
                type: licenseType,
                validUntil: validUntil || undefined,
                notes: notes || undefined,
            });
            setModalMsg({ type: 'success', text: 'License application submitted successfully!' });
            setTimeout(() => {
                setModalOpen(false);
                setSelectedUserId('');
                setNotes('');
                setModalMsg(null);
                loadData();
            }, 1200);
        } catch (err: any) {
            setModalMsg({ type: 'error', text: err.message || 'Failed to submit license application.' });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredLicenses = useMemo(() => {
        if (!searchQuery.trim()) return allLicenses;
        const q = searchQuery.toLowerCase();
        return allLicenses.filter((lic) => {
            const name = `${lic.user?.firstName || ''} ${lic.user?.lastName || ''}`.toLowerCase();
            const num = (lic.licenseNumber || lic.user?.licenseId || '').toLowerCase();
            const type = (lic.type || '').toLowerCase();
            return name.includes(q) || num.includes(q) || type.includes(q);
        });
    }, [allLicenses, searchQuery]);

    if (unauthorized) {
        return (
            <AccessDenied
                title="Club Officials Access Required"
                description="This licensing hub is restricted to authorized Club Officials (Presidents, Secretaries, Coaches) and Platform Administrators."
                requiredRole="Club Official / Administrator"
                returnHref={`/club/${clubIdentifier}`}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !club) {
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Licensing Hub Unavailable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {error || `No club found for identifier "${clubIdentifier}".`}
                    </p>
                </div>
                <Link
                    href={`/club/${clubIdentifier}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                    <span>Return to Club</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Link href={`/club/${clubIdentifier}`} className="hover:text-red-600 transition">
                            {club.name}
                        </Link>
                        <span>/</span>
                        <span className="text-slate-900 dark:text-white">Licensing Hub</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Award className="w-8 h-8 text-red-600" />
                        <span>Club Licensing Operations</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Sanction license requests, issue passes, or apply on behalf of club athletes for {club.name}.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setModalMsg(null);
                            setModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Apply on Behalf of Member</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Sanctioning</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {pendingLicenses.length}
                        </div>
                    </div>
                    <Clock className="w-8 h-8 text-amber-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Approved Licenses</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {allLicenses.filter((l) => l.status === 'APPROVED').length}
                        </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered Passes</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {allLicenses.length}
                        </div>
                    </div>
                    <Award className="w-8 h-8 text-red-500" />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'pending'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Pending Requests ({pendingLicenses.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('registry')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'registry'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Award className="w-4 h-4" />
                    <span>All Club Licenses ({allLicenses.length})</span>
                </button>
            </div>

            {/* Tab 1: Pending Sanctions */}
            {activeTab === 'pending' && (
                <div className="space-y-4">
                    {pendingLicenses.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-900 dark:text-white">All Caught Up!</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                There are no pending athlete license applications awaiting club sanctioning.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingLicenses.map((lic) => {
                                const u = lic.user || {};
                                const personId = u.licenseId || u.id;
                                const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'MB';

                                return (
                                    <div
                                        key={lic.id}
                                        className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                                            {u.firstName} {u.lastName}
                                                        </h3>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            {u.email || 'Athlete'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="rounded-md bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                                                    {lic.status}
                                                </span>
                                            </div>

                                            <div className="rounded-xl bg-white dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 font-medium">License Type:</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{lic.type}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 font-medium">License #:</span>
                                                    <span className="font-mono font-bold text-red-600">{lic.licenseNumber || 'PENDING'}</span>
                                                </div>
                                                {lic.validUntil && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 font-medium">Valid Until:</span>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {format(new Date(lic.validUntil), 'PPP')}
                                                        </span>
                                                    </div>
                                                )}
                                                {lic.notes && (
                                                    <div className="pt-1 text-slate-500 italic">
                                                        &quot;{lic.notes}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                onClick={() => handleApprove(lic.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span>Sanction License</span>
                                            </button>
                                            <button
                                                onClick={() => handleReject(lic.id)}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition"
                                            >
                                                <X className="w-4 h-4" />
                                                <span>Reject</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: All Registry */}
            {activeTab === 'registry' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="relative max-w-sm w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, license #, type..."
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Member / Athlete</th>
                                        <th className="px-4 py-3">License #</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Validity</th>
                                        <th className="px-4 py-3 text-right">Profile</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredLicenses.map((lic) => {
                                        const u = lic.user || {};
                                        const personId = u.licenseId || u.id;
                                        const isApproved = lic.status === 'APPROVED';

                                        return (
                                            <tr key={lic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                                                    {u.firstName} {u.lastName}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-red-600">
                                                    {lic.licenseNumber || u.licenseId || 'PENDING'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                                        {lic.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                            isApproved
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                                        }`}
                                                    >
                                                        {lic.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {lic.validUntil ? format(new Date(lic.validUntil), 'MMM yyyy') : 'Active Season'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {personId && (
                                                        <Link
                                                            href={`/people/${personId}`}
                                                            className="inline-flex items-center gap-1 text-red-600 hover:underline font-bold"
                                                        >
                                                            <span>View</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* "Apply on Behalf" Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-red-600" />
                                <span>Apply for Athlete License</span>
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {modalMsg && (
                            <div
                                className={`rounded-xl p-3 text-xs font-bold ${
                                    modalMsg.type === 'success'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                }`}
                            >
                                {modalMsg.text}
                            </div>
                        )}

                        <form onSubmit={handleApplyOnBehalf} className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Select Member / Athlete *</label>
                                <select
                                    required
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">-- Choose Member --</option>
                                    {clubMembers.map((m) => (
                                        <option key={m.userId || m.id} value={m.userId || m.id}>
                                            {m.user?.firstName} {m.user?.lastName} ({m.user?.licenseId || m.user?.email || 'No license #'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">License Category *</label>
                                <select
                                    value={licenseType}
                                    onChange={(e) => setLicenseType(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="PLAYER_STANDARD">Player Standard (Adult)</option>
                                    <option value="PLAYER_JUNIOR">Player Junior (Youth)</option>
                                    <option value="PLAYER_SENIOR">Player Senior (Veterans)</option>
                                    <option value="COACH">Coach Sanction</option>
                                    <option value="REFEREE">Referee Sanction</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Valid Until (Optional)</label>
                                <input
                                    type="date"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Application Notes / Justification</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. League participation season 2026/2027"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-300 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 font-bold text-white shadow-xs transition"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Application'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

