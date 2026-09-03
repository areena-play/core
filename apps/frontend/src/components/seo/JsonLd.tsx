import React from 'react';
import { getCompetitionSeoData, getPersonSeoData, getClubSeoData } from '@/lib/seo';

interface JsonLdProps {
    data?: Record<string, any> | null;
}

export function JsonLd({ data }: JsonLdProps) {
    if (!data) return null;
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

/**
 * Generate Schema.org Person JSON-LD using shared getPersonSeoData()
 */
export function generatePersonJsonLd(person: any) {
    if (!person) return null;
    const seo = getPersonSeoData(person);

    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: seo.fullName,
        givenName: person.firstName || undefined,
        familyName: person.lastName || undefined,
        identifier: seo.identifier,
        image: seo.avatarUrl,
        url: seo.canonicalUrl,
        address: seo.city
            ? {
                  '@type': 'PostalAddress',
                  addressLocality: seo.city,
                  addressCountry: seo.country,
              }
            : undefined,
    };
}

/**
 * Generate Schema.org SportsEvent JSON-LD using shared getCompetitionSeoData()
 */
export function generateCompetitionJsonLd(comp: any) {
    if (!comp) return null;
    const seo = getCompetitionSeoData(comp);

    return {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: seo.pureTitle,
        description: seo.description,
        startDate: seo.startDate,
        endDate: seo.endDate,
        url: seo.canonicalUrl,
        location: seo.location
            ? {
                  '@type': 'Place',
                  name: seo.location,
              }
            : undefined,
        organizer: seo.organizerName
            ? {
                  '@type': 'SportsOrganization',
                  name: seo.organizerName,
              }
            : undefined,
    };
}

/**
 * Generate Schema.org SportsClub JSON-LD using shared getClubSeoData()
 */
export function generateClubJsonLd(club: any) {
    if (!club) return null;
    const seo = getClubSeoData(club);

    return {
        '@context': 'https://schema.org',
        '@type': 'SportsClub',
        name: seo.pureTitle,
        description: seo.description,
        identifier: seo.code,
        url: seo.canonicalUrl,
        image: seo.logoUrl,
        address: seo.city
            ? {
                  '@type': 'PostalAddress',
                  addressLocality: seo.city,
                  addressCountry: 'CH',
              }
            : undefined,
    };
}