const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    'areena_session_secret_dev_key_2026';

export const SESSION_COOKIE_NAME = 'areena_session';
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours
const REFRESH_THRESHOLD_SECONDS = 12 * 60 * 60; // Refresh when < 12h remaining

export interface SessionPayload {
    id: string;
    iat: number;
    exp: number;
}

function stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        'raw',
        stringToUint8Array(SESSION_SECRET) as unknown as BufferSource,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
    );
}

/**
 * Generates a signed session cookie string using Web Crypto (compatible with Edge and Node runtimes).
 */
export async function createSessionToken(): Promise<string> {
    const now = Date.now();
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const id = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const payload: SessionPayload = {
        id,
        iat: now,
        exp: now + SESSION_MAX_AGE_SECONDS * 1000,
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = bufferToBase64Url(stringToUint8Array(payloadJson));

    const key = await getHmacKey();
    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        stringToUint8Array(payloadB64) as unknown as BufferSource,
    );
    const signatureB64 = bufferToBase64Url(signatureBuffer);

    return `${payloadB64}.${signatureB64}`;
}

/**
 * Validates a signed session cookie string using Web Crypto.
 */
export async function verifySessionToken(tokenString: string | undefined | null): Promise<{
    valid: boolean;
    shouldRefresh: boolean;
    payload?: SessionPayload;
}> {
    if (!tokenString) {
        return { valid: false, shouldRefresh: false };
    }

    const parts = tokenString.split('.');
    if (parts.length !== 2) {
        return { valid: false, shouldRefresh: false };
    }

    const [payloadB64, signatureB64] = parts;

    try {
        const key = await getHmacKey();
        const signatureBytes = base64UrlToUint8Array(signatureB64);
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes as unknown as BufferSource,
            stringToUint8Array(payloadB64) as unknown as BufferSource,
        );

        if (!isValid) {
            return { valid: false, shouldRefresh: false };
        }

        const payloadBytes = base64UrlToUint8Array(payloadB64);
        const payloadJson = new TextDecoder().decode(payloadBytes);
        const payload: SessionPayload = JSON.parse(payloadJson);

        const now = Date.now();
        if (now > payload.exp) {
            return { valid: false, shouldRefresh: false };
        }

        const remainingMs = payload.exp - now;
        const shouldRefresh = remainingMs < REFRESH_THRESHOLD_SECONDS * 1000;

        return { valid: true, shouldRefresh, payload };
    } catch {
        return { valid: false, shouldRefresh: false };
    }
}

/**
 * Constructs a Set-Cookie header value for the session cookie.
 */
export function buildSessionCookieHeader(tokenValue: string): string {
    const isProd = process.env.NODE_ENV === 'production';
    const secureFlag = isProd ? '; Secure' : '';
    return `${SESSION_COOKIE_NAME}=${tokenValue}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secureFlag}`;
}
