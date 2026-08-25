'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useWebSocket } from '@/lib/useWebSocket';
import { Bell, User, LogOut, Shield, Award, Radio, Sun, Moon, Laptop } from 'lucide-react';

export function Navbar() {
    const { user, logout } = useAuth();
    const { isConnected } = useWebSocket();
    const { theme, resolvedTheme, setTheme } = useTheme();

    const toggleTheme = () => {
        if (resolvedTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    };

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                {/* Left: Brand Logo & Title */}
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative h-9 w-28 sm:h-10 sm:w-32">
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
                    <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:inline-block border-l border-slate-300 dark:border-slate-700 pl-4">
                        Sports Association Management
                    </span>
                </div>

                {/* Right: Live Connection, Theme Toggle, Notifications & User Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                    {/* WebSocket Status Indicator */}
                    <div
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            isConnected
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40'
                        }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${
                                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                        />
                        <Radio className="h-3 w-3" />
                        <span className="hidden sm:inline">{isConnected ? 'Live Sync' : 'Reconnecting...'}</span>
                    </div>

                    {/* Quick Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        title={`Current theme: ${theme} (Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'})`}
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                    >
                        {resolvedTheme === 'dark' ? (
                            <Sun className="h-4 w-4 text-amber-400" />
                        ) : (
                            <Moon className="h-4 w-4 text-slate-700" />
                        )}
                    </button>

                    {user ? (
                        <div className="flex items-center gap-3">
                            {/* License Badge if exists */}
                            {user.licenseId && (
                                <div className="hidden lg:flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800/40 px-2.5 py-1 text-xs font-mono text-red-800 dark:text-red-300">
                                    <Award className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                    <span>LIC #{user.licenseId}</span>
                                </div>
                            )}

                            {/* User Profile Link */}
                            <Link
                                href="/profile"
                                className="flex items-center gap-2.5 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-3 py-1.5 text-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 font-bold text-white text-xs">
                                    {user.firstName[0]}
                                    {user.lastName[0]}
                                </div>
                                <div className="hidden text-left md:block">
                                    <div className="font-medium text-slate-900 dark:text-slate-200 leading-tight">
                                        {user.firstName} {user.lastName}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {user.isSuperAdmin ? 'Federation Super Admin' : user.email}
                                    </div>
                                </div>
                            </Link>

                            <button
                                onClick={logout}
                                title="Log out"
                                aria-label="Log out"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400 transition"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/auth/login"
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-red-700 transition"
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
