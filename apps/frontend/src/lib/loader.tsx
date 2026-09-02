'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { subscribeApiLoading } from '@/lib/api';

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export type LoaderMode = 'top' | 'fullscreen';

export interface LoaderOptions {
    /**
     * Presentation mode:
     * - 'top': Thin progress bar overlaid above the navbar. Default.
     * - 'fullscreen': Backdrop blur overlay covering the entire screen (above all modals/dialogs).
     */
    mode?: LoaderMode;

    /**
     * Progress percentage (0 - 100).
     * If omitted or undefined, displays a continuous smooth loading animation.
     */
    progress?: number;

    /**
     * Title displayed on fullscreen loader (e.g. "Generating Fixtures...").
     */
    title?: string;

    /**
     * Description / subtitle displayed under title on fullscreen loader.
     */
    description?: string;
}

export interface LoaderInstance {
    /**
     * Update options on the fly (e.g. progress percentage, title, or description).
     */
    update: (options: Partial<LoaderOptions>) => void;
    /**
     * Set explicit progress percentage (0 - 100).
     */
    setProgress: (percent: number) => void;
    /**
     * Dismiss / close this loader instance.
     */
    close: () => void;
}

interface InternalLoaderEntry {
    id: number;
    mode: LoaderMode;
    progress?: number;
    title?: string;
    description?: string;
}

export interface LoaderState {
    topActive: boolean;
    topProgress?: number;
    fullscreenActive: boolean;
    fullscreenProgress?: number;
    fullscreenTitle?: string;
    fullscreenDescription?: string;
}

/* -------------------------------------------------------------------------- */
/*                           GLOBAL STATE & LISTENERS                         */
/* -------------------------------------------------------------------------- */

let nextEntryId = 1;
const activeEntries = new Map<number, InternalLoaderEntry>();
let apiLoadingCount = 0;
const listeners = new Set<(state: LoaderState) => void>();

function calculateState(): LoaderState {
    let hasTop = apiLoadingCount > 0;
    let hasFullscreen = false;
    let topProgress: number | undefined;
    let fullscreenProgress: number | undefined;
    let fullscreenTitle: string | undefined;
    let fullscreenDescription: string | undefined;

    // Evaluate active manual entries (latest takes precedence for text/progress)
    activeEntries.forEach((entry) => {
        if (entry.mode === 'fullscreen') {
            hasFullscreen = true;
            if (entry.progress !== undefined) fullscreenProgress = entry.progress;
            if (entry.title) fullscreenTitle = entry.title;
            if (entry.description) fullscreenDescription = entry.description;
        } else {
            hasTop = true;
            if (entry.progress !== undefined) topProgress = entry.progress;
        }
    });

    return {
        topActive: hasTop,
        topProgress,
        fullscreenActive: hasFullscreen,
        fullscreenProgress,
        fullscreenTitle,
        fullscreenDescription,
    };
}

function notify() {
    const state = calculateState();
    listeners.forEach((fn) => fn(state));
}

// Automatically bind to ApiClient requests for top bar indication
if (typeof window !== 'undefined') {
    subscribeApiLoading((count) => {
        apiLoadingCount = count;
        notify();
    });
}

/* -------------------------------------------------------------------------- */
/*                                PUBLIC UTILITY                              */
/* -------------------------------------------------------------------------- */

/**
 * Unified AREENA Loader Utility
 */
export function loader(options: LoaderOptions = {}): LoaderInstance {
    const id = nextEntryId++;
    const entry: InternalLoaderEntry = {
        id,
        mode: options.mode || 'top',
        progress: options.progress,
        title: options.title,
        description: options.description,
    };

    activeEntries.set(id, entry);
    notify();

    return {
        update(updated: Partial<LoaderOptions>) {
            if (!activeEntries.has(id)) return;
            const current = activeEntries.get(id)!;
            if (updated.mode !== undefined) current.mode = updated.mode;
            if (updated.progress !== undefined) current.progress = updated.progress;
            if (updated.title !== undefined) current.title = updated.title;
            if (updated.description !== undefined) current.description = updated.description;
            notify();
        },
        setProgress(percent: number) {
            if (!activeEntries.has(id)) return;
            activeEntries.get(id)!.progress = Math.max(0, Math.min(100, percent));
            notify();
        },
        close() {
            if (activeEntries.delete(id)) {
                notify();
            }
        },
    };
}

loader.show = function show(options: LoaderOptions = {}): LoaderInstance {
    return loader(options);
};

loader.top = function top(options: Omit<LoaderOptions, 'mode'> = {}): LoaderInstance {
    return loader({ ...options, mode: 'top' });
};

loader.fullscreen = function fullscreen(options: Omit<LoaderOptions, 'mode'> = {}): LoaderInstance {
    return loader({ ...options, mode: 'fullscreen' });
};

loader.track = async function track<T>(
    promiseOrFn: Promise<T> | ((instance: LoaderInstance) => Promise<T>),
    options: LoaderOptions = {}
): Promise<T> {
    const instance = loader(options);
    try {
        const promise = typeof promiseOrFn === 'function' ? promiseOrFn(instance) : promiseOrFn;
        return await promise;
    } finally {
        instance.close();
    }
};

loader.hideAll = function hideAll() {
    activeEntries.clear();
    notify();
};

/* -------------------------------------------------------------------------- */
/*                                REACT CONTAINER                             */
/* -------------------------------------------------------------------------- */

export function LoaderContainer() {
    const [mounted, setMounted] = useState(false);
    const [state, setState] = useState<LoaderState>(calculateState);

    // Continuous simulated animation state for top loader when progress is indeterminate
    const [simulatedTopProgress, setSimulatedTopProgress] = useState(0);
    const [topBarVisible, setTopBarVisible] = useState(false);

    useEffect(() => {
        setMounted(true);
        listeners.add(setState);
        notify();
        return () => {
            listeners.delete(setState);
        };
    }, []);

    // Handle Top Bar Animation
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        let hideTimer: NodeJS.Timeout | null = null;

        if (state.topActive) {
            setTopBarVisible(true);
            if (state.topProgress === undefined) {
                // Continuous indeterminate simulation
                setSimulatedTopProgress((prev) => (prev === 0 ? 25 : prev));
                timer = setInterval(() => {
                    setSimulatedTopProgress((prev) => {
                        if (prev >= 88) return prev;
                        const step = (90 - prev) * 0.15;
                        return Math.min(88, prev + Math.max(1.5, step));
                    });
                }, 120);
            }
        } else {
            // Complete & hide
            setSimulatedTopProgress(100);
            hideTimer = setTimeout(() => {
                setTopBarVisible(false);
                setSimulatedTopProgress(0);
            }, 300);
        }

        return () => {
            if (timer) clearInterval(timer);
            if (hideTimer) clearTimeout(hideTimer);
        };
    }, [state.topActive, state.topProgress]);

    const effectiveTopProgress =
        state.topProgress !== undefined ? state.topProgress : simulatedTopProgress;

    const showTopBar = topBarVisible || effectiveTopProgress > 0 || state.topActive;

    const topBarElement = showTopBar ? (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                zIndex: 9999999,
                pointerEvents: 'none',
                overflow: 'hidden',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
            }}
        >
            <div
                style={{
                    height: '100%',
                    width: `${effectiveTopProgress}%`,
                    opacity: topBarVisible ? 1 : 0,
                    background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #dc2626 100%)',
                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.9), 0 0 4px rgba(245, 158, 11, 0.7)',
                    transition:
                        effectiveTopProgress === 100
                            ? 'width 150ms ease-out, opacity 300ms ease'
                            : 'width 200ms ease-out',
                }}
            />
        </div>
    ) : null;

    const fullscreenElement = state.fullscreenActive ? (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(2, 6, 23, 0.82)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Loading"
        >
            <div className="relative z-10 flex flex-col items-center max-w-sm sm:max-w-md w-full px-6 text-center space-y-5">
                <div className="relative h-10 w-36 mx-auto">
                    <Image
                        src="/areena-logo-dark.png"
                        alt="AREENA"
                        fill
                        priority
                        className="object-contain drop-shadow-md"
                    />
                </div>

                <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-7 shadow-2xl space-y-4 text-left sm:text-center">
                    <div className="flex items-center justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/10 border border-red-500/20 shadow-md text-red-500">
                            <Loader2 className="h-7 w-7 animate-spin" />
                        </div>
                    </div>

                    <div className="space-y-1 text-center">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            {state.fullscreenTitle || 'Loading...'}
                        </h3>
                        {state.fullscreenDescription && (
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                                {state.fullscreenDescription}
                            </p>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mt-3 relative">
                        {state.fullscreenProgress !== undefined ? (
                            <div
                                style={{ width: `${Math.max(0, Math.min(100, state.fullscreenProgress))}%` }}
                                className="bg-gradient-to-r from-red-600 via-amber-500 to-red-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-amber-500 to-red-500 rounded-full animate-indeterminate" />
                        )}
                    </div>

                    {state.fullscreenProgress !== undefined && (
                        <div className="text-xs font-mono font-bold text-slate-300 text-center pt-0.5">
                            {Math.round(state.fullscreenProgress)}%
                        </div>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    if (!mounted || typeof document === 'undefined') {
        return null;
    }

    return (
        <>
            {topBarElement && createPortal(topBarElement, document.body)}
            {fullscreenElement && createPortal(fullscreenElement, document.body)}
        </>
    );
}
