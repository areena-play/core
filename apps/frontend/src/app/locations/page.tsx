'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    MapPin,
    Building2,
    Shield,
    Trophy,
    Search,
    Plus,
    ExternalLink,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ChevronRight,
    Loader2,
    SlidersHorizontal,
    Phone,
    Mail,
    Globe,
    Layers,
    Sparkles,
    X,
} from 'lucide-react';

export default function LocationsPage() {
    const { user } = useAuth();
    const { t } = useI18n();

    const [locations, setLocations] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAssoc, setSelectedAssoc] = useState('');
    const [selectedClub, setSelectedClub] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    // Modal state for Admin Creating Location
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createErr, setCreateErr] = useState('');
    const [formName, setFormName] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formPostalCode, setFormPostalCode] = useState('');
    const [formCountry, setFormCountry] = useState('Switzerland');
    const [formDescription, setFormDescription] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formWebsite, setFormWebsite] = useState('');
    const [formGoogleMaps, setFormGoogleMaps] = useState('');
    const [formUnitCount, setFormUnitCount] = useState(12);
    const [formUnitNaming, setFormUnitNaming] = useState('Table');
    const [formClubId, setFormClubId] = useState('');
    const [formAssocId, setFormAssocId] = useState('');

    const isAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) => ['ADMIN', 'PRESIDENT'].includes(r.role)) ||
        user?.clubRoles?.some((r: any) => ['ADMIN', 'PRESIDENT'].includes(r.role));

    const loadData = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (searchQuery) params.q = searchQuery;
            if (selectedAssoc) params.associationId = selectedAssoc;
            if (selectedClub) params.clubId = selectedClub;
            if (selectedCity) params.city = selectedCity;

            const [locsData, assocsData, clubsData] = await Promise.all([
                api.getLocations(params).catch(() => []),
                api.getAssociations().catch(() => ({ associations: [] })),
                api.getClubs().catch(() => []),
            ]);

            const rawLocs = Array.isArray(locsData) ? locsData : (locsData?.locations || []);
            const rawAssocs = Array.isArray(assocsData) ? assocsData : (assocsData?.associations || []);
            const rawClubs = Array.isArray(clubsData) ? clubsData : (clubsData?.clubs || []);

            setLocations(rawLocs);
            setAssociations(rawAssocs);
            setClubs(rawClubs);
        } catch (err) {
            console.error('Failed to load locations:', err);
            setLocations([]);
            setAssociations([]);
            setClubs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [searchQuery, selectedAssoc, selectedClub, selectedCity]);

    const handleCreateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateErr('');
        setCreating(true);
        try {
            await api.createLocation({
                name: formName,
                address: formAddress,
                city: formCity,
                postalCode: formPostalCode,
                country: formCountry,
                description: formDescription,
                phone: formPhone,
                email: formEmail,
                website: formWebsite,
                googleMapsUrl: formGoogleMaps,
                initialUnitCount: formUnitCount,
                unitNaming: formUnitNaming,
                clubIds: formClubId ? [formClubId] : [],
                associationIds: formAssocId ? [formAssocId] : [],
            });

            setCreateModalOpen(false);
            setFormName('');
            setFormAddress('');
            setFormCity('');
            setFormPostalCode('');
            setFormDescription('');
            setFormPhone('');
            setFormEmail('');
            setFormWebsite('');
            setFormGoogleMaps('');
            loadData();
        } catch (err: any) {
            setCreateErr(err.message || 'Failed to create location.');
        } finally {
            setCreating(false);
        }
    };

    // Extract unique cities
    const uniqueCities = Array.from(new Set(locations.map((l) => l.city).filter(Boolean))).sort();

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {t('locations.title') || 'Competition & Sports Locations'}
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                        {t('locations.subtitle') || 'Explore official federation competition halls, club training facilities, court and table reservations, and tournament schedules.'}
                    </p>
                </div>

                {isAdmin && (
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 text-xs font-bold shadow transition shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('locations.addLocationBtn') || 'Add Location'}</span>
                    </button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Search query */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('locations.searchPlaceholder') || 'Search location, city, hall...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    {/* City filter */}
                    <div>
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                        >
                            <option value="">{t('locations.allCities') || 'All Cities'}</option>
                            {uniqueCities.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Association filter */}
                    <div>
                        <select
                            value={selectedAssoc}
                            onChange={(e) => setSelectedAssoc(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                        >
                            <option value="">{t('locations.allAssociations') || 'All Associations'}</option>
                            {associations.map((a) => (
                                <option key={a.id} value={a.id}>{a.name} ({a.shortName || a.code})</option>
                            ))}
                        </select>
                    </div>

                    {/* Club filter */}
                    <div>
                        <select
                            value={selectedClub}
                            onChange={(e) => setSelectedClub(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                        >
                            <option value="">{t('locations.allClubs') || 'All Clubs'}</option>
                            {clubs.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Locations Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                    <p className="text-xs text-slate-500">Loading sports locations...</p>
                </div>
            ) : locations.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <MapPin className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Locations Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No facilities match your search criteria. Try adjusting your filters or add a new sports location.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {locations.map((loc) => {
                        const totalUnits = loc.units?.length || 0;
                        const availableUnits = loc.units?.filter((u: any) => u.status === 'AVAILABLE').length || 0;
                        const primaryClub = loc.clubs?.find((c: any) => c.isPrimary)?.club || loc.clubs?.[0]?.club;
                        const primaryAssoc = loc.associations?.[0]?.association;

                        // Resolve unit wording (e.g. Table vs Court from association rules)
                        const unitWord = primaryAssoc?.rules?.unitNaming || 'Table';

                        return (
                            <div
                                key={loc.id}
                                className="group flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:shadow-xl hover:border-amber-500/40 dark:hover:border-amber-500/40 transition-all duration-200"
                            >
                                {/* Top Badges */}
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full">
                                        <MapPin className="w-3 h-3" />
                                        {loc.city}
                                    </span>

                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {availableUnits}/{totalUnits} {unitWord}s Open
                                    </span>
                                </div>

                                {/* Title & Address */}
                                <div className="space-y-2 flex-1">
                                    <Link
                                        href={`/locations/${loc.slug || loc.id}`}
                                        className="text-base font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition"
                                    >
                                        {loc.name}
                                    </Link>

                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                                        <span>{loc.address}, {loc.postalCode} {loc.city}</span>
                                    </p>

                                    {loc.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed pt-1">
                                            {loc.description}
                                        </p>
                                    )}
                                </div>

                                {/* Affiliated Entities */}
                                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {loc.associations?.map((a: any) => (
                                            <span
                                                key={a.association.id}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-semibold"
                                            >
                                                <Building2 className="w-3 h-3" />
                                                {a.association.shortName || a.association.code}
                                            </span>
                                        ))}

                                        {loc.clubs?.map((c: any) => (
                                            <span
                                                key={c.club.id}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-semibold"
                                            >
                                                <Shield className="w-3 h-3" />
                                                {c.club.name}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Linked Competitions */}
                                    {loc.competitions && loc.competitions.length > 0 && (
                                        <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                            <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                            <span className="truncate">
                                                {loc.competitions[0]?.competition?.name}
                                                {loc.competitions.length > 1 && ` + ${loc.competitions.length - 1} more`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                    {loc.googleMapsUrl ? (
                                        <a
                                            href={loc.googleMapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            title="Open in Google Maps"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    ) : <div />}

                                    <Link
                                        href={`/locations/${loc.slug || loc.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white px-4 py-2 text-xs font-bold shadow-xs transition"
                                    >
                                        <span>View Schedule & Courts</span>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Location Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {t('locations.createLocationTitle') || 'Add New Sports Location'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {createErr && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <div>{createErr}</div>
                            </div>
                        )}

                        <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Location / Hall Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Sporthalle Hardau"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Street Address *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Bullingerstrasse 60"
                                        value={formAddress}
                                        onChange={(e) => setFormAddress(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Postal Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="8004"
                                        value={formPostalCode}
                                        onChange={(e) => setFormPostalCode(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        City *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Zürich"
                                        value={formCity}
                                        onChange={(e) => setFormCity(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={formCountry}
                                        onChange={(e) => setFormCountry(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Playing Units Configuration */}
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                                <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>Playing Units (Courts / Tables / Pitches)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                            Unit Type Wording
                                        </label>
                                        <select
                                            value={formUnitNaming}
                                            onChange={(e) => setFormUnitNaming(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                        >
                                            <option value="Table">Table (Tisch / Table Tennis)</option>
                                            <option value="Court">Court (Platz / Tennis / Squash)</option>
                                            <option value="Pitch">Pitch (Spielfeld / Football)</option>
                                            <option value="Lane">Lane (Bahn / Bowling)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                            Initial Unit Count
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={64}
                                            value={formUnitCount}
                                            onChange={(e) => setFormUnitCount(parseInt(e.target.value, 10) || 1)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Affiliated Club & Association */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Host / Home Club
                                    </label>
                                    <select
                                        value={formClubId}
                                        onChange={(e) => setFormClubId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="">None / Independent</option>
                                        {clubs.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Federation / Association
                                    </label>
                                    <select
                                        value={formAssocId}
                                        onChange={(e) => setFormAssocId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="">None / Regional</option>
                                        {associations.map((a) => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.shortName || a.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Description & Features
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Sports floor type, lighting specs, spectator capacity..."
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow transition disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{creating ? 'Creating...' : 'Create Location'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
