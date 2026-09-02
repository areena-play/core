'use client';

import React from 'react';
import Image from 'next/image';

interface AreenaLogoProps {
    className?: string;
    priority?: boolean;
    alt?: string;
}

/**
 * Instant Zero-Flicker Areena Logo.
 *
 * Renders both light and dark logos and controls visibility via CSS classes
 * (`hidden dark:block` and `block dark:hidden`), perfectly synchronized with
 * the <html> tag classes on the very first painted frame without waiting for React state hydration.
 */
export function AreenaLogo({ className = 'object-contain', priority = true, alt = 'AREENA Logo' }: AreenaLogoProps) {
    return (
        <>
            {/* Dark logo: shown when <html class="dark"> */}
            <Image
                src="/areena-logo-dark.png"
                alt={alt}
                fill
                priority={priority}
                className={`${className} hidden dark:block`}
            />

            {/* Light logo: shown when <html class="light"> (or not dark) */}
            <Image
                src="/areena-logo.png"
                alt={alt}
                fill
                priority={priority}
                className={`${className} block dark:hidden`}
            />
        </>
    );
}

