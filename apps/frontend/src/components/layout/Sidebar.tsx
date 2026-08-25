'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    Trophy,
    Award,
    Network,
    Mail,
    Code2,
    User,
    Sliders,
    CheckSquare,
    GraduationCap,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';

export function Sidebar() {
    const pathname = usePathname();
    const { t } = useI18n();

    const navItems = [
        { label: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
        { label: t('nav.calendar'), href: '/calendar', icon: Calendar },
        { label: t('nav.competitions'), href: '/competitions', icon: Trophy },
        { label: t('nav.licenses'), href: '/licenses', icon: Award },
        { label: t('nav.refresherCourses'), href: '/licenses/refresher-courses', icon: GraduationCap },
        { label: t('nav.approvals'), href: '/licenses/approvals', icon: CheckSquare },
        { label: t('nav.associations'), href: '/associations', icon: Network },
        { label: t('nav.associationSettings'), href: '/associations/settings', icon: Sliders },
        { label: t('nav.communications'), href: '/communications', icon: Mail },
        { label: t('nav.developerApi'), href: '/developers', icon: Code2 },
        { label: t('nav.profile'), href: '/profile', icon: User },
    ];

    return (
        <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/60 hidden md:block transition-colors duration-200">
            <div className="flex h-full flex-col justify-between p-4">
                <nav className="space-y-1">
                    <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('nav.navigation')}
                    </div>
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:text-red-500 dark:border-red-500/20 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <Icon
                                    className={`h-4 w-4 ${isActive ? 'text-red-600 dark:text-red-500' : 'text-slate-400'}`}
                                />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Association Branding Badge at bottom */}
                <div className="rounded-xl border border-slate-200 bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/50 p-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="font-semibold text-slate-900 dark:text-slate-300">AREENA Core v1.0</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
                        {t('nav.sportsManagement')}
                    </div>
                </div>
            </div>
        </aside>
    );
}
