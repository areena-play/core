'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { Network, Shield, Plus, ChevronRight, Info, Sliders, ExternalLink, MapPin, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

export default function AssociationsPage() {
    const { user } = useAuth();
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
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Network className="h-6 w-6 text-red-500" />
                        Federation Hierarchy & Clubs (DAG)
                    </h1>
                    <p className="text-sm text-slate-400">
                        Multi-parent Directed Acyclic Graph (DAG) association hierarchy with national rule precedence
                        and club affiliations.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/associations/settings"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                        <Sliders className="h-4 w-4" />
                        <span>Main Association Settings</span>
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
                            <span>Affiliate New Club</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Visual DAG Tree Structure */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        Association Hierarchy Tree
                    </h2>
                    <span className="text-xs text-slate-400">Click an association to inspect rules & overrides</span>
                </div>

                <div className="space-y-6">
                    {/* Top-Level National Association */}
                    {topLevel?.map((nat: any) => (
                        <div key={nat.id} className="space-y-4">
                            <div
                                onClick={() => setSelectedAssoc(nat)}
                                className={`cursor-pointer rounded-xl border p-5 transition ${
                                    selectedAssoc?.id === nat.id
                                        ? 'border-red-500 bg-red-950/20'
                                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                                TOP-LEVEL NATIONAL
                                            </span>
                                            <span className="font-mono text-xs text-slate-400 font-bold">
                                                [{nat.code}]
                                            </span>
                                        </div>
                                        <h3 className="mt-1 text-lg font-bold text-white">{nat.name}</h3>
                                        <p className="text-xs text-slate-400">
                                            Top of hierarchy. National rules override all regional sub-associations.
                                        </p>
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                        Template:{' '}
                                        <span className="text-red-400 font-bold">{nat.licenseIdTemplate}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sub-Associations Layer */}
                            <div className="pl-6 border-l-2 border-slate-800 ml-4 space-y-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Regional Sub-Associations:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {subAssocs?.map((sub: any) => {
                                        const isSelected = selectedAssoc?.id === sub.id;
                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => setSelectedAssoc(sub)}
                                                className={`cursor-pointer rounded-xl border p-4 transition space-y-2 ${
                                                    isSelected
                                                        ? 'border-red-500 bg-red-950/20'
                                                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                                        {sub.level}
                                                    </span>
                                                    <span className="font-mono text-xs text-red-400 font-bold">
                                                        [{sub.code}]
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-white text-sm">{sub.name}</h4>
                                                <div className="text-[11px] text-slate-400">
                                                    Affiliated Clubs: {sub.clubAssociations?.length || 0}
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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Info className="h-5 w-5 text-red-500" />
                                Rule Precedence & Configuration: {selectedAssoc.name}
                            </h3>
                            <p className="text-xs text-slate-400">
                                Shows active rules, with national rules overriding local rules according to federation
                                charter.
                            </p>
                        </div>
                        <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300">
                            Region Digit: {selectedAssoc.regionDigit}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                        <pre>{JSON.stringify(effectiveRules, null, 2)}</pre>
                    </div>
                </div>
            )}

            {/* Clubs Directory */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            Affiliated Sports Clubs
                        </h2>
                        <p className="text-xs text-slate-400">
                            Clubs can be affiliated with multiple sub-associations simultaneously (multi-parent DAG).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hierarchy.clubs?.map((club: any) => (
                        <div
                            key={club.id}
                            className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition shadow-sm space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="rounded bg-red-950 border border-red-800/40 px-2 py-0.5 text-[10px] font-mono font-bold text-red-400">
                                    {club.code}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    {club.associations?.length || 1} Parent Associations
                                </span>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-white">{club.name}</h3>
                                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                                    {club.address}, {club.postalCode} {club.city}
                                </p>
                            </div>

                            <div className="space-y-1 text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                                {club.email && (
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                                        <span>{club.email}</span>
                                    </div>
                                )}
                                {club.phone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                                        <span>{club.phone}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-slate-800/60">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                    Affiliated With:
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {club.associations?.map((ca: any) => (
                                        <span
                                            key={ca.association.id}
                                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Affiliate New Sports Club</h3>
                            <button onClick={() => setShowClubModal(false)} className="text-slate-400 hover:text-white">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateClub} className="space-y-3 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <label className="font-semibold text-slate-300">Club Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. TTC Zurich Affoltern"
                                        value={clubName}
                                        onChange={(e) => setClubName(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300">Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="TCA"
                                        value={clubCode}
                                        onChange={(e) => setClubCode(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300">Street Address</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Fronwaldstrasse 115"
                                    value={clubAddress}
                                    onChange={(e) => setClubAddress(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-300">City</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Zurich"
                                        value={clubCity}
                                        onChange={(e) => setClubCity(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300">Postal Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="8046"
                                        value={clubPostalCode}
                                        onChange={(e) => setClubPostalCode(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-300">Email</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="info@tca.ch"
                                        value={clubEmail}
                                        onChange={(e) => setClubEmail(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300">Phone</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="+41 44 123 45 67"
                                        value={clubPhone}
                                        onChange={(e) => setClubPhone(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300">
                                    Parent Sub-Associations (Multi-Select DAG)
                                </label>
                                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-2 space-y-1">
                                    {hierarchy.associations?.map((a: any) => (
                                        <label
                                            key={a.id}
                                            className="flex items-center gap-2 cursor-pointer text-slate-300"
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
                                                className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500"
                                            />
                                            <span>
                                                {a.name} ({a.code})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowClubModal(false)}
                                    className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                                >
                                    Save Club
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
