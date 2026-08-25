export type SupportedLocale = 'en' | 'de' | 'fr' | 'it';
export declare const SUPPORTED_LOCALES: SupportedLocale[];
export interface LocaleInfo {
    code: SupportedLocale;
    label: string;
    nativeLabel: string;
    flag: string;
}
export declare const LOCALES: Record<SupportedLocale, LocaleInfo>;
//# sourceMappingURL=i18n.d.ts.map