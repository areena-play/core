'use client';

import React from 'react';
import { useMainView } from '@/lib/mainViewContext';

interface WorkspaceHeaderCardProps {
    dataTour?: string;
    className?: string;
}

export function WorkspaceHeaderCard({ dataTour = 'workspace-switcher', className = '' }: WorkspaceHeaderCardProps) {
    const { headerTitle, headerBadge, headerLogoUrl, currentViewMeta } = useMainView();
    const ActiveIcon = currentViewMeta.icon;

    return (
        <div
            data-tour={dataTour}
            className={`rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 p-2.5 space-y-1.5 transition-colors duration-150 ${className}`}
        >
            {headerLogoUrl ? (
                <div className="pt-0.5 flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={headerLogoUrl}
                        alt={headerTitle || 'Logo'}
                        className="max-h-10 w-auto max-w-full object-contain rounded"
                    />
                </div>
            ) : 
                <div className="flex items-center gap-2">
                    <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${currentViewMeta.badgeColor}`}
                    >
                        {headerBadge}
                    </span>
                    <div>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-snug break-words">
                            {headerTitle}
                        </h3>
                    </div>
                </div>
            }
        </div>
    );
}

