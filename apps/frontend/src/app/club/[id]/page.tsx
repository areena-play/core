'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Shield,
    Users,
    Trophy,
    Calendar,
    Mail,
    Award,
    CheckCircle2,
    MapPin,
    Plus,
    ChevronRight,
    ExternalLink,
    Clock,
    Search,
    Flame,
} from 'lucide-react';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

export default function SingleClubPage() {
    const params = useParams();
    const clubId = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [club, setClub] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClubData = async () => {
        try {
            const clubs = await api.getClubs();
            const foundClub = clubs.find((c: any) => c.id === clubId);
            if (foundClub) {
                setClub(foundClub);
                setEntityMeta({
                    id: foundClub.id,
                    title: foundClub.name,
                    code: foundClub.code,
                    badge: 'Club',
                    subtitle: `${foundClub.city} • Affiliated with Regional & National Associations`,
                });
            }

            // Load licenses/members associated
            const licensesData = await api.getLicenses();
            setMembers(licensesData || []);

            // Load competitions
            const compsData = await api.getCompetitions();
            setCompetitions(compsData || []);
        } catch (err) {
            console.error('Failed to load club details', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clubId) {
            fetchClubData();
        }
    }, [clubId]);

    const filteredMembers = members.filter((m) => m.clubId === clubId || m.club?.id === clubId);

    const memberColumns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'member',
                accessorFn: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Member / Athlete" />,
                cell: ({ row }) => (
                    <span className="font-semibold text-slate-900 dark:text-white">
                        {row.original.user ? `${row.original.user.firstName} ${row.original.user.lastName}` : 'Club Member'}
                    </span>
                ),
            },
            {
                id: 'type',
                accessorFn: (row) => row.type,
                header: ({ column }) => <DataTableColumnHeader column={column} title="License Type" />,
                cell: ({ row }) => (
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                        {row.original.type}
                    </span>
                ),
            },
            {
                id: 'licenseNumber',
                accessorFn: (row) => row.licenseNumber || row.user?.licenseId || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="License #" />,
                cell: ({ row }) => (
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {row.original.licenseNumber || row.original.user?.licenseId || 'PENDING'}
                    </span>
                ),
            },
            {
                id: 'eloPoints',
                accessorFn: (row) => row.user?.eloPoints || 1200,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Elo Points" />,
                cell: ({ row }) => (
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {row.original.user?.eloPoints || 1200} pts
                    </span>
                ),
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
                cell: ({ row }) => {
                    const isApproved = row.original.status === 'APPROVED';
                    return (
                        <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                isApproved
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/50'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800/50'
                            }`}
                        >
                            {row.original.status}
                        </span>
                    );
                },
            },
            {
                id: 'validity',
                accessorFn: (row) => (row.validUntil ? new Date(row.validUntil).getTime() : 0),
                header: ({ column }) => <DataTableColumnHeader column={column} title="Validity" className="justify-end w-full" />,
                cell: ({ row }) => (
                    <div className="text-right text-slate-500 dark:text-slate-400">
                        {row.original.validUntil ? format(new Date(row.original.validUntil), 'MMM yyyy') : 'Current Season'}
                    </div>
                ),
            },
        ],
        []
    );

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Club Banner Header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
                            {club?.code || 'CLB'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                    {club?.name || 'Club Directory'}
                                </h1>
                                <span className="rounded-full bg-red-100 dark:bg-red-950 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                                    Active Club
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span>{club?.address || `${club?.city || 'Switzerland'}`}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/licenses/apply"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Request Club License</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Athletes</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{filteredMembers.length}</div>
                    </div>
                    <Users className="w-8 h-8 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Rating</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {filteredMembers.length > 0
                                ? Math.round(
                                      filteredMembers.reduce((acc, m) => acc + (m.user?.eloPoints || 1200), 0) /
                                          filteredMembers.length
                                  )
                                : 1200}{' '}
                            <span className="text-xs font-normal text-slate-400">pts</span>
                        </div>
                    </div>
                    <Trophy className="w-8 h-8 text-amber-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Affiliated City</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white truncate">{club?.city || 'Switzerland'}</div>
                    </div>
                    <MapPin className="w-8 h-8 text-blue-500" />
                </div>
            </div>

            {/* Members Interactive DataTable */}
            <div className="space-y-3" id="members">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-red-500" />
                        <span>{t('clubWorkspace.members')}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Manage club athlete passes, Elo ratings, and licensing validation.
                    </p>
                </div>

                <DataTable
                    columns={memberColumns}
                    data={filteredMembers}
                    searchPlaceholder="Search club athletes, license #, type..."
                    emptyMessage="No athletes currently registered under this club."
                    defaultPageSize={10}
                    pageSizeOptions={[5, 10, 25, 50]}
                />
            </div>
        </div>
    );
}