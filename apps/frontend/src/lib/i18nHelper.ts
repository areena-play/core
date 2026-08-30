/**
 * Helper to retrieve localized text from an i18n dictionary map (e.g. { en: '...', de: '...', fr: '...', it: '...' })
 * with fallback to the default language or raw fallback string.
 */
export function getLocalizedValue(
    i18nMap?: Record<string, string> | null | any,
    fallback: string = '',
    locale: string = 'en',
): string {
    if (i18nMap && typeof i18nMap === 'object') {
        if (i18nMap[locale] && typeof i18nMap[locale] === 'string' && i18nMap[locale].trim() !== '') {
            return i18nMap[locale];
        }
        if (i18nMap.en && typeof i18nMap.en === 'string' && i18nMap.en.trim() !== '') {
            return i18nMap.en;
        }
        // Fallback to first available non-empty translation
        for (const key of Object.keys(i18nMap)) {
            if (typeof i18nMap[key] === 'string' && i18nMap[key].trim() !== '') {
                return i18nMap[key];
            }
        }
    }
    return fallback || '';
}

