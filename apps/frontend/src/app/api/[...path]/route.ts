import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl(): string {
    return (
        process.env.BACKEND_INTERNAL_URL ||
        process.env.BACKEND_URL ||
        (process.env.BACKEND_PORT ? `http://127.0.0.1:${process.env.BACKEND_PORT}` : 'http://127.0.0.1:4000')
    );
}

async function handleProxy(request: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path ? params.path.join('/') : '';
    const search = request.nextUrl.search || '';
    const backendBase = getBackendUrl();
    const targetUrl = `${backendBase}/${path}${search}`;

    const forwardHeaders: Record<string, string> = {};

    // Forward headers from client to backend
    const forwardHeaderNames = [
        'authorization',
        'content-type',
        'accept',
        'cookie',
        'user-agent',
        'sec-fetch-site',
        'sec-fetch-mode',
        'origin',
        'referer',
    ];

    forwardHeaderNames.forEach((name) => {
        const val = request.headers.get(name);
        if (val) forwardHeaders[name] = val;
    });

    const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        request.ip ||
        '127.0.0.1';
    forwardHeaders['x-forwarded-for'] = clientIp;

    // Body extraction for mutating methods
    let body: BodyInit | undefined = undefined;
    const method = request.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const arrayBuffer = await request.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 0) {
            body = Buffer.from(arrayBuffer);
        }
    }

    try {
        let backendRes: Response;
        try {
            backendRes = await fetch(targetUrl, {
                method,
                headers: forwardHeaders,
                body,
                cache: 'no-store',
            });
        } catch (fetchErr: any) {
            if (targetUrl.includes('localhost:')) {
                const fallbackUrl = targetUrl.replace('localhost:', '127.0.0.1:');
                backendRes = await fetch(fallbackUrl, {
                    method,
                    headers: forwardHeaders,
                    body,
                    cache: 'no-store',
                });
            } else {
                throw fetchErr;
            }
        }

        const responseData = await backendRes.arrayBuffer();
        const responseHeaders = new Headers();

        [
            'content-type',
            'content-length',
            'content-disposition',
            'cache-control',
            'x-ratelimit-limit',
            'x-ratelimit-remaining',
        ].forEach((h) => {
            const v = backendRes.headers.get(h);
            if (v) responseHeaders.set(h, v);
        });

        return new NextResponse(responseData, {
            status: backendRes.status,
            statusText: backendRes.statusText,
            headers: responseHeaders,
        });
    } catch (err: any) {
        console.error(`[Frontend Proxy] Failed to connect to ${targetUrl}:`, err.message);
        return NextResponse.json(
            {
                error: 'Bad Gateway',
                message: `Failed to connect to backend at ${backendBase}. Please ensure the backend service is running.`,
                target: targetUrl,
                details: err.message,
            },
            { status: 502 },
        );
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;

