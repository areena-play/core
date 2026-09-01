'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import { UserPlus, AlertCircle } from 'lucide-react';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/';
    const { login } = useAuth();
    const { resolvedTheme } = useTheme();
    const { t } = useI18n();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('Switzerland');

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [registeredPendingEmail, setRegisteredPendingEmail] = useState<string | null>(null);

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const res = await api.register({
                email,
                password,
                firstName,
                lastName,
                phone,
                street,
                postalCode,
                city,
                country,
            });

            if (res.requiresVerification) {
                setRegisteredPendingEmail(email);
            } else {
                login(res.token, res.user);
                router.push(redirectUrl);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    if (registeredPendingEmail) {
        return (
            <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center space-y-2">
                        <div className="relative h-12 w-40 mx-auto">
                            <Image key={logoSrc} src={logoSrc} alt="AREENA Logo" fill priority className="object-contain" />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 md:p-8 shadow-sm dark:shadow-xl space-y-6 text-xs text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                            <UserPlus className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Account Created Successfully!
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                We've sent an email verification link to{' '}
                                <strong className="text-slate-900 dark:text-white">{registeredPendingEmail}</strong>.
                                Please check your inbox and click the link to activate your account.
                            </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                            <Link
                                href="/auth/login"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 shadow transition"
                            >
                                <span>Go to Sign In</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-lg space-y-6">
                <div className="text-center space-y-2">
                    <div className="relative h-12 w-40 mx-auto">
                        <Image key={logoSrc} src={logoSrc} alt="AREENA Logo" fill priority className="object-contain" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('auth.registerTitle')}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('auth.registerSubtitle')}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 md:p-8 shadow-sm dark:shadow-xl space-y-5 text-xs">
                    {errorMsg && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/80 p-3 text-red-800 dark:text-red-300">
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>{errorMsg}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.firstName')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Roger"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.lastName')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Federer"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                                {t('common.email')}
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="roger@tennis.ch"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                                {t('auth.password')}
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            {password && <PasswordRequirements password={password} className="mt-2" />}
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                                {t('profile.phone')}
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="+41 79 123 45 67"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                                {t('profile.street')}
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Bahnhofstrasse 1"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.postalCode')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="8001"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.city')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Zurich"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                                {t('profile.country')}
                            </label>
                            <input
                                type="text"
                                required
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition"
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>{loading ? t('common.loading') : t('auth.registerButton')}</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                    {t('auth.hasAccount')}{' '}
                    <Link
                        href="/auth/login"
                        className="text-red-600 dark:text-red-400 font-semibold hover:underline"
                    >
                        {t('auth.loginButton')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <React.Suspense
            fallback={
                <div className="min-h-[85vh] flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                </div>
            }
        >
            <RegisterForm />
        </React.Suspense>
    );
}
