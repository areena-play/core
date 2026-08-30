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
    ChevronLeft,
    ChevronRight,
    Bell,
    Check,
} from 'lucide-react';
import { AdminNoticeDto, NoticeType, NoticeDisplayMode } from '@areena/shared';
import { getLocalizedValue } from '@/lib/i18nHelper';

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

export function AdminNoticeModal() {
    const { user } = useAuth();
    const { t, locale } = useI18n();

    const [notices, setNotices] = useState<AdminNoticeDto[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchActiveNotices = async () => {
        try {
            const data: AdminNoticeDto[] = await api.getActiveNotices();
            const permDismissed = getLocalPermanentDismissed();
            const sessionClosed = getSessionClosed();

            // 1. Filter out permanently dismissed notices & non-modal notices
            const modalNotices = (data || []).filter(
                (n) => n.displayMode === NoticeDisplayMode.MODAL,
            );

            const nonDismissed = modalNotices.filter((n) => {
                if (n.isDismissible && permDismissed.includes(n.id)) {
                    return false;
                }
                return true;
            });

            // 2. Filter out notices already closed in the current browser session
            const pendingModalNotices = nonDismissed.filter((n) => !sessionClosed.includes(n.id));

            setNotices(pendingModalNotices);
            if (pendingModalNotices.length > 0) {
                setCurrentIndex(0);
                setIsOpen(true);
                setDontShowAgain(false);
            } else {
                setIsOpen(false);
            }
        } catch (err) {
            // Silently ignore active notice load error
        }
    };

    useEffect(() => {
        fetchActiveNotices();
    }, [user]);

    // Whenever current notice changes, reset the "Don't show again" checkbox
    useEffect(() => {
        setDontShowAgain(false);
    }, [currentIndex]);

    if (!isOpen || notices.length === 0) return null;

    const currentNotice = notices[currentIndex] || notices[0];

    // Handles temporary close (X button, backdrop click, or ESC)
    const handleTemporaryClose = () => {
        // Record as closed for current session only
        addSessionClosed(currentNotice.id);

        if (currentIndex < notices.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsOpen(false);
        }
    };

    // Handles Acknowledge button click
    const handleAcknowledge = async () => {
        setSubmitting(true);

        if (dontShowAgain && currentNotice.isDismissible) {
            // PERMANENT DISMISSAL
            addLocalPermanentDismissed(currentNotice.id);
            if (user) {
                try {
                    await api.dismissNotice(currentNotice.id);
                } catch (err) {
                    console.warn('Server notice dismissal error:', err);
                }
            }
        } else {
            // TEMPORARY SESSION CLOSE
            addSessionClosed(currentNotice.id);
        }

        setSubmitting(false);

        // Advance to next notice or close modal
        if (currentIndex < notices.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsOpen(false);
        }
    };

    // Severity styling
    let borderClass = 'border-blue-500/50 bg-gradient-to-b from-slate-900 to-slate-950 text-blue-100';
    let icon = <Info className="w-6 h-6 text-blue-400 shrink-0" />;
    let headerBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/40';

    if (currentNotice.type === NoticeType.WARNING) {
        borderClass = 'border-amber-500/50 bg-gradient-to-b from-slate-900 to-slate-950 text-amber-100';
        icon = <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />;
        headerBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else if (currentNotice.type === NoticeType.CRITICAL) {
        borderClass = 'border-red-500/60 bg-gradient-to-b from-slate-900 to-slate-950 text-red-100 shadow-2xl shadow-red-950/60';
        icon = <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />;
        headerBadge = 'bg-red-500/20 text-red-300 border-red-500/40';
    } else if (currentNotice.type === NoticeType.SUCCESS) {
        borderClass = 'border-emerald-500/50 bg-gradient-to-b from-slate-900 to-slate-950 text-emerald-100';
        icon = <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />;
        headerBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }

    const targetLabel =
        currentNotice.targetGroup === 'ALL'
            ? 'Global Announcement'
            : currentNotice.targetGroup === 'PLAYERS'
              ? 'Athletes & Players Notice'
              : currentNotice.targetGroup === 'COACHES'
                ? 'Certified Coaches Bulletin'
                : currentNotice.targetGroup === 'REFEREES'
                  ? 'Referees & Umpires Notice'
                  : currentNotice.targetGroup === 'CLUB_ADMINS'
                    ? 'Club Management Notice'
                    : currentNotice.targetGroup === 'ASSOCIATION_ADMINS'
                      ? 'Federation Governance Notice'
                      : 'System Administrator Notice';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            {/* Modal Dialog Box */}
            <div
                className={`relative max-w-xl w-full rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ${borderClass}`}
            >
                {/* Header */}
                <div className="p-5 md:p-6 border-b border-slate-800/80 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="mt-0.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${headerBadge}`}>
                                    {currentNotice.type}
                                </span>
                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-medium">
                                    {targetLabel}
                                </span>
                                {currentNotice.association && (
                                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                                        {currentNotice.association.shortName || currentNotice.association.name}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight leading-snug">
                                {getLocalizedValue(currentNotice.titleI18n, currentNotice.title, locale)}
                            </h3>
                        </div>
                    </div>

                    {/* Temporary Close (X) button */}
                    <button
                        onClick={handleTemporaryClose}
                        title="Close for now (will appear again on next visit)"
                        aria-label="Close"
                        className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all active:scale-95 shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 md:p-6 overflow-y-auto flex-1 text-sm text-slate-200 whitespace-pre-line leading-relaxed selection:bg-red-600 selection:text-white">
                    {getLocalizedValue(currentNotice.contentI18n, currentNotice.content, locale)}
                </div>

                {/* Footer Controls */}
                <div className="p-5 md:p-6 bg-slate-950/80 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Dismissal Toggle or Permanence Warning */}
                    <div className="flex-1 min-w-0">
                        {currentNotice.isDismissible ? (
                            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    className="w-4 h-4 rounded text-red-600 bg-slate-800 border-slate-700 focus:ring-red-500 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                                    Don&apos;t show this message again
                                </span>
                            </label>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Permanent notice (will show on future visits)</span>
                            </div>
                        )}
                    </div>

                    {/* Multi-notice navigation & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {notices.length > 1 && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mr-2">
                                <span className="font-semibold text-white">
                                    {currentIndex + 1}
                                </span>
                                <span>/</span>
                                <span>{notices.length}</span>
                            </div>
                        )}

                        <button
                            onClick={handleTemporaryClose}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors border border-slate-700/60"
                        >
                            Close for now
                        </button>

                        <button
                            onClick={handleAcknowledge}
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-red-600/20 transition-all active:scale-95"
                        >
                            <Check className="w-3.5 h-3.5" />
                            {dontShowAgain ? 'Dismiss Forever' : 'Acknowledge'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

