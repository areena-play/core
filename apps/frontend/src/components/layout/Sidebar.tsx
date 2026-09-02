'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    Trophy,
    Award,
    BookOpen,
    Network,
    Mail,
    Code2,
    Sliders,
    CheckSquare,
    GraduationCap,
    Shield,
    Layers,
    Users,
    Flame,
    ArrowLeft,
    Sparkles,
    Receipt,
    Activity,
    Cookie,
    HelpCircle,
    Calculator,
    Table as TableIcon,
    ChevronDown,
    ChevronRight,
    Building2,
    ShieldAlert,
    Settings,
    Megaphone,
    MessageSquare,
    UserCheck,
    BarChart3,
    DollarSign,
    Mic,
    Key,
    MapPin,
} from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useAuth } from '@/lib/authContext';
import { getCommonNavSections, NavSection, NavItem, SubNavItem } from '@/lib/navigation';

function SidebarContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const { user } = useAuth();
    const { activeView, entityId, entityMeta, currentViewMeta, mainAssoc, associations } = useMainView();

    // Track expanded status of collapsible groups (e.g. Competitions, People, Associations)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        // keep the list empty, default is false for all groups
    });

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const ActiveIcon = currentViewMeta.icon;

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const sections = getCommonNavSections({
        activeView,
        entityId,
        pathname,
        t,
        user,
        mainAssoc,
        associations,
    });

    // Determine header card contents
    const headerTitle =
        entityMeta?.title ||
        (activeView === 'association' ? (mainAssoc?.name || 'Sports Federation') : t(currentViewMeta.labelKey));
    const headerBadge = entityMeta?.badge || t(currentViewMeta.badgeKey);
    const headerDesc = entityMeta?.subtitle || t(currentViewMeta.descKey);

    // Precise active navigation resolver
    const isNavActive = (targetHref: string) => {
        if (!targetHref) return false;
        const [targetPath, targetQuery] = targetHref.split('?');

        // 1. If targetHref has query params (e.g. ?type=league or ?role=player)
        if (targetQuery) {
            if (pathname !== targetPath) return false;
            const targetParams = new URLSearchParams(targetQuery);
            for (const [key, value] of targetParams.entries()) {
                if (searchParams.get(key)?.toLowerCase() !== value.toLowerCase()) {
                    return false;
                }
            }
            return true;
        }

        // 2. If targetHref has NO query params:
        // Exact pathname match ONLY. When specific query params are present (type or role),
        // do not keep the bare parent overview item highlighted.
        if (pathname === targetPath) {
            if (searchParams.has('type') || searchParams.has('role')) {
                return false;
            }
            return true;
        }

        return false;
    };

    return (
        <aside className="w-64 h-full flex-shrink-0 border-r border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70 hidden md:flex md:flex-col justify-between transition-colors duration-200">
            {/* Scrollable Navigation Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 scrollbar-none">
                {/* Active Workspace Header Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${currentViewMeta.badgeColor}`}
                        >
                            {headerBadge}
                        </span>
                        <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${currentViewMeta.gradientBg} text-white shadow-xs`}
                        >
                            <ActiveIcon className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-1">
                            {headerTitle}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {headerDesc}
                        </p>
                    </div>

                    {/* Return to Main Starting Page Link */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition group"
                        >
                            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
                            <span>Return to Main Starting Page</span>
                        </Link>
                    </div>
                </div>

                {/* Dynamic Navigation Sections */}
                <nav className="space-y-5">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            {section.sectionTitle && (
                                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {section.sectionTitle}
                                </div>
                            )}
                            {section.items.map((item, itemIdx) => {
                                const hasChildren = item.children && item.children.length > 0;
                                const isGroupExpanded = expandedGroups[item.id] ?? false;
                                const isItemActive = isNavActive(item.href);

                                const Icon = item.icon;

                                return (
                                    <div key={`${item.href}-${itemIdx}`} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Link
                                                href={item.href}
                                                className={`flex-1 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                                                    isItemActive && !hasChildren
                                                        ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:text-red-500 dark:border-red-500/20 font-bold'
                                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Icon
                                                        className={`h-4 w-4 ${
                                                            isItemActive ? 'text-red-600 dark:text-red-500' : 'text-slate-400'
                                                        }`}
                                                    />
                                                    <span>{item.label}</span>
                                                </div>
                                            </Link>
                                            {hasChildren && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(item.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                                >
                                                    {isGroupExpanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Render Collapsible Children Sub-Links */}
                                        {hasChildren && isGroupExpanded && (
                                            <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-800/80 space-y-1 pt-0.5">
                                                {item.children!.map((sub, subIdx) => {
                                                    const isSubActive = isNavActive(sub.href);

                                                    return (
                                                        <Link
                                                            key={`${sub.href}-${subIdx}`}
                                                            href={sub.href}
                                                            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                                                                isSubActive
                                                                    ? 'text-red-600 dark:text-red-400 font-bold bg-red-50/50 dark:bg-red-950/30'
                                                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                                                            }`}
                                                        >
                                                            <span>{sub.label}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Sticky Fixed Bottom AREENA Tag & Legal Links */}
            <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs">
                <div className="block rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 p-2.5 transition">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                            <div className="relative h-4 w-4 shrink-0">
                                <Image src="/icon.svg" alt="AREENA" fill className="object-contain" />
                            </div>
                            <span>AREENA</span>
                            <span className="text-[9.5px] font-normal text-slate-400">© {new Date().getFullYear()}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[8.5px] text-slate-400 dark:text-slate-500">
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(
                                        new CustomEvent('areena:open-cookie-settings'),
                                    );
                                }
                            }}
                            className="flex items-center gap-0.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            <Cookie className="h-2.5 w-2.5 text-amber-500/80" />
                            <span>{t('cookieConsent.shortLabel')}</span>
                        </button>
                        <Link
                            href="/data-protection"
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            {t('nav.dataProtection')}
                        </Link>
                        <Link
                            href="/impressum"
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            {t('nav.impressum')}
                        </Link>
                        <Link
                            href="/support"
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            Support
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export function Sidebar() {
    return (
        <React.Suspense fallback={<aside className="w-64 h-full flex-shrink-0 border-r border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/70 hidden md:flex" />}>
            <SidebarContent />
        </React.Suspense>
    );
}
