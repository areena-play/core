'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { Trophy, Plus, Filter, Calendar, MapPin, Users, ChevronRight, Shield, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ModalPortal } from '@/components/ui/ModalPortal';

export default function CompetitionsPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [assocFilter, setAssocFilter] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New Competition Form
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formType, setFormType] = useState('LEAGUE');
    const [formAssocId, setFormAssocId] = useState('');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [creating, setCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchCompetitions = async () => {
        try {
            const params: Record<string, string> = {};
            if (typeFilter) params.type = typeFilter;
            if (statusFilter) params.status = statusFilter;
            if (assocFilter) params.associationId = assocFilter;

            const data = await api.getCompetitions(params);
            setCompetitions(data);
        } catch (err) {
            console.error('Failed to load competitions:', err);
        }
    };

    useEffect(() => {
        async function init() {
            try {
                const assocData = await api.getAssociations();
                setAssociations(assocData.associations || []);
                if (assocData.associations && assocData.associations.length > 0) {
                    setFormAssocId(assocData.associations[0].id);
                }
            } catch {}
        }
        init();
    }, []);

    useEffect(() => {
        fetchCompetitions();
    }, [typeFilter, statusFilter, assocFilter]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErrorMsg('');
        try {
            await api.createCompetition({
                name: formName,
                description: formDesc,
                type: formType,
                associationId: formAssocId,
                startDate: formStartDate,
                endDate: formEndDate,
                location: formLocation,
            });
            setShowCreateModal(false);
            fetchCompetitions();
            setFormName('');
            setFormDesc('');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create competition');
        } finally {
            setCreating(false);
        }
    };

    const filteredComps = competitions.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-red-500" />
                        <span>{t('competitions.title')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {t('competitions.subtitle')}
                    </p>
                </div>

                {user && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 transition shadow self-start sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('competitions.createCompetition')}</span>
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                <div className="flex flex-1 flex-wrap items-center gap-2.5 sm:gap-3">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white placeholder-slate-400 focus:border-red-500 focus:outline-none"
                        />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                    >
                        <option value="">{t('competitions.filterType')}</option>
                        <option value="LEAGUE">🛡️ {t('competitions.filterLeague')}</option>
                        <option value="TOURNAMENT">🏆 {t('competitions.filterTournament')}</option>
                    </select>

                    <select
                        value={assocFilter}
                        onChange={(e) => setAssocFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                    >
                        <option value="">{t('calendar.allAssociations')}</option>
                        {associations.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} ({a.code})
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                    >
                        <option value="">{t('competitions.filterStatus')}</option>
                        <option value="REGISTRATION_OPEN">Registration Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
            </div>

            {/* Competitions Grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredComps.map((comp) => (
                    <div
                        key={comp.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 transition group shadow-sm"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span
                                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        comp.type === 'LEAGUE'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-950 text-red-400 border border-red-300 dark:border-red-800/50'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 text-blue-400 border border-blue-300 dark:border-blue-800/50'
                                    }`}
                                >
                                    {comp.type}
                                </span>
                                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                    {comp.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition line-clamp-1">
                                    {comp.name}
                                </h3>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {comp.description || 'Championship competition organized by the federation.'}
                                </p>
                            </div>

                            <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="truncate">{comp.association?.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        {format(new Date(comp.startDate), 'MMM yyyy')} -{' '}
                                        {format(new Date(comp.endDate), 'MMM yyyy')}
                                    </span>
                                </div>
                                {comp.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                                        <span className="truncate">{comp.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {comp.categories?.length || 0} {t('competitions.categories')}
                            </span>
                            <Link
                                href={`/competitions/${comp.id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                            >
                                <span>{t('competitions.standings')}</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Competition Modal */}
            {showCreateModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
                        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-red-500" />
                                    <span>{t('competitions.createCompetition')}</span>
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleCreate} className="space-y-3 text-xs">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.name')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. National Championship League 2026"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            {t('competitions.matchType')}
                                        </label>
                                        <select
                                            value={formType}
                                            onChange={(e) => setFormType(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                        >
                                            <option value="LEAGUE">🛡️ League (Long-running)</option>
                                            <option value="TOURNAMENT">🏆 Tournament</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            {t('common.association')}
                                        </label>
                                        <select
                                            value={formAssocId}
                                            onChange={(e) => setFormAssocId(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                        >
                                            {associations.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.details')}
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Competition rules, description, and eligibility..."
                                        value={formDesc}
                                        onChange={(e) => setFormDesc(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            {t('common.date')} Start
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formStartDate}
                                            onChange={(e) => setFormStartDate(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            {t('common.date')} End
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formEndDate}
                                            onChange={(e) => setFormEndDate(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.location')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. National Sports Complex / Regional Arenas"
                                        value={formLocation}
                                        onChange={(e) => setFormLocation(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow"
                                    >
                                        {creating ? t('common.submitting') : t('competitions.createCompetition')}
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
