'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupportedLocale, SUPPORTED_LOCALES, LOCALES, LocaleInfo } from '@areena/shared';
import { translations } from './i18n';

export type TranslationParams = Record<string, any>;

interface I18nContextType {
    locale: SupportedLocale;
    setLocale: (locale: SupportedLocale) => void;
    t: (key: string, params?: TranslationParams, defaultValue?: string) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
    locales: Record<SupportedLocale, LocaleInfo>;
    supportedLocales: SupportedLocale[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function resolveNestedKey(obj: any, path: string): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    const keys = path.split('.');
    let current: any = obj;
    for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
            current = current[k];
        } else {
            return undefined;
        }
    }
    return typeof current === 'string' ? current : undefined;
}

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

    const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
        try {
            return new Intl.NumberFormat(locale, options).format(value);
        } catch {
            return String(value);
        }
    };

    const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
        try {
            const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
            return new Intl.DateTimeFormat(locale, options).format(d);
        } catch {
            return String(date);
        }
    };

    const t = (key: string, params?: TranslationParams, defaultValue?: string): string => {
        const activeDict = translations[locale] || translations.en;
        const fallbackDict = translations.en;

        let template: string | undefined;

        // 1. Context check (e.g. context: 'coach', context: 'female')
        if (params && params.context) {
            const contextKey = `${key}_${params.context}`;
            template = resolveNestedKey(activeDict, contextKey) || resolveNestedKey(fallbackDict, contextKey);
        }

        // 2. Pluralization check (e.g. count: 0, count: 1, count: 5)
        if (!template && params && typeof params.count === 'number') {
            const count = params.count;
            let pluralKey: string | undefined;
            if (count === 0) {
                pluralKey = `${key}_zero`;
            } else if (count === 1) {
                pluralKey = `${key}_one`;
            } else {
                pluralKey = `${key}_other`;
            }

            if (pluralKey) {
                template = resolveNestedKey(activeDict, pluralKey) || resolveNestedKey(fallbackDict, pluralKey);
            }
        }

        // 3. Direct Key Resolution
        if (!template) {
            template = resolveNestedKey(activeDict, key) || resolveNestedKey(fallbackDict, key);
        }

        // 4. Default value fallback
        if (!template) {
            template = defaultValue !== undefined ? defaultValue : key;
        }

        if (typeof template !== 'string') {
            return String(template ?? key);
        }

        // 5. Interpolate context variables
        if (params && typeof params === 'object') {
            // Replace {{var}}, {var}, %{var}, and :var patterns
            return template.replace(/(?:\{\{|\{|\%\{|:)([a-zA-Z0-9_]+)(?:\}\}|\})?/g, (match, varName) => {
                if (varName in params) {
                    const val = params[varName];
                    if (val === null || val === undefined) return '';
                    if (typeof val === 'number') {
                        return formatNumber(val);
                    }
                    if (val instanceof Date) {
                        return formatDate(val);
                    }
                    return String(val);
                }
                return match;
            });
        }

        return template;
    };

    return (
        <I18nContext.Provider
            value={{
                locale,
                setLocale,
                t,
                formatNumber,
                formatDate,
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
