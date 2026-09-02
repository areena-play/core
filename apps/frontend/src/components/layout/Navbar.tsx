'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useWebSocket } from '@/lib/useWebSocket';
import { getCommonNavSections, NavSection, NavItem } from '@/lib/navigation';
import {
    Menu,
    X,
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
    LogOut,
    Radio,
    Sun,
    Moon,
    Globe,
    ChevronDown,
    ChevronRight,
    Shield,
    Sparkles,
    Building2,
    Flame,
    ArrowUpRight,
    Layers,
    Users,
    ArrowLeft,
    Receipt,
    Activity,
    Cookie,
    HelpCircle,
    ShieldCheck,
    Mic,
    DollarSign,
    BarChart3,
} from 'lucide-react';

export function Navbar() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { isConnected } = useWebSocket();
    const { theme, resolvedTheme, setTheme } = useTheme();
    const { locale, setLocale, t, locales, supportedLocales } = useI18n();
    const { activeView, entityId, entityMeta, currentViewMeta, mainAssoc, associations } = useMainView();
    const pathname = usePathname();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const [isDemo, setIsDemo] = useState(false);

    // Track expanded status of collapsible groups in mobile menu
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        // keep the list empty, default is false for all groups
    });

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const userMenuRef = useRef<HTMLDivElement>(null);
    const langDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.getSetupStatus()
            .then((status) => {
                if (status?.isDemo) {
                    setIsDemo(true);
                }
            })
            .catch(() => {});
    }, []);

    const toggleTheme = () => {
        if (theme === 'system') {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        } else {
            setTheme(theme === 'dark' ? 'light' : 'dark');
        }
    };

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
                setLangDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';
    const CurrentViewIcon = currentViewMeta.icon;

    const sections = getCommonNavSections({
        activeView,
        entityId,
        pathname,
        t,
        user,
        mainAssoc,
        associations,
    });

    const headerTitle =
        entityMeta?.title ||
        (activeView === 'association' ? (mainAssoc?.name || 'Sports Federation') : t(currentViewMeta.labelKey));
    const headerBadge = entityMeta?.badge || t(currentViewMeta.badgeKey);
    const headerDesc = entityMeta?.subtitle || t(currentViewMeta.descKey);

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200">
                <div className="flex h-16 items-center justify-between px-3 sm:px-6">
                    {/* Left: Mobile Menu Toggle, Brand Logo & Entity Breadcrumb */}
                    <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
                        {/* Mobile Hamburger Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle Navigation Menu"
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden transition"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>

                        <div className="flex items-center gap-2">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="relative h-8 w-24 sm:h-10 sm:w-32">
                                    <Image
                                        key={logoSrc}
                                        src={logoSrc}
                                        alt="AREENA Logo"
                                        fill
                                        priority
                                        className="object-contain"
                                    />
                                </div>
                            </Link>
                            {isDemo && (
                                <Link
                                    href="/auth/login"
                                    title="Demo Instance Active - Click to switch demo accounts"
                                    className="hidden sm:inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider bg-red-600/90 hover:bg-red-600 text-white px-2 py-0.5 rounded-full shadow-sm transition hover:scale-105"
                                >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Demo Mode
                                </Link>
                            )}
                        </div>

                        {/* Breadcrumb / Main Association Name or Custom Logo */}
                        {entityMeta && activeView !== 'association' ? (
                            <div className="hidden md:flex items-center gap-2 text-xs border-l border-slate-300 dark:border-slate-700 pl-4">
                                <Link
                                    href="/"
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                                >
                                    {mainAssoc?.shortName || mainAssoc?.name || 'Federation'}
                                </Link>
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white max-w-[240px] lg:max-w-md truncate">
                                    <CurrentViewIcon className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                    <span className="truncate">{entityMeta.title}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="hidden lg:flex items-center border-l border-slate-300 dark:border-slate-700 pl-4">
                                {mainAssoc?.logoUrl ? (
                                    <div className="relative h-8 max-w-[140px] flex items-center">
                                        <img
                                            src={mainAssoc.logoUrl}
                                            alt={mainAssoc.name}
                                            className="h-7 max-w-[140px] object-contain"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide max-w-sm truncate">
                                        {mainAssoc?.name || ''}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Live Connection, Language Selector, Theme Toggle & Enhanced User Menu */}
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* WebSocket Status Indicator */}
                        <div
                            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-medium ${
                                isConnected
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40'
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${
                                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                }`}
                            />
                            <Radio className="h-3 w-3" />
                            <span className="hidden sm:inline">
                                {isConnected ? t('nav.liveSync') : t('nav.reconnecting')}
                            </span>
                        </div>

                        {/* Language Selector Dropdown (Desktop & Mobile in Navbar) */}
                        <div className="relative" ref={langDropdownRef}>
                            <button
                                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                                className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <span className="text-xs sm:text-sm leading-none">{locales[locale].flag}</span>
                                <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">
                                    {locales[locale].code}
                                </span>
                                <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400" />
                            </button>

                            {langDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-36 sm:w-40 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-1.5 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {t('nav.language')}
                                    </div>
                                    {supportedLocales.map((loc) => (
                                        <button
                                            key={loc}
                                            onClick={() => {
                                                setLocale(loc);
                                                setLangDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between rounded-lg px-2 sm:px-2.5 py-1.5 text-xs text-left transition ${
                                                locale === loc
                                                    ? 'bg-red-50 text-red-600 font-bold dark:bg-red-950/50 dark:text-red-400'
                                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5 sm:gap-2">
                                                <span className="text-xs sm:text-sm leading-none">{locales[loc].flag}</span>
                                                <span className="text-[11px] sm:text-xs">{locales[loc].nativeLabel}</span>
                                            </span>
                                            <span className="font-mono text-[9px] sm:text-[10px] uppercase text-slate-400">
                                                {loc}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            title={`Current theme: ${theme}`}
                            className="rounded-lg p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                        >
                            {resolvedTheme === 'dark' ? (
                                <Sun className="h-4 w-4 text-amber-400" />
                            ) : (
                                <Moon className="h-4 w-4 text-slate-700" />
                            )}
                        </button>

                        {/* Integrated User Profile & Role-Aware Menu Dropdown */}
                        {user ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-1 sm:px-2.5 sm:py-1.5 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 font-bold text-white text-xs shadow-xs">
                                        {user.firstName[0]}
                                        {user.lastName[0]}
                                    </div>
                                    <div className="hidden text-left md:block">
                                        <div className="font-bold text-slate-900 dark:text-slate-200 leading-tight text-xs">
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                                            {user.isSuperAdmin
                                                ? t('userMenu.roleSuperAdmin')
                                                : (user.associationRoles?.length ?? 0) > 0
                                                  ? t('userMenu.roleAssocAdmin')
                                                  : (user.clubRoles?.length ?? 0) > 0
                                                    ? t('userMenu.roleClubAdmin')
                                                    : user.email}
                                        </div>
                                    </div>
                                    <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:inline" />
                                </button>

                                {/* User Menu Popover */}
                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                                        {/* User Identity Header Card */}
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-950/60 mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 font-bold text-white text-sm shadow">
                                                    {user.firstName[0]}
                                                    {user.lastName[0]}
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>

                                            {user.licenseId && (
                                                <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 font-mono">License:</span>
                                                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                                                        #{user.licenseId}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* My Spaces Section */}
                                        <div className="space-y-1">
                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                {t('userMenu.mySpaces')}
                                            </div>

                                            {/* My Competitions */}
                                            <Link
                                                href="/profile#competitions"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <Trophy className="h-4 w-4 text-amber-500" />
                                                <span>{t('userMenu.myCompetitions')}</span>
                                            </Link>

                                            {/* My Licenses */}
                                            <Link
                                                href="/profile#licenses"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <Award className="h-4 w-4 text-emerald-500" />
                                                <span>{t('userMenu.myLicenses')}</span>
                                            </Link>

                                            {/* My Courses */}
                                            <Link
                                                href="/profile#courses"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <GraduationCap className="h-4 w-4 text-blue-500" />
                                                <span>{t('userMenu.myCourses')}</span>
                                            </Link>

                                            {/* (Only if any) My Admin Access */}
                                            {(user.isSuperAdmin || (user.associationRoles && user.associationRoles.length > 0) || (user.clubRoles && user.clubRoles.length > 0)) && (
                                                <Link
                                                    href="/profile#admin-access"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                >
                                                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                                                    <span>{t('userMenu.myAdminAccess')}</span>
                                                </Link>
                                            )}
                                        </div>

                                        {/* Account Section */}
                                        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                {t('userMenu.account')}
                                            </div>

                                            {/* My Profile & Settings */}
                                            <Link
                                                href="/profile#personal"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <User className="h-4 w-4 text-slate-400" />
                                                <span>{t('userMenu.myProfile')}</span>
                                            </Link>

                                            {/* Support & FAQs */}
                                            <Link
                                                href="/support"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <HelpCircle className="h-4 w-4 text-amber-500" />
                                                <span>{t('nav.support')}</span>
                                            </Link>
                                        </div>

                                        {/* Integrated Sign Out Button */}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                            <button
                                                onClick={() => {
                                                    setUserMenuOpen(false);
                                                    logout();
                                                }}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition"
                                            >
                                                <LogOut className="h-4 w-4 text-red-500" />
                                                <span>{t('nav.logOut')}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Link
                                    href={pathname && pathname !== '/auth/login' && pathname !== '/auth/register' ? `/auth/login?redirect=${encodeURIComponent(pathname)}` : '/auth/login'}
                                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition"
                                >
                                    {t('nav.signIn')}
                                </Link>
                                <Link
                                    href={pathname && pathname !== '/auth/login' && pathname !== '/auth/register' ? `/auth/register?redirect=${encodeURIComponent(pathname)}` : '/auth/register'}
                                    className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-red-700 transition"
                                >
                                    {t('nav.register')}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Slide-Over Navigation Drawer */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
                        {/* Top Bar: Logo & Close Button */}
                        <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white/95 dark:bg-slate-950/95">
                            <div className="relative h-8 w-28">
                                <Image
                                    key={logoSrc}
                                    src={logoSrc}
                                    alt="AREENA Logo"
                                    fill
                                    priority
                                    className="object-contain"
                                />
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                                aria-label="Close navigation"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Navigation Body */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
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
                                        <CurrentViewIcon className="h-3.5 w-3.5" />
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
                            </div>

                            {/* Regular Navigation Sections */}
                            <nav className="space-y-4">
                                {sections.map((section, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {section.sectionTitle}
                                        </div>
                                        {section.items.map((item, itemIdx) => {
                                            const isActive =
                                                pathname === item.href ||
                                                (item.href !== '/' &&
                                                    !item.href.includes('#') &&
                                                    pathname.startsWith(item.href));
                                            const Icon = item.icon;
                                            const hasChildren = item.children && item.children.length > 0;
                                            const isGroupExpanded = expandedGroups[item.id] ?? false;

                                            return (
                                                <div key={`${item.href}-${itemIdx}`} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Link
                                                            href={item.href}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className={`flex-1 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                                                                isActive && !hasChildren
                                                                    ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:text-red-500 dark:border-red-500/20 font-bold'
                                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <Icon
                                                                    className={`h-4 w-4 ${
                                                                        isActive && !hasChildren
                                                                            ? 'text-red-600 dark:text-red-500'
                                                                            : 'text-slate-400'
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

                                                    {hasChildren && isGroupExpanded && (
                                                        <div className="pl-6 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-4 my-1">
                                                            {item.children!.map((child, cIdx) => {
                                                                const isChildActive = pathname === child.href;
                                                                return (
                                                                    <Link
                                                                        key={cIdx}
                                                                        href={child.href}
                                                                        onClick={() => setMobileMenuOpen(false)}
                                                                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                                                                            isChildActive
                                                                                ? 'font-bold text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/30'
                                                                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                                        }`}
                                                                    >
                                                                        <span>{child.label}</span>
                                                                        {child.badge && (
                                                                            <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-400">
                                                                                {child.badge}
                                                                            </span>
                                                                        )}
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
                                            setMobileMenuOpen(false);
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
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                                    >
                                        {t('nav.dataProtection')}
                                    </Link>
                                    <Link
                                        href="/impressum"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                                    >
                                        {t('nav.impressum')}
                                    </Link>
                                    <Link
                                        href="/support"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                                    >
                                        Support
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}