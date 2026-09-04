'use client';

import React from 'react';

interface FlagIconProps {
    code: string; // ISO 2-letter country code or language code (e.g. 'CH', 'DE', 'en', 'fr', 'gb', 'us', etc.)
    className?: string;
    alt?: string;
}

export function FlagIcon({ code, className = 'w-5 h-3.5', alt }: FlagIconProps) {
    const c = (code || '').toUpperCase().trim();
    const label = alt || `${c} Flag`;

    // Map common language codes to country flags
    const normalizedCode = c === 'EN' ? 'GB' : c;

    const baseClass = `inline-block shrink-0 rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.4)] overflow-hidden align-middle ${className}`;

    switch (normalizedCode) {
        // Switzerland 🇨🇭
        case 'CH':
            return (
                <svg viewBox="0 0 32 32" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="32" fill="#D52B1E" />
                    <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                    <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                </svg>
            );

        // Germany 🇩🇪
        case 'DE':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="8" y="0" fill="#000000" />
                    <rect width="32" height="8" y="8" fill="#DD0000" />
                    <rect width="32" height="8" y="16" fill="#FFCE00" />
                </svg>
            );

        // France 🇫🇷
        case 'FR':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="10.66" height="24" x="0" fill="#002654" />
                    <rect width="10.66" height="24" x="10.66" fill="#FFFFFF" />
                    <rect width="10.68" height="24" x="21.32" fill="#ED2939" />
                </svg>
            );

        // Italy 🇮🇹
        case 'IT':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="10.66" height="24" x="0" fill="#009246" />
                    <rect width="10.66" height="24" x="10.66" fill="#FFFFFF" />
                    <rect width="10.68" height="24" x="21.32" fill="#CE2B37" />
                </svg>
            );

        // Austria 🇦🇹
        case 'AT':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="8" y="0" fill="#ED2939" />
                    <rect width="32" height="8" y="8" fill="#FFFFFF" />
                    <rect width="32" height="8" y="16" fill="#ED2939" />
                </svg>
            );

        // Liechtenstein 🇱🇮
        case 'LI':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="12" y="0" fill="#002B7F" />
                    <rect width="32" height="12" y="12" fill="#CE1126" />
                    {/* Crown */}
                    <path
                        d="M5 5.5 L6.5 9 L9 6.5 L11.5 9 L13 5.5 L12 10.5 H6 Z"
                        fill="#FFD100"
                        stroke="#000"
                        strokeWidth="0.5"
                    />
                </svg>
            );

        // United Kingdom 🇬🇧
        case 'GB':
        case 'UK':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <clipPath id="gb-clip">
                        <rect width="32" height="24" />
                    </clipPath>
                    <g clipPath="url(#gb-clip)">
                        <rect width="32" height="24" fill="#012169" />
                        <path d="M0,0 L32,24 M32,0 L0,24" stroke="#FFFFFF" strokeWidth="4" />
                        <path d="M0,0 L32,24 M32,0 L0,24" stroke="#C8102E" strokeWidth="2" />
                        <path d="M16,0 V24 M0,12 H32" stroke="#FFFFFF" strokeWidth="6" />
                        <path d="M16,0 V24 M0,12 H32" stroke="#C8102E" strokeWidth="3.6" />
                    </g>
                </svg>
            );

        // United States 🇺🇸
        case 'US':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#B22234" />
                    <rect y="1.84" width="32" height="1.84" fill="#FFFFFF" />
                    <rect y="5.53" width="32" height="1.84" fill="#FFFFFF" />
                    <rect y="9.23" width="32" height="1.84" fill="#FFFFFF" />
                    <rect y="12.92" width="32" height="1.84" fill="#FFFFFF" />
                    <rect y="16.61" width="32" height="1.84" fill="#FFFFFF" />
                    <rect y="20.3" width="32" height="1.84" fill="#FFFFFF" />
                    <rect width="13" height="12.92" fill="#3C3B6E" />
                    {/* Simplified Starfield */}
                    <circle cx="3" cy="3" r="0.7" fill="#FFF" />
                    <circle cx="6.5" cy="3" r="0.7" fill="#FFF" />
                    <circle cx="10" cy="3" r="0.7" fill="#FFF" />
                    <circle cx="4.75" cy="6.5" r="0.7" fill="#FFF" />
                    <circle cx="8.25" cy="6.5" r="0.7" fill="#FFF" />
                    <circle cx="3" cy="10" r="0.7" fill="#FFF" />
                    <circle cx="6.5" cy="10" r="0.7" fill="#FFF" />
                    <circle cx="10" cy="10" r="0.7" fill="#FFF" />
                </svg>
            );

        // Spain 🇪🇸
        case 'ES':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="6" y="0" fill="#AA151B" />
                    <rect width="32" height="12" y="6" fill="#F1BF00" />
                    <rect width="32" height="6" y="18" fill="#AA151B" />
                    {/* Crest indicator */}
                    <rect x="6" y="9" width="3.5" height="5" rx="1" fill="#AA151B" />
                </svg>
            );

        // Portugal 🇵🇹
        case 'PT':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="12" height="24" x="0" fill="#046A38" />
                    <rect width="20" height="24" x="12" fill="#DA291C" />
                    <circle cx="12" cy="12" r="3.5" fill="#FFD100" />
                    <circle cx="12" cy="12" r="2.2" fill="#DA291C" />
                </svg>
            );

        // Netherlands 🇳🇱
        case 'NL':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="8" y="0" fill="#AE1C28" />
                    <rect width="32" height="8" y="8" fill="#FFFFFF" />
                    <rect width="32" height="8" y="16" fill="#21468B" />
                </svg>
            );

        // Belgium 🇧🇪
        case 'BE':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="10.66" height="24" x="0" fill="#000000" />
                    <rect width="10.66" height="24" x="10.66" fill="#FDDA24" />
                    <rect width="10.68" height="24" x="21.32" fill="#EF3340" />
                </svg>
            );

        // Poland 🇵🇱
        case 'PL':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="12" y="0" fill="#FFFFFF" />
                    <rect width="32" height="12" y="12" fill="#DC143C" />
                </svg>
            );

        // Sweden 🇸🇪
        case 'SE':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#006AA7" />
                    <rect x="9" y="0" width="4" height="24" fill="#FECC00" />
                    <rect x="0" y="10" width="32" height="4" fill="#FECC00" />
                </svg>
            );

        // Norway 🇳🇴
        case 'NO':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#BA0C2F" />
                    <rect x="8" y="0" width="6" height="24" fill="#FFFFFF" />
                    <rect x="0" y="9" width="32" height="6" fill="#FFFFFF" />
                    <rect x="9.5" y="0" width="3" height="24" fill="#00205B" />
                    <rect x="0" y="10.5" width="32" height="3" fill="#00205B" />
                </svg>
            );

        // Denmark 🇩🇰
        case 'DK':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#C8102E" />
                    <rect x="9" y="0" width="4" height="24" fill="#FFFFFF" />
                    <rect x="0" y="10" width="32" height="4" fill="#FFFFFF" />
                </svg>
            );

        // Finland 🇫🇮
        case 'FI':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#FFFFFF" />
                    <rect x="9" y="0" width="5" height="24" fill="#002F6C" />
                    <rect x="0" y="9.5" width="32" height="5" fill="#002F6C" />
                </svg>
            );

        // Canada 🇨🇦
        case 'CA':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="8" height="24" x="0" fill="#FF0000" />
                    <rect width="16" height="24" x="8" fill="#FFFFFF" />
                    <rect width="8" height="24" x="24" fill="#FF0000" />
                    {/* Maple Leaf */}
                    <path
                        d="M16 6 L17 9.5 L19.5 8.5 L18.5 11 L21 12 L18.5 14 L19 16.5 L16.5 15.5 L16.5 18 L15.5 18 L15.5 15.5 L13 16.5 L13.5 14 L11 12 L13.5 11 L12.5 8.5 L15 9.5 Z"
                        fill="#FF0000"
                    />
                </svg>
            );

        // Australia 🇦🇺
        case 'AU':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#00008B" />
                    {/* Mini Union Jack canton */}
                    <g transform="scale(0.45)">
                        <rect width="32" height="24" fill="#012169" />
                        <path d="M0,0 L32,24 M32,0 L0,24" stroke="#FFFFFF" strokeWidth="4" />
                        <path d="M0,0 L32,24 M32,0 L0,24" stroke="#C8102E" strokeWidth="2" />
                        <path d="M16,0 V24 M0,12 H32" stroke="#FFFFFF" strokeWidth="6" />
                        <path d="M16,0 V24 M0,12 H32" stroke="#C8102E" strokeWidth="3.6" />
                    </g>
                    {/* Commonwealth Star */}
                    <circle cx="8" cy="17" r="2.2" fill="#FFFFFF" />
                    {/* Southern Cross */}
                    <circle cx="24" cy="5" r="0.9" fill="#FFFFFF" />
                    <circle cx="27" cy="9" r="0.9" fill="#FFFFFF" />
                    <circle cx="21" cy="11" r="0.9" fill="#FFFFFF" />
                    <circle cx="24" cy="19" r="0.9" fill="#FFFFFF" />
                    <circle cx="25.5" cy="13" r="0.6" fill="#FFFFFF" />
                </svg>
            );

        // Japan 🇯🇵
        case 'JP':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#FFFFFF" />
                    <circle cx="16" cy="12" r="6" fill="#BC002D" />
                </svg>
            );

        // China 🇨🇳
        case 'CN':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#DE2910" />
                    <polygon points="6,3.5 7,6.5 4.5,4.5 7.5,4.5 5,6.5" fill="#FFDE00" transform="scale(1.2) translate(0.5, 0.5)" />
                    <circle cx="13" cy="4" r="0.7" fill="#FFDE00" />
                    <circle cx="15" cy="6.5" r="0.7" fill="#FFDE00" />
                    <circle cx="15" cy="9.5" r="0.7" fill="#FFDE00" />
                    <circle cx="13" cy="12" r="0.7" fill="#FFDE00" />
                </svg>
            );

        // India 🇮🇳
        case 'IN':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="8" y="0" fill="#FF9933" />
                    <rect width="32" height="8" y="8" fill="#FFFFFF" />
                    <rect width="32" height="8" y="16" fill="#138808" />
                    <circle cx="16" cy="12" r="2.8" fill="none" stroke="#000080" strokeWidth="0.8" />
                    <circle cx="16" cy="12" r="0.6" fill="#000080" />
                </svg>
            );

        // Brazil 🇧🇷
        case 'BR':
            return (
                <svg viewBox="0 0 32 24" className={baseClass} aria-label={label} role="img">
                    <rect width="32" height="24" fill="#009739" />
                    <polygon points="16,3 29,12 16,21 3,12" fill="#FEDD00" />
                    <circle cx="16" cy="12" r="4.2" fill="#012169" />
                    <path d="M12.2,13.2 Q16,10 19.8,13.2" stroke="#FFFFFF" strokeWidth="0.8" fill="none" />
                </svg>
            );

        // Fallback generic globe
        default:
            return (
                <span className={`${baseClass} bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-slate-700 dark:text-slate-200 uppercase`}>
                    {c.slice(0, 2)}
                </span>
            );
    }
}

