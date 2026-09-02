'use client';

import React, { useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { loader, LoaderContainer } from '@/lib/loader';

/**
 * Hook to automatically trigger the top loading bar on route changes.
 */
function RouteLoadingTracker() {
    const pathname = usePathname();

    useEffect(() => {
        const l = loader();
        const timer = setTimeout(() => {
            l.close();
        }, 180);
        return () => {
            clearTimeout(timer);
            l.close();
        };
    }, [pathname]);

    return null;
}

/**
 * TopLoadingBar
 * Re-exports the unified LoaderContainer while preserving route change tracking.
 */
export function TopLoadingBar() {
    return (
        <Suspense fallback={null}>
            <RouteLoadingTracker />
            <LoaderContainer />
        </Suspense>
    );
}
