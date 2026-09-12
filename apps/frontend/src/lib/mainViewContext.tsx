'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Network, Trophy, Shield, ShieldAlert } from 'lucide-react';
import { api } from './api';

export type MainViewType = 'association' | 'tournament' | 'club' | 'admin';

export interface EntityMeta {
    id: string;
    title: string;
    code?: string;
    slug?: string;
    logoUrl?: string | null;
    subtitle?: string;
    badge?: string;
    parentAssociationId?: string;
    parentAssociationName?: string;
    categories?: any[];
}

export interface MainViewMeta {
    id: MainViewType;
    labelKey: string;
    shortLabelKey: string;
    descKey: string;
    badgeKey: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeColor: string;
    gradientBg: string;
    navbarGlow: string;
    navbarBorder: string;
    ambientLight: string;
}

export const MAIN_VIEW_DEFINITIONS: Record<MainViewType, MainViewMeta> = {
    association: {
        id: 'association',
        labelKey: 'mainViews.association',
        shortLabelKey: 'mainViews.associationShort',
        descKey: 'mainViews.associationDesc',
        badgeKey: 'mainViews.associationBadge',
        icon: Network,
        accentColor: 'text-red-600 dark:text-red-500',
        badgeColor: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/70 dark:text-red-400 dark:border-red-800/50',
        gradientBg: 'from-red-600 to-rose-600',
        navbarGlow: 'from-red-500/20 via-rose-500/8 to-transparent dark:from-red-500/30 dark:via-rose-500/12 dark:to-transparent',
        navbarBorder: 'border-red-200/70 dark:border-red-900/40',
        ambientLight: 'bg-red-500/20 dark:bg-red-500/30',
    },
    tournament: {
        id: 'tournament',
        labelKey: 'mainViews.tournament',
        shortLabelKey: 'mainViews.tournamentShort',
        descKey: 'mainViews.tournamentDesc',
        badgeKey: 'mainViews.tournamentBadge',
        icon: Trophy,
        accentColor: 'text-amber-600 dark:text-amber-400',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-400 dark:border-amber-800/50',
        gradientBg: 'from-amber-500 to-orange-600',
        navbarGlow: 'from-amber-500/20 via-orange-500/8 to-transparent dark:from-amber-500/30 dark:via-orange-500/12 dark:to-transparent',
        navbarBorder: 'border-amber-200/70 dark:border-amber-900/40',
        ambientLight: 'bg-amber-500/20 dark:bg-amber-500/30',
    },
    club: {
        id: 'club',
        labelKey: 'mainViews.club',
        shortLabelKey: 'mainViews.clubShort',
        descKey: 'mainViews.clubDesc',
        badgeKey: 'mainViews.clubBadge',
        icon: Shield,
        accentColor: 'text-blue-600 dark:text-blue-400',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-400 dark:border-blue-800/50',
        gradientBg: 'from-blue-600 to-indigo-600',
        navbarGlow: 'from-blue-500/20 via-indigo-500/8 to-transparent dark:from-blue-500/30 dark:via-indigo-500/12 dark:to-transparent',
        navbarBorder: 'border-blue-200/70 dark:border-blue-900/40',
        ambientLight: 'bg-blue-500/20 dark:bg-blue-500/30',
    },
    admin: {
        id: 'admin',
        labelKey: 'mainViews.admin',
        shortLabelKey: 'mainViews.adminShort',
        descKey: 'mainViews.adminDesc',
        badgeKey: 'mainViews.adminBadge',
        icon: ShieldAlert,
        accentColor: 'text-purple-600 dark:text-purple-400',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-400 dark:border-purple-800/50',
        gradientBg: 'from-purple-600 via-red-600 to-rose-700',
        navbarGlow: 'from-purple-500/20 via-pink-500/8 to-transparent dark:from-purple-500/30 dark:via-pink-500/12 dark:to-transparent',
        navbarBorder: 'border-purple-200/70 dark:border-purple-900/40',
        ambientLight: 'bg-purple-500/20 dark:bg-purple-500/30',
    },
};

interface MainViewContextType {
    activeView: MainViewType;
    entityId: string | null;
    entityMeta: EntityMeta | null;
    setEntityMeta: (meta: EntityMeta | null) => void;
    currentViewMeta: MainViewMeta;
    isTransitioning: boolean;
    mainAssoc: any | null;
    associations: any[];
    refetchAssociations: () => Promise<void>;
    headerTitle: string;
    headerBadge: string;
    headerLogoUrl: string | null;
}

const MainViewContext = createContext<MainViewContextType | undefined>(undefined);

function parseContextFromUrl(path: string): { activeView: MainViewType; entityId: string | null } {
    if (!path) return { activeView: 'association', entityId: 'main' };
    if (path.startsWith('/admin')) {
        return { activeView: 'admin', entityId: 'system' };
    }
    if (path.startsWith('/competition/') || path.startsWith('/competitions/')) {
        const parts = path.split('/');
        return { activeView: 'tournament', entityId: parts[2] || null };
    }
    if (path.startsWith('/club/')) {
        const parts = path.split('/');
        return { activeView: 'club', entityId: parts[2] || null };
    }
    if (path.startsWith('/association/')) {
        const parts = path.split('/');
        return { activeView: 'association', entityId: parts[2] || null };
    }
    return { activeView: 'association', entityId: 'main' };
}

export function MainViewProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [entityMeta, setEntityMetaState] = useState<EntityMeta | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [associations, setAssociations] = useState<any[]>([]);
    const [mainAssoc, setMainAssoc] = useState<any | null>(null);
    const prevContextRef = useRef<string>('');
    const lastContextRef = useRef<{
        activeView: MainViewType;
        entityId: string | null;
        entityMeta: EntityMeta | null;
        returnPath: string | null;
    }>({
        activeView: 'association',
        entityId: 'main',
        entityMeta: null,
        returnPath: null,
    });

    const isContextAgnosticRoute = useMemo(() => {
        return pathname.startsWith('/profile') || pathname.startsWith('/auth/') || pathname.startsWith('/support');
    }, [pathname]);

    const fetchAssociations = useCallback(async () => {
        try {
            const data = await api.getAssociations();
            const assocs = data.associations || [];
            setAssociations(assocs);

            const top = assocs.find((a: any) => a.isTopLevel) || assocs[0] || null;
            setMainAssoc(top);

            // If no associations exist at all and we are not already on /setup, redirect to setup
            if (assocs.length === 0 && pathname !== '/setup') {
                router.replace('/setup');
            }
        } catch (err: any) {
            console.error('Failed to load associations:', err);
        }
    }, [pathname, router]);

    useEffect(() => {
        fetchAssociations();
    }, [fetchAssociations]);

    const [clientContext, setClientContext] = useState<{
        activeView: MainViewType;
        entityId: string | null;
    } | null>(null);

    // Read stored session context on client mount if on an agnostic route
    useEffect(() => {
        if (isContextAgnosticRoute) {
            try {
                const params = new URLSearchParams(window.location.search);
                const returnUrl = params.get('returnUrl') || params.get('redirect');
                if (returnUrl && !returnUrl.startsWith('/profile') && !returnUrl.startsWith('/auth/') && !returnUrl.startsWith('/support')) {
                    const parsedFromUrl = parseContextFromUrl(returnUrl);
                    if (parsedFromUrl.activeView !== 'association' || parsedFromUrl.entityId !== 'main') {
                        setClientContext(parsedFromUrl);
                        return;
                    }
                }

                const stored = sessionStorage.getItem('areena_last_view_context');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.activeView) {
                        lastContextRef.current = {
                            activeView: parsed.activeView,
                            entityId: parsed.entityId || null,
                            entityMeta: parsed.entityMeta || null,
                            returnPath: parsed.returnPath || null,
                        };
                        setClientContext({
                            activeView: parsed.activeView,
                            entityId: parsed.entityId || null,
                        });
                        if (parsed.entityMeta) {
                            setEntityMetaState(parsed.entityMeta);
                        }
                    }
                }
            } catch {}
        } else {
            setClientContext(null);
        }
    }, [isContextAgnosticRoute]);

    // Determine active view & entity ID deterministically for SSR/Hydration
    const { activeView, entityId } = useMemo(() => {
        if (isContextAgnosticRoute && clientContext) {
            return clientContext;
        }
        return parseContextFromUrl(pathname);
    }, [pathname, isContextAgnosticRoute, clientContext]);

    const isEntityMetaMatching = useCallback((meta: EntityMeta | null, targetId: string | null): boolean => {
        if (!meta || !targetId) return false;
        const target = targetId.toLowerCase();
        return (
            meta.id.toLowerCase() === target ||
            (meta.code ? meta.code.toLowerCase() === target : false) ||
            (meta.slug ? meta.slug.toLowerCase() === target : false)
        );
    }, []);

    // Automatically resolve & synchronize entityMeta based on activeView & entityId
    useEffect(() => {
        if (isContextAgnosticRoute) return;

        // 1. National Association View (/ or /competitions, etc.)
        if (activeView === 'association' && (!entityId || entityId === 'main')) {
            if (entityMeta !== null) {
                setEntityMetaState(null);
            }
            return;
        }

        // 2. Sub-Association View (/association/[id]/...)
        if (activeView === 'association' && entityId && entityId !== 'main') {
            if (isEntityMetaMatching(entityMeta, entityId)) {
                return;
            }

            // Check if already in loaded associations list
            const found = associations.find((a: any) =>
                a.id?.toLowerCase() === entityId.toLowerCase() ||
                a.slug?.toLowerCase() === entityId.toLowerCase() ||
                a.code?.toLowerCase() === entityId.toLowerCase()
            );

            if (found) {
                setEntityMetaState({
                    id: found.id,
                    title: found.name,
                    code: found.code,
                    slug: found.slug,
                    badge: found.level || 'REGIONAL',
                    logoUrl: found.logoUrl || null,
                    subtitle: `Regional Sub-Association [${found.code || ''}]`,
                    parentAssociationId: found.parentHierarchies?.[0]?.parentId || found.parentHierarchies?.[0]?.parent?.id,
                    parentAssociationName: found.parentHierarchies?.[0]?.parent?.name,
                });
            } else {
                let isMounted = true;
                api.getAssociation(entityId)
                    .then((assoc: any) => {
                        if (!isMounted || !assoc?.id) return;
                        setEntityMetaState({
                            id: assoc.id,
                            title: assoc.name,
                            code: assoc.code,
                            slug: assoc.slug,
                            badge: assoc.level || 'REGIONAL',
                            logoUrl: assoc.logoUrl || null,
                            subtitle: `Regional Sub-Association [${assoc.code || ''}]`,
                            parentAssociationId: assoc.parentHierarchies?.[0]?.parentId || assoc.parentHierarchies?.[0]?.parent?.id,
                            parentAssociationName: assoc.parentHierarchies?.[0]?.parent?.name,
                        });
                    })
                    .catch(() => {});
                return () => {
                    isMounted = false;
                };
            }
            return;
        }

        // 3. Club View (/club/[id]/...)
        if (activeView === 'club' && entityId) {
            if (isEntityMetaMatching(entityMeta, entityId)) {
                return;
            }

            let isMounted = true;
            api.getClub(entityId)
                .then((club: any) => {
                    if (!isMounted || !club?.id) return;
                    setEntityMetaState({
                        id: club.id,
                        title: club.name,
                        code: club.code,
                        slug: club.slug,
                        badge: 'CLUB',
                        logoUrl: club.logoUrl || null,
                        subtitle: club.city ? `${club.city} • Sports Club` : 'Sports Club',
                    });
                })
                .catch(() => {});
            return () => {
                isMounted = false;
            };
        }

        // 4. Tournament / Competition View (/competition/[id]/...)
        if (activeView === 'tournament' && entityId) {
            if (isEntityMetaMatching(entityMeta, entityId)) {
                return;
            }

            let isMounted = true;
            api.getCompetition(entityId)
                .then((comp: any) => {
                    if (!isMounted || !comp?.id) return;
                    setEntityMetaState({
                        id: comp.id,
                        title: comp.name,
                        code: comp.type,
                        badge: comp.type || 'TOURNAMENT',
                        subtitle: comp.description || 'Competition',
                        categories: comp.categories || [],
                    });
                })
                .catch(() => {});
            return () => {
                isMounted = false;
            };
        }

        // 5. System Administration View (/admin/...)
        if (activeView === 'admin') {
            if (entityMeta !== null) {
                setEntityMetaState(null);
            }
        }
    }, [activeView, entityId, associations, isContextAgnosticRoute, entityMeta, isEntityMetaMatching]);

    // Store active context when navigating entity pages
    useEffect(() => {
        if (!isContextAgnosticRoute) {
            lastContextRef.current = {
                activeView,
                entityId,
                entityMeta,
                returnPath: pathname,
            };
            try {
                sessionStorage.setItem(
                    'areena_last_view_context',
                    JSON.stringify({
                        activeView,
                        entityId,
                        entityMeta,
                        returnPath: pathname,
                    })
                );
            } catch {}
        }
    }, [isContextAgnosticRoute, activeView, entityId, entityMeta, pathname]);

    const setEntityMeta = useCallback(
        (meta: EntityMeta | null) => {
            setEntityMetaState(meta);
            if (meta) {
                lastContextRef.current.entityMeta = meta;
                try {
                    const stored = sessionStorage.getItem('areena_last_view_context');
                    const parsed = stored ? JSON.parse(stored) : {};
                    sessionStorage.setItem(
                        'areena_last_view_context',
                        JSON.stringify({
                            ...parsed,
                            entityMeta: meta,
                        })
                    );
                } catch {}
            }
        },
        []
    );

    useEffect(() => {
        const currentContextKey = `${activeView}:${entityId || 'main'}`;
        if (prevContextRef.current && prevContextRef.current !== currentContextKey) {
            setIsTransitioning(true);
            const timer = setTimeout(() => {
                setIsTransitioning(false);
            }, 450);
            prevContextRef.current = currentContextKey;
            return () => clearTimeout(timer);
        }
        prevContextRef.current = currentContextKey;
    }, [activeView, entityId]);

    const currentViewMeta = MAIN_VIEW_DEFINITIONS[activeView] || MAIN_VIEW_DEFINITIONS.association;

    // Effective entityMeta preserves last known entityMeta during profile/auth views
    const effectiveEntityMeta = entityMeta || (isContextAgnosticRoute ? lastContextRef.current.entityMeta : null);

    const headerTitle = useMemo(() => {
        if (activeView === 'association') {
            if (entityId && entityId !== 'main') {
                if (effectiveEntityMeta?.title) return effectiveEntityMeta.title;
                const assoc = associations.find((a: any) =>
                    a.id?.toLowerCase() === entityId.toLowerCase() ||
                    a.slug?.toLowerCase() === entityId.toLowerCase() ||
                    a.code?.toLowerCase() === entityId.toLowerCase()
                );
                if (assoc?.name) return assoc.name;
                return entityId.toUpperCase();
            }
            return mainAssoc?.name;
        }
        if (activeView === 'club') {
            return effectiveEntityMeta?.title;
        }
        if (activeView === 'tournament') {
            return effectiveEntityMeta?.title;
        }
        if (activeView === 'admin') {
            return 'Administration';
        }
        return '';
    }, [activeView, entityId, effectiveEntityMeta, mainAssoc, associations]);

    const headerBadge = useMemo(() => {
        if (activeView === 'association') {
            if (entityId && entityId !== 'main') {
                if (effectiveEntityMeta?.badge) return effectiveEntityMeta.badge;
                const assoc = associations.find((a: any) =>
                    a.id?.toLowerCase() === entityId.toLowerCase() ||
                    a.slug?.toLowerCase() === entityId.toLowerCase() ||
                    a.code?.toLowerCase() === entityId.toLowerCase()
                );
                if (assoc?.level) return assoc.level;
                return 'REGIONAL';
            }
            return mainAssoc?.level || 'NATIONAL';
        }
        if (activeView === 'club') {
            return effectiveEntityMeta?.badge || 'CLUB';
        }
        if (activeView === 'tournament') {
            return effectiveEntityMeta?.badge || 'TOURNAMENT';
        }
        if (activeView === 'admin') {
            return 'SYSTEM';
        }
        return effectiveEntityMeta?.badge || 'FEDERATION';
    }, [activeView, entityId, effectiveEntityMeta, mainAssoc, associations]);

    const headerLogoUrl = useMemo(() => {
        if (activeView === 'association') {
            if (!entityId || entityId === 'main') {
                return mainAssoc?.logoUrl || null;
            }
            if (effectiveEntityMeta?.logoUrl !== undefined) return effectiveEntityMeta.logoUrl;
            const assoc = associations.find((a: any) =>
                a.id?.toLowerCase() === entityId.toLowerCase() ||
                a.slug?.toLowerCase() === entityId.toLowerCase() ||
                a.code?.toLowerCase() === entityId.toLowerCase()
            );
            return assoc?.logoUrl || null;
        }
        if (activeView === 'club') {
            return effectiveEntityMeta?.logoUrl || null;
        }
        return null;
    }, [activeView, entityId, effectiveEntityMeta, mainAssoc, associations]);

    return (
        <MainViewContext.Provider
            value={{
                activeView,
                entityId,
                entityMeta: effectiveEntityMeta,
                setEntityMeta,
                currentViewMeta,
                isTransitioning,
                mainAssoc,
                associations,
                refetchAssociations: fetchAssociations,
                headerTitle,
                headerBadge,
                headerLogoUrl,
            }}
        >
            {children}
        </MainViewContext.Provider>
    );
}

export function useMainView() {
    const context = useContext(MainViewContext);
    if (!context) {
        throw new Error('useMainView must be used within a MainViewProvider');
    }
    return context;
}

