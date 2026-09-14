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
    Building2,
    UserCheck,
    Megaphone,
    Sparkles,
    Settings,
    Layers,
} from 'lucide-react';
import { format } from 'date-fns';

export default function SingleClubOverviewPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [club, setClub] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [contactsData, setContactsData] = useState<any>(null);
    const [eventsData, setEventsData] = useState<any>(null);
    const [tournamentsData, setTournamentsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isClubOfficial =
        user?.isSuperAdmin ||
        user?.clubRoles?.some(
            (r: any) =>
                (r.clubId === club?.id || r.club?.slug === club?.slug || r.clubId === clubIdentifier || r.club?.slug === clubIdentifier) &&
                ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COACH', 'TECHNICAL_DIRECTOR', 'JUNIOR_COACH', 'OFFICIAL'].includes(r.role)
        );

    const fetchClubData = async () => {
        setLoading(true);
        try {
            const [contactsRes, membersRes, eventsRes, tournamentsRes] = await Promise.all([
                api.getClubContacts(clubIdentifier).catch(() => null),
                api.getClubMembers(clubIdentifier).catch(() => null),
                api.getClubEvents(clubIdentifier).catch(() => null),
                api.getClubTournaments(clubIdentifier).catch(() => null),
            ]);

            const targetClub = contactsRes?.club || membersRes?.club || eventsRes?.club || tournamentsRes?.club;
            if (targetClub) {
                setClub(targetClub);
                setContactsData(contactsRes);
                setMembers(membersRes?.members || membersRes?.licenses || []);
                setEventsData(eventsRes);
                setTournamentsData(tournamentsRes);

                setEntityMeta({
                    id: targetClub.id,
                    title: targetClub.name,
                    code: targetClub.code,
                    badge: 'Club',
                    subtitle: `${targetClub.city || 'Switzerland'} • Official Sports Club Overview`,
                });
            } else {
                setClub(null);
            }
        } catch (err) {
            console.error('Failed to load club overview', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clubIdentifier) {
            fetchClubData();
        }
    }, [clubIdentifier]);

    const topAthletes = useMemo(() => {
        return [...members]
            .filter((m) => m.status === 'APPROVED' && m.user)
            .sort((a, b) => (b.user?.eloPoints || 1200) - (a.user?.eloPoints || 1200))
            .slice(0, 5);
    }, [members]);

    const upcomingMatches = useMemo(() => {
        const encs = eventsData?.encounters || [];
        return encs
            .filter((e: any) => e.status !== 'COMPLETED')
            .slice(0, 4);
    }, [eventsData]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (!club) {
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Club Not Found</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        No club matching identifier &quot;{clubIdentifier}&quot; could be located.
                    </p>
                </div>
                <div>
                    <Link
                        href="/clubs"
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                    >
                        <span>Back to Clubs Directory</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    const officialsCount = contactsData?.officials?.length || 0;
    const venuesCount = contactsData?.locations?.length || 0;
    const teamsCount = eventsData?.teams?.length || 0;
    const hostedTournamentsCount = tournamentsData?.hostedTournaments?.length || 0;

    return (
        <div className="space-y-8 pb-12">
            {/* Club Banner Header */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/80 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                            {club.code || 'CLB'}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {club.name}
                                </h1>
                                <span className="rounded-full bg-red-100 dark:bg-red-950 px-3 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                                    Active Club
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-red-500" />
                                <span>{club.address || `${club.city || 'Switzerland'}`}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href={`/club/${clubIdentifier}/teams`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                        >
                            <Trophy className="w-4 h-4 text-blue-500" />
                            <span>Team Hub</span>
                        </Link>
                        <Link
                            href={`/club/${clubIdentifier}/tournaments`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
                        >
                            <Layers className="w-4 h-4" />
                            <span>Tournament Hub</span>
                        </Link>
                        {isClubOfficial && (
                            <Link
                                href={`/club/${clubIdentifier}/settings`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2.5 text-xs font-bold shadow-xs transition"
                                title="Club Settings"
                            >
                                <Settings className="w-4 h-4 text-slate-300" />
                                <span>Settings</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Link
                    href={`/club/${clubIdentifier}/members`}
                    className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between hover:border-red-300 dark:hover:border-red-900 transition group"
                >
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-red-600 transition">Members</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{members.length}</div>
                    </div>
                    <Users className="w-7 h-7 text-red-500" />
                </Link>
                <Link
                    href={`/club/${clubIdentifier}/teams`}
                    className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-900 transition group"
                >
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition">Team Hub</div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{teamsCount}</div>
                    </div>
                    <Trophy className="w-7 h-7 text-blue-500" />
                </Link>
                <Link
                    href={`/club/${clubIdentifier}/tournaments`}
                    className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-900 transition group"
                >
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-purple-600 transition">Hosted Tournaments</div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{hostedTournamentsCount}</div>
                    </div>
                    <Layers className="w-7 h-7 text-purple-500" />
                </Link>
                <Link
                    href={`/club/${clubIdentifier}/contacts`}
                    className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-900 transition group"
                >
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition">Sports Halls</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{venuesCount}</div>
                    </div>
                    <MapPin className="w-7 h-7 text-emerald-500" />
                </Link>
            </div>

            {/* Quick Navigation Cards */}
            <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Club Sections & Sites</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        href={`/club/${clubIdentifier}/teams`}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-900 transition group space-y-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                                    Teams & Rosters
                                </h3>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Overview of registered teams in leagues and cups, squad rosters, and standings.
                            </p>
                        </div>
                    </Link>

                    <Link
                        href={`/club/${clubIdentifier}/members`}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-red-300 dark:hover:border-red-900 transition group space-y-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition">
                                    Registered Members
                                </h3>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Complete athlete roster with Elo ratings and profile links.
                            </p>
                        </div>
                    </Link>

                    <Link
                        href={`/club/${clubIdentifier}/contacts`}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-900 transition group space-y-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                                    Contacts & Venues
                                </h3>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Club address, board officials, and sports court facilities.
                            </p>
                        </div>
                    </Link>

                    <Link
                        href={`/club/${clubIdentifier}/events`}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-amber-300 dark:hover:border-amber-900 transition group space-y-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                                    Events & League Fixtures
                                </h3>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                League matches, schedules, scores, and calendar events.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Club Officials Hubs Section (Shown for Officials / Admins) */}
            {isClubOfficial && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-red-600" />
                            <span>Club Officials Operations</span>
                        </h2>
                        <span className="rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-red-200 dark:border-red-900/40">
                            Sanctioned Area
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link
                            href={`/club/${clubIdentifier}/team-hub`}
                            className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 p-5 shadow-sm hover:border-red-400 transition group space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition">
                                        Team Hub
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Register teams, manage player rosters, set captains, and manage promotions & relegations.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={`/club/${clubIdentifier}/tournaments`}
                            className="rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10 p-5 shadow-sm hover:border-purple-400 transition group space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition">
                                        Tournament Hub
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Register & host tournaments, configure categories, entry fees, and tableaus.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={`/club/${clubIdentifier}/licensing`}
                            className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 p-5 shadow-sm hover:border-amber-400 transition group space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                                        Licensing Hub
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Sanction licenses, renew passes, or apply on behalf.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={`/club/${clubIdentifier}/members-hub`}
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-red-300 dark:hover:border-red-900 transition group space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition">
                                        Members Hub
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Register people, assign official roles, and manage access.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={`/club/${clubIdentifier}/communications`}
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-red-300 dark:hover:border-red-900 transition group space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
                                <Megaphone className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition">
                                        Communication Hub
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Broadcast announcements and newsletters to members.
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={`/club/${clubIdentifier}/settings`}
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-slate-400 dark:hover:border-slate-700 transition group space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold">
                                <Settings className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white transition">
                                        Club Settings
                                    </h3>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Manage club info, addresses, branding logos, and preferences.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* Split Content: Top Rated Athletes & Upcoming Fixtures */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Rated Athletes */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <span>Top Rated Athletes</span>
                        </h2>
                        <Link
                            href={`/club/${clubIdentifier}/members`}
                            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                            <span>Full Roster</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {topAthletes.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                            No ranked athletes registered.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {topAthletes.map((m, idx) => {
                                const u = m.user || {};
                                const personId = u.licenseId || u.id;
                                return (
                                    <div key={m.id} className="py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 text-center font-bold text-xs text-slate-400">
                                                #{idx + 1}
                                            </span>
                                            <div>
                                                <Link
                                                    href={`/people/${personId}`}
                                                    className="font-bold text-xs text-slate-900 dark:text-white hover:text-red-600 transition"
                                                >
                                                    {u.firstName} {u.lastName}
                                                </Link>
                                                <span className="text-[11px] text-slate-400 block font-mono">
                                                    {m.licenseNumber || u.licenseId || 'LICENSED'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            {u.eloPoints || 1200} pts
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Upcoming Fixtures Preview */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-red-600" />
                            <span>Upcoming Fixtures</span>
                        </h2>
                        <Link
                            href={`/club/${clubIdentifier}/events`}
                            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                            <span>All Fixtures</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {upcomingMatches.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                            No upcoming league fixtures scheduled.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingMatches.map((enc: any) => (
                                <div
                                    key={enc.id}
                                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                                >
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="font-bold text-slate-900 dark:text-white truncate">
                                            {enc.homeTeam?.name || 'Home'} vs {enc.awayTeam?.name || 'Away'}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {enc.scheduledDate ? format(new Date(enc.scheduledDate), 'MMM dd, HH:mm') : 'Scheduled'}
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 px-2 py-0.5 text-[10px] font-bold uppercase shrink-0">
                                        {enc.status || 'SCHEDULED'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}