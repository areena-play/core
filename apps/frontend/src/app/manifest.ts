import { MetadataRoute } from 'next';
import { getDynamicManifestData } from '@/lib/pwa/getManifestData';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    return (await getDynamicManifestData()) as MetadataRoute.Manifest;
}
