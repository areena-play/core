'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import {
    User,
    Shield,
    Building2,
    Award,
    Calendar,
    MapPin,
    Mail,
    ArrowLeft,
    CheckCircle2,
    GraduationCap,
    Clock,
    Sparkles,
    Trophy,
    ExternalLink,
    BadgeCheck,
    Lock,
    Copy,
    Check,
} from 'lucide-react';
import { JsonLd, generatePersonJsonLd } from '@/components/seo/JsonLd';

export default function PersonProfilePage() {
    const params = useParams();
    const router = useRouter();
    const identifier = params?.identifier as string;

    const [person, setPerson] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!identifier) return;

        async function loadPerson() {
            try {
                setLoading(true);
                setError(null);
                const data = await api.getPerson(identifier);
                setPerson(data);
            } catch (err: any) {
                console.error('Failed to load person profile:', err);
                setError(err.message || 'Person not found');
            } finally {
                setLoading(false);
            }
        }

        loadPerson();
    }, [identifier]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !person) {
        return (
            <div className="max-w-3xl mx-auto py-16 px-4 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 mb-4">
                    <User className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Person Not Found</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    We couldn't find a member profile matching identifier: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-xs">{identifier}</code>
                </p>
                <Link
                    href="/people"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to People Directory</span>
                </Link>
            </div>
        );
    }

    const activeLicenses = person.licenses?.filter((l: any) => l.status === 'ACTIVE') || [];

    return (
        <div className="w-full space-y-6 pb-20">
            {/* Schema.org Person Structured Data */}
            <JsonLd data={generatePersonJsonLd(person)} />

            {/* Top Action Bar */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Directory</span>
                </button>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleCopy(window.location.href)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Link Copied' : 'Share Profile'}</span>
                    </button>
                </div>
            </div>

            {/* Profile Header Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                    {/* Avatar */}
                    <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 text-red-600 dark:text-red-400 font-black text-2xl sm:text-3xl border-2 border-red-500/30 shadow-inner shrink-0">
                        {person.firstName?.[0] || 'U'}
                        {person.lastName?.[0] || ''}
                    </div>

                    {/* Main Bio Info */}
                    <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {person.firstName} {person.lastName}
                            </h1>
                            {person.licenseId && (
                                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                                    <BadgeCheck className="h-3.5 w-3.5 text-red-600" />
                                    <span>{person.licenseId}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            {person.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{person.city}{person.country ? `, ${person.country}` : ''}</span>
                                </div>
                            )}
                            {person.email && (
                                <div className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{person.email}</span>
                                </div>
                            )}
                            {person.createdAt && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Member since {format(new Date(person.createdAt), 'yyyy')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ELO / Rating Badge */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto p-4 sm:p-0 rounded-2xl bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent border sm:border-0 border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ELO Rating</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-slate-900 dark:text-white">
                                {person.eloPoints || 1000}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">pts</span>
                        </div>
                        {person.rank && (
                            <div className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-0.5">
                                Rank #{person.rank}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Licenses & Affiliations */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Licenses Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-red-600" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Official Licenses & Credentials</h2>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{activeLicenses.length} Active</span>
                        </div>

                        {activeLicenses.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {activeLicenses.map((lic: any) => (
                                    <div key={lic.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {lic.type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    <span>ACTIVE</span>
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {lic.club?.name && <span>Club: <strong className="text-slate-700 dark:text-slate-300">{lic.club.name}</strong></span>}
                                                {lic.association?.name && <span> • Assoc: <strong className="text-slate-700 dark:text-slate-300">{lic.association.name}</strong></span>}
                                            </div>
                                        </div>
                                        {lic.validUntil && (
                                            <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                                                <span>Valid through</span>
                                                <div className="font-mono font-bold text-slate-600 dark:text-slate-300">
                                                    {format(new Date(lic.validUntil), 'dd.MM.yyyy')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                                No active licenses currently on file for this person.
                            </div>
                        )}
                    </div>

                    {/* Roles & Governance Affiliations */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-red-600" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Club & Association Affiliations</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Club Affiliations */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Club Roles</div>
                                {person.clubRoles?.length > 0 ? (
                                    <div className="space-y-2">
                                        {person.clubRoles.map((cr: any) => (
                                            <div key={cr.id} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                                                <div>
                                                    <div className="font-bold text-xs text-slate-900 dark:text-white">{cr.club?.name || 'Club'}</div>
                                                    <div className="text-[10px] text-slate-400">{cr.club?.code}</div>
                                                </div>
                                                <span className="rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                                    {cr.role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic p-3">No direct club leadership roles</div>
                                )}
                            </div>

                            {/* Association Affiliations */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Association Roles</div>
                                {person.associationRoles?.length > 0 ? (
                                    <div className="space-y-2">
                                        {person.associationRoles.map((ar: any) => (
                                            <div key={ar.id} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                                                <div>
                                                    <div className="font-bold text-xs text-slate-900 dark:text-white">{ar.association?.name || 'Association'}</div>
                                                    <div className="text-[10px] text-slate-400">{ar.association?.code}</div>
                                                </div>
                                                <span className="rounded-lg bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold border border-red-200 dark:border-red-800">
                                                    {ar.role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic p-3">No federation administrative roles</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Training, Courses, Metadata */}
                <div className="space-y-6">
                    {/* Training & Refresher Courses */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-red-600" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Training & Courses</h2>
                        </div>

                        {person.courseAttendances?.length > 0 ? (
                            <div className="space-y-2.5">
                                {person.courseAttendances.map((ca: any) => (
                                    <div key={ca.id} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                                            {ca.course?.title || 'Certification Course'}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                                            <span>{ca.course?.category || 'Referee / Coach'}</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                {ca.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic text-center p-4">
                                No course attendance records found.
                            </div>
                        )}
                    </div>

                    {/* Quick Metadata Box */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-5 space-y-3 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white">Profile Identifiers</div>
                        <div className="space-y-1.5 text-[11px] font-mono">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">License ID:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{person.licenseId || 'None'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Unique UUID:</span>
                                <span className="text-slate-500 truncate max-w-[140px]">{person.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}