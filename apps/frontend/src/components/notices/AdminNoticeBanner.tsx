'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
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
import { AdminNoticeDto, NoticeType, NoticeDisplayMode } from '@areena/shared';

const LOCAL_PERMANENT_DISMISSED_KEY = 'areena_dismissed_notices';
const SESSION_CLOSED_KEY = 'areena_session_closed_notices';

function getLocalPermanentDismissed(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LOCAL_PERMANENT_DISMISSED_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function addLocalPermanentDismissed(id: string) {
    if (typeof window === 'undefined') return;
    try {
        const existing = getLocalPermanentDismissed();
        if (!existing.includes(id)) {
            existing.push(id);
            localStorage.setItem(LOCAL_PERMANENT_DISMISSED_KEY, JSON.stringify(existing));
        }
    } catch {}
}

function getSessionClosed(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = sessionStorage.getItem(SESSION_CLOSED_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function addSessionClosed(id: string) {
    if (typeof window === 'undefined') return;
    try {
        const existing = getSessionClosed();
        if (!existing.includes(id)) {
            existing.push(id);
            sessionStorage.setItem(SESSION_CLOSED_KEY, JSON.stringify(existing));
        }
    } catch {}
}

export function AdminNoticeBanner() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [notices, setNotices] = useState<AdminNoticeDto[]>([]);
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
    const [dismissingId, setDismissingId] = useState<string | null>(null);

    const fetchNotices = async () => {
        try {
            const data: AdminNoticeDto[] = await api.getActiveNotices();
            const permDismissed = getLocalPermanentDismissed();
            const sessionClosed = getSessionClosed();

            // Only display notices configured as BANNER (or default)
            const bannerNotices = (data || []).filter(
                (n) => n.displayMode === NoticeDisplayMode.BANNER || !n.displayMode,
            );

            // Filter out permanently dismissed & session-closed notices
            const visible = bannerNotices.filter((n) => {
                if (n.isDismissible && permDismissed.includes(n.id)) {
                    return false;
                }
                if (sessionClosed.includes(n.id)) {
                    return false;
                }
                return true;
            });

            setNotices(visible);
        } catch (err) {
            // Silently ignore
        }
    };

    useEffect(() => {
        fetchNotices();
    }, [user]);

    // Temporary close (X button) - closes for session only
    const handleTemporaryClose = (notice: AdminNoticeDto) => {
        addSessionClosed(notice.id);
        setNotices((prev) => prev.filter((n) => n.id !== notice.id));
    };

    // Permanent Dismissal ("Don't show again" button)
    const handlePermanentDismiss = async (notice: AdminNoticeDto) => {
        setDismissingId(notice.id);
        addLocalPermanentDismissed(notice.id);
        setNotices((prev) => prev.filter((n) => n.id !== notice.id));

        if (user) {
            try {
                await api.dismissNotice(notice.id);
            } catch (err) {
                console.warn('Server notice dismissal sync error:', err);
            }
        }
        setDismissingId(null);
    };

    const toggleExpand = (id: string) => {
        setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    if (notices.length === 0) return null;

    return (
        <aside aria-label="System Announcements" className="w-full flex flex-col z-40 shrink-0">
            {notices.map((notice) => {
                const isExpanded = !!expandedMap[notice.id];

                let bannerBg = 'bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b border-blue-500/30 text-blue-100';
                let icon = <Info className="w-4 h-4 text-blue-400 shrink-0" />;
                let badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';

                if (notice.type === NoticeType.WARNING) {
                    bannerBg = 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/30 text-amber-100';
                    icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
                    badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                } else if (notice.type === NoticeType.CRITICAL) {
                    bannerBg = 'bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-b border-red-500/50 text-red-100 shadow-md shadow-red-950/30';
                    icon = <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />;
                    badgeClass = 'bg-red-500/20 text-red-300 border-red-500/40';
                } else if (notice.type === NoticeType.SUCCESS) {
                    bannerBg = 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/30 text-emerald-100';
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
                    badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                }

                const targetLabel =
                    notice.targetGroup === 'ALL'
                        ? 'Announcement'
                        : notice.targetGroup === 'PLAYERS'
                          ? 'Athletes'
                          : notice.targetGroup === 'COACHES'
                            ? 'Coaches'
                            : notice.targetGroup === 'REFEREES'
                              ? 'Referees'
                              : notice.targetGroup === 'CLUB_ADMINS'
                                ? 'Clubs'
                                : notice.targetGroup === 'ASSOCIATION_ADMINS'
                                  ? 'Federation'
                                  : 'Admins';

                return (
                    <div
                        key={notice.id}
                        className={`w-full px-4 sm:px-6 py-2.5 transition-all duration-300 ${bannerBg}`}
                    >
                        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-1 rounded-lg bg-black/20 shrink-0">{icon}</div>

                                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 text-xs sm:text-sm">
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass} shrink-0`}
                                    >
                                        {targetLabel}
                                    </span>

                                    <span className="font-bold text-white shrink-0">
                                        {notice.title}:
                                    </span>

                                    <span
                                        className={`text-slate-200 ${
                                            !isExpanded && notice.content.length > 140 ? 'truncate' : ''
                                        }`}
                                    >
                                        {notice.content}
                                    </span>

                                    {notice.content.length > 140 && (
                                        <button
                                            onClick={() => toggleExpand(notice.id)}
                                            className="text-xs font-semibold text-slate-300 hover:text-white underline underline-offset-2 ml-1 shrink-0"
                                        >
                                            {isExpanded ? 'Less' : 'More'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Actions & Dismissal */}
                            <div className="flex items-center gap-2 shrink-0">
                                {notice.isDismissible && (
                                    <button
                                        onClick={() => handlePermanentDismiss(notice)}
                                        disabled={dismissingId === notice.id}
                                        title="Don't show this announcement again"
                                        className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium bg-black/30 hover:bg-black/50 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-white/10 transition-all active:scale-95"
                                    >
                                        <EyeOff className="w-3 h-3 opacity-80" />
                                        Don&apos;t show again
                                    </button>
                                )}

                                {!notice.isDismissible && (
                                    <span className="hidden md:inline text-[10px] text-slate-400 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                        Permanent
                                    </span>
                                )}

                                <button
                                    onClick={() => handleTemporaryClose(notice)}
                                    title="Close for now"
                                    aria-label="Close notice"
                                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-black/30 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </aside>
    );
}
