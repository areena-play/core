export interface ManifestData {
    name: string;
    short_name: string;
    description: string;
    start_url: string;
    display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
    orientation: 'portrait-primary' | 'any' | 'natural' | 'landscape';
    background_color: string;
    theme_color: string;
    icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose?: string;
    }>;
    shortcuts: Array<{
        name: string;
        short_name: string;
        description?: string;
        url: string;
        icons?: Array<{ src: string; sizes: string }>;
    }>;
    categories: string[];
}

export async function getDynamicManifestData(): Promise<ManifestData> {
    let prefix = '';
    let associationFullName = '';

    try {
        const backendBase =
            process.env.BACKEND_INTERNAL_URL ||
            process.env.BACKEND_URL ||
            (process.env.BACKEND_PORT ? `http://127.0.0.1:${process.env.BACKEND_PORT}` : 'http://127.0.0.1:4000');

        const res = await fetch(`${backendBase}/associations?top=true`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });

        if (res.ok) {
            const data = await res.json();
            prefix = (data.shortName || data.code || '').trim();
            associationFullName = (data.name || '').trim();
        }
    } catch {
        // Fallback gracefully if backend is offline or starting up
    }

    const appName = prefix ? `${prefix} AREENA` : 'AREENA';
    const appDescription = associationFullName
        ? `${associationFullName} (${prefix}) – Official Tournament, League & Live Scoring Platform`
        : 'Next-generation sports federation, tournament, league, and live scoring platform.';

    return {
        name: appName,
        short_name: appName,
        description: appDescription,
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0b0f19',
        theme_color: '#dc2626',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
            {
                src: '/favicon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'maskable',
            },
            {
                src: '/areena-logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
        shortcuts: [
            {
                name: 'Live Competitions',
                short_name: 'Live',
                description: 'View active tournaments and live match tickers',
                url: '/competitions',
                icons: [{ src: '/icon.svg', sizes: 'any' }],
            },
            {
                name: 'Player Search & ELO',
                short_name: 'Players',
                description: 'Look up player rankings and head-to-head records',
                url: '/search',
                icons: [{ src: '/icon.svg', sizes: 'any' }],
            },
            {
                name: 'Events Schedule',
                short_name: 'Calendar',
                description: 'Browse upcoming tournaments and matches',
                url: '/calendar',
                icons: [{ src: '/icon.svg', sizes: 'any' }],
            },
            {
                name: 'My Profile & License',
                short_name: 'Passport',
                description: 'View your digital license card and match history',
                url: '/profile',
                icons: [{ src: '/icon.svg', sizes: 'any' }],
            },
        ],
        categories: ['sports', 'productivity', 'utilities'],
    };
}
