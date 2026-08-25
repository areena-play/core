'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupportedLocale, SUPPORTED_LOCALES, LOCALES, LocaleInfo } from '@areena/shared';
import { translations } from './i18n';

interface I18nContextType {
    locale: SupportedLocale;
    setLocale: (locale: SupportedLocale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    locales: Record<SupportedLocale, LocaleInfo>;
    supportedLocales: SupportedLocale[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<SupportedLocale>('en');

    useEffect(() => {
        // Retrieve stored locale or browser locale
        const storedLocale = localStorage.getItem('areena_locale') as SupportedLocale;
        if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) {
            setLocaleState(storedLocale);
            document.documentElement.lang = storedLocale;
            return;
        }

        const browserLang = navigator.language.slice(0, 2).toLowerCase() as SupportedLocale;
        if (SUPPORTED_LOCALES.includes(browserLang)) {
            setLocaleState(browserLang);
            document.documentElement.lang = browserLang;
        }
    }, []);

    const setLocale = (newLocale: SupportedLocale) => {
        setLocaleState(newLocale);
        localStorage.setItem('areena_locale', newLocale);
        document.documentElement.lang = newLocale;
    };

    const t = (key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        const activeDict = translations[locale] || translations.en;
        const fallbackDict = translations.en;

        let val: any = activeDict;
        for (const k of keys) {
            if (val && typeof val === 'object' && k in val) {
                val = val[k];
            } else {
                val = undefined;
                break;
            }
        }

        // Fallback to English if key missing
        if (val === undefined) {
            let fallbackVal: any = fallbackDict;
            for (const k of keys) {
                if (fallbackVal && typeof fallbackVal === 'object' && k in fallbackVal) {
                    fallbackVal = fallbackVal[k];
                } else {
                    fallbackVal = undefined;
                    break;
                }
            }
            val = fallbackVal;
        }

        if (typeof val !== 'string') {
            return key; // return key as fallback
        }

        // Variable interpolation e.g. {name}
        if (params) {
            let interpolated = val;
            for (const [pKey, pVal] of Object.entries(params)) {
                interpolated = interpolated.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
            }
            return interpolated;
        }

        return val;
    };

    return (
        <I18nContext.Provider
            value={{
                locale,
                setLocale,
                t,
                locales: LOCALES,
                supportedLocales: SUPPORTED_LOCALES,
            }}
        >
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

