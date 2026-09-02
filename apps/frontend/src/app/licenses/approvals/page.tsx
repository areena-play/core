'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { CheckSquare, CheckCircle2, XCircle, Clock, Shield, Award, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Modal } from '@/components/ui/Modal';

export default function ApprovalsQueuePage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const [pendingLicenses, setPendingLicenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const isAuthorized =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        ) ||
        user?.clubRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const fetchPending = async () => {
        try {
            const data = await api.getLicenses();
            const filtered = data.filter(
                (l: any) => l.status === 'PENDING_CLUB' || l.status === 'PENDING_ASSOCIATION',
            );
            setPendingLicenses(filtered);
        } catch (err) {
            console.error('Failed to load pending licenses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            if (isAuthorized) {
                fetchPending();
            } else {
                setLoading(false);
            }
        }
    }, [authLoading, isAuthorized]);

    const handleApprove = async (licenseId: string) => {
        setProcessingId(licenseId);
        try {
            await api.approveLicense(licenseId, { approved: true });
            fetchPending();
        } catch (err: any) {
            alert(err.message || 'Approval failed');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingId) return;
        setProcessingId(rejectingId);
        try {
            await api.approveLicense(rejectingId, {
                approved: false,
                rejectionReason: rejectReason,
            });
            setRejectingId(null);
            setRejectReason('');
            fetchPending();
        } catch (err: any) {
            alert(err.message || 'Rejection failed');
        } finally {
            setProcessingId(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <AccessDenied
                title="License Approvals Restricted"
                description="The license approvals queue is restricted to authorized federation and club administrative officers."
                requiredRole="Club or Association Administrator"
                returnHref="/licenses"
            />
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="h-6 w-6 text-red-500" />
                    <span>{t('licenses.approvalsQueue')}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {t('licenses.subtitle')}
                </p>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center text-slate-500 dark:text-slate-400">
                    {t('common.loading')}
                </div>
            ) : pendingLicenses.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 p-12 text-center text-slate-500 dark:text-slate-400 space-y-2 shadow-sm">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">All Clear!</h3>
                    <p className="text-xs">
                        There are no pending license applications requiring your administrative review.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingLicenses.map((lic) => (
                        <div
                            key={lic.id}
                            className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition sm:flex-row sm:items-center shadow-sm"
                        >
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            lic.status === 'PENDING_CLUB'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-300 dark:border-blue-800/40'
                                        }`}
                                    >
                                        {lic.status.replace('_', ' ')}
                                    </span>
                                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                                        {lic.type}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {lic.user?.firstName} {lic.user?.lastName} ({lic.user?.email})
                                </h3>

                                <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                                    <span>
                                        <strong>{t('common.association')}:</strong> {lic.association?.name}
                                    </span>
                                    {lic.club && (
                                        <span>
                                            <strong>{t('common.club')}:</strong> {lic.club.name}
                                        </span>
                                    )}
                                    <span>
                                        <strong>{t('common.date')}:</strong> {format(new Date(lic.createdAt), 'PPP')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={() => setRejectingId(lic.id)}
                                    disabled={processingId === lic.id}
                                    className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 border border-slate-300 dark:border-slate-700 transition"
                                >
                                    {t('common.reject')}
                                </button>
                                <button
                                    onClick={() => handleApprove(lic.id)}
                                    disabled={processingId === lic.id}
                                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow transition flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>
                                        {processingId === lic.id
                                            ? t('common.saving')
                                            : t('common.approve')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            <Modal
                isOpen={Boolean(rejectingId)}
                onClose={() => setRejectingId(null)}
                title={`${t('common.reject')} License Application`}
                subtitle="Provide an explanation for rejecting this license request"
                size="md"
            >
                <form onSubmit={handleReject} className="space-y-4">
                    <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Reason for Rejection
                        </label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Explain why this license request is being rejected..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={processingId === rejectingId}
                            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {t('common.reject')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
