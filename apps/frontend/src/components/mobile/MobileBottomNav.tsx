'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Search, Calendar, User, Zap } from 'lucide-react';
import { triggerHaptic } from '@/lib/pwa/useHaptics';
import { useAuth } from '@/lib/authContext';

interface MobileBottomNavProps {
    onOpenScorepad?: () => void;
}

export function MobileBottomNav({ onOpenScorepad }: MobileBottomNavProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    const tabs = [
        {
            name: 'Competitions',
            href: '/competitions',
            icon: Trophy,
            isActive: pathname.startsWith('/competition'),
        },
        {
            name: 'Search',
            href: '/search',
            icon: Search,
            isActive: pathname.startsWith('/search'),
        },
        {
            name: 'Scorepad',
            action: onOpenScorepad,
            icon: Zap,
            isSpecial: true,
            isActive: false,
        },
        {
            name: 'Calendar',
            href: '/calendar',
            icon: Calendar,
            isActive: pathname.startsWith('/calendar'),
        },
        {
            name: user ? 'Passport' : 'Sign In',
            href: user ? '/profile' : '/auth/login',
            icon: User,
            isActive: pathname.startsWith('/profile') || pathname.startsWith('/auth'),
        },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;

                    if (tab.isSpecial) {
                        return (
                            <button
                                key={tab.name}
                                onClick={() => {
                                    triggerHaptic('medium');
                                    if (tab.action) tab.action();
                                    else if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('areena:open-scorepad'));
                                    }
                                }}
                                className="flex flex-col items-center justify-center -mt-5 group"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/40 group-active:scale-95 transition-transform duration-150">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">
                                    {tab.name}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href!}
                            onClick={() => triggerHaptic('light')}
                            className={`flex flex-col items-center justify-center w-16 py-1 transition-colors rounded-xl active:scale-95 duration-150 ${
                                tab.isActive
                                    ? 'text-red-600 dark:text-red-400 font-bold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className={`h-5 w-5 ${tab.isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                            <span className="text-[10px] tracking-tight mt-1">{tab.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

