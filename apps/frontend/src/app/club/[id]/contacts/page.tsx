'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    MapPin,
    Building2,
    Shield,
    Users,
    Mail,
    Phone,
    Globe,
    ExternalLink,
    ChevronRight,
    Award,
    Sparkles,
    UserCheck,
    Layers,
} from 'lucide-react';
import { formatPhoneNumber } from '@areena/shared';

export default function ClubContactsPage() {
    const params = useParams();
    const clubIdentifier = params?.id as string;
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        club: any;
        officials: any[];
        locations: any[];
    } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!clubIdentifier) return;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.getClubContacts(clubIdentifier);
                setData(res);
                if (res.club) {
                    setEntityMeta({
                        id: res.club.id,
                        title: res.club.name,
                        code: res.club.code,
                        badge: 'Club',
                        subtitle: `${res.club.city || 'Switzerland'} • Contacts & Venues`,
                    });
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load club contacts and venues.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [clubIdentifier, setEntityMeta]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !data?.club) {
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Contacts Unavailable</h2>
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

    const { club, officials, locations } = data;
    const fullAddress = [club.address, club.postalCode, club.city, club.country || 'Switzerland']
        .filter(Boolean)
        .join(', ');

    return (
        <div className="space-y-8 pb-12">
            {/* Page Header */}
            <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    <Link href={`/club/${clubIdentifier}`} className="hover:text-red-600 transition">
                        {club.name}
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900 dark:text-white">Contacts & Venues</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-red-600" />
                    <span>Club Contacts & Sports Venues</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Official representatives, headquarters address, and sports hall court facilities.
                </p>
            </div>

            {/* Club Headquarters Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4 max-w-xl">
                        <div className="flex items-center gap-3">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
                                {club.code || 'CLB'}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">{club.name}</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Official Registered Sports Club
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 text-sm text-slate-600 dark:text-slate-300">
                            {fullAddress && (
                                <div className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span>{fullAddress}</span>
                                </div>
                            )}
                            {club.email && (
                                <div className="flex items-center gap-2.5">
                                    <Mail className="w-4 h-4 text-red-500 shrink-0" />
                                    <a href={`mailto:${club.email}`} className="text-red-600 hover:underline">
                                        {club.email}
                                    </a>
                                </div>
                            )}
                            {club.phone && (
                                <div className="flex items-center gap-2.5">
                                    <Phone className="w-4 h-4 text-red-500 shrink-0" />
                                    <a href={`tel:${club.phone}`} className="hover:underline">
                                        {formatPhoneNumber(club.phone)}
                                    </a>
                                </div>
                            )}
                            {club.website && (
                                <div className="flex items-center gap-2.5">
                                    <Globe className="w-4 h-4 text-red-500 shrink-0" />
                                    <a
                                        href={club.website.startsWith('http') ? club.website : `https://${club.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-red-600 hover:underline flex items-center gap-1"
                                    >
                                        <span>{club.website.replace(/^https?:\/\//, '')}</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {fullAddress && (
                        <div className="shrink-0 flex flex-col gap-2">
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <MapPin className="w-4 h-4 text-red-400" />
                                <span>Get Directions on Google Maps</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Club Officials Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-red-600" />
                            <span>Club Officials & Administration</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Board members, executive committee, head coaches, and sanctioned delegates.
                        </p>
                    </div>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {officials.length} {officials.length === 1 ? 'Official' : 'Officials'}
                    </span>
                </div>

                {officials.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
                        <UserCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Officials Registered</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Club officials can be assigned via the Members Hub by authorized administrators.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {officials.map((official) => {
                            const u = official.user || {};
                            const personId = u.licenseId || u.id;
                            const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'OF';

                            return (
                                <div
                                    key={official.id}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                                >
                                    <div className="flex items-start gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                            {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                                    {u.firstName} {u.lastName}
                                                </span>
                                            </div>
                                            <div className="mt-1">
                                                <span className="inline-block rounded-md bg-red-100 dark:bg-red-950/70 border border-red-200 dark:border-red-900/50 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                                                    {official.title || official.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                                        {u.email && (
                                            <div className="flex items-center gap-2 truncate">
                                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <a href={`mailto:${u.email}`} className="hover:text-red-600 truncate">
                                                    {u.email}
                                                </a>
                                            </div>
                                        )}
                                        {u.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <a href={`tel:${u.phone}`} className="hover:text-red-600">
                                                    {formatPhoneNumber(u.phone)}
                                                </a>
                                            </div>
                                        )}
                                        {personId && (
                                            <div className="pt-1">
                                                <Link
                                                    href={`/people/${personId}`}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700"
                                                >
                                                    <span>View Member Profile</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sports Halls & Venues Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-red-600" />
                            <span>Sports Halls & Court Facilities</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Home training grounds, match halls, and court/table configurations.
                        </p>
                    </div>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {locations.length} {locations.length === 1 ? 'Venue' : 'Venues'}
                    </span>
                </div>

                {locations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
                        <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Venues Linked</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            No dedicated sports halls or courts currently linked to this club profile.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {locations.map((lc) => {
                            const loc = lc.location || lc;
                            const locAddress = [loc.address, loc.postalCode, loc.city, loc.country]
                                .filter(Boolean)
                                .join(', ');
                            const units = loc.units || [];

                            return (
                                <div
                                    key={lc.id || loc.id}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm flex flex-col justify-between space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-red-600" />
                                                    <span>{loc.name}</span>
                                                </h3>
                                                {loc.type && (
                                                    <span className="inline-block mt-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                                                        {loc.type}
                                                    </span>
                                                )}
                                            </div>
                                            {loc.id && (
                                                <Link
                                                    href={`/locations/${loc.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline shrink-0"
                                                >
                                                    <span>Venue Details</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            )}
                                        </div>

                                        {locAddress && (
                                            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                                <span>{locAddress}</span>
                                            </div>
                                        )}

                                        {/* Units & Tables */}
                                        {units.length > 0 && (
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <Layers className="w-3.5 h-3.5" />
                                                    <span>Available Courts / Units ({units.length})</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {units.map((unit: any) => (
                                                        <span
                                                            key={unit.id}
                                                            className="rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300"
                                                        >
                                                            {unit.name || `Table ${unit.number || ''}`}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {locAddress && (
                                        <div className="pt-2">
                                            <a
                                                href={`https://maps.google.com/?q=${encodeURIComponent(locAddress)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span>Open in Navigation / Maps</span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

