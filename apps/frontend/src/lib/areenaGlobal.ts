'use client';

import { confirm, prompt } from '@/lib/dialog';
import { api } from '@/lib/api';

/**
 * Global AREENA development & debugging utilities.
 * Accessible in the browser console via `areena` or `window.areena`.
 */
export const areena = {
    confirm,
    prompt,
    api,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
};

declare global {
    interface Window {
        areena: typeof areena;
    }
}

if (typeof window !== 'undefined') {
    (window as any).areena = areena;
}
