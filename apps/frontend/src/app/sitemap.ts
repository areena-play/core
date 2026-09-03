import { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { getSiteBaseUrl } from '@/lib/siteUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getSiteBaseUrl();

    // Static core public routes
    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/competitions`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/clubs`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/people`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/calendar`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/utilities/elo-calculator`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/utilities/level-table`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/manual`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/support`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/developers`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    try {
        // Dynamically index public associations, clubs, and competitions
        const [assocs, clubs, competitions] = await Promise.all([
            api.getAssociations().catch(() => []),
            api.getClubs().catch(() => []),
            api.getCompetitions().catch(() => []),
        ]);

        if (Array.isArray(assocs)) {
            assocs.forEach((a: any) => {
                if (a.id) {
                    routes.push({
                        url: `${baseUrl}/association/${a.slug || a.id}`,
                        lastModified: a.updatedAt ? new Date(a.updatedAt) : new Date(),
                        changeFrequency: 'daily',
                        priority: 0.8,
                    });
                }
            });
        }

        if (Array.isArray(clubs)) {
            clubs.forEach((c: any) => {
                if (c.id) {
                    routes.push({
                        url: `${baseUrl}/club/${c.id}`,
                        lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.8,
                    });
                }
            });
        }

        if (Array.isArray(competitions)) {
            competitions.forEach((cmp: any) => {
                if (cmp.id) {
                    routes.push({
                        url: `${baseUrl}/competition/${cmp.id}`,
                        lastModified: cmp.updatedAt ? new Date(cmp.updatedAt) : new Date(),
                        changeFrequency: 'hourly',
                        priority: 0.9,
                    });
                }
            });
        }
    } catch (err) {
        console.warn('Sitemap dynamic entity generation notice:', err);
    }

    return routes;
}