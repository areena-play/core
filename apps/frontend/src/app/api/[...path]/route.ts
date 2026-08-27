import { NextRequest, NextResponse } from 'next/server';
import {
    SESSION_COOKIE_NAME,
    buildSessionCookieHeader,
    createSessionToken,
    verifySessionToken,
} from '@/lib/sessionSecurity';
import { checkRateLimit } from '@/lib/rateLimit';

const BACKEND_INTERNAL_URL =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_URL ||
    'http://localhost:4000';

const INTERNAL_API_SECRET =
    process.env.INTERNAL_API_SECRET ||
    'areena_internal_secret_key_2026';

async function handleProxy(request: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            request.ip ||
            '127.0.0.1';

        // -------------------------------------------------------------
        // 1. Rate Limiting Check
        // -------------------------------------------------------------
        const rateLimitResult = checkRateLimit(clientIp);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded. Please slow down your requests.',
                    retryAfterSeconds: rateLimitResult.retryAfterSeconds,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimitResult.retryAfterSeconds),
                    },
                },
            );
        }

        // -------------------------------------------------------------
        // 2. Fetch Metadata & Cross-Origin Validation (Anti-Scraping / Anti-CSRF)
        // -------------------------------------------------------------
        const secFetchSite = request.headers.get('sec-fetch-site');
        if (secFetchSite && secFetchSite === 'cross-site') {
            return NextResponse.json(
                {
                    error: 'Forbidden',
                    message: 'Cross-origin proxy requests are prohibited.',
                },
                { status: 403 },
            );
        }

        const origin = request.headers.get('origin');
        if (origin) {
            try {
                const originUrl = new URL(origin);
                const reqHost = request.headers.get('host') || request.nextUrl.host;
                // If origin host does not match request host and is not localhost in dev
                if (originUrl.host !== reqHost && !originUrl.host.includes('localhost')) {
                    return NextResponse.json(
                        {
                            error: 'Forbidden',
                            message: 'Unauthorized origin for internal API proxy.',
                        },
                        { status: 403 },
                    );
                }
            } catch {}
        }

        // -------------------------------------------------------------
        // 3. Signed Session Handshake Cookie & User Auth Verification
        // -------------------------------------------------------------
        const isPublicMediaStream =
            params.path &&
            params.path.length >= 2 &&
            params.path[0] === 'upload' &&
            params.path[1] === 'file' &&
            request.method.toUpperCase() === 'GET';

        const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const sessionCheck = await verifySessionToken(sessionCookie);
        const authHeader = request.headers.get('authorization');

        // Legitimate requests must have either a valid signed session handshake cookie, a User Authorization token, or be a public media stream (images/logos)
        if (!isPublicMediaStream && !sessionCheck.valid && !authHeader) {
            return NextResponse.json(
                {
                    error: 'Forbidden',
                    message:
                        'Direct external access to frontend proxy is not permitted. Please visit the application in your browser or authenticate via OAuth 2.0.',
                    docs: '/developers',
                },
                { status: 403 },
            );
        }

        // -------------------------------------------------------------
        // 4. Forwarding Request to AREENA Backend
        // -------------------------------------------------------------
        const path = params.path ? params.path.join('/') : '';
        const search = request.nextUrl.search || '';
        const targetUrl = `${BACKEND_INTERNAL_URL}/${path}${search}`;

        const forwardHeaders: Record<string, string> = {
            'x-internal-secret': INTERNAL_API_SECRET,
        };

        if (authHeader) {
            forwardHeaders['authorization'] = authHeader;
        }

        const contentType = request.headers.get('content-type');
        if (contentType) {
            forwardHeaders['content-type'] = contentType;
        }

        const accept = request.headers.get('accept');
        if (accept) {
            forwardHeaders['accept'] = accept;
        }

        const userAgent = request.headers.get('user-agent');
        if (userAgent) {
            forwardHeaders['user-agent'] = userAgent;
        }

        forwardHeaders['x-forwarded-for'] = clientIp;

        const cookie = request.headers.get('cookie');
        if (cookie) {
            forwardHeaders['cookie'] = cookie;
        }

        // Body extraction
        let body: BodyInit | undefined = undefined;
        const method = request.method.toUpperCase();
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const arrayBuffer = await request.arrayBuffer();
            if (arrayBuffer && arrayBuffer.byteLength > 0) {
                body = Buffer.from(arrayBuffer);
            }
        }

        // Send request from Frontend Server to Backend API
        const backendRes = await fetch(targetUrl, {
            method,
            headers: forwardHeaders,
            body,
            cache: 'no-store',
        });

        // Read response body
        const responseData = await backendRes.arrayBuffer();

        // Build response with forwarded headers
        const responseHeaders = new Headers();
        const copyHeaders = [
            'content-type',
            'content-length',
            'content-disposition',
            'cache-control',
        ];

        copyHeaders.forEach((headerName) => {
            const val = backendRes.headers.get(headerName);
            if (val) {
                responseHeaders.set(headerName, val);
            }
        });

        // Add rate limit telemetry headers
        responseHeaders.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));

        // -------------------------------------------------------------
        // 5. SPA Rolling Session Refresh
        // -------------------------------------------------------------
        // If session is nearing half its lifetime and user is actively making SPA calls, roll forward!
        if (sessionCheck.shouldRefresh || !sessionCookie) {
            const refreshedToken = await createSessionToken();
            responseHeaders.append('Set-Cookie', buildSessionCookieHeader(refreshedToken));
        }

        return new NextResponse(responseData, {
            status: backendRes.status,
            statusText: backendRes.statusText,
            headers: responseHeaders,
        });
    } catch (err: any) {
        console.error('[Frontend Server Proxy] Error communicating with backend:', err);
        return NextResponse.json(
            {
                error: 'Bad Gateway',
                message: 'Failed to communicate with AREENA backend service.',
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
