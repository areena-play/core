'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18nContext';
import { useAdminNotices } from '@/lib/adminNoticeContext';
import {
    Info,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    X,
    EyeOff,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { AdminNoticeDto, NoticeType } from '@areena/shared';
import { getLocalizedValue } from '@/lib/i18nHelper';

export function AdminNoticeBanner() {
    const { locale } = useI18n();
    const { bannerNotices, closeForSession, dismissPermanently } = useAdminNotices();
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
    const [dismissingId, setDismissingId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDismiss = async (id: string) => {
        setDismissingId(id);
        await dismissPermanently(id);
        setDismissingId(null);
    };

    if (bannerNotices.length === 0) return null;

    return (
        <aside aria-label="System Announcements" className="relative z-20 w-full flex flex-col shrink-0">
            {bannerNotices.map((notice) => {
                const isExpanded = !!expandedMap[notice.id];
                const noticeTitle = getLocalizedValue(notice.titleI18n, notice.title, locale);
                const noticeContent = getLocalizedValue(notice.contentI18n, notice.content, locale);

                let bannerBg = 'bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b border-blue-500/30 text-blue-100';
                let icon = <Info className="w-4 h-4 text-blue-400 shrink-0" />;
                let badgeBg = 'bg-blue-500/20 text-blue-300 border-blue-500/30';

                if (notice.type === NoticeType.WARNING) {
                    bannerBg = 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/30 text-amber-100';
                    icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
                    badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                } else if (notice.type === NoticeType.CRITICAL) {
                    bannerBg = 'bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-b border-red-500/30 text-red-100';
                    icon = <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />;
                    badgeBg = 'bg-red-500/20 text-red-300 border-red-500/30';
                } else if (notice.type === NoticeType.SUCCESS) {
                    bannerBg = 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/30 text-emerald-100';
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
                    badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                }

                return (
                    <div
                        key={notice.id}
                        className={`transition-all duration-200 px-4 py-2.5 ${bannerBg}`}
                    >
                        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {icon}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${badgeBg}`}>
                                    {notice.type}
                                </span>
                                <span className="font-semibold truncate">
                                    {noticeTitle}
                                </span>
                                {noticeContent && !isExpanded && (
                                    <span className="hidden sm:inline text-slate-400 truncate max-w-md">
                                        – {noticeContent}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {noticeContent && (
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(notice.id)}
                                        className="px-2 py-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                                        title={isExpanded ? 'Collapse' : 'Read details'}
                                    >
                                        <span>{isExpanded ? 'Less' : 'Details'}</span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                )}

                                {notice.isDismissible && (
                                    <button
                                        type="button"
                                        disabled={dismissingId === notice.id}
                                        onClick={() => handleDismiss(notice.id)}
                                        className="hidden md:flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition text-[11px] disabled:opacity-50"
                                        title="Don't show this announcement again"
                                    >
                                        <EyeOff className="w-3 h-3" />
                                        <span>Don't show again</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => closeForSession(notice.id)}
                                    className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition"
                                    title="Close for this session"
                                    aria-label="Close"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Expandable details area */}
                        {isExpanded && noticeContent && (
                            <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-white/10 text-xs text-slate-300 leading-relaxed">
                                <p className="whitespace-pre-wrap">{noticeContent}</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </aside>
    );
}
