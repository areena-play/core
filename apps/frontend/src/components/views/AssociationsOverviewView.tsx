'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { Network, Shield, Plus, ChevronRight, Info, Sliders, ExternalLink, MapPin, Mail, Phone, Lock } from 'lucide-react';

interface AssociationsOverviewViewProps {
    scopedAssociationId?: string;
}

export function AssociationsOverviewView({ scopedAssociationId }: AssociationsOverviewViewProps) {
    const { user } = useAuth();
    const { t } = useI18n();
    const [hierarchy, setHierarchy] = useState<any>({ associations: [], clubs: [] });
    const [selectedAssoc, setSelectedAssoc] = useState<any | null>(null);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [effectiveRules, setEffectiveRules] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchHierarchy = async () => {
        try {
            const data = await api.getAssociations();
            setHierarchy(data);
            const assocs = data.associations || [];
            if (scopedAssociationId) {
                const found = assocs.find((a: any) => a.id === scopedAssociationId);
                if (found) {
                    setScopedAssoc(found);
                    setSelectedAssoc(found);
                }
            } else if (assocs.length > 0 && !selectedAssoc) {
                const top = assocs.find((a: any) => a.isTopLevel) || assocs[0];
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
    }, [scopedAssociationId]);

    useEffect(() => {
        if (selectedAssoc) {
            api.getAssociationRules(selectedAssoc.id)
                .then(setEffectiveRules)
                .catch(() => {});
        }
    }, [selectedAssoc]);

    const childAssocs = (hierarchy.associations || []).filter((a: any) =>
        a.id !== selectedAssoc?.id &&
        (
            a.parentHierarchies?.some((ph: any) => ph.parentId === selectedAssoc?.id) ||
            selectedAssoc?.childHierarchies?.some((ch: any) => ch.childId === a.id || ch.child?.id === a.id)
        )
    );

    return (
        <div className="space-y-6 pb-16">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-red-500" />
                                    <span>Sub-Association Hierarchy DAG</span>
                                </>
                            ) : (
                                <>
                                    <Network className="h-3.5 w-3.5 text-red-500" />
                                    <span>National Federation Hierarchy</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc ? `${scopedAssoc.name} • Sub-Associations` : t('nav.associationsOverview')}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {scopedAssoc
                                ? `Subordinate regional branches and child associations of ${scopedAssoc.name}.`
                                : 'Multi-parent Directed Acyclic Graph (DAG) regional association hierarchy and rule inheritance.'}
                        </p>
                    </div>

                    {scopedAssociationId && (
                        <Link
                            href="/associations"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                        >
                            <span>National Hierarchy</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {scopedAssoc ? `Direct Sub-Associations of ${scopedAssoc.name}` : 'Federation Regional Associations'}
                </h3>

                {childAssocs.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8 text-center text-xs text-slate-400">
                        {scopedAssoc
                            ? 'This sub-association has no further child sub-associations.'
                            : 'No regional sub-associations found.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {childAssocs.map((sub: any) => (
                            <Link
                                key={sub.id}
                                href={`/association/${sub.slug || sub.id}`}
                                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:shadow-md hover:border-red-500/50 transition space-y-3 group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-red-600 dark:text-red-400">
                                        {sub.level || 'Sub-Association'}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">{sub.code}</span>
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                                    {sub.name}
                                </h4>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-red-600 dark:text-red-400 font-bold">
                                    <span>Enter Sub-Association Portal</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
