'use client';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'scorePoint';

export function triggerHaptic(type: HapticType = 'light') {
    if (typeof window === 'undefined' || !('vibrate' in navigator)) {
        return;
    }

    try {
        switch (type) {
            case 'light':
                navigator.vibrate(8);
                break;
            case 'scorePoint':
                navigator.vibrate(12);
                break;
            case 'medium':
                navigator.vibrate(18);
                break;
            case 'heavy':
                navigator.vibrate(28);
                break;
            case 'success':
                navigator.vibrate([10, 40, 15]);
                break;
            case 'warning':
                navigator.vibrate([25, 40, 25]);
                break;
            case 'error':
                navigator.vibrate([40, 60, 40]);
                break;
            default:
                navigator.vibrate(10);
        }
    } catch {
        // Silently ignore if vibrations are blocked by system settings
    }
}

export function useHaptics() {
    return {
        vibrate: triggerHaptic,
        light: () => triggerHaptic('light'),
        scorePoint: () => triggerHaptic('scorePoint'),
        medium: () => triggerHaptic('medium'),
        heavy: () => triggerHaptic('heavy'),
        success: () => triggerHaptic('success'),
        warning: () => triggerHaptic('warning'),
        error: () => triggerHaptic('error'),
    };
}

