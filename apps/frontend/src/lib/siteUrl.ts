/**
 * Resolves the canonical public base URL for the hosted federation instance.
 * Supports DOMAIN_NAME, NEXT_PUBLIC_DOMAIN_NAME, NEXT_PUBLIC_APP_URL, or VERCEL_URL.
 */
export function getSiteBaseUrl(): string {
    const rawDomain =
        process.env.DOMAIN_NAME ||
        process.env.NEXT_PUBLIC_DOMAIN_NAME ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.VERCEL_URL;

    if (rawDomain && rawDomain.trim() && rawDomain !== 'localhost') {
        const cleaned = rawDomain.trim().replace(/\/$/, '');
        return cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
    }

    return 'https://areena.ch';
}