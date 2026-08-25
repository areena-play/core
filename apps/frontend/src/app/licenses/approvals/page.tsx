'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { CheckSquare, CheckCircle2, XCircle, Clock, Shield, Award, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ApprovalsQueuePage() {
    const { user } = useAuth();
    const [pendingLicenses, setPendingLicenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPending = async () => {
        try {
            const data = await api.getLicenses();
            const filtered = data.filter((l: any) => l.status === 'PENDING_CLUB' || l.status === 'PENDING_ASSOCIATION');
            setPendingLicenses(filtered);
        } catch (err) {
            console.error('Failed to load pending licenses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

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

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CheckSquare className="h-6 w-6 text-red-500" />
                    License Approvals Queue
                </h1>
                <p className="text-sm text-slate-400">
                    Club and Association administrative approval portal for submitted player, coach, and referee license
                    requests.
                </p>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center text-slate-400">Loading approval requests...</div>
            ) : pendingLicenses.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <h3 className="text-base font-semibold text-white">All Clear!</h3>
                    <p className="text-xs">
                        There are no pending license applications requiring your administrative review.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingLicenses.map((lic) => (
                        <div
                            key={lic.id}
                            className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-5 hover:border-slate-700 transition sm:flex-row sm:items-center"
                        >
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            lic.status === 'PENDING_CLUB'
                                                ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                                                : 'bg-blue-950 text-blue-400 border border-blue-800/40'
                                        }`}
                                    >
                                        {lic.status.replace('_', ' ')}
                                    </span>
                                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                                        {lic.type}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-white">
                                    {lic.user?.firstName} {lic.user?.lastName} ({lic.user?.email})
                                </h3>

                                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                                    <span>
                                        <strong>Association:</strong> {lic.association?.name}
                                    </span>
                                    {lic.club && (
                                        <span>
                                            <strong>Club:</strong> {lic.club.name}
                                        </span>
                                    )}
                                    <span>
                                        <strong>Applied on:</strong> {format(new Date(lic.createdAt), 'PPP')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={() => setRejectingId(lic.id)}
                                    disabled={processingId === lic.id}
                                    className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/60 border border-slate-700 transition"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(lic.id)}
                                    disabled={processingId === lic.id}
                                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow transition flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>{processingId === lic.id ? 'Approving...' : 'Approve License'}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
                        <h3 className="text-base font-bold text-white">Reject License Application</h3>
                        <form onSubmit={handleReject} className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-300">Reason for Rejection</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Explain why this license request is being rejected..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRejectingId(null)}
                                    className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingId === rejectingId}
                                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
