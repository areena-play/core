import { MetadataRoute } from 'next';
import { getSiteBaseUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = getSiteBaseUrl();

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/admin',
                    '/*/management/',
                    '/*/management',
                    '/management/',
                    '/management',
                    '/api/',
                    '/auth/verify-email',
                    '/auth/reset-password',
                    '/profile',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}