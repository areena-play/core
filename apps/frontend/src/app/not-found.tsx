'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileQuestion, ArrowLeft, Home, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';

export default function NotFoundPage() {
    const router = useRouter();
    const { t } = useI18n();

    return (
        <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4 max-w-xl mx-auto space-y-6">
            <div className="relative">
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-inner">
                    <FileQuestion className="h-10 w-10 sm:h-12 sm:w-12" />
                </div>
                <span className="absolute -bottom-2 -right-2 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm">
                    404
                </span>
            </div>

            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Page Not Found
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                    The requested page does not exist, has been removed, or is currently undergoing maintenance.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Go Back</span>
                </button>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs font-bold shadow-sm transition"
                >
                    <Home className="h-4 w-4" />
                    <span>Return to Home</span>
                </Link>
            </div>
        </div>
    );
}
