'use client';

import React from 'react';
import { useTour, TourPersona } from '@/lib/tourContext';
import { useI18n } from '@/lib/i18nContext';
import { Modal } from '@/components/ui/Modal';
import { Trophy, Users, Building2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export function WelcomeOnboardingModal() {
    const { showWelcomeModal, closeWelcomeModal, startTour } = useTour();
    const { t } = useI18n();

    if (!showWelcomeModal) return null;

    const handleSelectPersona = (persona: TourPersona) => {
        startTour(persona);
    };

    return (
        <Modal
            isOpen={showWelcomeModal}
            onClose={closeWelcomeModal}
            title={t('tour.welcomeModal.title') || 'Welcome to AREENA! 👋'}
            subtitle={t('tour.welcomeModal.subtitle') || 'Let’s personalize your experience. Choose your primary focus for a quick 60-second walkthrough:'}
            icon={<Sparkles className="h-5 w-5 text-red-500" />}
            size="lg"
        >
            <div className="space-y-4 text-xs pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Persona 1: Athlete / Player */}
                    <button
                        type="button"
                        onClick={() => handleSelectPersona('PLAYER')}
                        className="group flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-red-500 dark:hover:border-red-500 hover:bg-white dark:hover:bg-slate-900 transition-all text-left shadow-xs hover:shadow-md"
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 group-hover:scale-105 transition-transform">
                                <Trophy className="h-4 w-4" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                Start <ArrowRight className="h-3 w-3" />
                            </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {t('tour.welcomeModal.playerRoleTitle') || 'Athlete / Player'}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {t('tour.welcomeModal.playerRoleDesc') || 'Track your live ELO rating, view your license card, and register for tournaments.'}
                        </p>
                    </button>

                    {/* Persona 2: Club Manager */}
                    <button
                        type="button"
                        onClick={() => handleSelectPersona('CLUB_MANAGER')}
                        className="group flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all text-left shadow-xs hover:shadow-md"
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                                <Users className="h-4 w-4" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                Start <ArrowRight className="h-3 w-3" />
                            </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {t('tour.welcomeModal.clubRoleTitle') || 'Club Official / Coach'}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {t('tour.welcomeModal.clubRoleDesc') || 'Manage athlete rosters, print QR claim slips, and register squads for league seasons.'}
                        </p>
                    </button>

                    {/* Persona 3: Tournament Director */}
                    <button
                        type="button"
                        onClick={() => handleSelectPersona('TOURNAMENT_DIRECTOR')}
                        className="group flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-white dark:hover:bg-slate-900 transition-all text-left shadow-xs hover:shadow-md"
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                                <Building2 className="h-4 w-4" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                Start <ArrowRight className="h-3 w-3" />
                            </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {t('tour.welcomeModal.directorRoleTitle') || 'Tournament Director'}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {t('tour.welcomeModal.directorRoleDesc') || 'Setup draw categories, manage multi-table live scoring, and callout matches.'}
                        </p>
                    </button>

                    {/* Persona 4: General Overview */}
                    <button
                        type="button"
                        onClick={() => handleSelectPersona('OVERVIEW')}
                        className="group flex flex-col items-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-white dark:hover:bg-slate-900 transition-all text-left shadow-xs hover:shadow-md"
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                                <Sparkles className="h-4 w-4" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                Start <ArrowRight className="h-3 w-3" />
                            </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {t('tour.welcomeModal.overviewTitle') || 'General Platform Overview'}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {t('tour.welcomeModal.overviewDesc') || 'A comprehensive tour of global search, workspace switching, and licensing.'}
                        </p>
                    </button>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                        💡 {t('tour.welcomeModal.hint') || 'You can restart this tutorial anytime from the top menu.'}
                    </span>
                    <button
                        type="button"
                        onClick={closeWelcomeModal}
                        className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition font-semibold"
                    >
                        {t('tour.welcomeModal.skip') || 'Skip for now'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

