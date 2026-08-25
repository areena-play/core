'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { Calendar as CalendarIcon, Filter, MapPin, Clock, ChevronLeft, ChevronRight, List, Grid } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

export default function CalendarPage() {
    const { t } = useI18n();
    const [events, setEvents] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [selectedAssoc, setSelectedAssoc] = useState<string>('');
    const [selectedClub, setSelectedClub] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [includeDescendants, setIncludeDescendants] = useState<boolean>(true);
    const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 1)); // Sept 2026 for demo
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const fetchEvents = async () => {
        try {
            const params: Record<string, string> = {};
            if (selectedAssoc) params.associationId = selectedAssoc;
            if (selectedClub) params.clubId = selectedClub;
            if (selectedType) params.eventType = selectedType;
            if (includeDescendants) params.includeDescendants = 'true';

            const data = await api.getCalendarEvents(params);
            setEvents(data);
        } catch (err) {
            console.error('Failed to fetch calendar events:', err);
        }
    };

    useEffect(() => {
        async function loadFilters() {
            try {
                const [assocRes, clubsRes] = await Promise.all([api.getAssociations(), api.getClubs()]);
                setAssociations(assocRes.associations || []);
                setClubs(clubsRes || []);
            } catch {}
        }
        loadFilters();
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [selectedAssoc, selectedClub, selectedType, includeDescendants]);

    // Calendar Day Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getEventsForDay = (day: Date) => {
        return events.filter((e) => isSameDay(new Date(e.startDate), day));
    };

    const getEventBadgeClass = (type: string) => {
        switch (type) {
            case 'LEAGUE_MATCH':
                return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-400 dark:border-red-800/50';
            case 'TOURNAMENT':
                return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-400 dark:border-blue-800/50';
            case 'REFRESHER_COURSE':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/50';
            case 'ASSOCIATION_MEETING':
                return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-400 dark:border-purple-800/50';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6 text-red-500" />
                        <span>{t('calendar.title')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {t('calendar.subtitle')}
                    </p>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shadow-sm self-start sm:self-auto">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition ${
                            viewMode === 'grid'
                                ? 'bg-red-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Grid className="h-3.5 w-3.5" />
                        <span>{t('calendar.viewMonth')}</span>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition ${
                            viewMode === 'list'
                                ? 'bg-red-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <List className="h-3.5 w-3.5" />
                        <span>{t('calendar.viewAgenda')}</span>
                    </button>
                </div>
            </div>

            {/* Multi-Dimensional Filter Bar */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <Filter className="h-3.5 w-3.5 text-red-500" />
                    <span>{t('common.filter')}</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 pt-3">
                    {/* Association / Region Filter */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t('calendar.filterAssociation')}
                        </label>
                        <select
                            value={selectedAssoc}
                            onChange={(e) => setSelectedAssoc(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                        >
                            <option value="">{t('calendar.allAssociations')}</option>
                            {associations.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({a.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Club Filter */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t('calendar.filterClub')}
                        </label>
                        <select
                            value={selectedClub}
                            onChange={(e) => setSelectedClub(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                        >
                            <option value="">{t('calendar.allClubs')}</option>
                            {clubs.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Event Type Filter */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t('calendar.filterType')}
                        </label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                        >
                            <option value="">{t('calendar.allTypes')}</option>
                            <option value="TOURNAMENT">🏆 Tournaments</option>
                            <option value="LEAGUE_MATCH">⚔️ League Encounters</option>
                            <option value="REFRESHER_COURSE">🎓 Refresher Courses</option>
                            <option value="ASSOCIATION_MEETING">🏛️ Association Meetings</option>
                            <option value="CLUB_EVENT">🎪 Club Events</option>
                        </select>
                    </div>

                    {/* Include Sub-associations checkbox */}
                    <div className="flex items-center pt-2 sm:pt-5">
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeDescendants}
                                onChange={(e) => setIncludeDescendants(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 bg-slate-100 text-red-600 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-950"
                            />
                            <span>{t('associations.regionalAssociations')}</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(2026, 8, 1))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {t('calendar.today')}
                    </button>
                    <button
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Month Grid View */}
            {viewMode === 'grid' && (
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-sm">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 py-2.5 text-center text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800">
                        {daysInMonth.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 transition ${
                                        isToday
                                            ? 'bg-red-50 dark:bg-red-950/20'
                                            : 'bg-white hover:bg-slate-50 dark:bg-slate-950/40 dark:hover:bg-slate-900/30'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span
                                            className={`text-xs font-semibold ${
                                                isToday
                                                    ? 'flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-red-600 text-white text-[11px]'
                                                    : 'text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {format(day, 'd')}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                                {dayEvents.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-1 space-y-1">
                                        {dayEvents.map((evt) => (
                                            <button
                                                key={evt.id}
                                                onClick={() => setSelectedEvent(evt)}
                                                className={`w-full text-left rounded border px-1 py-0.5 text-[10px] sm:text-[11px] font-medium truncate block transition ${getEventBadgeClass(
                                                    evt.eventType,
                                                )}`}
                                            >
                                                {evt.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* List / Agenda View */}
            {viewMode === 'list' && (
                <div className="space-y-3">
                    {events.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                            {t('calendar.noEvents')}
                        </div>
                    ) : (
                        events.map((evt) => (
                            <div
                                key={evt.id}
                                onClick={() => setSelectedEvent(evt)}
                                className="flex cursor-pointer flex-col justify-between gap-3 sm:gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 transition sm:flex-row sm:items-center shadow-sm"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${getEventBadgeClass(
                                                evt.eventType,
                                            )}`}
                                        >
                                            {evt.eventType.replace('_', ' ')}
                                        </span>
                                        {evt.association && (
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {evt.association.name}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                        {evt.title}
                                    </h3>
                                    {evt.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                                            {evt.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-600 dark:text-slate-300">
                                    {evt.location && (
                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                            <MapPin className="h-3.5 w-3.5 text-red-500" />
                                            <span>{evt.location}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 font-mono text-slate-500 dark:text-slate-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{format(new Date(evt.startDate), 'MMM dd, yyyy HH:mm')}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Event Details Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between">
                            <span
                                className={`rounded border px-2.5 py-1 text-xs font-bold uppercase ${getEventBadgeClass(
                                    selectedEvent.eventType,
                                )}`}
                            >
                                {selectedEvent.eventType.replace('_', ' ')}
                            </span>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                            {selectedEvent.title}
                        </h3>
                        {selectedEvent.description && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                {selectedEvent.description}
                            </p>
                        )}

                        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span>
                                    <strong>Start:</strong> {format(new Date(selectedEvent.startDate), 'PPpp')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span>
                                    <strong>End:</strong> {format(new Date(selectedEvent.endDate), 'PPpp')}
                                </span>
                            </div>
                            {selectedEvent.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-red-500" />
                                    <span>
                                        <strong>Location:</strong> {selectedEvent.location}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
