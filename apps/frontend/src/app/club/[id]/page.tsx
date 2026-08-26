'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';

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
    const [searchMember, setSearchMember] = useState('');

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
            console.error('Failed to load club:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clubId) {
            fetchClubData();
        }
        return () => {
            setEntityMeta(null);
        };
    }, [clubId]);

    const isClubAdmin =
        user?.isSuperAdmin ||
        user?.clubRoles?.some(
            (r: any) => r.clubId === clubId && ['ADMIN', 'PRESIDENT', 'MANAGER'].includes(r.role),
        );

    const filteredMembers = members.filter((m) => {
        const fullName = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchMember.toLowerCase()) || m.licenseNumber?.includes(searchMember);
    });

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!club) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-8 text-center text-slate-700 dark:text-slate-300">
                Club not found.
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Club Workspace Header Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 px-2.5 py-0.5 text-xs font-bold uppercase">
                                Affiliated Sports Club
                            </span>
                            <span className="font-mono text-xs text-red-600 dark:text-red-400 font-bold">
                                [{club.code}]
                            </span>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">
                            {club.name}
                        </h1>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                            <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-red-500" />
                                {club.city || 'Switzerland'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-slate-400" />
                                {t('clubWorkspace.registeredPlayersCount', { count: members.length })}
                            </span>
                        </div>
                    </div>

                    {/* Quick Club Actions */}
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/licenses/apply"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                        >
                            <Plus className="h-4 w-4" />
                            <span>{t('licenses.applyNew')}</span>
                        </Link>
                        {isClubAdmin && (
                            <Link
                                href="/licenses/approvals"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                <Award className="h-4 w-4 text-amber-500" />
                                <span>{t('licenses.approvalsQueue')}</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Club Workspace KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        Club Members
                    </span>
                    <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {members.length}
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        League Teams
                    </span>
                    <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {competitions.length > 0 ? competitions.length : 1}
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        Active Licenses
                    </span>
                    <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {members.filter((m) => m.status === 'APPROVED').length}
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        Domestic T-Cards
                    </span>
                    <div className="mt-1 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                        {members.filter((m) => m.type === 'DOMESTIC_T_CARD').length}
                    </div>
                </div>
            </div>

            {/* Members Roster Section */}
            <div className="space-y-4" id="members">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-red-500" />
                            <span>{t('clubWorkspace.members')}</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Manage club athlete passes, Elo ratings, and licensing validation.
                        </p>
                    </div>

                    <div className="relative min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter members..."
                            value={searchMember}
                            onChange={(e) => setSearchMember(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-xs">
                    <table className="w-full text-left text-xs min-w-[600px]">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                            <tr>
                                <th className="py-3 pl-4 pr-2">Member / Athlete</th>
                                <th className="py-3 px-3">License Type</th>
                                <th className="py-3 px-3 font-mono">License #</th>
                                <th className="py-3 px-3 font-mono">Elo Points</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 pr-4 pl-2 text-right">Validity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredMembers.map((m) => (
                                <tr
                                    key={m.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                                >
                                    <td className="py-3 pl-4 pr-2 font-medium text-slate-900 dark:text-white">
                                        {m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Club Member'}
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                                            {m.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-red-600 dark:text-red-400">
                                        {m.licenseNumber || 'PENDING'}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                        {m.user?.eloPoints || 1200} pts
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                m.status === 'APPROVED'
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/50'
                                                    : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800/50'
                                            }`}
                                        >
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 pl-2 text-right text-slate-500 dark:text-slate-400">
                                        {m.validUntil ? format(new Date(m.validUntil), 'MMM yyyy') : 'Current Season'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registered League Teams Section */}
            <div className="space-y-4" id="teams">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-red-500" />
                        <span>{t('clubWorkspace.teams')}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Active teams representing {club.name} in national and regional championships.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {competitions.slice(0, 3).map((comp, idx) => (
                        <div
                            key={comp.id || idx}
                            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 shadow-xs space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                                    Team #{idx + 1}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                    {comp.type}
                                </span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                {club.name} Team {idx + 1}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                {comp.name}
                            </p>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <Link
                                    href={`/tournament/${comp.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                                >
                                    <span>View Tournament</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

