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
    UserCheck,
    Shield,
    Users,
    UserPlus,
    Key,
    Trash2,
    Plus,
    Search,
    ChevronRight,
    ExternalLink,
    Clock,
    CheckCircle2,
    X,
    Sparkles,
    Calendar,
    Mail,
    Phone,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ClubMembersHubPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [activeMembers, setActiveMembers] = useState<any[]>([]);
    const [pastMembers, setPastMembers] = useState<any[]>([]);
    const [assignedOfficials, setAssignedOfficials] = useState<any[]>([]);
    const [unauthorized, setUnauthorized] = useState(false);
    const [error, setError] = useState('');

    // Tabs: 'active' | 'officials' | 'past'
    const [activeTab, setActiveTab] = useState<'active' | 'officials' | 'past'>('active');
    const [searchQuery, setSearchQuery] = useState('');

    // Register Person Modal
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
    const [regSubmitting, setRegSubmitting] = useState(false);
    const [regForm, setRegForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        birthDate: '',
        gender: 'MALE',
        nationality: 'SUI',
        licenseType: 'PLAYER_STANDARD',
    });
    const [regMsg, setRegMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Assign Role Modal
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [roleSubmitting, setRoleSubmitting] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState('COACH');
    const [customTitle, setCustomTitle] = useState('');
    const [roleMsg, setRoleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError('');
        setUnauthorized(false);
        try {
            const res = await api.getClubMembersHub(clubIdentifier);
            setClub(res.club);
            setActiveMembers(res.activeMembers || []);
            setPastMembers(res.pastMembers || []);
            setAssignedOfficials(res.assignedOfficials || []);

            if (res.club) {
                setEntityMeta({
                    id: res.club.id,
                    title: res.club.name,
                    code: res.club.code,
                    badge: 'Club',
                    subtitle: `${res.club.city || 'Switzerland'} • Members Hub`,
                });
            }
        } catch (err: any) {
            if (err?.status === 403 || err?.message?.toLowerCase().includes('denied') || err?.message?.toLowerCase().includes('forbidden')) {
                setUnauthorized(true);
            } else {
                setError(err.message || 'Failed to load club members hub.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clubIdentifier || authLoading) return;
        loadData();
    }, [clubIdentifier, authLoading]);

    const handleRegisterPerson = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegSubmitting(true);
        setRegMsg(null);
        try {
            await api.registerClubMember(clubIdentifier, {
                firstName: regForm.firstName,
                lastName: regForm.lastName,
                email: regForm.email || undefined,
                birthDate: regForm.birthDate || undefined,
                gender: regForm.gender || undefined,
                nationality: regForm.nationality || undefined,
                licenseType: regForm.licenseType || 'PLAYER_STANDARD',
            });
            setRegMsg({ type: 'success', text: 'New person registered & club license generated!' });
            setTimeout(() => {
                setRegisterModalOpen(false);
                setRegForm({
                    firstName: '',
                    lastName: '',
                    email: '',
                    birthDate: '',
                    gender: 'MALE',
                    nationality: 'SUI',
                    licenseType: 'PLAYER_STANDARD',
                });
                setRegMsg(null);
                loadData();
            }, 1200);
        } catch (err: any) {
            setRegMsg({ type: 'error', text: err.message || 'Failed to register person.' });
        } finally {
            setRegSubmitting(false);
        }
    };

    const handleGrantRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            setRoleMsg({ type: 'error', text: 'Please select a user.' });
            return;
        }

        setRoleSubmitting(true);
        setRoleMsg(null);
        try {
            await api.grantClubRole(clubIdentifier, {
                userId: selectedUserId,
                role: selectedRole,
                title: customTitle || undefined,
            });
            setRoleMsg({ type: 'success', text: 'Official access role assigned successfully!' });
            setTimeout(() => {
                setRoleModalOpen(false);
                setSelectedUserId('');
                setCustomTitle('');
                setRoleMsg(null);
                loadData();
            }, 1200);
        } catch (err: any) {
            setRoleMsg({ type: 'error', text: err.message || 'Failed to assign role.' });
        } finally {
            setRoleSubmitting(false);
        }
    };

    const handleRevokeRole = async (roleId: string) => {
        if (!confirm('Are you sure you want to revoke this official role?')) return;
        try {
            await api.revokeClubRole(clubIdentifier, roleId);
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to revoke role.');
        }
    };

    const filteredActive = useMemo(() => {
        if (!searchQuery.trim()) return activeMembers;
        const q = searchQuery.toLowerCase();
        return activeMembers.filter((m) => {
            const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
            const num = (m.licenseNumber || m.user?.licenseId || '').toLowerCase();
            return name.includes(q) || num.includes(q);
        });
    }, [activeMembers, searchQuery]);

    const filteredPast = useMemo(() => {
        if (!searchQuery.trim()) return pastMembers;
        const q = searchQuery.toLowerCase();
        return pastMembers.filter((m) => {
            const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
            const num = (m.licenseNumber || m.user?.licenseId || '').toLowerCase();
            return name.includes(q) || num.includes(q);
        });
    }, [pastMembers, searchQuery]);

    if (unauthorized) {
        return (
            <AccessDenied
                title="Club Officials Access Required"
                description="This members management hub is restricted to authorized Club Officials (Presidents, Secretaries, Board Members) and Platform Administrators."
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
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Members Hub Unavailable</h2>
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
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <UserCheck className="w-8 h-8 text-red-600" />
                        <span>Club Members & Roles Management</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Create people, manage club official access rights, and review active/past memberships for {club.name}.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => {
                            setRegMsg(null);
                            setRegisterModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Register New Person</span>
                    </button>
                    <button
                        onClick={() => {
                            setRoleMsg(null);
                            setRoleModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold shadow-xs transition"
                    >
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>Assign Official Role</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Members</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{activeMembers.length}</div>
                    </div>
                    <Users className="w-8 h-8 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Officials</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{assignedOfficials.length}</div>
                    </div>
                    <Key className="w-8 h-8 text-amber-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Past / Inactive</div>
                        <div className="text-2xl font-black text-slate-500 dark:text-slate-400">{pastMembers.length}</div>
                    </div>
                    <Clock className="w-8 h-8 text-slate-400" />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'active'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Active Members ({activeMembers.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('officials')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'officials'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Key className="w-4 h-4" />
                    <span>Club Officials & Permissions ({assignedOfficials.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'past'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Past Members ({pastMembers.length})</span>
                </button>
            </div>

            {/* Search filter for tables */}
            {activeTab !== 'officials' && (
                <div className="relative max-w-sm w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter members by name, license #..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    />
                </div>
            )}

            {/* Tab 1: Active Members */}
            {activeTab === 'active' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Member</th>
                                    <th className="px-4 py-3">License #</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Validity</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredActive.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                            No active members found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredActive.map((m) => {
                                        const u = m.user || {};
                                        const personId = u.licenseId || u.id;
                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                                                    {u.firstName} {u.lastName}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-red-600">
                                                    {m.licenseNumber || u.licenseId || 'PENDING'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.type}</td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                                                        {m.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {m.validUntil ? format(new Date(m.validUntil), 'MMM yyyy') : 'Current Season'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {personId && (
                                                        <Link
                                                            href={`/people/${personId}`}
                                                            className="inline-flex items-center gap-1 text-red-600 hover:underline font-bold"
                                                        >
                                                            <span>Profile</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Officials Management */}
            {activeTab === 'officials' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignedOfficials.map((official) => {
                            const u = official.user || {};
                            const personId = u.licenseId || u.id;
                            const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'OF';

                            return (
                                <div
                                    key={official.id}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {u.firstName} {u.lastName}
                                                    </h3>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {u.email}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="rounded-md bg-amber-100 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                                {official.role}
                                            </span>
                                        </div>

                                        {official.title && (
                                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Custom Title: <span className="font-normal text-slate-500">{official.title}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                                        {personId && (
                                            <Link
                                                href={`/people/${personId}`}
                                                className="font-bold text-red-600 hover:underline inline-flex items-center gap-1"
                                            >
                                                <span>Profile</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => handleRevokeRole(official.id)}
                                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold p-1 rounded hover:bg-red-50 dark:hover:bg-red-950"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Revoke</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab 3: Past Members */}
            {activeTab === 'past' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Member</th>
                                    <th className="px-4 py-3">Last License #</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Expired Date</th>
                                    <th className="px-4 py-3 text-right">Profile</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredPast.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                            No past / expired members recorded.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPast.map((m) => {
                                        const u = m.user || {};
                                        const personId = u.licenseId || u.id;
                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                                                    {u.firstName} {u.lastName}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-slate-500">
                                                    {m.licenseNumber || u.licenseId || 'ARCHIVED'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.type}</td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                                                        {m.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {m.validUntil ? format(new Date(m.validUntil), 'PPP') : 'Expired'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {personId && (
                                                        <Link
                                                            href={`/people/${personId}`}
                                                            className="inline-flex items-center gap-1 text-slate-600 hover:text-red-600 font-bold"
                                                        >
                                                            <span>Profile</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Register New Person Modal */}
            {registerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-red-600" />
                                <span>Register New Person</span>
                            </h3>
                            <button
                                onClick={() => setRegisterModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {regMsg && (
                            <div
                                className={`rounded-xl p-3 text-xs font-bold ${
                                    regMsg.type === 'success'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                }`}
                            >
                                {regMsg.text}
                            </div>
                        )}

                        <form onSubmit={handleRegisterPerson} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 dark:text-slate-300">First Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={regForm.firstName}
                                        onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                                        placeholder="e.g. Roger"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 dark:text-slate-300">Last Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={regForm.lastName}
                                        onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                                        placeholder="e.g. Federer"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                                <input
                                    type="email"
                                    value={regForm.email}
                                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                    placeholder="member@example.com (optional)"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 dark:text-slate-300">Birth Date</label>
                                    <input
                                        type="date"
                                        value={regForm.birthDate}
                                        onChange={(e) => setRegForm({ ...regForm, birthDate: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 dark:text-slate-300">Gender</label>
                                    <select
                                        value={regForm.gender}
                                        onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 dark:text-slate-300">Nationality</label>
                                    <input
                                        type="text"
                                        value={regForm.nationality}
                                        onChange={(e) => setRegForm({ ...regForm, nationality: e.target.value })}
                                        placeholder="SUI"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500 uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Initial Club License Category *</label>
                                <select
                                    value={regForm.licenseType}
                                    onChange={(e) => setRegForm({ ...regForm, licenseType: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="PLAYER_STANDARD">Player Standard (Adult)</option>
                                    <option value="PLAYER_JUNIOR">Player Junior (Youth)</option>
                                    <option value="PLAYER_SENIOR">Player Senior (Veterans)</option>
                                    <option value="COACH">Coach Sanction</option>
                                    <option value="REFEREE">Referee Sanction</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setRegisterModalOpen(false)}
                                    className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-300 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={regSubmitting}
                                    className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 font-bold text-white shadow-xs transition"
                                >
                                    {regSubmitting ? 'Registering...' : 'Register Person'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Role Modal */}
            {roleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Key className="w-5 h-5 text-amber-500" />
                                <span>Assign Club Official Role</span>
                            </h3>
                            <button
                                onClick={() => setRoleModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {roleMsg && (
                            <div
                                className={`rounded-xl p-3 text-xs font-bold ${
                                    roleMsg.type === 'success'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                }`}
                            >
                                {roleMsg.text}
                            </div>
                        )}

                        <form onSubmit={handleGrantRole} className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Select Member *</label>
                                <select
                                    required
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">-- Choose Member --</option>
                                    {activeMembers.map((m) => (
                                        <option key={m.userId || m.id} value={m.userId || m.id}>
                                            {m.user?.firstName} {m.user?.lastName} ({m.user?.email || m.user?.licenseId || 'Member'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Official Role *</label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="PRESIDENT">President / Chairman</option>
                                    <option value="SECRETARY">Secretary / Board Member</option>
                                    <option value="TREASURER">Treasurer / Finance</option>
                                    <option value="COACH">Head Coach</option>
                                    <option value="JUNIOR_COACH">Junior / Youth Coach</option>
                                    <option value="TECHNICAL_DIRECTOR">Technical Director</option>
                                    <option value="OFFICIAL">Sanctioned Official / Delegate</option>
                                    <option value="ADMIN">Club Administrator</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 dark:text-slate-300">Custom Title (Optional)</label>
                                <input
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    placeholder="e.g. Youth Coordinator & Chief Scorer"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setRoleModalOpen(false)}
                                    className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-300 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={roleSubmitting}
                                    className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 font-bold text-white shadow-xs transition"
                                >
                                    {roleSubmitting ? 'Assigning...' : 'Assign Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

