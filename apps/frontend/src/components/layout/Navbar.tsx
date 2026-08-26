'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useWebSocket } from '@/lib/useWebSocket';
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
} from 'lucide-react';

export function Navbar() {
    const { user, logout } = useAuth();
    const { isConnected } = useWebSocket();
    const { theme, resolvedTheme, setTheme } = useTheme();
    const { locale, setLocale, t, locales, supportedLocales } = useI18n();
    const { activeView, entityMeta, currentViewMeta } = useMainView();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);

    const userMenuRef = useRef<HTMLDivElement>(null);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const toggleTheme = () => {
        if (resolvedTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    };

    const [mainAssoc, setMainAssoc] = useState<any | null>(null);

    useEffect(() => {
        async function loadMainAssoc() {
            try {
                const data = await api.getAssociations();
                const top = data.associations?.find((a: any) => a.isTopLevel) || data.associations?.[0];
                if (top) {
                    setMainAssoc(top);
                }
            } catch {}
        }
        loadMainAssoc();
    }, []);

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

                        {/* Language Selector Dropdown (Desktop) */}
                        <div className="relative hidden sm:block" ref={langDropdownRef}>
                            <button
                                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <span className="text-sm leading-none">{locales[locale].flag}</span>
                                <span className="font-semibold uppercase tracking-wider text-[11px]">
                                    {locales[locale].code}
                                </span>
                                <ChevronDown className="h-3 w-3 text-slate-400" />
                            </button>

                            {langDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-1.5 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
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
                                            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                                                locale === loc
                                                    ? 'bg-red-50 text-red-600 font-bold dark:bg-red-950/50 dark:text-red-400'
                                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="text-sm leading-none">{locales[loc].flag}</span>
                                                <span>{locales[loc].nativeLabel}</span>
                                            </span>
                                            <span className="font-mono text-[10px] uppercase text-slate-400">
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

                                        {/* My Workspaces & Accessible Pages */}
                                        <div className="space-y-1">
                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                {t('userMenu.myWorkspaces')}
                                            </div>

                                            {/* Super Admin Top Federation Link */}
                                            {user.isSuperAdmin && (
                                                <Link
                                                    href="/"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Network className="h-4 w-4 text-red-500" />
                                                        <span>{t('userMenu.topFederation')}</span>
                                                    </div>
                                                    <span className="rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 text-[10px] px-1.5 py-0.2 font-bold">
                                                        Admin
                                                    </span>
                                                </Link>
                                            )}

                                            {/* Association Admin Links */}
                                            {user.associationRoles?.map((r: any) => (
                                                <Link
                                                    key={r.associationId}
                                                    href={`/association/${r.associationId}`}
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Network className="h-4 w-4 text-red-500" />
                                                        <span>Association #{r.associationId.slice(0, 8)}</span>
                                                    </div>
                                                    <span className="rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.2 font-mono font-bold">
                                                        {r.role}
                                                    </span>
                                                </Link>
                                            ))}

                                            {/* Club Admin Links */}
                                            {user.clubRoles?.map((r: any) => (
                                                <Link
                                                    key={r.clubId}
                                                    href={`/club/${r.clubId}`}
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Shield className="h-4 w-4 text-blue-500" />
                                                        <span>Club Portal</span>
                                                    </div>
                                                    <span className="rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 text-[10px] px-1.5 py-0.2 font-bold">
                                                        {r.role}
                                                    </span>
                                                </Link>
                                            ))}

                                            {/* Tournaments Link */}
                                            <Link
                                                href="/tournaments"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <Trophy className="h-4 w-4 text-amber-500" />
                                                <span>{t('userMenu.myTournaments')}</span>
                                            </Link>

                                            {/* Licenses Link */}
                                            <Link
                                                href="/licenses"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <Award className="h-4 w-4 text-emerald-500" />
                                                <span>{t('userMenu.myLicenses')}</span>
                                            </Link>
                                        </div>

                                        {/* Account & Profile */}
                                        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                {t('userMenu.account')}
                                            </div>

                                            <Link
                                                href="/profile"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <User className="h-4 w-4 text-slate-400" />
                                                <span>{t('userMenu.myProfile')}</span>
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
                                    href="/auth/login"
                                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition"
                                >
                                    {t('nav.signIn')}
                                </Link>
                                <Link
                                    href="/auth/register"
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
                    <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl p-4 flex flex-col justify-between overflow-y-auto">
                        <div className="space-y-4">
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
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
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* User Summary if logged in */}
                            {user && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 p-3 space-y-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 font-bold text-white text-xs">
                                            {user.firstName[0]}
                                            {user.lastName[0]}
                                        </div>
                                        <div className="overflow-hidden flex-1">
                                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                {user.firstName} {user.lastName}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile accessible links */}
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                                        {user.isSuperAdmin && (
                                            <Link
                                                href="/"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 py-1"
                                            >
                                                <Network className="h-3.5 w-3.5" />
                                                <span>{t('userMenu.topFederation')}</span>
                                            </Link>
                                        )}
                                        <Link
                                            href="/tournaments"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 py-1"
                                        >
                                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                            <span>{t('userMenu.myTournaments')}</span>
                                        </Link>
                                        <Link
                                            href="/licenses"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 py-1"
                                        >
                                            <Award className="h-3.5 w-3.5 text-emerald-500" />
                                            <span>{t('userMenu.myLicenses')}</span>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Language Switcher in Mobile Drawer */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 p-2.5 space-y-1.5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {t('nav.language')}
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {supportedLocales.map((loc) => (
                                        <button
                                            key={loc}
                                            onClick={() => setLocale(loc)}
                                            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition ${
                                                locale === loc
                                                    ? 'bg-white shadow text-red-600 font-bold dark:bg-slate-800 dark:text-red-400'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <span className="text-sm">{locales[loc].flag}</span>
                                            <span className="truncate">{locales[loc].nativeLabel}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">{t('nav.theme')}</span>
                                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 p-0.5">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`rounded px-2 py-1 text-[11px] ${
                                            theme === 'light'
                                                ? 'bg-white shadow text-red-600 font-bold'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        {t('common.light')}
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`rounded px-2 py-1 text-[11px] ${
                                            theme === 'dark'
                                                ? 'bg-slate-800 shadow text-red-400 font-bold'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        {t('common.dark')}
                                    </button>
                                </div>
                            </div>

                            {user ? (
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-100 text-red-600 hover:bg-red-50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40 py-2 text-xs font-semibold transition"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>{t('nav.logOut')}</span>
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href="/auth/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="rounded-lg border border-slate-300 dark:border-slate-700 py-2 text-center text-xs font-semibold text-slate-800 dark:text-slate-200"
                                    >
                                        {t('nav.signIn')}
                                    </Link>
                                    <Link
                                        href="/auth/register"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="rounded-lg bg-red-600 py-2 text-center text-xs font-semibold text-white shadow"
                                    >
                                        {t('nav.register')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
