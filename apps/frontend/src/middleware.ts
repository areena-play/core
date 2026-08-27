import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_SECONDS,
    createSessionToken,
    verifySessionToken,
} from './lib/sessionSecurity';

export async function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const pathname = request.nextUrl.pathname;

    // Do not interfere with static assets, images, icons
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/icon') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/apple-icon') ||
        pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
    ) {
        return response;
    }

    // Check existing session cookie
    const currentCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionCheck = await verifySessionToken(currentCookie);

    // If missing, invalid, or needs refresh, issue/update session cookie
    if (!sessionCheck.valid || sessionCheck.shouldRefresh) {
        const newToken = await createSessionToken();
        const isProd = process.env.NODE_ENV === 'production';

        response.cookies.set({
            name: SESSION_COOKIE_NAME,
            value: newToken,
            path: '/',
            maxAge: SESSION_MAX_AGE_SECONDS,
            httpOnly: true,
            sameSite: 'lax',
            secure: isProd,
        });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except static files and assets:
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
