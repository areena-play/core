'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Award,
    Plus,
    Filter,
    CheckCircle2,
    Clock,
    XCircle,
    Shield,
    GraduationCap,
    ChevronRight,
    UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export default function LicensesPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [licenses, setLicenses] = useState<any[]>([]);
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchLicenses = async () => {
        try {
            const params: Record<string, string> = {};
            if (typeFilter) params.type = typeFilter;
            if (statusFilter) params.status = statusFilter;

            const data = await api.getLicenses(params);
            setLicenses(data);
        } catch (err) {
            console.error('Failed to load licenses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicenses();
    }, [typeFilter, statusFilter]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('common.approve')}d
                    </span>
                );
            case 'PENDING_CLUB':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-amber-400 border border-amber-300 dark:border-amber-800/40">
                        <Clock className="h-3 w-3" />
                        {t('licenses.pendingClub')}
                    </span>
                );
            case 'PENDING_ASSOCIATION':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-blue-400 border border-blue-300 dark:border-blue-800/40">
                        <Clock className="h-3 w-3" />
                        {t('licenses.pendingAssociation')}
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-800 dark:bg-red-950/80 px-2 py-0.5 text-[10px] font-bold uppercase dark:text-red-400 border border-red-300 dark:border-red-800/40">
                        <XCircle className="h-3 w-3" />
                        {t('common.reject')}ed
                    </span>
                );
            default:
                return (
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="h-6 w-6 text-red-500" />
                        <span>{t('licenses.title')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {t('licenses.subtitle')}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/licenses/refresher-courses"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <GraduationCap className="h-4 w-4" />
                        <span>{t('licenses.refresherCourses')}</span>
                    </Link>
                    <Link
                        href="/licenses/apply"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('licenses.applyNew')}</span>
                    </Link>
                </div>
            </div>

            {/* User's License ID Callout if assigned */}
            {user?.licenseId && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 via-white to-red-50 dark:from-red-950/60 dark:via-slate-900 dark:to-slate-950 p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 font-mono font-bold text-white text-base">
                            ID
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                                {t('licenses.licenseId')}
                            </div>
                            <div className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-widest">
                                {user.licenseId}
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-right hidden sm:block">
                        {t('licenses.nationalLicense')}
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <Filter className="h-3.5 w-3.5 text-red-500" />
                    <span>{t('common.filter')}:</span>
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                >
                    <option value="">{t('licenses.selectType')}</option>
                    <option value="PLAYER_REGULAR">Regular Player (Club-Attached)</option>
                    <option value="PLAYER_TCARD">T-Card (Tournament Only)</option>
                    <option value="PLAYER_WOMEN">Women's League License</option>
                    <option value="COACH">Coach License</option>
                    <option value="REFEREE">Referee License</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                >
                    <option value="">{t('common.all')} Statuses</option>
                    <option value="APPROVED">{t('common.approve')}d</option>
                    <option value="PENDING_CLUB">{t('licenses.pendingClub')}</option>
                    <option value="PENDING_ASSOCIATION">{t('licenses.pendingAssociation')}</option>
                    <option value="REJECTED">{t('common.reject')}ed</option>
                </select>
            </div>

            {/* Licenses Table */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('licenses.holder')}</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('licenses.licenseId')}</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('licenses.type')}</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('common.club')}</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('common.association')}</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3">{t('licenses.validity')}</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">{t('common.status')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                        {licenses.map((lic) => (
                            <tr
                                key={lic.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition"
                            >
                                <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-slate-900 dark:text-white">
                                    {lic.user?.firstName} {lic.user?.lastName}
                                    <div className="text-[10px] text-slate-500 font-normal">{lic.user?.email}</div>
                                </td>
                                <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-mono font-bold text-red-600 dark:text-red-400">
                                    {lic.user?.licenseId || (
                                        <span className="text-slate-400 font-normal">Pending</span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-slate-700 dark:text-slate-300">
                                    <span className="rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 text-[11px]">
                                        {lic.type.replace('PLAYER_', '')}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-slate-700 dark:text-slate-300">
                                    {lic.club ? (
                                        lic.club.name
                                    ) : (
                                        <span className="text-slate-400 italic">None (Tournament Card)</span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-slate-500 dark:text-slate-400">
                                    {lic.association?.name}
                                </td>
                                <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                    {format(new Date(lic.validFrom), 'dd.MM.yy')} -{' '}
                                    {format(new Date(lic.validUntil), 'dd.MM.yy')}
                                </td>
                                <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">{getStatusBadge(lic.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
