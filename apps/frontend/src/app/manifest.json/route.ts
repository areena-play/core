import { NextResponse } from 'next/server';
import { getDynamicManifestData } from '@/lib/pwa/getManifestData';

export const dynamic = 'force-dynamic';

export async function GET() {
    const data = await getDynamicManifestData();
    return NextResponse.json(data, {
        headers: {
            'Content-Type': 'application/manifest+json; charset=utf-8',
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
    });
}
