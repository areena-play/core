'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, Mail, MessageSquare, ExternalLink } from 'lucide-react';

interface SupportViewProps {
    scopedAssociationId?: string;
}

export function SupportView({ scopedAssociationId }: SupportViewProps) {
    return (
        <div className="w-full space-y-6 pb-16">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-[11px] font-bold uppercase">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Member Assistance</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Support & Help Desk
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Reach out for federation rules inquiries, tournament organization assistance, or platform bug reports.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                        <Mail className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Direct Email Helpdesk</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        For official competition licenses and sanctioning questions, email our sports desk.
                    </p>
                    <a
                        href="mailto:support@areena.ch"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                    >
                        <span>support@areena.ch</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Documentation & FAQs</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Browse user guides, match scoring tutorials, and tournament bracket walkthroughs.
                    </p>
                    <Link
                        href="/support"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:underline"
                    >
                        <span>Open Knowledge Base</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
