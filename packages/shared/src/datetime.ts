/**
 * Standard IANA Timezone constants and utilities for AREENA.
 */

export const DEFAULT_TIMEZONE = 'UTC';

export interface TimezoneOption {
    value: string;
    label: string;
    offsetName?: string;
}

/**
 * Formats a Date or ISO UTC string in a specific target timezone (e.g. Venue timezone).
 * Uses the native ECMAScript Intl API (no extra heavy libraries required).
 */
export function formatInTimezone(
    date: Date | string | number,
    timeZone: string = DEFAULT_TIMEZONE,
    options?: Intl.DateTimeFormatOptions,
    locale: string = 'en-GB'
): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
        timeZoneName: 'short',
    };

    try {
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options, timeZone }).format(d);
    } catch {
        // Fallback to UTC if timezone string is invalid
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options, timeZone: 'UTC' }).format(d);
    }
}

/**
 * Returns the short timezone abbreviation (e.g. 'CEST', 'CET', 'EST') for a given date and timezone.
 */
export function getTimezoneAbbreviation(
    date: Date | string | number = new Date(),
    timeZone: string = DEFAULT_TIMEZONE,
    locale: string = 'en-US'
): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    try {
        const parts = new Intl.DateTimeFormat(locale, {
            timeZone,
            timeZoneName: 'short',
        }).formatToParts(d);
        const tzPart = parts.find((p) => p.type === 'timeZoneName');
        return tzPart ? tzPart.value : timeZone;
    } catch {
        return timeZone;
    }
}

/**
 * Converts a venue/local datetime string (e.g. from <input type="datetime-local"> like "2026-09-15T14:30")
 * into a UTC ISO string ("2026-09-15T12:30:00.000Z"), interpreting the wall-clock time in the given target timezone.
 */
export function localInputToUtcIso(
    localInputString: string,
    targetTimezone: string = DEFAULT_TIMEZONE
): string {
    if (!localInputString) return '';

    // If already contains Z or offset, parse directly
    if (localInputString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(localInputString)) {
        return new Date(localInputString).toISOString();
    }

    // Match YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm
    const cleaned = localInputString.replace(' ', 'T');
    const [datePart, timePart = '00:00'] = cleaned.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);

    // Form an exact UTC candidate date first
    const utcCandidate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

    // Calculate the target timezone's wall-clock offset for this date
    const targetOffsetMinutes = getTimezoneOffsetMinutes(utcCandidate, targetTimezone);

    // Apply offset inverse to yield the exact UTC instant
    const realUtcInstant = new Date(utcCandidate.getTime() - targetOffsetMinutes * 60 * 1000);
    return realUtcInstant.toISOString();
}

/**
 * Converts a UTC Date or ISO string to the "YYYY-MM-DDTHH:mm" format expected by <input type="datetime-local">,
 * displaying the exact wall-clock time in the specified venue timezone.
 */
export function utcToLocalInputValue(
    utcDate: Date | string | number,
    targetTimezone: string = DEFAULT_TIMEZONE
): string {
    const d = typeof dateToValidDate(utcDate) === 'object' ? (dateToValidDate(utcDate) as Date) : new Date(utcDate);
    if (isNaN(d.getTime())) return '';

    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: targetTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(d);

    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}

/**
 * Formats a match schedule with dual context:
 * - Venue time (e.g. "14:00 CEST (Venue)")
 * - Viewer's user browser time (if different from venue)
 */
export function formatMatchSchedule(
    utcDate: Date | string | number,
    venueTimezone: string = DEFAULT_TIMEZONE,
    userTimezone?: string,
    locale: string = 'en-GB'
): { venueText: string; userText: string | null; isDifferentTimezone: boolean } {
    const d = typeof utcDate === 'string' || typeof utcDate === 'number' ? new Date(utcDate) : utcDate;
    if (isNaN(d.getTime())) {
        return { venueText: '', userText: null, isDifferentTimezone: false };
    }

    const browserTz = userTimezone || getUserBrowserTimezone();
    const isDifferent = Boolean(browserTz && browserTz.toLowerCase() !== venueTimezone.toLowerCase());

    const venueText = formatInTimezone(d, venueTimezone, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    }, locale);

    const userText = isDifferent
        ? formatInTimezone(d, browserTz, {
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
          }, locale)
        : null;

    return {
        venueText,
        userText,
        isDifferentTimezone: isDifferent,
    };
}

/**
 * Returns the viewer's browser IANA timezone (e.g. 'Europe/Zurich', 'America/New_York').
 */
export function getUserBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}

/* -------------------------------------------------------------------------- */
/*                               INTERNAL HELPERS                             */
/* -------------------------------------------------------------------------- */

function dateToValidDate(input: any): Date {
    return input instanceof Date ? input : new Date(input);
}

/**
 * Computes difference in minutes between UTC and a target IANA timezone at a specific instant.
 */
function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false,
        }).formatToParts(date);

        const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
        const asLocalInTz = Date.UTC(
            get('year'),
            get('month') - 1,
            get('day'),
            get('hour') === 24 ? 0 : get('hour'),
            get('minute'),
            get('second')
        );

        return Math.round((asLocalInTz - date.getTime()) / (60 * 1000));
    } catch {
        return 0;
    }
}

