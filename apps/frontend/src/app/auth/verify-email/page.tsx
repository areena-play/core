'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import {
    CheckCircle2,
    XCircle,
    Mail,
    ArrowRight,
    Loader2,
    RefreshCw,
    ShieldCheck,
    AlertCircle,
} from 'lucide-react';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { login } = useAuth();
    const { resolvedTheme } = useTheme();
    const { t } = useI18n();

    const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'ERROR' | 'IDLE'>(
        token ? 'LOADING' : 'IDLE',
    );
    const [message, setMessage] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState('');
    const [resendError, setResendError] = useState('');

    const logoSrc = resolvedTheme === 'dark' ? '/areena-logo-dark.png' : '/areena-logo.png';
    const verifiedTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus('IDLE');
            return;
        }

        // Prevent duplicate execution (e.g. React 18 StrictMode double-invoking effects)
        if (verifiedTokenRef.current === token) {
            return;
        }
        verifiedTokenRef.current = token;

        setStatus('LOADING');
        api.verifyEmail(token)
            .then((res) => {
                setStatus('SUCCESS');
                setMessage(res.message || 'Your email address has been verified successfully!');
                if (res.token && res.user) {
                    login(res.token, res.user);
                }
            })
            .catch((err) => {
                setStatus('ERROR');
                setMessage(err.message || 'The verification link is invalid or has expired.');
            });
    }, [token, login]);

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        setResendLoading(true);
        setResendSuccess('');
        setResendError('');

        try {
            const res = await api.resendVerification(resendEmail);
            setResendSuccess(res.message || 'A new verification link has been sent to your email.');
        } catch (err: any) {
            setResendError(err.message || 'Failed to send verification link.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-md space-y-6">
                {/* Brand Logo Header */}
                <div className="text-center space-y-2">
                    <div className="relative h-12 w-40 mx-auto">
                        <Image key={logoSrc} src={logoSrc} alt="AREENA Logo" fill priority className="object-contain" />
                    </div>
                </div>

                {/* State Card */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-6 md:p-8 shadow-sm dark:shadow-xl space-y-6 text-xs text-center">
                    {status === 'LOADING' && (
                        <div className="py-8 space-y-4">
                            <Loader2 className="w-12 h-12 mx-auto text-red-600 animate-spin" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Verifying your email address...
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Please wait while we confirm your account security credentials.
                            </p>
                        </div>
                    )}

                    {status === 'SUCCESS' && (
                        <div className="py-4 space-y-5">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="w-9 h-9" />
                            </div>
                            <div className="space-y-1.5">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Email Verified Successfully!
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {message}
                                </p>
                            </div>
                            <div className="pt-2">
                                <Link
                                    href="/"
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 shadow transition"
                                >
                                    <span>Continue to AREENA Workspace</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'ERROR' && (
                        <div className="py-4 space-y-5 text-left">
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                                    <XCircle className="w-8 h-8" />
                                </div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Verification Failed
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {message}
                                </p>
                            </div>

                            {/* Resend Form */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                                    Request a New Verification Link
                                </div>

                                {resendSuccess && (
                                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-start gap-2 text-xs">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{resendSuccess}</span>
                                    </div>
                                )}

                                {resendError && (
                                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 flex items-start gap-2 text-xs">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{resendError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleResend} className="space-y-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                            {t('common.email')}
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="name@example.ch"
                                            value={resendEmail}
                                            onChange={(e) => setResendEmail(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none text-xs"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resendLoading}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition text-xs"
                                    >
                                        {resendLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Mail className="w-4 h-4" />
                                        )}
                                        <span>Send Verification Link</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {status === 'IDLE' && (
                        <div className="py-4 space-y-5 text-left">
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto">
                                    <Mail className="w-8 h-8" />
                                </div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Check Your Email
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    We sent a verification link to your registered email address. Click the link in that email to confirm your account.
                                </p>
                            </div>

                            {/* Resend Form */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                                    Didn't receive an email?
                                </div>

                                {resendSuccess && (
                                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-start gap-2 text-xs">
                                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{resendSuccess}</span>
                                    </div>
                                )}

                                {resendError && (
                                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 flex items-start gap-2 text-xs">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{resendError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleResend} className="space-y-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                            {t('common.email')}
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="name@example.ch"
                                            value={resendEmail}
                                            onChange={(e) => setResendEmail(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none text-xs"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resendLoading}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition text-xs"
                                    >
                                        {resendLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Mail className="w-4 h-4" />
                                        )}
                                        <span>Resend Verification Email</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <Link href="/auth/login" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
                            Back to Sign In
                        </Link>
                        <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            AREENA Identity
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[85vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
