'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { Calendar as CalendarIcon, Filter, MapPin, Clock, ChevronLeft, ChevronRight, List, Grid, Lock, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

interface CalendarOverviewViewProps {
    scopedAssociationId?: string;
}

export function CalendarOverviewView({ scopedAssociationId }: CalendarOverviewViewProps) {
    const { t } = useI18n();
    const [events, setEvents] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [clubs, setClubs] = useState<any[]>([]);
    const [selectedAssoc, setSelectedAssoc] = useState<string>(scopedAssociationId || '');
    const [selectedClub, setSelectedClub] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [includeDescendants, setIncludeDescendants] = useState<boolean>(true);
    const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 1));
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const fetchEvents = async () => {
        try {
            const params: Record<string, string> = {};
            const effectiveAssoc = scopedAssociationId || selectedAssoc;
            if (effectiveAssoc) params.associationId = effectiveAssoc;
            if (selectedClub) params.clubId = selectedClub;
            if (selectedType) params.eventType = selectedType;
            if (includeDescendants) params.includeDescendants = 'true';

            const data = await api.getCalendarEvents(params);
            setEvents(data || []);
        } catch (err) {
            console.error('Failed to fetch calendar events:', err);
        }
    };

    useEffect(() => {
        async function loadFilters() {
            try {
                const [assocRes, clubsRes] = await Promise.all([api.getAssociations(), api.getClubs()]);
                const list = assocRes.associations || [];
                setAssociations(list);
                setClubs(clubsRes || []);
                if (scopedAssociationId) {
                    const found = list.find((a: any) => a.id === scopedAssociationId);
                    if (found) setScopedAssoc(found);
                }
            } catch {}
        }
        loadFilters();
    }, [scopedAssociationId]);

    useEffect(() => {
        fetchEvents();
    }, [selectedAssoc, selectedClub, selectedType, includeDescendants, scopedAssociationId]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getEventsForDay = (day: Date) => {
        return events.filter((e) => isSameDay(new Date(e.startDate), day));
    };

    return (
        <div className="space-y-6 pb-16">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-purple-500" />
                                    <span>Sub-Association Event Calendar</span>
                                </>
                            ) : (
                                <>
                                    <CalendarIcon className="h-3.5 w-3.5 text-purple-500" />
                                    <span>Federation Event Calendar</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc ? `${scopedAssoc.name} • Calendar` : t('nav.calendar')}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {scopedAssoc
                                ? `Tournaments, league encounters, and training clinics scheduled under ${scopedAssoc.name}.`
                                : 'Explore matches, courses, federation meetings, and tournament schedules.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {scopedAssociationId && (
                            <Link
                                href="/calendar"
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>All Events</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        )}
                        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                            >
                                <Grid className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {scopedAssociationId ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/40 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <Lock className="h-3.5 w-3.5 text-purple-500" />
                        <span>{scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}</span>
                    </div>
                ) : (
                    <select
                        value={selectedAssoc}
                        onChange={(e) => setSelectedAssoc(e.target.value)}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
                    >
                        <option value="">All Associations</option>
                        {associations.map((a: any) => (
                            <option key={a.id} value={a.id}>
                                {a.name} [{a.code}]
                            </option>
                        ))}
                    </select>
                )}

                <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
                >
                    <option value="">All Clubs</option>
                    {clubs.map((c: any) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
                >
                    <option value="">All Event Types</option>
                    <option value="TOURNAMENT">Tournaments</option>
                    <option value="LEAGUE_MATCH">League Matches</option>
                    <option value="TRAINING">Training Clinics</option>
                    <option value="MEETING">Governance Meetings</option>
                </select>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="text-center py-2 text-[11px] font-black uppercase text-slate-400">
                            {day}
                        </div>
                    ))}
                    {daysInMonth.map((day, idx) => {
                        const dayEvents = getEventsForDay(day);
                        return (
                            <div
                                key={idx}
                                className="min-h-[100px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2 flex flex-col justify-between"
                            >
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {format(day, 'd')}
                                </span>
                                <div className="space-y-1 mt-1">
                                    {dayEvents.slice(0, 2).map((evt: any, i: number) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setSelectedEvent(evt)}
                                            className="w-full text-left truncate rounded-md bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:opacity-80 transition"
                                        >
                                            {evt.title}
                                        </button>
                                    ))}
                                    {dayEvents.length > 2 && (
                                        <span className="text-[9px] text-slate-400 font-bold">
                                            +{dayEvents.length - 2} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-3">
                    {events.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center text-xs text-slate-400">
                            No events scheduled in this period.
                        </div>
                    ) : (
                        events.map((evt: any) => (
                            <div
                                key={evt.id}
                                onClick={() => setSelectedEvent(evt)}
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-xs hover:border-purple-500/50 cursor-pointer transition flex items-center justify-between"
                            >
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                        {evt.title}
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span>{format(new Date(evt.startDate), 'PPP')}</span>
                                        {evt.location && <span>• {evt.location}</span>}
                                    </div>
                                </div>
                                <span className="rounded-full bg-purple-50 dark:bg-purple-950 px-2.5 py-1 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                    {evt.eventType}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
