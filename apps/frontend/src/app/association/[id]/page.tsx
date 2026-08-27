'use client';

import React, { useEffect, useState } from 'react';
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
    const [loading, setLoading] = useState(true);

    const fetchAssociationData = async () => {
        try {
            const data = await api.getAssociations();
            const found = data.associations?.find((a: any) => a.id === assocId);
            if (found) {
                setAssociation(found);
                setEntityMeta({
                    id: found.id,
                    title: found.name,
                    code: found.code,
                    badge: found.level,
                    subtitle: `Regional Sub-Association [${found.code}] • Multi-Parent DAG Member`,
                });
            }

            // Load clubs
            const clubsData = await api.getClubs();
            setClubs(clubsData || []);

            // Load competitions for this association
            const compsData = await api.getCompetitions({ associationId: assocId });
            setCompetitions(compsData || []);

            // Load effective rules
            const rules = await api.getAssociationRules(assocId);
            setEffectiveRules(rules);
        } catch (err) {
            console.error('Failed to load association:', err);
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
            (r: any) => r.associationId === assocId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!association) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-8 text-center text-slate-700 dark:text-slate-300">
                Sub-association not found.
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Live Scoring Ticker */}
            <LiveTicker />

            {/* Association Header Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-2.5 py-0.5 text-xs font-bold uppercase">
                                {association.level}
                            </span>
                            <span className="font-mono text-xs text-red-600 dark:text-red-400 font-bold">
                                [{association.code}]
                            </span>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">
                            {association.name}
                        </h1>

                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                            {association.description ||
                                'Regional sports sub-association managing affiliated clubs, regional league categories, and licenses.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/association/${assocId}/tournaments`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                        >
                            <Trophy className="h-4 w-4" />
                            <span>View Regional Tournaments</span>
                        </Link>
                        {isAssocAdmin && (
                            <Link
                                href="/associations/settings"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                <Sliders className="h-4 w-4 text-slate-400" />
                                <span>{t('nav.associationSettings')}</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Regional Clubs Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            <span>Affiliated Regional Clubs</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Member clubs participating in championships under {association.name}.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {clubs.length} Clubs
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {clubs.map((c) => (
                        <Link
                            key={c.id}
                            href={`/club/${c.id}`}
                            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-red-500/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-red-500/40 transition group shadow-xs space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300 font-bold">
                                    [{c.code}]
                                </span>
                                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition" />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                {c.name}
                            </h4>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-red-500" />
                                <span>{c.city || 'Switzerland'}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

