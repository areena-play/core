import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { getPersonSeoData, buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { identifier: string } }): Promise<Metadata> {
    try {
        const person = await api.getPerson(params.identifier).catch(() => null);
        const seo = getPersonSeoData(person);
        return buildPageMetadata({
            title: seo.title,
            description: seo.description,
            canonicalUrl: seo.canonicalUrl,
            imageUrl: seo.avatarUrl,
        });
    } catch {
        const seo = getPersonSeoData(null);
        return buildPageMetadata({
            title: seo.title,
            description: seo.description,
            canonicalUrl: seo.canonicalUrl,
        });
    }
}

export default function PersonLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}