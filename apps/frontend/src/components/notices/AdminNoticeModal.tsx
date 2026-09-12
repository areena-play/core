'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18nContext';
import { useAdminNotices } from '@/lib/adminNoticeContext';
import {
    Info,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    X,
    Check,
} from 'lucide-react';
import { NoticeType } from '@areena/shared';
import { getLocalizedValue } from '@/lib/i18nHelper';

export function AdminNoticeModal() {
    const { locale, t } = useI18n();
    const { modalNotices, closeForSession, dismissPermanently } = useAdminNotices();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (modalNotices.length > 0) {
            setCurrentIndex(0);
            setIsOpen(true);
            setDontShowAgain(false);
        } else {
            setIsOpen(false);
        }
    }, [modalNotices.length]);

    // Whenever current notice index changes, reset the "Don't show again" checkbox
    useEffect(() => {
        setDontShowAgain(false);
    }, [currentIndex]);

    if (!isOpen || modalNotices.length === 0) return null;

    const currentNotice = modalNotices[currentIndex] || modalNotices[0];

    // Handles temporary close (X button, Close for now)
    const handleTemporaryClose = () => {
        closeForSession(currentNotice.id);
        if (currentIndex < modalNotices.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsOpen(false);
        }
    };

    // Handles Acknowledge button click
    const handleAcknowledge = async () => {
        setSubmitting(true);
        if (dontShowAgain && currentNotice.isDismissible) {
            await dismissPermanently(currentNotice.id);
        } else {
            closeForSession(currentNotice.id);
        }
        setSubmitting(false);

        if (currentIndex < modalNotices.length - 1) {
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
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-notice-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div
                className={`relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 animate-in zoom-in-95 ${borderClass}`}
            >
                {/* Header with notice type badge and title */}
                <div className="p-5 md:p-6 border-b border-slate-800 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="mt-0.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                            {icon}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${headerBadge} border`}
                                >
                                    {currentNotice.type}
                                </span>
                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-medium">
                                    {targetLabel}
                                </span>
                                {modalNotices.length > 1 && (
                                    <span className="text-[11px] font-semibold text-slate-400">
                                        Announcement {currentIndex + 1} of {modalNotices.length}
                                    </span>
                                )}
                            </div>
                            <h3 id="admin-notice-title" className="text-lg md:text-xl font-bold text-white tracking-tight leading-snug">
                                {getLocalizedValue(currentNotice.titleI18n, currentNotice.title, locale)}
                            </h3>
                        </div>
                    </div>

                    {/* Temporary Close (X) button */}
                    <button
                        onClick={handleTemporaryClose}
                        title={t('uiExtras.closeForNow')}
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
                                    {t('uiExtras.dontShowAgain')}
                                </span>
                            </label>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{t('uiExtras.permanentNotice')}</span>
                            </div>
                        )}
                    </div>

                    {/* Multi-notice navigation & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {modalNotices.length > 1 && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mr-2">
                                <span className="font-semibold text-white">
                                    {currentIndex + 1}
                                </span>
                                <span>/</span>
                                <span>{modalNotices.length}</span>
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
