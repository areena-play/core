export type SupportedLocale = 'en' | 'de' | 'fr' | 'it';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'de', 'fr', 'it'];

export interface LocaleInfo {
    code: SupportedLocale;
    label: string;
    nativeLabel: string;
    flag: string;
}

export const LOCALES: Record<SupportedLocale, LocaleInfo> = {
    en: {
        code: 'en',
        label: 'English',
        nativeLabel: 'English',
        flag: '🇬🇧',
    },
    de: {
        code: 'de',
        label: 'German',
        nativeLabel: 'Deutsch',
        flag: '🇩🇪',
    },
    fr: {
        code: 'fr',
        label: 'French',
        nativeLabel: 'Français',
        flag: '🇫🇷',
    },
    it: {
        code: 'it',
        label: 'Italian',
        nativeLabel: 'Italiano',
        flag: '🇮🇹',
    },
};

