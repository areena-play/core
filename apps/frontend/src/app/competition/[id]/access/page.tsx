'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { Modal } from '@/components/ui/Modal';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

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
        (ar: any) =>
            (ar.associationId === competition?.associationId && (ar.role === 'ADMIN' || ar.role === 'PRESIDENT')) ||
            ar.role === 'SUPERADMIN'
    );

    const canManage = isSuperAdmin || isAssocAdmin;

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRole.userId) return;
        try {
            await api.assignCompetitionRole(competitionId, { userId: newRole.userId, role: newRole.role });
            setActionMsg({ type: 'success', text: 'Role successfully assigned to user.' });
            setShowModal(false);
            setNewRole({ userId: '', role: 'REFEREE' });
            fetchData();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to assign role' });
        }
    };

    const handleRevokeRole = async (roleId: string) => {
        if (!confirm('Are you sure you want to revoke this competition role?')) return;
        try {
            await api.revokeCompetitionRole(competitionId, roleId);
            setActionMsg({ type: 'success', text: 'Role successfully revoked.' });
            fetchData();
        } catch (err: any) {
            setActionMsg({ type: 'error', text: err.message || 'Failed to revoke role' });
        }
    };

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'userName',
                accessorFn: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="User / Staff Member" />,
                cell: ({ row }) => (
                    <span className="font-semibold text-slate-900 dark:text-white">
                        {row.original.user?.firstName} {row.original.user?.lastName}
                    </span>
                ),
            },
            {
                id: 'email',
                accessorFn: (row) => row.user?.email || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Email Address" />,
                cell: ({ row }) => (
                    <span className="font-mono text-xs text-slate-500">{row.original.user?.email}</span>
                ),
            },
            {
                id: 'role',
                accessorFn: (row) => row.role,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned Role" />,
                cell: ({ row }) => (
                    <span className="rounded px-2 py-0.5 text-[11px] font-bold uppercase border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40">
                        {row.original.role}
                    </span>
                ),
            },
            {
                id: 'createdAt',
                accessorFn: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
                header: ({ column }) => <DataTableColumnHeader column={column} title="Granted On" />,
                cell: ({ row }) => (
                    <span className="text-xs text-slate-400">
                        {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '–'}
                    </span>
                ),
            },
            ...(canManage
                ? [
                      {
                          id: 'actions',
                          header: () => <div className="text-right">Actions</div>,
                          cell: ({ row }: any) => (
                              <div className="text-right">
                                  <button
                                      type="button"
                                      onClick={() => handleRevokeRole(row.original.id)}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                      title="Revoke Role"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              </div>
                          ),
                      },
                  ]
                : []),
        ],
        [canManage]
    );

    return (
        <div className="space-y-6 max-w-6xl pb-12">
            {/* Breadcrumb Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <Link href={`/competition/${competitionId}`} className="hover:text-red-600 transition flex items-center gap-1">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>{competition?.name || 'Tournament'}</span>
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-slate-700 dark:text-slate-200 font-bold">Access Rights</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Key className="h-6 w-6 text-red-500" />
                        <span>Competition Roles & Permissions</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Manage referee assignments, speaker console access, and tournament director privileges.
                    </p>
                </div>

                {canManage && (
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Assign Staff Role</span>
                    </button>
                )}
            </div>

            {/* Action Alert */}
            {actionMsg && (
                <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                        actionMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    }`}
                >
                    {actionMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{actionMsg.text}</span>
                </div>
            )}

            {/* Interactive DataTable */}
            <DataTable
                columns={columns}
                data={roles}
                loading={loading}
                searchPlaceholder="Search staff members, emails, or roles..."
                emptyMessage="No explicit competition roles assigned yet. Association administrators retain top access."
                defaultPageSize={10}
                pageSizeOptions={[5, 10, 25, 50]}
            />

            {/* Assign Role Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Assign Competition Role"
                subtitle="Grant administrative or operational permissions for this tournament"
                icon={<Key className="h-5 w-5 text-red-500" />}
                size="md"
            >
                <form onSubmit={handleAssignRole} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select User</label>
                        <select
                            required
                            value={newRole.userId}
                            onChange={(e) => setNewRole({ ...newRole, userId: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                        >
                            <option value="">-- Choose a registered member --</option>
                            {usersList.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select Role</label>
                        <select
                            value={newRole.role}
                            onChange={(e) => setNewRole({ ...newRole, role: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                        >
                            <option value="DIRECTOR">Tournament Director (Full Control)</option>
                            <option value="REFEREE">Chief Referee / Umpire (Matches & Scoring)</option>
                            <option value="SPEAKER">Speaker / Announcer (Announcements)</option>
                            <option value="CASHIER">Cashier (Player Check-in & Fees)</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow"
                        >
                            Grant Permission
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}