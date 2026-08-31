'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Shield,
    Search,
    Plus,
    Building2,
    MapPin,
    Mail,
    Phone,
    ChevronRight,
    Users,
    Trophy,
    ExternalLink,
} from 'lucide-react';
import { ModalPortal } from '@/components/ui/ModalPortal';

export default function ClubsOverviewPage() {
    const { user } = useAuth();
    const { t } = useI18n();

    const [clubs, setClubs] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [search, setSearch] = useState<string>('');
    const [selectedAssoc, setSelectedAssoc] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // New Club Modal State
    const [showModal, setShowModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formPostalCode, setFormPostalCode] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formAssocIds, setFormAssocIds] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const fetchData = async () => {
        try {
            const [clubsData, assocData] = await Promise.all([
                api.getClubs(),
                api.getAssociations().catch(() => ({ associations: [] })),
            ]);
            setClubs(clubsData || []);
            setAssociations(assocData?.associations || []);
        } catch (err) {
            console.error('Failed to load clubs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErrorMsg('');
        try {
            await api.createClub({
                name: formName,
                code: formCode.toUpperCase(),
                address: formAddress,
                postalCode: formPostalCode,
                city: formCity,
                email: formEmail,
                phone: formPhone,
                associationIds: formAssocIds,
            });
            setShowModal(false);
            setFormName('');
            setFormCode('');
            setFormCity('');
            setFormPostalCode('');
            setFormAddress('');
            setFormEmail('');
            setFormPhone('');
            setFormAssocIds([]);
            fetchData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create club');
        } finally {
            setCreating(false);
        }
    };

    const filteredClubs = clubs.filter((club) => {
        const matchesSearch =
            club.name.toLowerCase().includes(search.toLowerCase()) ||
            (club.code && club.code.toLowerCase().includes(search.toLowerCase())) ||
            (club.city && club.city.toLowerCase().includes(search.toLowerCase()));

        const matchesAssoc =
            !selectedAssoc ||
            club.associations?.some((a: any) => a.associationId === selectedAssoc || a.association?.id === selectedAssoc);

        return matchesSearch && matchesAssoc;
    });

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <Link href="/" className="hover:underline">
                            {t('nav.dashboard')}
                        </Link>
                        <ChevronRight className="h-3 w-3" />
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {t('nav.clubOverview')}
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-6 w-6 text-red-500" />
                        <span>{t('nav.clubOverview')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Affiliated Sports Clubs, Roster Management & Federation Participation
                    </p>
                </div>

                {isAssocAdmin && (
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-red-700 transition self-start sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Register New Club</span>
                    </button>
                )}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search clubs by name, code, or city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                    />
                </div>

                <select
                    value={selectedAssoc}
                    onChange={(e) => setSelectedAssoc(e.target.value)}
                    className="w-full sm:w-64 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                >
                    <option value="">All Federations & Regions</option>
                    {associations.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name} ({a.code || a.shortName})
                        </option>
                    ))}
                </select>
            </div>

            {/* Clubs Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                    ))}
                </div>
            ) : filteredClubs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-slate-500">
                    <Shield className="mx-auto h-10 w-10 text-slate-400 mb-2 opacity-50" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No clubs found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or register a new club.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredClubs.map((club) => {
                        const assocList = club.associations || [];
                        const teamCount = club._count?.teams ?? (club.teams?.length || 0);
                        const memberCount = club._count?.members ?? (club.roles?.length || 0);

                        return (
                            <div
                                key={club.id}
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-black text-sm border border-red-500/20 group-hover:scale-105 transition">
                                                <Shield className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight line-clamp-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                                    {club.name}
                                                </h3>
                                                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                                                    {club.code || 'CLUB'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location & Contact */}
                                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        {(club.city || club.postalCode) && (
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span>{[club.postalCode, club.city].filter(Boolean).join(' ')}</span>
                                            </div>
                                        )}
                                        {club.email && (
                                            <div className="flex items-center gap-1.5 text-[11px] truncate">
                                                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{club.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Affiliated Associations */}
                                    {assocList.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {assocList.map((assocItem: any, idx: number) => {
                                                const a = assocItem.association || assocItem;
                                                return (
                                                    <span
                                                        key={idx}
                                                        className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                                                    >
                                                        {a.shortName || a.code || a.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Action & Stats */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                            <span>{teamCount} Teams</span>
                                        </span>
                                    </div>
                                    <Link
                                        href={`/club/${club.id}`}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                                    >
                                        <span>Open Portal</span>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Club Modal */}
            {showModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    Register New Club
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleCreateClub} className="space-y-4">
                                {errorMsg && (
                                    <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs font-semibold text-red-600 border border-red-200">
                                        {errorMsg}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Club Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. TTC Zurich City"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Club Code *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={8}
                                            placeholder="e.g. TTCZC"
                                            value={formCode}
                                            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Postal Code
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 8001"
                                            value={formPostalCode}
                                            onChange={(e) => setFormPostalCode(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Zürich"
                                            value={formCity}
                                            onChange={(e) => setFormCity(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Official Contact Email
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="info@club.ch"
                                            value={formEmail}
                                            onChange={(e) => setFormEmail(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Contact Phone
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="+41 44 123 45 67"
                                            value={formPhone}
                                            onChange={(e) => setFormPhone(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Affiliate Federation / Regional Association *
                                    </label>
                                    <select
                                        required
                                        value={formAssocIds[0] || ''}
                                        onChange={(e) => setFormAssocIds(e.target.value ? [e.target.value] : [])}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="">Select Federation / Regional Association</option>
                                        {associations.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name} ({a.code || a.shortName})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                                    >
                                        {creating ? 'Registering...' : 'Register Club'}
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