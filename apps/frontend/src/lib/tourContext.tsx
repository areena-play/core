'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './authContext';
import { useI18n } from './i18nContext';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
    targetSelector: string; // e.g. '[data-tour="workspace-switcher"]'
    title: string;
    content: string;
    placement?: TourPlacement;
    actionLabel?: string;
    onBeforeStep?: () => void | Promise<void>;
}

export type TourPersona = 'OVERVIEW' | 'PLAYER' | 'CLUB_MANAGER' | 'TOURNAMENT_DIRECTOR';

interface TourContextType {
    isActive: boolean;
    currentStepIndex: number;
    activePersona: TourPersona | null;
    steps: TourStep[];
    currentStep: TourStep | null;
    startTour: (persona?: TourPersona, customSteps?: TourStep[]) => void;
    nextStep: () => void;
    prevStep: () => void;
    endTour: () => void;
    showWelcomeModal: boolean;
    openWelcomeModal: () => void;
    closeWelcomeModal: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

const STORAGE_KEY = 'areena_tour_completed_v1';
const WELCOME_SEEN_KEY = 'areena_welcome_seen_v1';

export function TourProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();

    const [isActive, setIsActive] = useState(false);
    const [steps, setSteps] = useState<TourStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [activePersona, setActivePersona] = useState<TourPersona | null>(null);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // Built-in Tour Presets
    const getTourSteps = useCallback((persona: TourPersona): TourStep[] => {
        switch (persona) {
            case 'PLAYER':
                return [
                    {
                        targetSelector: '[data-tour="brand-logo"]',
                        title: t('tour.player.welcomeTitle') || 'Welcome, Athlete!',
                        content: t('tour.player.welcomeDesc') || 'AREENA is your home for match history, live ELO ratings, and official federation licenses.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="nav-licenses"]',
                        title: t('tour.player.licenseTitle') || 'Official Player Licenses',
                        content: t('tour.player.licenseDesc') || 'View your active seasonal licenses, digital competition pass, and required course refreshers.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="nav-competitions"]',
                        title: t('tour.player.competitionsTitle') || 'Tournaments & Leagues',
                        content: t('tour.player.competitionsDesc') || 'Browse upcoming tournaments, inspect live categories, and register with one click.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="global-search"]',
                        title: t('tour.player.searchTitle') || 'Global Player & Club Search',
                        content: t('tour.player.searchDesc') || 'Look up any player to view head-to-head records, ranking positions, or club rosters.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="user-menu"]',
                        title: t('tour.player.profileTitle') || 'Your Profile & Family Manager',
                        content: t('tour.player.profileDesc') || 'Manage your account settings, dark mode, and delegate permissions for junior athletes.',
                        placement: 'bottom',
                    },
                ];

            case 'CLUB_MANAGER':
                return [
                    {
                        targetSelector: '[data-tour="workspace-switcher"]',
                        title: t('tour.club.workspaceTitle') || 'Workspace Switcher',
                        content: t('tour.club.workspaceDesc') || 'Switch directly between your Club Management portal, Federation governance, and Tournament workspaces.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="nav-clubs"]',
                        title: t('tour.club.rosterTitle') || 'Club Roster & Licenses',
                        content: t('tour.club.rosterDesc') || 'Manage your athletes, issue printable QR claim slips for new players, and order team passes.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="nav-competitions"]',
                        title: t('tour.club.teamsTitle') || 'Team Registrations',
                        content: t('tour.club.teamsDesc') || 'Register your club squads into official seasonal leagues and regional championships.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="user-menu"]',
                        title: t('tour.club.settingsTitle') || 'Club Settings & Billing',
                        content: t('tour.club.settingsDesc') || 'Manage club administrators, membership invoices, and Bexio accounting sync.',
                        placement: 'bottom',
                    },
                ];

            case 'TOURNAMENT_DIRECTOR':
                return [
                    {
                        targetSelector: '[data-tour="workspace-switcher"]',
                        title: t('tour.director.workspaceTitle') || 'Tournament Control Center',
                        content: t('tour.director.workspaceDesc') || 'Open any tournament in the Tournament Workspace for full live operational control.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="nav-competitions"]',
                        title: t('tour.director.hubTitle') || 'Tournament Hub',
                        content: t('tour.director.hubDesc') || 'Create new events, configure Knockout/Swiss/Mexicana brackets, and publish entries.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="global-search"]',
                        title: t('tour.director.liveDeskTitle') || 'Live Court & Table Manager',
                        content: t('tour.director.liveDeskDesc') || 'Dispatch matches to free tables asynchronously, trigger speaker calls, and monitor live scorecards.',
                        placement: 'bottom',
                    },
                ];

            case 'OVERVIEW':
            default:
                return [
                    {
                        targetSelector: '[data-tour="brand-logo"]',
                        title: t('tour.overview.logoTitle') || 'Welcome to AREENA',
                        content: t('tour.overview.logoDesc') || 'Your unified sports platform for federation governance, leagues, live scoring, and athlete ratings.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="workspace-switcher"]',
                        title: t('tour.overview.workspaceTitle') || 'Four Dedicated Workspaces',
                        content: t('tour.overview.workspaceDesc') || 'Effortlessly switch between Federation Governance, Tournament Live Desks, Club Portals, and System Admin.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="global-search"]',
                        title: t('tour.overview.searchTitle') || 'Instant Global Search',
                        content: t('tour.overview.searchDesc') || 'Press Ctrl+K or click here anytime to find players, clubs, tournaments, or license passes instantly.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="nav-competitions"]',
                        title: t('tour.overview.competitionsTitle') || 'Tournaments & Live Scoring',
                        content: t('tour.overview.competitionsDesc') || 'Explore all active leagues, draws, live court feeds, and historical results.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="nav-licenses"]',
                        title: t('tour.overview.licensesTitle') || 'Licensing & Education',
                        content: t('tour.overview.licensesDesc') || 'Official player licenses, coach accreditations, and referee refresher courses.',
                        placement: 'bottom',
                    },
                    {
                        targetSelector: '[data-tour="user-menu"]',
                        title: t('tour.overview.menuTitle') || 'User Profile & Preferences',
                        content: t('tour.overview.menuDesc') || 'Manage your account, language (DE/EN/FR/IT), dark mode theme, and family dependents.',
                        placement: 'bottom',
                    },
                ];
        }
    }, [t]);

    // Check if new user should see the welcome modal
    useEffect(() => {
        if (!authLoading && user && typeof window !== 'undefined') {
            const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);
            if (!hasSeenWelcome) {
                setShowWelcomeModal(true);
            }
        }
    }, [user, authLoading]);

    const startTour = useCallback((persona: TourPersona = 'OVERVIEW', customSteps?: TourStep[]) => {
        setShowWelcomeModal(false);
        const resolvedSteps = customSteps && customSteps.length > 0 ? customSteps : getTourSteps(persona);
        setSteps(resolvedSteps);
        setCurrentStepIndex(0);
        setActivePersona(persona);
        setIsActive(true);
        if (typeof window !== 'undefined') {
            localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        }
    }, [getTourSteps]);

    const endTour = useCallback(() => {
        setIsActive(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, 'true');
            localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        }
    }, []);

    const nextStep = useCallback(() => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
        } else {
            endTour();
        }
    }, [currentStepIndex, steps.length, endTour]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1);
        }
    }, [currentStepIndex]);

    const openWelcomeModal = useCallback(() => {
        setShowWelcomeModal(true);
    }, []);

    const closeWelcomeModal = useCallback(() => {
        setShowWelcomeModal(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        }
    }, []);

    const currentStep = isActive && steps[currentStepIndex] ? steps[currentStepIndex] : null;

    return (
        <TourContext.Provider
            value={{
                isActive,
                currentStepIndex,
                activePersona,
                steps,
                currentStep,
                startTour,
                nextStep,
                prevStep,
                endTour,
                showWelcomeModal,
                openWelcomeModal,
                closeWelcomeModal,
            }}
        >
            {children}
        </TourContext.Provider>
    );
}

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};

