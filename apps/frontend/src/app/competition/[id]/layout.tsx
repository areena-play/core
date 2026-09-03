import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { getCompetitionSeoData, buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    try {
        const comp = await api.getCompetition(params.id).catch(() => null);
        const seo = getCompetitionSeoData(comp);
        return buildPageMetadata({
            title: seo.title,
            description: seo.description,
            canonicalUrl: seo.canonicalUrl,
        });
    } catch {
        const seo = getCompetitionSeoData(null);
        return buildPageMetadata({
            title: seo.title,
            description: seo.description,
            canonicalUrl: seo.canonicalUrl,
        });
    }
}

export default function CompetitionLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}