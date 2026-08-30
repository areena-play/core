'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { Mail, Send, Users, CheckCircle2, AlertCircle, MessageSquare, Clock, Shield, Smartphone, Activity, BellRing } from 'lucide-react';
import { format } from 'date-fns';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { AuditTrailViewer } from '@/components/audit/AuditTrailViewer';
import { AdminNoticesManager } from '@/components/notices/AdminNoticesManager';

export default function CommunicationsPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [messages, setMessages] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'messages' | 'notices' | 'audit'>('messages');

    // Form
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [channel, setChannel] = useState('EMAIL');
    const [targetScope, setTargetScope] = useState('ALL'); // ALL, ASSOCIATION, CLUB
    const [selectedAssocId, setSelectedAssocId] = useState('');
    const [selectedClubId, setSelectedClubId] = useState('');
    const [targetRole, setTargetRole] = useState('ALL'); // ALL, PLAYER, COACH, REFEREE
    const [sending, setSending] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const fetchMessages = async () => {
        try {
            const data = await api.getMessages();
            setMessages(data);
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        api.getAssociations()
            .then((res) => {
                setAssociations(res.associations || []);
                if (res.associations?.length > 0) setSelectedAssocId(res.associations[0].id);
            })
            .catch(() => {});
        api.getClubs()
            .then((res) => {
                setClubs(res || []);
                if (res?.length > 0) setSelectedClubId(res[0].id);
            })
            .catch(() => {});
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const payload: any = {
                subject,
                body,
                channel,
                targetRole,
                associationId: targetScope === 'ASSOCIATION' ? selectedAssocId : null,
                clubId: targetScope === 'CLUB' ? selectedClubId : null,
            };

            const result = await api.sendBroadcast(payload);
            setSuccessMsg(t('communications.broadcastSuccess', { count: result.recipientCount }));
            fetchMessages();
            setSubject('');
            setBody('');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to send broadcast');
        } finally {
            setSending(false);
        }
    };

    if (!user) {
        return (
            <AccessDenied
                title="Communications Restricted"
                description="An authenticated AREENA user account is required to view federation circulars, bulletins, and internal communications."
                requiredRole="Authenticated Member"
                returnHref="/"
            />
        );
    }

    const canBroadcast =
        user.isSuperAdmin ||
        (user.associationRoles && user.associationRoles.length > 0) ||
        (user.clubRoles && user.clubRoles.length > 0);

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Mail className="h-6 w-6 text-red-500" />
                        <span>{t('communications.title')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {t('communications.subtitle')}
                    </p>
                </div>

                {/* Tab Switcher */}
                {canBroadcast && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab('messages')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                activeTab === 'messages'
                                    ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <Send className="h-3.5 w-3.5 text-red-500" />
                            <span>Broadcast Hub</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('notices')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                activeTab === 'notices'
                                    ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <BellRing className="h-3.5 w-3.5 text-amber-500" />
                            <span>Admin Notices</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                activeTab === 'audit'
                                    ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <Activity className="h-3.5 w-3.5 text-blue-500" />
                            <span>Audit & Delivery Trail</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Admin Notices & Announcements Tab */}
            {activeTab === 'notices' && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xl space-y-6">
                    <AdminNoticesManager associations={associations} clubs={clubs} />
                </div>
            )}

            {/* Contextual Audit Trail View */}
            {activeTab === 'audit' && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xl space-y-6">
                    <AuditTrailViewer
                        category="COMMUNICATION"
                        title={t('audit.commTrailTitle')}
                        subtitle={t('audit.commTrailSubtitle')}
                        compact={true}
                    />
                </div>
            )}

            {/* Compose & History Grid */}
            {activeTab === 'messages' && (
            <div className={canBroadcast ? 'grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8' : 'max-w-3xl space-y-6'}>
                {/* Left 2 Cols: Compose Form (Admins / Officials Only) */}
                {canBroadcast && (
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 md:p-8 shadow-xl space-y-6">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Send className="h-4 w-4 text-red-500" />
                                <span>{t('communications.compose')}</span>
                            </h2>

                        {errorMsg && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/80 p-4 text-xs text-red-700 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>{errorMsg}</div>
                            </div>
                        )}

                        {successMsg && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 p-4 text-xs text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <div>{successMsg}</div>
                            </div>
                        )}

                        <form onSubmit={handleSend} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('communications.channel')}
                                    </label>
                                    <select
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="EMAIL">✉️ Email Broadcast</option>
                                        <option value="SMS">📱 SMS Notification</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('communications.targetRole')}
                                    </label>
                                    <select
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="ALL">All Members & Officials</option>
                                        <option value="PLAYER">Licensed Players Only</option>
                                        <option value="COACH">Accredited Coaches Only</option>
                                        <option value="REFEREE">Certified Referees Only</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('communications.targetScope')}
                                </label>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetScope('ALL')}
                                        className={`rounded-lg border py-2 font-semibold transition ${
                                            targetScope === 'ALL'
                                                ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        All Federation
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetScope('ASSOCIATION')}
                                        className={`rounded-lg border py-2 font-semibold transition ${
                                            targetScope === 'ASSOCIATION'
                                                ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        Specific Region
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetScope('CLUB')}
                                        className={`rounded-lg border py-2 font-semibold transition ${
                                            targetScope === 'CLUB'
                                                ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        Specific Club
                                    </button>
                                </div>
                            </div>

                            {targetScope === 'ASSOCIATION' && (
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.association')}
                                    </label>
                                    <select
                                        value={selectedAssocId}
                                        onChange={(e) => setSelectedAssocId(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        {associations.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name} ({a.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {targetScope === 'CLUB' && (
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('common.club')}
                                    </label>
                                    <select
                                        value={selectedClubId}
                                        onChange={(e) => setSelectedClubId(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        {clubs.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.city})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('communications.subject')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Important: Tournament Registration Cutoff Date Announced"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('communications.message')}
                                </label>
                                <textarea
                                    required
                                    rows={6}
                                    placeholder="Type your official announcement here..."
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition"
                                >
                                    <Send className="h-4 w-4" />
                                    <span>{sending ? t('common.submitting') : t('communications.sendBroadcast')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                )}

                {/* Right Col: Sent Messages Log */}
                <div className="space-y-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-500" />
                        <span>{t('communications.history')}</span>
                    </h2>

                    <div className="space-y-3">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-4 space-y-2 text-xs shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-[10px] font-mono">
                                        {m.channel}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                        {format(new Date(m.sentAt), 'MMM dd, HH:mm')}
                                    </span>
                                </div>

                                <h4 className="font-bold text-slate-900 dark:text-white">{m.subject}</h4>
                                <p className="text-slate-600 dark:text-slate-300 line-clamp-2">{m.body}</p>

                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                                    <span>
                                        {t('communications.sentBy', {
                                            sender: `${m.sender?.firstName || ''} ${m.sender?.lastName || ''}`.trim() || 'Federation Admin',
                                        })}
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        {t('communications.deliveredCount', {
                                            count: m._count?.recipients || 0,
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
