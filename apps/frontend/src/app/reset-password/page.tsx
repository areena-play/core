'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, LogIn } from 'lucide-react';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { t } = useI18n();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!token) {
            setErrorMsg('Missing password reset token from URL.');
            return;
        }

        if (password.length < 8) {
            setErrorMsg(t('auth.passwordTooShort') || 'Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg(t('auth.passwordsDoNotMatch') || 'Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.resetPassword({ token, password });
            setSuccessMsg(res.message || t('auth.passwordResetSuccess') || 'Password reset successfully!');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-8 shadow-xl text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invalid Reset Link</h2>
                <p className="text-xs text-slate-500">
                    This password reset link is invalid or missing. Please request a new password reset from the login page.
                </p>
                <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 pt-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t('auth.backToSignIn')}</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-8 shadow-xl space-y-6">
            <div className="text-center space-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto mb-2">
                    <Lock className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                    {t('auth.resetPasswordTitle')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('auth.resetPasswordSubtitle')}
                </p>
            </div>

            {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>{errorMsg}</div>
                </div>
            )}

            {successMsg ? (
                <div className="space-y-4 text-center py-2">
                    <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-left">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>{successMsg}</div>
                    </div>
                    <Link
                        href="/auth/login"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-xs font-bold text-white shadow transition"
                    >
                        <LogIn className="h-4 w-4" />
                        <span>{t('auth.loginButton')}</span>
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('auth.newPasswordLabel')} *
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('auth.confirmNewPasswordLabel')} *
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-xs font-bold text-white shadow transition disabled:opacity-50"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <span>{loading ? t('common.saving') : t('auth.resetPasswordButton')}</span>
                    </button>

                    <div className="text-center pt-2">
                        <Link
                            href="/auth/login"
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>{t('auth.backToSignIn')}</span>
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-[75vh] flex items-center justify-center p-4">
            <Suspense fallback={
                <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                </div>
            }>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
