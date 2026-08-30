'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18nContext';
import {
    Cookie,
    Sliders,
    X,
    ChevronDown,
    ChevronUp,
    Lock,
    BarChart3,
    Settings,
} from 'lucide-react';

const CONSENT_STORAGE_KEY = 'areena_cookie_consent_v1';

export interface CookiePreferences {
    essential: boolean;
    analytics: boolean;
    preferences: boolean;
    timestamp: string;
}

export function CookieConsentBanner() {
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);

    // Consent preferences state
    const [analytics, setAnalytics] = useState(false);
    const [preferences, setPreferences] = useState(true);

    useEffect(() => {
        setMounted(true);

        // Check if consent was already given
        try {
            const saved = localStorage.getItem(CONSENT_STORAGE_KEY);
            if (!saved) {
                // Delay banner slightly for seamless page entrance
                const timer = setTimeout(() => setIsOpen(true), 600);
                return () => clearTimeout(timer);
            } else {
                const parsed: CookiePreferences = JSON.parse(saved);
                setAnalytics(!!parsed.analytics);
                setPreferences(!!parsed.preferences);
            }
        } catch (e) {
            setIsOpen(true);
        }
    }, []);

    // Listen for custom event from sidebar / mobile navigation footer
    useEffect(() => {
        const handleOpenSettings = () => {
            setIsCustomizing(true);
            setIsOpen(true);
        };

        window.addEventListener('areena:open-cookie-settings', handleOpenSettings);
        return () => window.removeEventListener('areena:open-cookie-settings', handleOpenSettings);
    }, []);

    const saveConsent = (analyticsVal: boolean, preferencesVal: boolean) => {
        const consentData: CookiePreferences = {
            essential: true,
            analytics: analyticsVal,
            preferences: preferencesVal,
            timestamp: new Date().toISOString(),
        };

        try {
            localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
        } catch (e) {
            console.error('Failed to save cookie consent to localStorage', e);
        }

        setAnalytics(analyticsVal);
        setPreferences(preferencesVal);
        setIsOpen(false);
        setIsCustomizing(false);
    };

    const handleAcceptAll = () => {
        saveConsent(true, true);
    };

    const handleEssentialOnly = () => {
        saveConsent(false, false);
    };

    const handleSaveCustom = () => {
        saveConsent(analytics, preferences);
    };

    if (!mounted || !isOpen) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-5 flex justify-center pointer-events-none animate-in slide-in-from-bottom duration-300">
            {/* Inverted Color Scheme Banner Card:
                - Light Site Mode -> Dark slate card (bg-slate-900 text-white)
                - Dark Site Mode  -> Crisp light card (dark:bg-white dark:text-slate-900)
                Never blends into the background (no dark-on-dark or light-on-light).
            */}
            <div className="w-full max-w-3xl pointer-events-auto rounded-2xl border-2 border-slate-700/80 bg-slate-900 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.6)] dark:border-slate-300 dark:bg-white dark:text-slate-900 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden text-xs transition-all">
                {/* Top Accent Gradient Bar */}
                <div className="h-1 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

                <div className="p-5 sm:p-6 space-y-4">
                    {/* Header & Main Info */}
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 text-amber-500 border border-amber-500/30 shadow-xs">
                            <Cookie className="h-5 w-5 text-amber-400 dark:text-amber-600" />
                        </div>

                        <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-white dark:text-slate-900 flex items-center gap-2">
                                    <span>{t('cookieConsent.title')}</span>
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 dark:text-emerald-700 dark:bg-emerald-50 dark:border-emerald-300 px-2 py-0.5 rounded">
                                        DSGVO / DSG
                                    </span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleEssentialOnly}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-900 dark:hover:bg-slate-100 transition"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <p className="text-slate-300 dark:text-slate-600 leading-relaxed text-xs">
                                {t('cookieConsent.description')}{' '}
                                <Link
                                    href="/data-protection"
                                    className="text-red-400 dark:text-red-600 font-bold hover:underline"
                                >
                                    {t('cookieConsent.privacyPolicy')}
                                </Link>{' '}
                                •{' '}
                                <Link
                                    href="/impressum"
                                    className="text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-900 font-medium hover:underline"
                                >
                                    {t('cookieConsent.impressum')}
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Detailed Category Settings (Collapsible) */}
                    {isCustomizing && (
                        <div className="space-y-3 pt-3 border-t border-slate-800 dark:border-slate-200 animate-in fade-in duration-200">
                            {/* 1. Essential */}
                            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-800 bg-slate-800/80 dark:border-slate-200 dark:bg-slate-50">
                                <div className="flex items-start gap-2.5">
                                    <Lock className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <div className="font-bold text-white dark:text-slate-900 text-xs">
                                            {t('cookieConsent.essentialTitle')}
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                                            {t('cookieConsent.essentialDesc')}
                                        </p>
                                    </div>
                                </div>
                                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/50 dark:bg-emerald-100 dark:text-emerald-800 dark:border-emerald-300">
                                    {t('cookieConsent.essentialBadge')}
                                </span>
                            </div>

                            {/* 2. Preferences / Functional */}
                            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-800 bg-slate-800/80 dark:border-slate-200 dark:bg-slate-50">
                                <div className="flex items-start gap-2.5">
                                    <Settings className="h-4 w-4 text-blue-400 dark:text-blue-600 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <div className="font-bold text-white dark:text-slate-900 text-xs">
                                            {t('cookieConsent.preferencesTitle')}
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                                            {t('cookieConsent.preferencesDesc')}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={preferences}
                                        onChange={(e) => setPreferences(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-700 dark:bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>

                            {/* 3. Analytics */}
                            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-800 bg-slate-800/80 dark:border-slate-200 dark:bg-slate-50">
                                <div className="flex items-start gap-2.5">
                                    <BarChart3 className="h-4 w-4 text-amber-400 dark:text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <div className="font-bold text-white dark:text-slate-900 text-xs">
                                            {t('cookieConsent.analyticsTitle')}
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                                            {t('cookieConsent.analyticsDesc')}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={analytics}
                                        onChange={(e) => setAnalytics(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-700 dark:bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCustomizing(!isCustomizing)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white dark:text-slate-600 dark:hover:text-slate-900 transition"
                        >
                            <Sliders className="h-3.5 w-3.5 text-red-500" />
                            <span>
                                {isCustomizing ? t('common.close') : t('cookieConsent.customize')}
                            </span>
                            {isCustomizing ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                            )}
                        </button>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            {isCustomizing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleEssentialOnly}
                                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-800 dark:hover:bg-slate-200 font-semibold transition active:scale-95"
                                    >
                                        {t('cookieConsent.rejectOptional')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveCustom}
                                        className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold transition shadow-md shadow-red-600/30 active:scale-95"
                                    >
                                        {t('cookieConsent.savePreferences')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleEssentialOnly}
                                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-800 dark:hover:bg-slate-200 font-semibold transition active:scale-95"
                                    >
                                        {t('cookieConsent.rejectOptional')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAcceptAll}
                                        className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold transition shadow-md shadow-red-600/30 active:scale-95"
                                    >
                                        {t('cookieConsent.acceptAll')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
