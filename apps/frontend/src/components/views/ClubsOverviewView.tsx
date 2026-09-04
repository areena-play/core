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
    Lock,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatPhoneNumber } from '@areena/shared';

interface ClubsOverviewViewProps {
    scopedAssociationId?: string;
}

export function ClubsOverviewView({ scopedAssociationId }: ClubsOverviewViewProps) {
    const { user } = useAuth();
    const { t } = useI18n();

    const [clubs, setClubs] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [search, setSearch] = useState<string>('');
    const [selectedAssoc, setSelectedAssoc] = useState<string>(scopedAssociationId || '');
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formPostalCode, setFormPostalCode] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formAssocIds, setFormAssocIds] = useState<string[]>(scopedAssociationId ? [scopedAssociationId] : []);
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
            const list = assocData?.associations || [];
            setAssociations(list);
            if (scopedAssociationId) {
                const found = list.find((a: any) => a.id === scopedAssociationId);
                if (found) setScopedAssoc(found);
            }
        } catch (err) {
            console.error('Failed to load clubs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [scopedAssociationId]);

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErrorMsg('');
        try {
            await api.createClub({
                name: formName,
                code: formCode.toUpperCase(),
                slug: formSlug ? formSlug.trim().toLowerCase() : undefined,
                address: formAddress,
                postalCode: formPostalCode,
                city: formCity,
                email: formEmail,
                phone: formPhone ? formatPhoneNumber(formPhone) : formPhone,
                associationIds: scopedAssociationId ? [scopedAssociationId] : formAssocIds,
            });
            setShowModal(false);
            setFormName('');
            setFormCode('');
            setFormSlug('');
            setFormCity('');
            setFormPostalCode('');
            setFormAddress('');
            setFormEmail('');
            setFormPhone('');
            if (!scopedAssociationId) setFormAssocIds([]);
            fetchData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create club');
        } finally {
            setCreating(false);
        }
    };

    const effectiveAssocId = scopedAssociationId || selectedAssoc;

    const filteredClubs = clubs.filter((c) => {
        const matchesSearch =
            !search ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.city.toLowerCase().includes(search.toLowerCase());

        const matchesAssoc =
            !effectiveAssocId ||
            c.associations?.some((ca: any) => ca.associationId === effectiveAssocId || ca.association?.id === effectiveAssocId);

        return matchesSearch && matchesAssoc;
    });

    return (
        <div className="space-y-6 pb-16">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Regional Sub-Association Clubs</span>
                                </>
                            ) : (
                                <>
                                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Affiliated Sports Clubs</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc ? `${scopedAssoc.name} • Clubs Overview` : t('nav.clubOverview')}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            {scopedAssoc
                                ? `Affiliated sports clubs and organizations registered under ${scopedAssoc.name} [${scopedAssoc.code}].`
                                : 'Explore member sports clubs, official headquarters, team rosters, and regional association alignments.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {scopedAssociationId && (
                            <Link
                                href="/clubs"
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>All Clubs</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        )}
                        {isAssocAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (scopedAssociationId) setFormAssocIds([scopedAssociationId]);
                                    setShowModal(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Register New Club</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search clubs by name, code, city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white shadow-xs focus:border-blue-500 focus:outline-none"
                    />
                </div>

                {scopedAssociationId ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/40 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        <Lock className="h-3.5 w-3.5 text-blue-500" />
                        <span className="truncate max-w-[200px]">
                            {scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
                        </span>
                    </div>
                ) : (
                    <select
                        value={selectedAssoc}
                        onChange={(e) => setSelectedAssoc(e.target.value)}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none shrink-0"
                    >
                        <option value="">All Associations</option>
                        {associations.map((a: any) => (
                            <option key={a.id} value={a.id}>
                                {a.name} [{a.code}]
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                    ))}
                </div>
            ) : filteredClubs.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
                    <Shield className="h-10 w-10 text-slate-400 mx-auto" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">No clubs found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {scopedAssociationId
                            ? 'No clubs affiliated with this sub-association match your search.'
                            : 'No registered clubs match your search query.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClubs.map((club: any) => (
                        <Link
                            key={club.id}
                            href={`/club/${club.slug || club.id}`}
                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:shadow-md hover:border-blue-500/50 transition flex flex-col justify-between space-y-4 group"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-sm border border-blue-500/20 group-hover:scale-105 transition">
                                            {club.code || 'CLB'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                                {club.name}
                                            </h3>
                                            <span className="text-[11px] text-slate-400 font-mono">
                                                Club Code: {club.code}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{club.city || 'Switzerland'}</span>
                                    </div>
                                    {club.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate font-mono text-[11px]">{club.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-slate-300">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-blue-500" />
                                        <span>{club._count?.licenses || 0} Members</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                        <span>{club._count?.teams || 0} Teams</span>
                                    </span>
                                </div>
                                <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-0.5 transition flex items-center">
                                    <span>Portal</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Register Club Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Register New Sports Club"
                subtitle="Create an affiliated club profile, primary address, and assign parent federations"
                icon={<Shield className="h-5 w-5 text-blue-500" />}
                size="lg"
            >
                {errorMsg && (
                    <div className="rounded-xl p-3 mb-4 text-xs bg-red-50 text-red-700 border border-red-200">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleCreateClub} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Club Official Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. BC Zurich Nord"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Custom URL Slug (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. bc-zurich-nord"
                                value={formSlug}
                                onChange={(e) => setFormSlug(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Club Code *
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="BCZN"
                                value={formCode}
                                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none uppercase"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                City *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Zurich"
                                value={formCity}
                                onChange={(e) => setFormCity(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Postal Code *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="8050"
                                value={formPostalCode}
                                onChange={(e) => setFormPostalCode(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Street Address *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Sportstrasse 12"
                                value={formAddress}
                                onChange={(e) => setFormAddress(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Official Email *
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="info@bczn.ch"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Phone *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="+41 44 123 45 67"
                                value={formPhone}
                                onChange={(e) => setFormPhone(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {!scopedAssociationId && (
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Parent Associations *
                            </label>
                            <select
                                multiple
                                value={formAssocIds}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                                    setFormAssocIds(selected);
                                }}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none h-24"
                            >
                                {associations.map((a: any) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} [{a.code}]
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                        >
                            {creating ? 'Creating Club...' : 'Register Club'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
