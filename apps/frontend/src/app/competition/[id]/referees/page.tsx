'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    GraduationCap,
    ChevronRight,
    Plus,
    UserCheck,
    ArrowLeft,
    Shield,
    Trophy,
    Award,
    Scale,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

export default function CompetitionRefereesPage() {
    const params = useParams();
    const competitionId = params.id as string;
    const { user } = useAuth();
    const { t } = useI18n();

    const [competition, setCompetition] = useState<any | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const comp = await api.getCompetition(competitionId);
            setCompetition(comp);
            const rolesData = await api.getCompetitionRoles(competitionId).catch(() => []);
            setRoles(rolesData || []);
        } catch (err: any) {
            console.error('Failed to load referees', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    const refereeRoles = roles.filter(
        (r) => r.role === 'REFEREE' || r.role === 'HEAD_REFEREE' || r.role === 'DIRECTOR'
    );

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'officialName',
                accessorFn: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Official Name" />,
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
                id: 'designation',
                accessorFn: (row) => row.role,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Designation" />,
                cell: ({ row }) => (
                    <span
                        className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase border ${
                            row.original.role === 'HEAD_REFEREE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40'
                        }`}
                    >
                        {row.original.role === 'HEAD_REFEREE' ? 'Head Referee (Chief)' : row.original.role === 'DIRECTOR' ? 'Tournament Director' : 'Table Umpire'}
                    </span>
                ),
            },
            {
                id: 'createdAt',
                accessorFn: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
                header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned On" />,
                cell: ({ row }) => (
                    <span className="text-xs text-slate-400">
                        {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '–'}
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <div className="space-y-6 max-w-6xl pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <Link href={`/competition/${competitionId}`} className="hover:text-red-600 transition flex items-center gap-1">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>{competition?.name || 'Tournament'}</span>
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-slate-700 dark:text-slate-200 font-bold">Match Officials</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Scale className="h-6 w-6 text-red-500" />
                        <span>Referees & Table Umpires</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Designated match officials and scoring controllers for {competition?.name || 'this competition'}.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={`/competition/${competitionId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        href={`/competition/${competitionId}/access`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Manage In Access Rights</span>
                    </Link>
                </div>
            </div>

            {/* Interactive DataTable */}
            <DataTable
                columns={columns}
                data={refereeRoles}
                loading={loading}
                searchPlaceholder="Search referee name, email, or designation..."
                emptyMessage="No designated referees assigned yet. Go to Access Rights to appoint Head Referees and Table Umpires."
                defaultPageSize={10}
                pageSizeOptions={[5, 10, 25, 50]}
            />
        </div>
    );
}