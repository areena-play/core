'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Network,
    Shield,
    Trophy,
    Calendar,
    Users,
    ChevronRight,
    Sliders,
    Award,
    Plus,
    ExternalLink,
    MapPin,
    ArrowUpRight,
    Search,
    Building2,
    Layers,
    FileText,
    Settings,
    Crown,
    Activity,
} from 'lucide-react';
import { LiveTicker } from '@/components/layout/LiveTicker';

export default function SubAssociationPage() {
    const params = useParams();
    const assocId = params?.id as string;
    const { user } = useAuth();
    const { t } = useI18n();
    const { setEntityMeta } = useMainView();

    const [association, setAssociation] = useState<any>(null);
    const [clubs, setClubs] = useState<any[]>([]);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [effectiveRules, setEffectiveRules] = useState<any>(null);
    const [clubSearchQuery, setClubSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchAssociationData = async () => {
        try {
            setLoading(true);
            let found: any = null;

            // 1. Try direct fetch by ID, slug, or uppercase code
            try {
                found = await api.getAssociation(assocId);
            } catch (err) {
                // Ignore and try fallback
            }

            // 2. Fallback: Search in full hierarchy tree
            if (!found || !found.id) {
                const data = await api.getAssociations().catch(() => ({ associations: [] }));
                const list = data?.associations || [];
                found = list.find((a: any) =>
                    a.id === assocId ||
                    a.slug?.toLowerCase() === assocId?.toLowerCase() ||
                    a.code?.toUpperCase() === assocId?.toUpperCase()
                );

                if (found?.id) {
                    // Try to fetch full details with the resolved UUID
                    found = await api.getAssociation(found.id).catch(() => found);
                }
            }

            if (found) {
                setAssociation(found);
                setEntityMeta({
                    id: found.id,
                    title: found.name,
                    code: found.code,
                    badge: found.level,
                    subtitle: `Regional Sub-Association [${found.code}] • Multi-Parent DAG Member`,
                });

                const realId = found.id;

                // Load clubs and filter to this association
                const [allClubs, compsData, rules] = await Promise.all([
                    api.getClubs().catch(() => []),
                    api.getCompetitions({ associationId: realId }).catch(() => []),
                    api.getAssociationRules(realId).catch(() => null),
                ]);

                // Filter clubs affiliated with this association
                const affiliatedClubs = (Array.isArray(allClubs) ? allClubs : []).filter((c: any) =>
                    c.associations?.some((a: any) =>
                        a.associationId === realId ||
                        a.association?.id === realId ||
                        a.association?.code === found.code ||
                        a.association?.slug === found.slug
                    ) ||
                    found.clubAssociations?.some((ca: any) => ca.clubId === c.id || ca.club?.id === c.id)
                );

                // Fallback to found.clubAssociations if direct filter returned none
                if (affiliatedClubs.length > 0) {
                    setClubs(affiliatedClubs);
                } else if (found.clubAssociations?.length > 0) {
                    setClubs(found.clubAssociations.map((ca: any) => ca.club).filter(Boolean));
                } else {
                    setClubs([]);
                }

                setCompetitions(Array.isArray(compsData) ? compsData : []);
                setEffectiveRules(rules);
            } else {
                setAssociation(null);
            }
        } catch (err) {
            console.error('Failed to load association:', err);
            setAssociation(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (assocId) {
            fetchAssociationData();
        }
        return () => {
            setEntityMeta(null);
        };
    }, [assocId]);

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some(
            (r: any) =>
                (r.associationId === association?.id || r.associationId === assocId) &&
                ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER'].includes(r.role)
        );

    // Filter clubs based on search
    const filteredClubs = useMemo(() => {
        if (!clubSearchQuery.trim()) return clubs;
        const q = clubSearchQuery.toLowerCase();
        return clubs.filter(
            (c) =>
                c.name?.toLowerCase().includes(q) ||
                c.code?.toLowerCase().includes(q) ||
                c.city?.toLowerCase().includes(q)
        );
    }, [clubs, clubSearchQuery]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
        );
    }

    if (!association) {
        return (
            <div className="max-w-3xl mx-auto py-16 px-4 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 mb-4">
                    <Shield className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Sub-Association Not Found
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    We couldn&apos;t find an association matching identifier: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-xs">{assocId}</code>
                </p>
                <Link
                    href="/associations"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition"
                >
                    <Network className="h-4 w-4" />
                    <span>View All Associations</span>
                </Link>
            </div>
        );
    }

    const assocSlugOrCode = association.slug || association.code?.toLowerCase() || association.id;
    const parentAssoc = association.parentHierarchies?.[0]?.parent;
    const childAssocs = association.childHierarchies?.map((ch: any) => ch.child).filter(Boolean) || [];

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Live Scoring Ticker */}
            <LiveTicker />

            {/* Association Header Card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-md bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                                {association.level || 'REGIONAL'}
                            </span>
                            <span className="font-mono text-xs text-red-600 dark:text-red-400 font-black">
                                [{association.code}]
                            </span>
                            {parentAssoc && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <span>• Member of</span>
                                    <Link
                                        href={`/association/${parentAssoc.slug || parentAssoc.code?.toLowerCase() || parentAssoc.id}`}
                                        className="font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 underline"
                                    >
                                        {parentAssoc.name}
                                    </Link>
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {association.name}
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                            {association.description ||
                                `Regional sports sub-association managing affiliated clubs, regional league categories, and licenses under ${parentAssoc?.name || 'the National Federation'}.`}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 shrink-0">
                        <Link
                            href={`/association/${assocSlugOrCode}/competitions`}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm"
                        >
                            <Trophy className="h-4 w-4" />
                            <span>Regional Tournaments</span>
                        </Link>

                        <Link
                            href={`/association/${assocSlugOrCode}/clubs`}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                        >
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span>Clubs Directory</span>
                        </Link>

                        {isAssocAdmin && (
                            <Link
                                href={`/association/${assocSlugOrCode}/management`}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2.5 text-xs font-bold transition shadow-sm"
                            >
                                <Settings className="h-4 w-4" />
                                <span>Management Hub</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Affiliated Clubs
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {clubs.length}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Active member organizations
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Competitions
                    </div>
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">
                        {competitions.length}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Leagues & seasonal tournaments
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Association Level
                    </div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {association.level || 'REGIONAL'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Code: [{association.code}]
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Subordinate Branches
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {childAssocs.length}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        DAG Child Associations
                    </div>
                </div>
            </div>

            {/* Subordinate Child Associations (if any) */}
            {childAssocs.length > 0 && (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Network className="h-5 w-5 text-red-600" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Regional Sub-Associations & Branches ({childAssocs.length})
                            </h2>
                        </div>
                        <Link
                            href={`/association/${assocSlugOrCode}/associations`}
                            className="text-xs font-bold text-red-600 hover:underline inline-flex items-center gap-1"
                        >
                            <span>Explore Hierarchy DAG</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {childAssocs.map((ch: any) => (
                            <Link
                                key={ch.id}
                                href={`/association/${ch.slug || ch.code?.toLowerCase() || ch.id}`}
                                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-red-500/40 transition group space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-[10px] text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                                        [{ch.code}]
                                    </span>
                                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition" />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 transition truncate">
                                    {ch.name}
                                </h3>
                                <div className="text-[11px] text-slate-400">
                                    Level: <strong>{ch.level || 'SUB_REGIONAL'}</strong>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Affiliated Regional Clubs Section */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-600" />
                            <span>Affiliated Regional Clubs ({filteredClubs.length})</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Member clubs participating in championships under {association.name}.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search clubs by name, code, city..."
                                value={clubSearchQuery}
                                onChange={(e) => setClubSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-red-500 w-52 sm:w-64"
                            />
                        </div>

                        <Link
                            href={`/association/${assocSlugOrCode}/clubs`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline shrink-0"
                        >
                            <span>View Table</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {filteredClubs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredClubs.map((c) => (
                            <Link
                                key={c.id}
                                href={`/club/${c.slug || c.code?.toLowerCase() || c.id}`}
                                className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 hover:border-red-500/40 hover:bg-white dark:hover:bg-slate-900 transition group shadow-xs space-y-2.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-800 dark:text-slate-200 font-black">
                                        [{c.code}]
                                    </span>
                                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition" />
                                </div>

                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition truncate">
                                        {c.name}
                                    </h3>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                                        <span className="truncate">{c.city || c.address || 'Switzerland'}</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                    <span>{c._count?.licenses ?? c.licenses?.length ?? 0} Players</span>
                                    <span>{c._count?.teams ?? c.teams?.length ?? 0} Teams</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                        {clubSearchQuery
                            ? `No affiliated clubs matching "${clubSearchQuery}".`
                            : 'No clubs currently affiliated with this sub-association.'}
                    </div>
                )}
            </div>

            {/* Regional Competitions & Tournaments Section */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <span>Regional Championships & Tournaments ({competitions.length})</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Championships, regional cups, and ranking tournaments sanctioned by {association.name}.
                        </p>
                    </div>

                    <Link
                        href={`/association/${assocSlugOrCode}/competitions`}
                        className="text-xs font-bold text-red-600 hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                        <span>Full List</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {competitions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {competitions.map((comp) => (
                            <Link
                                key={comp.id}
                                href={`/competition/${comp.slug || comp.id}`}
                                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-red-500/40 hover:bg-white dark:hover:bg-slate-900 transition group space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                        {comp.type}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                        {comp.season?.name || 'Current'}
                                    </span>
                                </div>

                                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 transition truncate">
                                    {comp.name}
                                </h3>

                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                    <span>{comp.categories?.length || comp._count?.categories || 0} Categories</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        {comp.status || 'ACTIVE'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                        No active regional championships recorded for this season.
                    </div>
                )}
            </div>
        </div>
    );
}
