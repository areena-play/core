/**
 * Resolves the canonical public base URL for the hosted federation instance.
 */
export function getSiteBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_BASE_URL || `https://${process.env.DOMAIN_NAME}`;
}