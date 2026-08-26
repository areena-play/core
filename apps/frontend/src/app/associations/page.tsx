'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { Network, Shield, Plus, ChevronRight, Info, Sliders, ExternalLink, MapPin, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

export default function AssociationsPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [hierarchy, setHierarchy] = useState<any>({ associations: [], clubs: [] });
    const [selectedAssoc, setSelectedAssoc] = useState<any | null>(null);
    const [effectiveRules, setEffectiveRules] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // New Club modal state
    const [showClubModal, setShowClubModal] = useState(false);
    const [clubName, setClubName] = useState('');
    const [clubCode, setClubCode] = useState('');
    const [clubAddress, setClubAddress] = useState('');
    const [clubCity, setClubCity] = useState('');
    const [clubPostalCode, setClubPostalCode] = useState('');
    const [clubEmail, setClubEmail] = useState('');
    const [clubPhone, setClubPhone] = useState('');
    const [selectedAssocIds, setSelectedAssocIds] = useState<string[]>([]);

    const fetchHierarchy = async () => {
        try {
            const data = await api.getAssociations();
            setHierarchy(data);
            if (data.associations?.length > 0 && !selectedAssoc) {
                const top = data.associations.find((a: any) => a.isTopLevel) || data.associations[0];
                setSelectedAssoc(top);
            }
        } catch (err) {
            console.error('Failed to load hierarchy:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHierarchy();
    }, []);

    useEffect(() => {
        if (selectedAssoc) {
            api.getAssociationRules(selectedAssoc.id)
                .then(setEffectiveRules)
                .catch(() => {});
        }
    }, [selectedAssoc]);

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createClub({
                name: clubName,
                code: clubCode,
                address: clubAddress,
                city: clubCity,
                postalCode: clubPostalCode,
                email: clubEmail,
                phone: clubPhone,
                associationIds: selectedAssocIds.length > 0 ? selectedAssocIds : [selectedAssoc?.id],
            });
            setShowClubModal(false);
            fetchHierarchy();
            setClubName('');
            setClubCode('');
            setClubAddress('');
            setClubCity('');
            setClubEmail('');
            setClubPhone('');
        } catch (err) {
            alert('Failed to create club');
        }
    };

    const topLevel = hierarchy.associations?.filter((a: any) => a.isTopLevel);
    const subAssocs = hierarchy.associations?.filter((a: any) => !a.isTopLevel);

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Network className="h-6 w-6 text-red-500" />
                        <span>{t('associations.title')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {t('associations.subtitle')}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/associations/settings"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <Sliders className="h-4 w-4" />
                        <span>{t('associations.settingsTitle')}</span>
                    </Link>
                    {user && (
                        <button
                            onClick={() => {
                                if (selectedAssoc) setSelectedAssocIds([selectedAssoc.id]);
                                setShowClubModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                        >
                            <Plus className="h-4 w-4" />
                            <span>{t('common.add')} {t('common.club')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Visual DAG Tree Structure */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        <span>{t('associations.dagTree')}</span>
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('associations.ruleHierarchy')}
                    </span>
                </div>

                <div className="space-y-6">
                    {/* Top-Level National Association */}
                    {topLevel?.map((nat: any) => (
                        <div key={nat.id} className="space-y-4">
                            <div
                                onClick={() => setSelectedAssoc(nat)}
                                className={`cursor-pointer rounded-xl border p-4 sm:p-5 transition ${
                                    selectedAssoc?.id === nat.id
                                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20 shadow-sm'
                                        : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                                {t('associations.nationalPrecedence')}
                                            </span>
                                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold">
                                                [{nat.code}]
                                            </span>
                                        </div>
                                        <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                            {nat.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {t('associations.ruleHierarchy')}
                                        </p>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                        {t('associations.licenseTemplate')}:{' '}
                                        <span className="text-red-600 dark:text-red-400 font-bold">
                                            {nat.licenseIdTemplate}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Sub-Associations Layer */}
                            <div className="pl-4 sm:pl-6 border-l-2 border-slate-200 dark:border-slate-800 ml-2 sm:ml-4 space-y-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('associations.regionalAssociations')}:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                                    {subAssocs?.map((sub: any) => {
                                        const isSelected = selectedAssoc?.id === sub.id;
                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => setSelectedAssoc(sub)}
                                                className={`cursor-pointer rounded-xl border p-4 transition space-y-2 ${
                                                    isSelected
                                                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20 shadow-sm'
                                                        : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                                                        {sub.level}
                                                    </span>
                                                    <Link
                                                        href={`/association/${sub.id}`}
                                                        className="font-mono text-xs text-red-600 dark:text-red-400 font-bold hover:underline"
                                                    >
                                                        [{sub.code}] ↗
                                                    </Link>
                                                </div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {sub.name}
                                                </h4>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {t('associations.affiliatedClubsCount', {
                                                        count: sub.clubAssociations?.length || 0,
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Association Rules & Inspector */}
            {selectedAssoc && effectiveRules && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 sm:p-6 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Info className="h-5 w-5 text-red-500" />
                                <span>{selectedAssoc.name} Rules</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('associations.ruleHierarchy')}
                            </p>
                        </div>
                        <span className="rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 text-xs font-mono self-start sm:self-auto">
                            Region Digit: {selectedAssoc.regionDigit}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-4 font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto">
                        <pre>{JSON.stringify(effectiveRules, null, 2)}</pre>
                    </div>
                </div>
            )}

            {/* Clubs Directory */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            <span>{t('associations.affiliatedClubs')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('associations.multiParentDAG')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hierarchy.clubs?.map((club: any) => (
                        <div
                            key={club.id}
                            className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-300 dark:border-red-800/40 px-2 py-0.5 text-[10px] font-mono font-bold">
                                    {club.code}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {club.associations?.length || 1} Parent Associations
                                </span>
                            </div>

                            <div>
                                <Link
                                    href={`/club/${club.id}`}
                                    className="text-base font-bold text-slate-900 hover:text-red-600 dark:text-white dark:hover:text-red-400 transition"
                                >
                                    {club.name} ↗
                                </Link>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                                    {club.address}, {club.postalCode} {club.city}
                                </p>
                            </div>

                            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2.5">
                                {club.email && (
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{club.email}</span>
                                    </div>
                                )}
                                {club.phone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{club.phone}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                    {t('common.association')}s:
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {club.associations?.map((ca: any) => (
                                        <span
                                            key={ca.association.id}
                                            className="rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 text-[10px]"
                                        >
                                            {ca.association.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Club Modal */}
            {showClubModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {t('common.add')} {t('common.club')}
                            </h3>
                            <button
                                onClick={() => setShowClubModal(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateClub} className="space-y-3 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.club')} {t('common.name')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. TTC Zurich Affoltern"
                                        value={clubName}
                                        onChange={(e) => setClubName(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="TCA"
                                        value={clubCode}
                                        onChange={(e) => setClubCode(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.street')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Fronwaldstrasse 115"
                                    value={clubAddress}
                                    onChange={(e) => setClubAddress(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.city')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Zurich"
                                        value={clubCity}
                                        onChange={(e) => setClubCity(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.postalCode')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="8046"
                                        value={clubPostalCode}
                                        onChange={(e) => setClubPostalCode(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.email')}
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="info@tca.ch"
                                        value={clubEmail}
                                        onChange={(e) => setClubEmail(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.phone')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="+41 44 123 45 67"
                                        value={clubPhone}
                                        onChange={(e) => setClubPhone(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Parent Sub-Associations (Multi-Select DAG)
                                </label>
                                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-2 space-y-1">
                                    {hierarchy.associations?.map((a: any) => (
                                        <label
                                            key={a.id}
                                            className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAssocIds.includes(a.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked)
                                                        setSelectedAssocIds([...selectedAssocIds, a.id]);
                                                    else
                                                        setSelectedAssocIds(
                                                            selectedAssocIds.filter((id) => id !== a.id),
                                                        );
                                                }}
                                                className="rounded border-slate-300 bg-slate-100 text-red-600 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-900"
                                            />
                                            <span>
                                                {a.name} ({a.code})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowClubModal(false)}
                                    className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 shadow"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
