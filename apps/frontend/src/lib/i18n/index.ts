import { SupportedLocale } from '@areena/shared';
import { en, TranslationDictionary } from './translations/en';
import { de } from './translations/de';
import { fr } from './translations/fr';
import { it } from './translations/it';

export const translations: Record<SupportedLocale, TranslationDictionary> = {
    en,
    de,
    fr,
    it,
};

export * from './translations/en';

