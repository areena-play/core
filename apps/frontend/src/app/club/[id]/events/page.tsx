'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Calendar,
    Trophy,
    Shield,
    MapPin,
    Clock,
    CheckCircle2,
    Users,
    ChevronRight,
    ExternalLink,
    Filter,
    Flame,
    Building2,
    Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ClubEventsPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [club, setClub] = useState<any>(null);
    const [encounters, setEncounters] = useState<any[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'fixtures' | 'calendar' | 'teams'>('fixtures');
    const [fixtureFilter, setFixtureFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');

    useEffect(() => {
        if (!clubIdentifier) return;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.getClubEvents(clubIdentifier);
                setClub(res.club);
                setEncounters(res.encounters || []);
                setCalendarEvents(res.calendarEvents || []);
                setTeams(res.teams || []);

                if (res.club) {
                    setEntityMeta({
                        id: res.club.id,
                        title: res.club.name,
                        code: res.club.code,
                        badge: 'Club',
                        subtitle: `${res.club.city || 'Switzerland'} • Events & League Matches`,
                    });
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load club events.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [clubIdentifier, setEntityMeta]);

    const filteredEncounters = useMemo(() => {
        if (fixtureFilter === 'ALL') return encounters;
        if (fixtureFilter === 'UPCOMING') {
            return encounters.filter(
                (e) => e.status === 'SCHEDULED' || e.status === 'IN_PROGRESS' || !e.status
            );
        }
        return encounters.filter((e) => e.status === 'COMPLETED');
    }, [encounters, fixtureFilter]);

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
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Events Unavailable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {error || `No club found for identifier "${clubIdentifier}".`}
                    </p>
                </div>
                <Link
                    href="/clubs"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                    <span>Back to Clubs Directory</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    <Link href={`/club/${clubIdentifier}`} className="hover:text-red-600 transition">
                        {club.name}
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900 dark:text-white">Events & Fixtures</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-red-600" />
                    <span>Club Events & League Fixtures</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    League encounters, tournaments, training blocks, and calendar schedules for {club.name}.
                </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Fixtures</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{encounters.length}</div>
                    </div>
                    <Flame className="w-8 h-8 text-red-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Teams</div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{teams.length}</div>
                    </div>
                    <Trophy className="w-8 h-8 text-blue-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Calendar Events</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{calendarEvents.length}</div>
                    </div>
                    <Calendar className="w-8 h-8 text-amber-500" />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Matches</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {encounters.filter((e) => e.status === 'COMPLETED').length}
                        </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('fixtures')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'fixtures'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Trophy className="w-4 h-4" />
                    <span>League Fixtures & Matches ({encounters.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'calendar'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Club Calendar ({calendarEvents.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                        activeTab === 'teams'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Club Teams ({teams.length})</span>
                </button>
            </div>

            {/* Tab 1: League Fixtures */}
            {activeTab === 'fixtures' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFixtureFilter('ALL')}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                    fixtureFilter === 'ALL'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                All ({encounters.length})
                            </button>
                            <button
                                onClick={() => setFixtureFilter('UPCOMING')}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                    fixtureFilter === 'UPCOMING'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                Upcoming / Live ({encounters.filter((e) => e.status !== 'COMPLETED').length})
                            </button>
                            <button
                                onClick={() => setFixtureFilter('COMPLETED')}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                    fixtureFilter === 'COMPLETED'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                Completed ({encounters.filter((e) => e.status === 'COMPLETED').length})
                            </button>
                        </div>
                    </div>

                    {filteredEncounters.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30">
                            <Trophy className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-900 dark:text-white">No League Encounters Found</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                No fixtures found matching this status filter.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredEncounters.map((enc) => {
                                const isHome =
                                    enc.homeTeam?.clubId === club.id ||
                                    enc.homeTeam?.club?.slug === club.slug ||
                                    enc.homeTeam?.club?.id === club.id;
                                const isCompleted = enc.status === 'COMPLETED';
                                const matchDate = enc.scheduledDate ? new Date(enc.scheduledDate) : null;
                                const venueName =
                                    enc.locationUnit?.location?.name ||
                                    enc.location?.name ||
                                    (isHome ? `${club.name} Home Venue` : 'Away Venue');

                                return (
                                    <div
                                        key={enc.id}
                                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                                    >
                                        <div className="space-y-3">
                                            {/* Header badge */}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                                    {enc.category?.name || enc.category?.competition?.name || 'League Match'}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                        isCompleted
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                                                    }`}
                                                >
                                                    {enc.status || 'SCHEDULED'}
                                                </span>
                                            </div>

                                            {/* Match Teams & Score */}
                                            <div className="space-y-2 py-1">
                                                <div
                                                    className={`flex items-center justify-between p-2 rounded-xl transition ${
                                                        isHome
                                                            ? 'bg-red-50/70 dark:bg-red-950/20 font-bold text-slate-900 dark:text-white'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-slate-400 w-12 shrink-0">
                                                            HOME
                                                        </span>
                                                        <span className="text-sm font-bold truncate">
                                                            {enc.homeTeam?.name || 'Home Team'}
                                                        </span>
                                                    </div>
                                                    {isCompleted && (
                                                        <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                                                            {enc.homeScore ?? '-'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div
                                                    className={`flex items-center justify-between p-2 rounded-xl transition ${
                                                        !isHome
                                                            ? 'bg-red-50/70 dark:bg-red-950/20 font-bold text-slate-900 dark:text-white'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-slate-400 w-12 shrink-0">
                                                            AWAY
                                                        </span>
                                                        <span className="text-sm font-bold truncate">
                                                            {enc.awayTeam?.name || 'Away Team'}
                                                        </span>
                                                    </div>
                                                    {isCompleted && (
                                                        <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                                                            {enc.awayScore ?? '-'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer / Match Details */}
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                                            <div className="space-y-1">
                                                {matchDate && (
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{format(matchDate, 'PPP • HH:mm')}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 truncate max-w-xs">
                                                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                                    <span className="truncate">{venueName}</span>
                                                </div>
                                            </div>

                                            {enc.category?.competitionId && (
                                                <Link
                                                    href={`/competition/${enc.category.competitionId}`}
                                                    className="inline-flex items-center gap-1 font-bold text-red-600 hover:underline shrink-0 text-[11px]"
                                                >
                                                    <span>League Table</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Club Calendar */}
            {activeTab === 'calendar' && (
                <div className="space-y-4">
                    {calendarEvents.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30">
                            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-900 dark:text-white">No Calendar Events Scheduled</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Check back for upcoming club training, open tournaments, or assembly dates.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {calendarEvents.map((evt) => (
                                <div
                                    key={evt.id}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-md bg-red-100 dark:bg-red-950/70 border border-red-200 dark:border-red-900/50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">
                                            {evt.type || 'Event'}
                                        </span>
                                        {evt.startDate && (
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {format(new Date(evt.startDate), 'MMM dd, yyyy')}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        {evt.title || evt.name}
                                    </h3>
                                    {evt.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {evt.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Club Teams */}
            {activeTab === 'teams' && (
                <div className="space-y-4">
                    {teams.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30">
                            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <h3 className="font-bold text-slate-900 dark:text-white">No Teams Registered</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                No league teams currently linked under this club profile.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teams.map((team) => (
                                <div
                                    key={team.id}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                            {team.name?.[0] || 'T'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{team.name}</h3>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {team.category?.name || 'League Team'}
                                            </span>
                                        </div>
                                    </div>
                                    {team.category?.competition && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                            <Link
                                                href={`/competition/${team.category.competition.id}`}
                                                className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline"
                                            >
                                                <span>{team.category.competition.name}</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

