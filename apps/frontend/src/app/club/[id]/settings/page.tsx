'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import {
    Settings,
    Shield,
    Building2,
    MapPin,
    Mail,
    Phone,
    Globe,
    Save,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Sparkles,
    Image,
    Link as LinkIcon,
    ArrowLeft,
    RefreshCw,
} from 'lucide-react';
import { formatPhoneNumber } from '@areena/shared';

export default function ClubSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const clubIdentifier = params?.id as string;
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [club, setClub] = useState<any>(null);
    const [unauthorized, setUnauthorized] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [form, setForm] = useState({
        name: '',
        code: '',
        slug: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        postalCode: '',
        country: 'Switzerland',
        logoUrl: '',
    });
    const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);

    const loadClub = async () => {
        setLoading(true);
        setMsg(null);
        setUnauthorized(false);
        try {
            let targetClub: any = null;
            try {
                targetClub = await api.getClub(clubIdentifier);
            } catch {
                const clubs = await api.getClubs().catch(() => []);
                targetClub = clubs.find(
                    (c: any) =>
                        c.id === clubIdentifier ||
                        c.slug?.toLowerCase() === clubIdentifier?.toLowerCase() ||
                        c.code?.toLowerCase() === clubIdentifier?.toLowerCase()
                );
            }

            if (!targetClub) {
                setClub(null);
                return;
            }

            // Check permissions
            const isOfficial =
                user?.isSuperAdmin ||
                user?.clubRoles?.some(
                    (r: any) =>
                        (r.clubId === targetClub.id || r.club?.slug === targetClub.slug) &&
                        ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COACH', 'TECHNICAL_DIRECTOR', 'OFFICIAL'].includes(r.role)
                ) ||
                targetClub.adminRoles?.some((r: any) => r.userId === user?.id);

            if (!isOfficial && !user?.isSuperAdmin) {
                setUnauthorized(true);
                return;
            }

            setClub(targetClub);
            setExpectedUpdatedAt(targetClub.updatedAt);
            setForm({
                name: targetClub.name || '',
                code: targetClub.code || '',
                slug: targetClub.slug || '',
                email: targetClub.email || '',
                phone: targetClub.phone || '',
                website: targetClub.website || '',
                address: targetClub.address || '',
                city: targetClub.city || '',
                postalCode: targetClub.postalCode || '',
                country: targetClub.country || 'Switzerland',
                logoUrl: targetClub.logoUrl || '',
            });

            setEntityMeta({
                id: targetClub.id,
                title: targetClub.name,
                code: targetClub.code,
                badge: 'Club',
                subtitle: `${targetClub.city || 'Switzerland'} • Club Settings`,
            });
        } catch (err: any) {
            if (err?.status === 403 || err?.message?.toLowerCase().includes('denied') || err?.message?.toLowerCase().includes('unauthorized')) {
                setUnauthorized(true);
            } else {
                setMsg({ type: 'error', text: err.message || 'Failed to load club settings.' });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!clubIdentifier || authLoading) return;
        loadClub();
    }, [clubIdentifier, authLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setMsg({ type: 'error', text: 'Club name is required.' });
            return;
        }

        setSaving(true);
        setMsg(null);
        try {
            const updated = await api.updateClub(club.id, {
                name: form.name.trim(),
                slug: form.slug.trim() || undefined,
                email: form.email.trim() || undefined,
                phone: form.phone.trim() || undefined,
                website: form.website.trim() || undefined,
                address: form.address.trim() || undefined,
                city: form.city.trim() || undefined,
                postalCode: form.postalCode.trim() || undefined,
                country: form.country.trim() || undefined,
                logoUrl: form.logoUrl.trim() || undefined,
                expectedUpdatedAt: expectedUpdatedAt || undefined,
            });

            setMsg({ type: 'success', text: 'Club settings updated successfully!' });
            setClub(updated);
            setExpectedUpdatedAt(updated.updatedAt);

            // If slug changed, update URL without breaking history
            if (updated.slug && updated.slug !== clubIdentifier && club.slug !== updated.slug) {
                router.replace(`/club/${updated.slug}/settings`);
            }
        } catch (err: any) {
            setMsg({
                type: 'error',
                text: err.message || 'Failed to update club settings. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (unauthorized) {
        return (
            <AccessDenied
                title="Club Administrator Access Required"
                description="This settings page is restricted to authorized Club Officials (Presidents, Board Members) and Platform Super Administrators."
                requiredRole="Club Administrator / Official"
                returnHref={`/club/${clubIdentifier}`}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (!club) {
        return (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Club Not Found</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        No club matching identifier &quot;{clubIdentifier}&quot; could be located.
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

    return (
        <div className="space-y-8 pb-12 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    <Settings className="w-8 h-8 text-red-600" />
                    <span>Club Settings & Configuration</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage club identity, contact addresses, official communication channels, and website preferences.
                </p>
            </div>

            {/* Notification Toast */}
            {msg && (
                <div
                    className={`rounded-2xl p-4 text-xs font-bold flex items-center gap-3 border shadow-xs ${
                        msg.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60'
                    }`}
                >
                    {msg.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span>{msg.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Club Identity & Branding */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white">Club Identity & Branding</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Official name, short code, and custom URL slug.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Club Official Name *</label>
                            <input
                                required
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Table Tennis Club Zurich"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Club Short Code</label>
                            <input
                                disabled
                                type="text"
                                value={form.code}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3.5 py-2.5 text-slate-500 font-mono font-bold cursor-not-allowed uppercase"
                            />
                            <p className="text-[10px] text-slate-400">Short codes are assigned by association governance.</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">URL Slug Identifier</label>
                            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-red-500">
                                <span className="bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[11px] font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                    /club/
                                </span>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    placeholder="ttc-zurich"
                                    className="w-full px-3 py-2.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Custom web link to access this club view directly.</p>
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Club Logo URL</label>
                            <div className="flex items-center gap-3">
                                {form.logoUrl ? (
                                    <img
                                        src={form.logoUrl}
                                        alt="Logo Preview"
                                        className="h-10 w-10 rounded-xl object-contain border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-1 shrink-0"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                        <Image className="w-5 h-5" />
                                    </div>
                                )}
                                <input
                                    type="url"
                                    value={form.logoUrl}
                                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Official Contact Information */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white">Contact & Communication</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Official correspondence email, phone numbers, and website links.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Official Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="info@club.ch"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="+41 44 123 45 67"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Official Website</label>
                            <input
                                type="text"
                                value={form.website}
                                onChange={(e) => setForm({ ...form, website: e.target.value })}
                                placeholder="https://www.club.ch"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Club Headquarters & Address */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white">Headquarters & Postal Address</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Registered physical mailing address for postal delivery and club association records.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1.5 sm:col-span-3">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Street Address & House Number</label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="e.g. Sportstrasse 12"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Postal Code (PLZ)</label>
                            <input
                                type="text"
                                value={form.postalCode}
                                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                                placeholder="8000"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">City / Municipality</label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                placeholder="Zürich"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 dark:text-slate-300">Country</label>
                            <input
                                type="text"
                                value={form.country}
                                onChange={(e) => setForm({ ...form, country: e.target.value })}
                                placeholder="Switzerland"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Save & Action Footer */}
                <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                    <Link
                        href={`/club/${club.slug || clubIdentifier}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Cancel & Return to Overview</span>
                    </Link>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-3 text-xs font-bold text-white shadow-md transition"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Saving Configuration...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save Club Settings</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

