'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { ShieldAlert, LogIn, ArrowLeft, UserX, KeyRound, Sparkles } from 'lucide-react';

interface AccessDeniedProps {
    title?: string;
    description?: string;
    requiredRole?: string;
    returnHref?: string;
}

export function AccessDenied({
    title = 'Access Restricted',
    description,
    requiredRole = 'Association Administrator or Super Administrator',
    returnHref = '/',
}: AccessDeniedProps) {
    const { user, loading: authLoading, justLoggedOut } = useAuth();
    const { t } = useI18n();
    const pathname = usePathname();
    const router = useRouter();

    const isAnonymous = !user;
    const loginHref = pathname && pathname !== '/auth/login' ? `/auth/login?redirect=${encodeURIComponent(pathname)}` : '/auth/login';

    // If the user logs out and lands on an AccessDenied page, immediately redirect to homepage
    const prevUserRef = React.useRef(user);
    React.useEffect(() => {
        if (justLoggedOut || (!authLoading && prevUserRef.current && !user)) {
            router.replace('/');
        }
        prevUserRef.current = user;
    }, [user, authLoading, justLoggedOut, router]);

    if (justLoggedOut) {
        return null;
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl border border-red-200 dark:border-red-900/40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
                {/* Icon Badge */}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400 border border-red-200 dark:border-red-800/50 shadow-inner">
                    <ShieldAlert className="h-8 w-8 animate-pulse" />
                </div>

                {/* Heading & Context */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-red-600/10 dark:bg-red-600/20 px-3 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30 uppercase tracking-wider">
                        <KeyRound className="h-3 w-3" />
                        <span>Insufficient Privileges</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {title}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                        {description ||
                            `This workspace is restricted to authorized personnel (${requiredRole}). Your current account does not have sufficient access rights.`}
                    </p>
                </div>

                {/* Current User Status Badge */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60 p-3.5 text-xs flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                            {user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : <UserX className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                                {user ? `${user.firstName} ${user.lastName}` : 'Anonymous Visitor'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {user
                                    ? user.isSuperAdmin
                                        ? 'Super Administrator'
                                        : user.associationRoles && user.associationRoles.length > 0
                                        ? `${user.associationRoles.map((r) => r.role).join(', ')} (Assoc)`
                                        : user.clubRoles && user.clubRoles.length > 0
                                        ? `${user.clubRoles.map((r) => r.role).join(', ')} (Club)`
                                        : 'Regular Licensed Member'
                                    : 'Not Authenticated'}
                            </div>
                        </div>
                    </div>

                    <span className="rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-2 py-0.5 text-[10px] font-bold uppercase flex-shrink-0">
                        {isAnonymous ? 'Sign In Required' : 'Access Denied'}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                        href={returnHref}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Return to Overview</span>
                    </Link>

                    {isAnonymous ? (
                        <Link
                            href={loginHref}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-red-700 transition"
                        >
                            <LogIn className="h-4 w-4" />
                            <span>Sign In with Admin Account</span>
                        </Link>
                    ) : (
                        <Link
                            href={loginHref}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                            <LogIn className="h-4 w-4" />
                            <span>Switch Account</span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

