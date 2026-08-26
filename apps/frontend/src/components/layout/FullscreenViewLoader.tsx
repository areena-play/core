'use client';

import React from 'react';
import Image from 'next/image';
import { useMainView } from '@/lib/mainViewContext';
import { useI18n } from '@/lib/i18nContext';
import { useTheme } from '@/lib/themeContext';
import { Loader2, Sparkles } from 'lucide-react';

export function FullscreenViewLoader() {
    const { isTransitioning, currentViewMeta, entityMeta } = useMainView();
    const { t } = useI18n();
    const { resolvedTheme } = useTheme();

    if (!isTransitioning) return null;

    const Icon = currentViewMeta.icon;
    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';
    const viewName = entityMeta?.title || t(currentViewMeta.labelKey);

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xl transition-all duration-300 animate-in fade-in"
            role="status"
            aria-live="polite"
        >
            {/* Ambient Glow Background Orb */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <div className="relative z-10 flex flex-col items-center max-w-sm sm:max-w-md w-full px-6 text-center space-y-6">
                {/* Brand Logo */}
                <div className="relative">
                    <div className="relative h-12 w-44 mx-auto">
                        <Image
                            key={logoSrc}
                            src={logoSrc}
                            alt="AREENA Logo"
                            fill
                            priority
                            className="object-contain drop-shadow-lg"
                        />
                    </div>
                </div>

                {/* Destination View Card */}
                <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/90 p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-center">
                        <div
                            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${currentViewMeta.gradientBg} shadow-lg shadow-red-500/20 text-white animate-bounce duration-1000`}
                        >
                            <Icon className="h-8 w-8" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-800/50">
                            <Sparkles className="h-3 w-3 text-red-400" />
                            <span>{entityMeta?.badge || t(currentViewMeta.badgeKey)}</span>
                        </div>

                        <h2 className="text-xl font-extrabold text-white tracking-tight line-clamp-1">
                            {t('mainViews.switchingTo', { view: viewName })}
                        </h2>

                        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed line-clamp-2">
                            {entityMeta?.subtitle || t(currentViewMeta.descKey)}
                        </p>
                    </div>

                    {/* Progress Bar & Spinner */}
                    <div className="pt-2 space-y-2">
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 h-1.5 rounded-full animate-[progress_1s_ease-in-out_infinite]" />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                            <span>{t('mainViews.loadingWorkspace')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
