'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { ModalPortal } from '@/components/ui/ModalPortal';
import {
    Key,
    ChevronLeft,
    Plus,
    Trash2,
    Shield,
    Users,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CompetitionAccessPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin;
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [newRole, setNewRole] = useState({
        userId: '',
        role: 'ENTER_RESULTS',
    });

    const fetchData = async () => {
        try {
            const [comp, r, u] = await Promise.all([
                api.getCompetition(competitionId),
                api.getCompetitionRoles(competitionId).catch(() => []),
                api.getUsers().catch(() => ({ users: [] })),
            ]);
            setCompetition(comp);
            setRoles(r || []);
            setUsersList(u.users || (Array.isArray(u) ? u : []));
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to load access rights');
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

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.assignCompetitionRole(competitionId, newRole);
            setShowModal(false);
            setSuccessMessage('Access role assigned successfully.');
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to assign role');
        }
    };

    const handleRevokeRole = async (roleId: string) => {
        if (!confirm('Are you sure you want to revoke this access right?')) return;
        try {
            await api.revokeCompetitionRole(competitionId, roleId);
            setSuccessMessage('Access role revoked.');
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to revoke role');
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
                            <Key className="h-7 w-7 text-cyan-400" />
                            Granular Access Rights
                        </h1>
                    </div>
                </div>
                {hasAdminRole && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500"
                    >
                        <Plus className="h-4 w-4" /> Assign Access Role
                    </button>
                )}
            </div>

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

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-white">Assigned Competition Personnel</h3>
                        <p className="text-xs text-zinc-400">
                            Users with designated administrative, scoring, refereeing, speaker, or cashier duties.
                        </p>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
                        {roles.length} Roles Assigned
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                        <thead className="border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Assigned Role</th>
                                <th className="px-6 py-4">Granted At</th>
                                {hasAdminRole && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {roles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        No explicit competition roles assigned yet.
                                    </td>
                                </tr>
                            ) : (
                                roles.map((r) => (
                                    <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-orange-400">
                                                {r.user?.firstName?.[0] || 'U'}
                                            </div>
                                            <span>
                                                {r.user?.firstName} {r.user?.lastName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">{r.user?.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-0.5 text-xs font-semibold text-orange-400">
                                                {r.role.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-500">
                                            {format(new Date(r.createdAt), 'dd.MM.yyyy HH:mm')}
                                        </td>
                                        {hasAdminRole && (
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleRevokeRole(r.id)}
                                                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
                                                    title="Revoke Permission"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Assign Role */}
            {showModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Key className="h-5 w-5 text-orange-400" />
                                Assign Competition Access Role
                            </h3>

                            <form onSubmit={handleAssignRole} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Select User
                                    </label>
                                    <select
                                        value={newRole.userId}
                                        onChange={(e) => setNewRole({ ...newRole, userId: e.target.value })}
                                        required
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                                    >
                                        <option value="">-- Choose User --</option>
                                        {usersList.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.firstName} {u.lastName} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Competition Role
                                    </label>
                                    <select
                                        value={newRole.role}
                                        onChange={(e) => setNewRole({ ...newRole, role: e.target.value })}
                                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                                    >
                                        <option value="ADMIN">ADMIN (Full management)</option>
                                        <option value="ENTER_RESULTS">ENTER_RESULTS (Live scoresheet)</option>
                                        <option value="ASSIGN_COURTS">ASSIGN_COURTS (Assign tables)</option>
                                        <option value="SPEAKER">SPEAKER (Audio announcements)</option>
                                        <option value="HEAD_REFEREE">HEAD_REFEREE (Tournament director)</option>
                                        <option value="REFEREE">REFEREE (Table umpire)</option>
                                        <option value="CASHIER">CASHIER (Entry fee payments)</option>
                                        <option value="CREATE_BACKUPS">CREATE_BACKUPS (Snapshot export)</option>
                                        <option value="EDIT_REGISTRATIONS">EDIT_REGISTRATIONS (Roster edits)</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-500 shadow-md shadow-orange-600/30"
                                    >
                                        Assign Access
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
