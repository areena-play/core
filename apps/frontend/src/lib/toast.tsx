'use client';

import React from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { useTheme } from '@/lib/themeContext';

/**
 * Re-export sonner's toast API with full typing and convenience functions.
 *
 * Usage:
 * ```ts
 * import { toast } from '@/lib/toast';
 *
 * toast.success('Match scores saved successfully!');
 * toast.error('Failed to update tournament.');
 * toast.warning('Club registration deadline is approaching.');
 * toast.info('Schedule published on Court 1.');
 *
 * // Promise tracking:
 * toast.promise(api.updateCompetition(id, data), {
 *     loading: 'Saving competition changes...',
 *     success: 'Competition updated successfully!',
 *     error: (err) => err?.message || 'Error updating competition',
 * });
 * ```
 */
export const toast = sonnerToast;

/**
 * Application Toast Container Component
 * Placed in RootLayout to listen to toast calls and adapt to dark/light theme automatically.
 */
export function ToastContainer() {
    const { resolvedTheme } = useTheme();

    return (
        <SonnerToaster
            theme={resolvedTheme as 'light' | 'dark'}
            position="top-center"
            richColors
            closeButton
            expand={false}
            duration={4000}
            toastOptions={{
                style: {
                    borderRadius: '1rem',
                    fontFamily: 'inherit',
                },
                classNames: {
                    toast: 'border font-sans shadow-xl',
                    title: 'text-sm font-semibold',
                    description: 'text-xs text-slate-400',
                    actionButton: 'bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-lg',
                    cancelButton: 'bg-slate-800 text-slate-300 text-xs font-medium rounded-lg',
                },
            }}
        />
    );
}

