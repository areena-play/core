'use client';

import { confirm, prompt } from '@/lib/dialog';
import { loader } from '@/lib/loader';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api';
import { translations } from '@/lib/i18n';
import {
    SupportedLocale,
    SUPPORTED_LOCALES,
    DEFAULT_TIMEZONE,
    formatInTimezone,
    getTimezoneAbbreviation,
    localInputToUtcIso,
    utcToLocalInputValue,
    formatMatchSchedule,
    getUserBrowserTimezone,
} from '@areena/shared';

/**
 * Global AREENA Developer Cockpit & Utility Toolkit.
 * Accessible in the browser console via `areena` or `window.areena`.
 */
export const areena = {
    // 1. Version Information
    version: process.env.NEXT_PUBLIC_APP_VERSION!,

    // 2. Interactive Dialogs, Loaders & Notifications
    confirm,
    prompt,
    loader,
    toast,

    // 3. Backend API Client
    api,

    // 4. Internationalization & Translations
    i18n: {
        getSupportedLocales: () => SUPPORTED_LOCALES,
        getCurrentLocale: (): SupportedLocale => {
            if (typeof window === 'undefined') return 'en';
            return (localStorage.getItem('areena_locale') as SupportedLocale) || 'en';
        },
        setLocale: (locale: SupportedLocale) => {
            if (typeof window === 'undefined') return;
            if (!SUPPORTED_LOCALES.includes(locale)) {
                console.warn(`[areena] Unsupported locale "${locale}". Supported:`, SUPPORTED_LOCALES);
                return;
            }
            localStorage.setItem('areena_locale', locale);
            document.documentElement.lang = locale;
            window.location.reload();
        },
        t: (key: string, locale?: SupportedLocale): string => {
            const loc = locale || areena.i18n.getCurrentLocale();
            const dict = (translations as any)[loc] || translations.en;
            const parts = key.split('.');
            let curr = dict;
            for (const p of parts) {
                if (curr && typeof curr === 'object' && p in curr) {
                    curr = curr[p];
                } else {
                    return key;
                }
            }
            return typeof curr === 'string' ? curr : key;
        },
    },

    // Shorthand for translation lookup
    t: (key: string, locale?: SupportedLocale) => areena.i18n.t(key, locale),

    // 5. Auth & Session Inspection
    auth: {
        getToken: () => {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem('areena_token');
        },
        getUser: () => {
            if (typeof window === 'undefined') return null;
            const u = localStorage.getItem('areena_user');
            return u ? JSON.parse(u) : null;
        },
        logout: () => {
            if (typeof window === 'undefined') return;
            localStorage.removeItem('areena_token');
            localStorage.removeItem('areena_user');
            window.location.href = '/login';
        },
    },

    // 6. Theme Switching
    theme: {
        get: () => {
            if (typeof window === 'undefined') return 'dark';
            return localStorage.getItem('areena_theme') || 'dark';
        },
        set: (theme: 'dark' | 'light' | 'system') => {
            if (typeof window === 'undefined') return;
            localStorage.setItem('areena_theme', theme);
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else if (theme === 'light') {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            } else {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.classList.toggle('dark', isDark);
                document.documentElement.classList.toggle('light', !isDark);
            }
        },
    },

    // 7. Multi-Timezone Utilities
    datetime: {
        DEFAULT: DEFAULT_TIMEZONE,
        getUserBrowserTimezone,
        formatInTimezone,
        getTimezoneAbbreviation,
        localInputToUtcIso,
        utcToLocalInputValue,
        formatMatchSchedule,
    },
};

declare global {
    interface Window {
        areena: typeof areena;
    }
}

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).areena = areena;
}
