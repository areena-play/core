'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Key,
    ChevronRight,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    ArrowLeft,
    Shield,
    Trophy,
} from 'lucide-react';
import { ModalPortal } from '@/components/ui/ModalPortal';

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
    const [newRole, setNewRole] = useState({ userId: '', role: 'REFEREE' });
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = async () => {
        try {
            const comp = await api.getCompetition(competitionId);
            setCompetition(comp);
            const [rolesData, usersData] = await Promise.all([
                api.getCompetitionRoles(competitionId).catch(() => []),
                api.getUsers ? api.getUsers().catch(() => []) : Promise.resolve([]),
            ]);
            setRoles(rolesData || []);
            setUsersList(Array.isArray(usersData) ? usersData : usersData?.users || []);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to load access rights' });
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
    const canManage = isSuperAdmin || isAssocAdmin || roles.some((r) => r.userId === user?.id && r.role === 'ADMIN');

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.assignCompetitionRole(competitionId, newRole);
            setShowModal(false);
            setActionMsg({ type: 'success', text: 'Access role assigned successfully.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to assign role' });
        }
    };

    const handleRevokeRole = async (roleId: string) => {
        if (!confirm('Are you sure you want to revoke this access role?')) return;
        try {
            await api.revokeCompetitionRole(competitionId, roleId);
            setActionMsg({ type: 'success', text: 'Access role revoked.' });
            fetchData();
            setTimeout(() => setActionMsg(null), 3000);
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to revoke role' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/competitions" className="hover:underline flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-red-500" />
                    <span>{t('nav.competitions') || 'Competitions'}</span>
                </Link>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/competition/${competitionId}`} className="hover:underline text-slate-700 dark:text-slate-300 font-medium">
                    {competition?.name || 'Tournament'}
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="font-semibold text-slate-900 dark:text-white">Access Rights & Permissions</span>
            </div>

            {/* Header Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase border bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/50">
                                Staff Permissions
                            </span>
                            <span className="font-mono text-xs text-slate-400">Granular Access Control</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Key className="h-6 w-6 text-red-500" />
                            <span>Competition Access Rights</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Assign roles for tournament administration, refereeing, scorekeeping, cashier desk, and speaker announcements
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={`/competition/${competitionId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Dashboard</span>
                        </Link>
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Assign Role</span>
                            </button>
                        )}
                    </div>
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

            {/* Roles Table Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Personnel & Role Permissions ({roles.length})</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-3">User / Staff Member</th>
                                <th className="p-3">Email Address</th>
                                <th className="p-3">Assigned Role</th>
                                <th className="p-3">Granted On</th>
                                {canManage && <th className="p-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {roles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                                        No explicit competition roles assigned yet. Association administrators automatically retain top access.
                                    </td>
                                </tr>
                            ) : (
                                roles.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                            {r.user?.firstName} {r.user?.lastName}
                                        </td>
                                        <td className="p-3 font-mono text-xs text-slate-500">{r.user?.email}</td>
                                        <td className="p-3">
                                            <span className="rounded px-2 py-0.5 text-[11px] font-bold uppercase border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40">
                                                {r.role}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs text-slate-400">
                                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '–'}
                                        </td>
                                        {canManage && (
                                            <td className="p-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRevokeRole(r.id)}
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                                    title="Revoke Role"
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

            {/* Assign Role Modal */}
            {showModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">Assign Competition Role</h3>
                                <button type="button" onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                            </div>
                <form onSubmit={handleAssignRole} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select User</label>
                        <select
                            required
                            value={newRole.userId}
                            onChange={(e) => setNewRole({ ...newRole, userId: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        >
                            <option value="">-- Choose registered user --</option>
                            {usersList.map((u: any) => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Granted Role</label>
                        <select
                            value={newRole.role}
                            onChange={(e) => setNewRole({ ...newRole, role: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-red-500"
                        >
                            <option value="ADMIN">ADMIN (Full tournament control)</option>
                            <option value="HEAD_REFEREE">HEAD REFEREE (Official referee in chief)</option>
                            <option value="REFEREE">REFEREE (Table umpire / match referee)</option>
                            <option value="ENTERING_RESULTS">ENTERING RESULTS (Scorekeeper)</option>
                            <option value="STARTING_MATCHES_ASSIGNING_COURTS">STARTING MATCHES & ASSIGNING COURTS</option>
                            <option value="CALLOUTS">CALLOUTS (Speaker & Announcer)</option>
                            <option value="CASHIER">CASHIER (Entry fee collections)</option>
                            <option value="CAN_CREATE_BACKUPS">CAN CREATE BACKUPS</option>
                            <option value="CAN_EDIT_REGISTRATIONS">CAN EDIT REGISTRATIONS</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs"
                        >
                            Assign Role
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
