import type { Metadata } from 'next';
import { getSiteBaseUrl } from './siteUrl';

/**
 * Unified descriptor for a Competition entity
 */
export function getCompetitionSeoData(comp: any) {
    if (!comp) {
        return {
            title: 'Competition & Live Draw',
            description: 'Tournament management, draw brackets, match schedules, and live scoring on AREENA.',
            typeLabel: 'Tournament',
            location: undefined,
            startDate: undefined,
            endDate: undefined,
            organizerName: undefined,
            canonicalUrl: `${getSiteBaseUrl()}/competitions`,
        };
    }

    const name = comp.name || 'Competition';
    const typeLabel = comp.type === 'league' ? 'League' : 'Tournament';
    const assocName = comp.association?.name ? ` • ${comp.association.name}` : '';
    const description =
        comp.description ||
        `Official ${typeLabel}${assocName}. View live draw brackets, match schedules, participant lists, and results on AREENA.`;

    const canonicalUrl = `${getSiteBaseUrl()}/competition/${comp.id}`;

    return {
        title: `${name} – ${typeLabel} & Live Results`,
        pureTitle: name,
        description,
        typeLabel,
        location: comp.location || undefined,
        startDate: comp.startDate || undefined,
        endDate: comp.endDate || undefined,
        organizerName: comp.association?.name || undefined,
        canonicalUrl,
    };
}

/**
 * Unified descriptor for a Person (User / Player) entity
 */
export function getPersonSeoData(person: any) {
    if (!person) {
        return {
            title: 'Person Profile',
            description: 'Player profile, license credentials, and rankings on AREENA.',
            fullName: 'Player',
            canonicalUrl: `${getSiteBaseUrl()}/people`,
        };
    }

    const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Player Profile';
    const licenseInfo = person.licenseId ? ` (License: ${person.licenseId})` : '';
    const cityInfo = person.city ? ` from ${person.city}` : '';
    const description = `${fullName}${licenseInfo}${cityInfo} – Official Player Profile, ELO Rating (${person.eloPoints || 1000} pts), and verified licenses on AREENA.`;

    const identifier = person.licenseId || person.id;
    const canonicalUrl = `${getSiteBaseUrl()}/people/${identifier}`;

    return {
        title: `${fullName} | Player Profile`,
        pureTitle: fullName,
        description,
        fullName,
        identifier,
        city: person.city || undefined,
        country: person.country || 'CH',
        avatarUrl: person.avatarUrl || undefined,
        canonicalUrl,
    };
}

/**
 * Unified descriptor for a Club entity
 */
export function getClubSeoData(club: any) {
    if (!club) {
        return {
            title: 'Club Overview',
            description: 'Sports club details, venues, and team rosters on AREENA.',
            name: 'Club',
            canonicalUrl: `${getSiteBaseUrl()}/clubs`,
        };
    }

    const name = club.name || 'Sports Club';
    const codeInfo = club.code ? ` (${club.code})` : '';
    const cityInfo = club.city ? ` in ${club.city}` : '';
    const description = `${name}${codeInfo}${cityInfo} – Official Club Profile, active teams, home venues, and club members on AREENA.`;

    const canonicalUrl = `${getSiteBaseUrl()}/club/${club.id}`;

    return {
        title: `${name} | Sports Club`,
        pureTitle: name,
        description,
        name,
        code: club.code || undefined,
        city: club.city || undefined,
        logoUrl: club.logoUrl || undefined,
        canonicalUrl,
    };
}

/**
 * Builds standard Next.js Metadata object from common SEO data
 */
export function buildPageMetadata(data: {
    title: string;
    description: string;
    canonicalUrl?: string;
    imageUrl?: string;
}): Metadata {
    return {
        title: data.title,
        description: data.description,
        alternates: data.canonicalUrl ? { canonical: data.canonicalUrl } : undefined,
        openGraph: {
            title: `${data.title} | AREENA`,
            description: data.description,
            url: data.canonicalUrl,
            images: data.imageUrl ? [data.imageUrl] : undefined,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: data.title,
            description: data.description,
            images: data.imageUrl ? [data.imageUrl] : undefined,
        },
    };
}