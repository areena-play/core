'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeApiLoading } from '@/lib/api';

/**
 * TopLoadingBar
 * A very thin loading bar overlaid at the absolute top of the page (above navbar),
 * with 0px layout displacement (overlay only), indicating in-flight API calls and page data loads.
 */
function TopLoadingBarContent() {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Track Route changes
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 180);
        return () => clearTimeout(timer);
    }, [pathname]);

    // Track Global API Requests
    useEffect(() => {
        const unsubscribe = subscribeApiLoading((count) => {
            setIsLoading(count > 0);
        });
        return unsubscribe;
    }, []);

    // Progress Animation Handling
    useEffect(() => {
        if (isLoading) {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            setVisible(true);
            setProgress((prev) => (prev === 0 ? 18 : prev));

            progressTimerRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 86) return prev;
                    const step = (90 - prev) * 0.15;
                    return Math.min(88, prev + Math.max(1.2, step));
                });
            }, 120);
        } else {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            setProgress(100);
            hideTimerRef.current = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 250);
        }

        return () => {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, [isLoading]);

    if (!visible && progress === 0) return null;

    return (
        <div
            aria-hidden="true"
            className="fixed top-0 left-0 right-0 z-[1000] h-[2.5px] pointer-events-none overflow-hidden"
        >
            <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] transition-all duration-200 ease-out"
                style={{
                    width: `${progress}%`,
                    opacity: visible ? 1 : 0,
                    transition: progress === 100 ? 'width 150ms ease-out, opacity 250ms ease' : 'width 200ms ease-out',
                }}
            />
        </div>
    );
}

export function TopLoadingBar() {
    return (
        <Suspense fallback={null}>
            <TopLoadingBarContent />
        </Suspense>
    );
}
