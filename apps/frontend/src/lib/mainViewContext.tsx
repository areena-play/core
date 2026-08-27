'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Network, Trophy, Shield } from 'lucide-react';
import { useI18n } from './i18nContext';

export type MainViewType = 'association' | 'tournament' | 'club';

export interface EntityMeta {
    id: string;
    title: string;
    code?: string;
    subtitle?: string;
    badge?: string;
    parentAssociationId?: string;
    parentAssociationName?: string;
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
    },
};

interface MainViewContextType {
    activeView: MainViewType;
    entityId: string | null;
    entityMeta: EntityMeta | null;
    setEntityMeta: (meta: EntityMeta | null) => void;
    currentViewMeta: MainViewMeta;
    isTransitioning: boolean;
}

const MainViewContext = createContext<MainViewContextType | undefined>(undefined);

export function MainViewProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [entityMeta, setEntityMeta] = useState<EntityMeta | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevContextRef = useRef<string>('');

    // Determine active view & entity ID strictly from URL
    const { activeView, entityId } = useMemo(() => {
        if (pathname.startsWith('/tournament/')) {
            const parts = pathname.split('/');
            const id = parts[2] || null;
            return { activeView: 'tournament' as MainViewType, entityId: id };
        }
        if (pathname.startsWith('/club/')) {
            const parts = pathname.split('/');
            const id = parts[2] || null;
            return { activeView: 'club' as MainViewType, entityId: id };
        }
        if (pathname.startsWith('/association/')) {
            const parts = pathname.split('/');
            const id = parts[2] || null;
            return { activeView: 'association' as MainViewType, entityId: id };
        }
        return { activeView: 'association' as MainViewType, entityId: 'main' };
    }, [pathname]);

    // Trigger fullscreen loader when switching primary workspace context (e.g. from association to tournament, or between clubs)
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

    return (
        <MainViewContext.Provider
            value={{
                activeView,
                entityId,
                entityMeta,
                setEntityMeta,
                currentViewMeta,
                isTransitioning,
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
