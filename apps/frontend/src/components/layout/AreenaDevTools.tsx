'use client';

import { useEffect } from 'react';
import { areena } from '@/lib/areenaGlobal';

/**
 * Client component that ensures `window.areena` is registered on the browser window.
 */
export function AreenaDevTools() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).areena = areena;
        }
    }, []);

    return null;
}

