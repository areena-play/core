import { parsePhoneNumberFromString, AsYouType, CountryCode, getCountryCallingCode } from 'libphonenumber-js';

/**
 * Standard default country for phone number parsing when no country code prefix (+...) is provided.
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'CH';

export interface CountryPhoneOption {
    code: CountryCode;
    name: string;
    callingCode: string;
    flag: string;
}

/**
 * Curated list of primary countries (Switzerland & neighbours first, followed by others).
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
 * Normalizes a phone number to standard international format (e.g. "+41 79 123 45 67").
 * Accepts both local formats ("079 123 45 67") and international formats ("+41791234567", "0041 79...").
 * If parsing fails, returns the trimmed raw string or empty string if empty.
 */
export function normalizePhoneNumber(
    raw: string | null | undefined,
    defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';

    try {
        const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
        if (parsed && parsed.isValid()) {
            return parsed.formatInternational();
        }
    } catch {}

    return trimmed;
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
 * Deconstructs an existing phone number string into a matching country code and national number.
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
            return {
                country: parsed.country,
                national: parsed.nationalNumber || '',
            };
        }
    } catch {}

    return { country: defaultCountry, national: trimmed.replace(/^\+\d+\s*/, '') };
}
