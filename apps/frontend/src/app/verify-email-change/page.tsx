'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, User } from 'lucide-react';

function VerifyEmailChangeContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { refreshUser } = useAuth();
    const { t } = useI18n();

    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        if (!token) {
            setLoading(false);
            setErrorMsg(t('auth.emailChangeInvalidToken') || 'No confirmation token provided.');
            return;
        }

        const confirm = async () => {
            try {
                const res = await api.confirmEmailChange(token);
                setSuccessMsg(res.message || t('auth.emailChangeConfirmedDesc') || 'Email successfully verified.');
                if (res.newEmail) {
                    setNewEmail(res.newEmail);
                }
                await refreshUser();
            } catch (err: any) {
                setErrorMsg(err.message || t('auth.emailChangeInvalidToken') || 'Failed to confirm email change.');
            } finally {
                setLoading(false);
            }
        };

        confirm();
    }, [token, refreshUser, t]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-8 shadow-xl text-center space-y-6">
                {loading && (
                    <div className="space-y-4 py-8">
                        <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto" />
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            Verifying New Email Address...
                        </h2>
                        <p className="text-xs text-slate-500">
                            Please wait while we confirm your email change request.
                        </p>
                    </div>
                )}

                {!loading && successMsg && (
                    <div className="space-y-5 py-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto shadow-sm">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white">
                                {t('auth.emailChangeConfirmedTitle')}
                            </h1>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {successMsg}
                            </p>
                            {newEmail && (
                                <div className="mt-2 inline-block rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {newEmail}
                                </div>
                            )}
                        </div>
                        <div className="pt-2">
                            <Link
                                href="/profile"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-xs font-bold text-white shadow transition"
                            >
                                <User className="h-4 w-4" />
                                <span>{t('auth.goToProfile')}</span>
                            </Link>
                        </div>
                    </div>
                )}

                {!loading && errorMsg && (
                    <div className="space-y-5 py-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 mx-auto shadow-sm">
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white">
                                Verification Failed
                            </h1>
                            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                                {errorMsg}
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                href="/profile"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
                            >
                                <span>{t('auth.goToProfile')}</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailChangePage() {
    return (
        <Suspense fallback={
            <div className="min-h-[70vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
        }>
            <VerifyEmailChangeContent />
        </Suspense>
    );
}
