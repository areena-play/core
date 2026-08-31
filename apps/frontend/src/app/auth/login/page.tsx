'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import {
    LogIn,
    AlertCircle,
    Sparkles,
    Shield,
    Building2,
    Home,
    GraduationCap,
    Award,
    Trophy,
    UserCheck,
    ArrowRight,
    Flame,
    Mail,
    CheckCircle2,
} from 'lucide-react';

interface DemoAccount {
    roleName: string;
    personName: string;
    email: string;
    password?: string;
    badge: string;
    badgeColor: string;
    description: string;
    icon: React.ReactNode;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
    {
        roleName: 'Super Administrator',
        personName: 'Super Admin',
        email: 'admin@areena.ch',
        badge: 'Root Access',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
        description: 'Global system administration, organization bootstrapping, and audit logs.',
        icon: <Shield className="w-4 h-4 text-red-400" />,
    },
    {
        roleName: 'Federation President',
        personName: 'Beat Hirschi (STTF)',
        email: 'president.sttf@areena.ch',
        badge: 'National Federation',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        description: 'Swiss Table Tennis Federation rules, seasonal approvals, and sanctioning.',
        icon: <Building2 className="w-4 h-4 text-indigo-400" />,
    },
    {
        roleName: 'Regional Admin',
        personName: 'Urs Bischofberger (OTTV)',
        email: 'regional.sttf.east@areena.ch',
        badge: 'Regional Federation',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        description: 'STTF Ostschweiz regional leagues, club affiliations, and fixtures.',
        icon: <Building2 className="w-4 h-4 text-purple-400" />,
    },
    {
        roleName: 'Club President',
        personName: 'Thomas Müller (TTC Zürich)',
        email: 'club.zurich@areena.ch',
        badge: 'Club Management',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        description: 'TTC Zürich-Affoltern player licensing, team rosters, and finances.',
        icon: <Home className="w-4 h-4 text-blue-400" />,
    },
    {
        roleName: 'Club Admin',
        personName: 'Adrian Wenger (TTC Bern)',
        email: 'club.bern@areena.ch',
        badge: 'Club Admin',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        description: 'TTC Bern Capitals membership management and team registrations.',
        icon: <Home className="w-4 h-4 text-sky-400" />,
    },
    {
        roleName: 'Head Coach & Instructor',
        personName: 'Hans Meier',
        email: 'coach.hans@areena.ch',
        badge: 'Certified Coach',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        description: 'Certified Coach license, course instructor for refresher seminars.',
        icon: <GraduationCap className="w-4 h-4 text-amber-400" />,
    },
    {
        roleName: 'Head Referee & Umpire',
        personName: 'Sandra Gerber',
        email: 'referee.sandra@areena.ch',
        badge: 'Certified Referee',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        description: 'National referee license, encounter officiating, and rule clinics.',
        icon: <Award className="w-4 h-4 text-amber-400" />,
    },
    {
        roleName: 'Elite Player (NLA)',
        personName: 'Marco Bernasconi (Rank #4)',
        email: 'player.marco@areena.ch',
        badge: 'ELO 1850',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Top-tier licensed athlete competing in Swiss National Championship.',
        icon: <Trophy className="w-4 h-4 text-emerald-400" />,
    },
    {
        roleName: 'Women League Player',
        personName: 'Elena Rossi (Rank #12)',
        email: 'player.elena@areena.ch',
        badge: 'ELO 1620',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Licensed player for CTT Genève competing in National League A.',
        icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
    },
    {
        roleName: 'Junior Athlete (U19)',
        personName: 'Lucas Weber (Rank #28)',
        email: 'player.junior.lucas@areena.ch',
        badge: 'Junior U19',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        description: 'Junior tournament participant for TTC Basel Rheinfelden.',
        icon: <Flame className="w-4 h-4 text-teal-400" />,
    },
];

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const { resolvedTheme } = useTheme();
    const { t } = useI18n();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
        const [resendStatus, setResendStatus] = useState<string | null>(null);
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [isDemo, setIsDemo] = useState(process.env.NEXT_PUBLIC_IS_DEMO === 'true');
    const [activeDemoCategory, setActiveDemoCategory] = useState<'ALL' | 'ADMINS' | 'CLUBS' | 'PLAYERS'>('ALL');

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    // Verify demo state from backend public config
    useEffect(() => {
        api.getPublicConfig()
            .then((cfg) => {
                if (typeof cfg?.isDemo === 'boolean') {
                    setIsDemo(cfg.isDemo);
                }
            })
            .catch(() => {
                // Fallback to NEXT_PUBLIC_IS_DEMO
            });
    }, []);

    const handleResendFromLogin = async (targetEmail: string) => {
        setResendLoading(true);
        setResendStatus(null);
        try {
            const res = await api.resendVerification(targetEmail);
            setResendStatus(res.message || t('auth.activationLinkSent'));
        } catch (err: any) {
            setResendStatus(err.message || 'Failed to resend verification email.');
        } finally {
            setResendLoading(false);
        }
    };

    const executeLogin = async (loginEmail: string, loginPass: string) => {
        setLoading(true);
        setErrorMsg('');
        setUnverifiedEmail(null);
        setResendStatus(null);

        try {
            const res = await api.login({ email: loginEmail, password: loginPass });
            login(res.token, res.user);
            router.push('/');
        } catch (err: any) {
            const isUnverified =
                err.status === 403 ||
                err.error === 'EMAIL_NOT_VERIFIED' ||
                err.code === 'EMAIL_NOT_VERIFIED' ||
                err.data?.error === 'EMAIL_NOT_VERIFIED' ||
                err.message?.includes('EMAIL_NOT_VERIFIED') ||
                err.message?.toLowerCase().includes('verify your email') ||
                err.message?.toLowerCase().includes('unverified');

            if (isUnverified) {
                const targetEmail = err.data?.email || loginEmail;
                setUnverifiedEmail(targetEmail);
                setErrorMsg(
                    err.data?.message ||
                    (err.message && err.message !== 'EMAIL_NOT_VERIFIED'
                        ? err.message
                        : t('auth.emailNotVerifiedDesc'))
                );
            } else {
                setErrorMsg(err.message || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

        const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError('');
        setForgotSuccess('');
        try {
            const res = await api.forgotPassword(forgotEmail);
            setForgotSuccess(res.message || t('auth.resetLinkSent') || 'If an account exists with this email address, a password reset link has been sent.');
        } catch (err: any) {
            setForgotError(err.message || 'Failed to send password reset link.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await executeLogin(email, password);
    };

    const handleQuickLogin = async (demoAccount: DemoAccount) => {
        setEmail(demoAccount.email);
        setPassword('Password123!');
        await executeLogin(demoAccount.email, 'Password123!');
    };

    const filteredDemoAccounts = DEMO_ACCOUNTS.filter((acc) => {
        if (activeDemoCategory === 'ADMINS') {
            return acc.email.includes('admin') || acc.email.includes('president') || acc.email.includes('regional');
        }
        if (activeDemoCategory === 'CLUBS') {
            return acc.email.includes('club') || acc.email.includes('coach') || acc.email.includes('referee');
        }
        if (activeDemoCategory === 'PLAYERS') {
            return acc.email.includes('player');
        }
        return true;
    });

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
            <div className={`w-full ${isDemo ? 'max-w-4xl' : 'max-w-md'} space-y-6 transition-all duration-300`}>
                {/* Brand Logo Header */}
                <div className="text-center space-y-2">
                    <div className="relative h-12 w-40 mx-auto">
                        <Image key={logoSrc} src={logoSrc} alt="AREENA Logo" fill priority className="object-contain" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('auth.loginTitle')}</h1>
                        {isDemo && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                                <Sparkles className="w-3 h-3" />
                                Demo Site
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isDemo
                            ? 'Welcome to the AREENA demonstration instance. Sign in with any of the pre-configured demo personas below.'
                            : t('auth.loginSubtitle')}
                    </p>
                </div>

                <div className={`grid grid-cols-1 ${isDemo ? 'lg:grid-cols-12' : ''} gap-6 items-start`}>
                    {/* Login Form Card */}
                    <div
                        className={`${
                            isDemo ? 'lg:col-span-5' : 'w-full'
                        } rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 md:p-8 shadow-sm dark:shadow-xl space-y-5 text-xs`}
                    >
                        {errorMsg && (
                            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/80 dark:bg-red-950/60 p-4 text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                                <div className="flex items-start gap-2.5">
                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        {unverifiedEmail && (
                                            <div className="font-bold text-xs text-red-900 dark:text-red-200">
                                                {t('auth.emailNotVerifiedTitle')}
                                            </div>
                                        )}
                                        <div className="text-xs leading-relaxed">{errorMsg}</div>
                                    </div>
                                </div>
                                {unverifiedEmail && (
                                    <div className="pt-3 border-t border-red-200/70 dark:border-red-800/60 space-y-2">
                                        {resendStatus ? (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                <span>{resendStatus}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-red-100/50 dark:bg-red-900/30 p-2.5 rounded-lg border border-red-200/60 dark:border-red-800/40">
                                                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                                                    {t('auth.didntReceiveEmail')}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={resendLoading}
                                                    onClick={() => handleResendFromLogin(unverifiedEmail)}
                                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition shadow-xs active:scale-95 disabled:opacity-50"
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                    <span>{resendLoading ? t('auth.resending') : t('auth.resendActivationLink')}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {forgotMode ? (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="space-y-1">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {t('auth.forgotPasswordTitle')}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {t('auth.forgotPasswordSubtitle')}
                                    </p>
                                </div>

                                {forgotError && (
                                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <div>{forgotError}</div>
                                    </div>
                                )}

                                {forgotSuccess && (
                                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>{forgotSuccess}</div>
                                    </div>
                                )}

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.email')}
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="name@example.ch"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition active:scale-[0.99]"
                                >
                                    <Mail className="h-4 w-4" />
                                    <span>{forgotLoading ? t('common.loading') : t('auth.sendResetLink')}</span>
                                </button>

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotMode(false);
                                            setForgotSuccess('');
                                            setForgotError('');
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                                    >
                                        <span>← {t('auth.backToSignIn')}</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.email')}
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="name@example.ch"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            {t('auth.password')}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForgotMode(true);
                                                setForgotEmail(email);
                                                setErrorMsg('');
                                            }}
                                            className="text-[11px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400 hover:underline"
                                        >
                                            {t('auth.forgotPasswordLink')}
                                        </button>
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition active:scale-[0.99]"
                                >
                                    <LogIn className="h-4 w-4" />
                                    <span>{loading ? t('common.loading') : t('auth.loginButton')}</span>
                                </button>
                            </form>
                        )}

                        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            {t('auth.noAccount')}{' '}
                            <Link
                                href="/auth/register"
                                className="text-red-600 dark:text-red-400 font-semibold hover:underline"
                            >
                                {t('auth.registerButton')}
                            </Link>
                        </div>
                    </div>

                    {/* ONLY ON DEMO SITES: Demo Accounts Explorer & One-Click Login */}
                    {isDemo && (
                        <div className="lg:col-span-7 rounded-2xl border border-red-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 md:p-6 shadow-xl space-y-4 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-red-500" />
                                        Demo Accounts & Roles
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Click any demo persona to automatically log in. (Password: <code className="text-red-300 font-mono">Password123!</code>)
                                    </p>
                                </div>

                                {/* Category Filters */}
                                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 self-start sm:self-auto">
                                    {(['ALL', 'ADMINS', 'CLUBS', 'PLAYERS'] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setActiveDemoCategory(cat)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                                activeDemoCategory === cat
                                                    ? 'bg-red-600 text-white shadow-sm'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {cat === 'ALL'
                                                ? 'All'
                                                : cat === 'ADMINS'
                                                  ? 'Admins'
                                                  : cat === 'CLUBS'
                                                    ? 'Clubs & Officials'
                                                    : 'Athletes'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Demo Accounts Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                                {filteredDemoAccounts.map((account) => (
                                    <button
                                        key={account.email}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => handleQuickLogin(account)}
                                        className="group flex flex-col justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-red-500/40 text-left transition-all active:scale-[0.98] shadow-sm hover:shadow-red-950/20"
                                    >
                                        <div className="space-y-1.5 w-full">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="p-1 rounded bg-slate-800/80 border border-slate-700/50 shrink-0">
                                                        {account.icon}
                                                    </div>
                                                    <span className="font-bold text-white text-xs truncate">
                                                        {account.roleName}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${account.badgeColor} shrink-0`}
                                                >
                                                    {account.badge}
                                                </span>
                                            </div>

                                            <div className="text-[11px] font-semibold text-slate-300">
                                                {account.personName}
                                            </div>

                                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                                                {account.description}
                                            </p>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between w-full text-[10px]">
                                            <span className="text-slate-400 font-mono truncate">{account.email}</span>
                                            <span className="text-red-400 font-semibold inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                Sign In <ArrowRight className="w-2.5 h-2.5" />
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
                                <span>⏰ Database auto-resets every day at 02:00 AM CET</span>
                                <span className="text-slate-400 font-mono">AREENA Demo Engine</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

