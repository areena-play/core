'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    BellRing,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Info,
    AlertTriangle,
    ShieldAlert,
    EyeOff,
    Users,
    Clock,
    Check,
    X,
    Filter,
    Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminNoticeDto, NoticeType, NoticeTargetGroup, NoticeDisplayMode } from '@areena/shared';

interface Props {
    associations: any[];
    clubs: any[];
}

export function AdminNoticesManager({ associations, clubs }: Props) {
    const { user } = useAuth();
    const { t } = useI18n();

    const [notices, setNotices] = useState<AdminNoticeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<NoticeType>(NoticeType.INFO);
    const [displayMode, setDisplayMode] = useState<NoticeDisplayMode>(NoticeDisplayMode.BANNER);
    const [targetGroup, setTargetGroup] = useState<NoticeTargetGroup>(NoticeTargetGroup.ALL);
    const [selectedAssocId, setSelectedAssocId] = useState('');
    const [selectedClubId, setSelectedClubId] = useState('');
    const [isDismissible, setIsDismissible] = useState(true);
    const [priority, setPriority] = useState(0);
    const [expiresAt, setExpiresAt] = useState('');

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const data = await api.getAdminNotices();
            setNotices(data || []);
        } catch (err: any) {
            console.error('Failed to load admin notices:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleCreateNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const payload: any = {
                title,
                content,
                type,
                displayMode,
                targetGroup,
                isDismissible,
                priority: Number(priority) || 0,
                associationId: selectedAssocId || null,
                clubId: selectedClubId || null,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            };

            await api.createNotice(payload);
            setSuccessMsg('Notice created and published successfully!');
            setShowCreateModal(false);
            // Reset form
            setTitle('');
            setContent('');
            setType(NoticeType.INFO);
            setDisplayMode(NoticeDisplayMode.BANNER);
            setTargetGroup(NoticeTargetGroup.ALL);
            setIsDismissible(true);
            setPriority(0);
            setExpiresAt('');
            fetchNotices();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create notice');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (notice: AdminNoticeDto) => {
        try {
            await api.updateNotice(notice.id, { isActive: !notice.isActive });
            setNotices((prev) =>
                prev.map((n) => (n.id === notice.id ? { ...n, isActive: !n.isActive } : n)),
            );
        } catch (err: any) {
            alert(err.message || 'Failed to update notice');
        }
    };

    const handleDeleteNotice = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this notice?')) return;
        try {
            await api.deleteNotice(id);
            setNotices((prev) => prev.filter((n) => n.id !== id));
        } catch (err: any) {
            alert(err.message || 'Failed to delete notice');
        }
    };

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-red-500" />
                        System & Federation Notices
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Publish broadcast alerts with role targeting, priority sorting, and optional dismissal controls.
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-red-600/20 transition-all active:scale-95 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Create Announcement
                </button>
            </div>

            {successMsg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {successMsg}
                </div>
            )}

            {/* Notices List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400 text-sm">Loading announcements...</div>
            ) : notices.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                    <BellRing className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white">No active or archived notices</h4>
                    <p className="text-xs text-slate-400 mt-1">
                        Click &quot;Create Announcement&quot; above to publish a system notice.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3.5">
                    {notices.map((notice) => {
                        let typeBadgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                        let typeIcon = <Info className="w-4 h-4 text-blue-400" />;

                        if (notice.type === NoticeType.WARNING) {
                            typeBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                            typeIcon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
                        } else if (notice.type === NoticeType.CRITICAL) {
                            typeBadgeClass = 'bg-red-500/20 text-red-300 border-red-500/30';
                            typeIcon = <ShieldAlert className="w-4 h-4 text-red-400" />;
                        } else if (notice.type === NoticeType.SUCCESS) {
                            typeBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                            typeIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
                        }

                        return (
                            <div
                                key={notice.id}
                                className={`rounded-xl border p-4 bg-slate-900/70 backdrop-blur-sm transition-all ${
                                    notice.isActive
                                        ? 'border-slate-800 hover:border-slate-700'
                                        : 'border-slate-800/40 opacity-60'
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="mt-0.5">{typeIcon}</div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <span
                                                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeBadgeClass}`}
                                                >
                                                    {notice.type}
                                                </span>

                                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-medium">
                                                    Format: {notice.displayMode === 'MODAL' ? 'Popup Modal' : 'Top Banner'}
                                                </span>

                                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-medium">
                                                    Target: {notice.targetGroup}
                                                </span>

                                                {notice.isDismissible ? (
                                                    <span className="text-[11px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                                                        <EyeOff className="w-3 h-3" /> Dismissible (
                                                        {notice._count?.dismissals || 0} dismissed)
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 font-semibold">
                                                        Permanent (Cannot be hidden)
                                                    </span>
                                                )}

                                                {notice.priority > 0 && (
                                                    <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                                        Priority: {notice.priority}
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="text-sm font-bold text-white tracking-tight">
                                                {notice.title}
                                            </h4>

                                            <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                                                {notice.content}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
                                                <span>
                                                    Created: {format(new Date(notice.createdAt), 'dd MMM yyyy HH:mm')}
                                                </span>
                                                {notice.createdBy && (
                                                    <span>
                                                        By: {notice.createdBy.firstName} {notice.createdBy.lastName}
                                                    </span>
                                                )}
                                                {notice.expiresAt && (
                                                    <span>
                                                        Expires: {format(new Date(notice.expiresAt), 'dd MMM yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                                        <button
                                            onClick={() => handleToggleActive(notice)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                notice.isActive
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                            }`}
                                        >
                                            {notice.isActive ? 'Active' : 'Disabled'}
                                        </button>

                                        <button
                                            onClick={() => handleDeleteNotice(notice.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
                                            title="Delete Notice"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Announcement Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-red-500" />
                                Create Admin Notice
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-semibold text-red-400">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateNotice} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Notice Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Scheduled System Maintenance on Sunday"
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Display Format
                                    </label>
                                    <select
                                        value={displayMode}
                                        onChange={(e) => setDisplayMode(e.target.value as NoticeDisplayMode)}
                                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    >
                                        <option value={NoticeDisplayMode.BANNER}>Top Banner (Full Width)</option>
                                        <option value={NoticeDisplayMode.MODAL}>Popup Modal (Dialog)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Severity / Type
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as NoticeType)}
                                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    >
                                        <option value={NoticeType.INFO}>INFO (Blue)</option>
                                        <option value={NoticeType.WARNING}>WARNING (Amber)</option>
                                        <option value={NoticeType.CRITICAL}>CRITICAL (Red)</option>
                                        <option value={NoticeType.SUCCESS}>SUCCESS (Emerald)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Target Audience
                                    </label>
                                    <select
                                        value={targetGroup}
                                        onChange={(e) => setTargetGroup(e.target.value as NoticeTargetGroup)}
                                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    >
                                        <option value={NoticeTargetGroup.ALL}>Everyone (All Users & Guests)</option>
                                        <option value={NoticeTargetGroup.PLAYERS}>Athletes & Players</option>
                                        <option value={NoticeTargetGroup.COACHES}>Certified Coaches</option>
                                        <option value={NoticeTargetGroup.REFEREES}>Referees & Umpires</option>
                                        <option value={NoticeTargetGroup.CLUB_ADMINS}>Club Administrators</option>
                                        <option value={NoticeTargetGroup.ASSOCIATION_ADMINS}>Federation / Regional Admins</option>
                                        <option value={NoticeTargetGroup.SUPER_ADMINS}>System Admins Only</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Notice Message / Content *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Enter the full message text to display to users..."
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                                />
                            </div>

                            {/* Dismissal Control Toggle */}
                            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDismissible}
                                        onChange={(e) => setIsDismissible(e.target.checked)}
                                        className="w-4 h-4 rounded text-red-600 bg-slate-800 border-slate-700 focus:ring-red-500"
                                    />
                                    <span className="text-xs font-bold text-white">
                                        Allow users to permanently hide / dismiss this message
                                    </span>
                                </label>
                                <p className="text-[11px] text-slate-400 pl-7">
                                    {isDismissible
                                        ? 'Users will see a "Don\'t show again" option. Once clicked, it will never show to that user again.'
                                        : 'Users cannot dismiss this message. It will be shown every time until you deactivate or delete it.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Priority (Higher = Shown First)
                                    </label>
                                    <input
                                        type="number"
                                        value={priority}
                                        onChange={(e) => setPriority(Number(e.target.value))}
                                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Expiration Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={expiresAt}
                                        onChange={(e) => setExpiresAt(e.target.value)}
                                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? 'Publishing...' : 'Publish Notice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

