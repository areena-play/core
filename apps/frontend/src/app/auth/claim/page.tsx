'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2, ArrowRight, UserCheck, Sparkles, Mail } from 'lucide-react';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { normalizePhoneNumber } from '@areena/shared';
import { PhoneInput } from '@/components/ui/PhoneInput';

function ClaimProfileForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryToken = searchParams.get('token') || '';
    const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl') || '/profile';
    const { user, loading: authLoading, login } = useAuth();
    const { resolvedTheme } = useTheme();
    const { t } = useI18n();

    // Redirect to profile if already authenticated
    useEffect(() => {
        if (!authLoading && user) {
            router.replace(redirectUrl);
        }
    }, [user, authLoading, router, redirectUrl]);

    const [mode, setMode] = useState<'LICENSE' | 'TOKEN'>(queryToken ? 'TOKEN' : 'LICENSE');
    const [claimToken, setClaimToken] = useState(queryToken);

    // 3-Factor verification fields
    const [licenseId, setLicenseId] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthDate, setBirthDate] = useState('');

    // New credentials & contact fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('Switzerland');

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [claimedPendingEmail, setClaimedPendingEmail] = useState<string | null>(null);

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (password !== confirmPassword) {
            setErrorMsg(t('auth.passwordsDoNotMatch') || 'Passwords do not match. Please re-enter your password.');
            return;
        }

        setLoading(true);

        try {
            const normalizedPhone = normalizePhoneNumber(phone);

            let res: any;
            if (mode === 'LICENSE') {
                res = await api.claimProfile({
                    licenseId: licenseId.trim(),
                    lastName: lastName.trim(),
                    birthDate,
                    email: email.trim(),
                    password,
                    phone: normalizedPhone || phone,
                    street,
                    postalCode,
                    city,
                    country,
                });
            } else {
                res = await api.claimWithToken({
                    claimToken: claimToken.trim(),
                    email: email.trim(),
                    password,
                    phone: normalizedPhone || phone,
                    street,
                    postalCode,
                    city,
                    country,
                });
            }

            if (res.requiresVerification) {
                setClaimedPendingEmail(email);
            } else {
                if (res.token && res.user) {
                    login(res.token, res.user);
                }
                router.push(redirectUrl);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Profile claiming failed. Please check your information and try again.');
        } finally {
            setLoading(false);
        }
    };

    if (claimedPendingEmail) {
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
                            <Mail className="h-8 w-8" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {t('auth.claimSuccessCheckEmailTitle') || 'Claim Received! Please Verify Your Email'}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                {t('auth.claimSuccessCheckEmailDesc') || 'We have sent a confirmation link to'}{' '}
                                <strong className="text-slate-900 dark:text-white">{claimedPendingEmail}</strong>.
                            </p>
                            <p className="text-slate-500 dark:text-slate-500 text-[11px] pt-1">
                                {t('auth.claimSuccessCheckEmailNote') || 'Click the link in the email to activate your login credentials and gain immediate access to your STT profile.'}
                            </p>
                        </div>

                        <div className="pt-2">
                            <Link
                                href="/auth/login"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 shadow transition"
                            >
                                <span>{t('auth.backToLogin') || 'Go to Login'}</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <div className="relative h-12 w-40 mx-auto">
                        <Image key={logoSrc} src={logoSrc} alt="AREENA Logo" fill priority className="object-contain" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('auth.claimTitle') || 'Claim Your STT Profile'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {t('auth.claimSubtitle') || 'Link your existing Swiss Table Tennis license to an AREENA login account to retain your historical matches and ELO rating.'}
                    </p>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('LICENSE');
                            setErrorMsg('');
                        }}
                        className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            mode === 'LICENSE'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                        <span>{t('auth.claimModeLicense') || 'License & Birthdate'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('TOKEN');
                            setErrorMsg('');
                        }}
                        className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            mode === 'TOKEN'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t('auth.claimModeToken') || 'Invite Code / QR'}</span>
                    </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 md:p-8 shadow-sm dark:shadow-xl space-y-6 text-xs">
                    {errorMsg && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'LICENSE' ? (
                            <div className="space-y-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-semibold pb-1 border-b border-slate-200 dark:border-slate-800">
                                    <ShieldCheck className="w-4 h-4 text-red-500" />
                                    <span>{t('auth.identityVerification') || '1. Identity Verification'}</span>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('auth.licenseNumber') || 'STT License Number'} *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 12345"
                                        value={licenseId}
                                        onChange={(e) => setLicenseId(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {t('auth.licenseHelper') || 'Your federation license number from Swiss Table Tennis.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            {t('profile.lastName')} *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Mustermann"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                                            {t('profile.birthDate')} *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-semibold pb-1 border-b border-slate-200 dark:border-slate-800">
                                    <KeyRound className="w-4 h-4 text-amber-500" />
                                    <span>{t('auth.inviteCodeSection') || '1. Invite Token'}</span>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('auth.claimTokenLabel') || 'Claim Token / Invite Code'} *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Paste token or scan QR code"
                                        value={claimToken}
                                        onChange={(e) => setClaimToken(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-3.5 pt-2">
                            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-semibold">
                                <Sparkles className="w-4 h-4 text-red-500" />
                                <span>{t('auth.newAccountSetup') || '2. Choose Your AREENA Login'}</span>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.email')} *
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="athlete@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('auth.newPassword') || 'New Password'} *
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                                <div className="mt-2">
                                    <PasswordRequirements password={password} />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('auth.confirmPassword') || 'Confirm Password'} *
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.phone')}
                                </label>
                                <div className="mt-1">
                                    <PhoneInput value={phone} onChange={setPhone} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.postalCode')}
                                    </label>
                                    <input
                                        type="text"
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
                                        placeholder="Zurich"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition"
                            >
                                <UserCheck className="h-4 w-4" />
                                <span>{loading ? t('common.loading') : (t('auth.claimSubmitButton') || 'Claim & Activate Profile')}</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 px-1">
                    <div>
                        {t('auth.hasAccount')}{' '}
                        <Link href="/auth/login" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
                            {t('auth.loginButton')}
                        </Link>
                    </div>
                    <div>
                        {t('auth.noAccount')}{' '}
                        <Link href="/auth/register" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
                            {t('auth.registerButton')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ClaimPage() {
    return (
        <React.Suspense
            fallback={
                <div className="min-h-[85vh] flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                </div>
            }
        >
            <ClaimProfileForm />
        </React.Suspense>
    );
}

