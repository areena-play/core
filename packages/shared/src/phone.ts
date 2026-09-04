import { parsePhoneNumberFromString, AsYouType, CountryCode, getCountryCallingCode, getCountries } from 'libphonenumber-js';

/**
 * Standard default country for phone number parsing when no country code prefix (+...) is provided.
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'CH';

/**
 * Standard fallback prioritized countries (Switzerland & adjacent DACH / neighbouring countries).
 */
export const DEFAULT_PRIORITIZED_COUNTRIES: CountryCode[] = ['CH', 'DE', 'FR', 'IT', 'AT', 'LI'];

export interface CountryPhoneOption {
    code: CountryCode;
    name: string;
    callingCode: string;
    flag: string;
}

/**
 * Converts a 2-letter ISO country code to its Unicode regional indicator flag emoji.
 */
export function getCountryFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    try {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map((char) => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    } catch {
        return '🌐';
    }
}

/**
 * Returns all ~245 world countries with international calling codes, localized names, and flags.
 */
export function getAllCountryPhoneOptions(locale: string = 'en'): CountryPhoneOption[] {
    let displayNames: Intl.DisplayNames | null = null;
    try {
        displayNames = new Intl.DisplayNames([locale, 'en'], { type: 'region' });
    } catch {}

    const allCodes = getCountries();
    const result: CountryPhoneOption[] = [];

    for (const code of allCodes) {
        try {
            const callingCode = `+${getCountryCallingCode(code)}`;
            const name = displayNames?.of(code) || code;
            result.push({
                code,
                name,
                callingCode,
                flag: getCountryFlagEmoji(code),
            });
        } catch {}
    }

    return result;
}

/**
 * Returns phone country options partitioned into Prioritized (on top, custom ordered) and Others (sorted A-Z).
 */
export function getSortedCountryPhoneOptions(
    prioritizedCodes: string[] = DEFAULT_PRIORITIZED_COUNTRIES,
    locale: string = 'en'
): { prioritized: CountryPhoneOption[]; others: CountryPhoneOption[]; all: CountryPhoneOption[] } {
    const all = getAllCountryPhoneOptions(locale);
    const upperPrioritized = (prioritizedCodes && prioritizedCodes.length > 0
        ? prioritizedCodes
        : DEFAULT_PRIORITIZED_COUNTRIES
    ).map((c) => c.toUpperCase());

    const prioritizedMap = new Map<string, CountryPhoneOption>();
    const others: CountryPhoneOption[] = [];

    for (const item of all) {
        if (upperPrioritized.includes(item.code)) {
            prioritizedMap.set(item.code, item);
        } else {
            others.push(item);
        }
    }

    const prioritized: CountryPhoneOption[] = [];
    for (const code of upperPrioritized) {
        const item = prioritizedMap.get(code);
        if (item) {
            prioritized.push(item);
        }
    }

    others.sort((a, b) => a.name.localeCompare(b.name, locale));

    return {
        prioritized,
        others,
        all: [...prioritized, ...others],
    };
}

/**
 * Curated default list of primary countries for legacy compatibility.
 */
export const POPULAR_COUNTRY_CODES: CountryPhoneOption[] = [
    { code: 'CH', name: 'Switzerland', callingCode: '+41', flag: '🇨🇭' },
    { code: 'DE', name: 'Germany', callingCode: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', callingCode: '+33', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', callingCode: '+39', flag: '🇮🇹' },
    { code: 'AT', name: 'Austria', callingCode: '+43', flag: '🇦🇹' },
    { code: 'LI', name: 'Liechtenstein', callingCode: '+423', flag: '🇱🇮' },
    { code: 'GB', name: 'United Kingdom', callingCode: '+44', flag: '🇬🇧' },
    { code: 'US', name: 'United States', callingCode: '+1', flag: '🇺🇸' },
    { code: 'ES', name: 'Spain', callingCode: '+34', flag: '🇪🇸' },
    { code: 'PT', name: 'Portugal', callingCode: '+351', flag: '🇵🇹' },
    { code: 'NL', name: 'Netherlands', callingCode: '+31', flag: '🇳🇱' },
    { code: 'BE', name: 'Belgium', callingCode: '+32', flag: '🇧🇪' },
    { code: 'PL', name: 'Poland', callingCode: '+48', flag: '🇵🇱' },
    { code: 'SE', name: 'Sweden', callingCode: '+46', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', callingCode: '+47', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', callingCode: '+45', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', callingCode: '+358', flag: '🇫🇮' },
    { code: 'CA', name: 'Canada', callingCode: '+1', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', callingCode: '+61', flag: '🇦🇺' },
    { code: 'JP', name: 'Japan', callingCode: '+81', flag: '🇯🇵' },
    { code: 'CN', name: 'China', callingCode: '+86', flag: '🇨🇳' },
    { code: 'IN', name: 'India', callingCode: '+91', flag: '🇮🇳' },
    { code: 'BR', name: 'Brazil', callingCode: '+55', flag: '🇧🇷' },
];

/**
 * Formats any phone number into a properly spaced international representation (e.g. "+41 79 123 45 67").
 * Accepts unformatted numbers (e.g. "+41791234567"), local formats ("079 123 45 67", "0791234567"), and raw strings.
 * Falls back to AsYouType or trimmed raw string if unparseable.
 */
export function formatPhoneNumber(
    raw: string | null | undefined,
    defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
    if (!raw) return '';
    const trimmed = String(raw).trim();
    if (!trimmed) return '';

    try {
        const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
        if (parsed) {
            return parsed.formatInternational();
        }
    } catch {}

    try {
        const formatted = new AsYouType(defaultCountry).input(trimmed);
        if (formatted) return formatted;
    } catch {}

    return trimmed;
}

/**
 * Normalizes a phone number to standard international format with proper spacing (e.g. "+41 79 123 45 67").
 * Accepts both local formats ("079 123 45 67") and international formats ("+41791234567", "0041 79...").
 * If parsing fails, returns the trimmed raw string or empty string if empty.
 */
export function normalizePhoneNumber(
    raw: string | null | undefined,
    defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
    return formatPhoneNumber(raw, defaultCountry);
}

/**
 * Formats a phone number in E.164 standard without spaces (e.g. "+41791234567").
 * Ideal for SMS gateways, telephony APIs, and compact DB indexing.
 */
export function toE164(
    raw: string | null | undefined,
    defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
        const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
        if (parsed && parsed.isValid()) {
            return parsed.number; // E.164: "+41791234567"
        }
    } catch {}

    return null;
}

/**
 * Checks whether a phone number is valid according to international phone numbering plans.
 */
export function isValidPhoneNumber(
    raw: string | null | undefined,
    defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): boolean {
    if (!raw) return false;
    const trimmed = raw.trim();
    if (!trimmed) return false;

    try {
        const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
        return Boolean(parsed && parsed.isValid());
    } catch {
        return false;
    }
}

/**
 * Live formats as the user types (e.g. 079123 -> "079 123").
 */
export function formatAsYouType(
    raw: string,
    defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
    if (!raw) return '';
    return new AsYouType(defaultCountry).input(raw);
}

/**
 * Deconstructs an existing phone number string into a matching country code and national number (properly spaced).
 */
export function extractCountryAndNationalNumber(
    raw: string | null | undefined,
    defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): { country: CountryCode; national: string } {
    if (!raw) return { country: defaultCountry, national: '' };
    const trimmed = raw.trim();
    if (!trimmed) return { country: defaultCountry, national: '' };

    try {
        const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
        if (parsed && parsed.country) {
            const intl = parsed.formatInternational();
            const callingCode = `+${parsed.countryCallingCode}`;
            const national = intl.startsWith(callingCode)
                ? intl.slice(callingCode.length).trim()
                : parsed.nationalNumber || '';

            return {
                country: parsed.country,
                national: national || parsed.nationalNumber || '',
            };
        }
    } catch {}

    return { country: defaultCountry, national: trimmed.replace(/^\+\d+\s*/, '') };
}

