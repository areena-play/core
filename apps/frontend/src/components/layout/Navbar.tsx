'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import { useWebSocket } from '@/lib/useWebSocket';
import { SupportedLocale } from '@areena/shared';
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
} from 'lucide-react';

export function Navbar() {
    const { user, logout } = useAuth();
    const { isConnected } = useWebSocket();
    const { theme, resolvedTheme, setTheme } = useTheme();
    const { locale, setLocale, t, locales, supportedLocales } = useI18n();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const toggleTheme = () => {
        if (resolvedTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    };

    // Close lang dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
                setLangDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

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
        <>
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200">
                <div className="flex h-16 items-center justify-between px-3 sm:px-6">
                    {/* Left: Mobile Menu Button & Brand Logo */}
                    <div className="flex items-center gap-2 sm:gap-6">
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

                        <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:inline-block border-l border-slate-300 dark:border-slate-700 pl-4">
                            {t('nav.sportsManagement')}
                        </span>
                    </div>

                    {/* Right: Live Connection, Language Selector, Theme Toggle & User Info */}
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
                            title={`Current theme: ${theme} (Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'})`}
                            className="rounded-lg p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                        >
                            {resolvedTheme === 'dark' ? (
                                <Sun className="h-4 w-4 text-amber-400" />
                            ) : (
                                <Moon className="h-4 w-4 text-slate-700" />
                            )}
                        </button>

                        {user ? (
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* License Badge */}
                                {user.licenseId && (
                                    <div className="hidden xl:flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800/40 px-2 py-0.5 text-xs font-mono text-red-800 dark:text-red-300">
                                        <Award className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                        <span>LIC #{user.licenseId}</span>
                                    </div>
                                )}

                                {/* User Profile Link */}
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-1 sm:px-3 sm:py-1.5 text-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 font-bold text-white text-xs">
                                        {user.firstName[0]}
                                        {user.lastName[0]}
                                    </div>
                                    <div className="hidden text-left md:block">
                                        <div className="font-medium text-slate-900 dark:text-slate-200 leading-tight text-xs">
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                            {user.isSuperAdmin ? t('nav.superAdmin') : user.email}
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    onClick={logout}
                                    title={t('nav.logOut')}
                                    aria-label={t('nav.logOut')}
                                    className="rounded-lg p-1.5 sm:p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400 transition"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
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

                            {/* User Summary if logged in */}
                            {user && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 p-3 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 font-bold text-white text-xs">
                                            {user.firstName[0]}
                                            {user.lastName[0]}
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                {user.firstName} {user.lastName}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                    {user.licenseId && (
                                        <div className="pt-1 text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                                            License #{user.licenseId}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation List */}
                            <nav className="space-y-1">
                                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {t('nav.navigation')}
                                </div>
                                {navItems.map((item) => {
                                    const isActive =
                                        pathname === item.href ||
                                        (item.href !== '/' && pathname.startsWith(item.href));
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition ${
                                                isActive
                                                    ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:text-red-500 dark:border-red-500/20 font-semibold'
                                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                                            }`}
                                        >
                                            <Icon
                                                className={`h-4 w-4 ${
                                                    isActive ? 'text-red-600 dark:text-red-500' : 'text-slate-400'
                                                }`}
                                            />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
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
