'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import {
    Trophy,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Home,
    AlertCircle,
    ClipboardCheck,
    RefreshCw,
    CalendarDays,
    MapPin,
    Users,
    ArrowUpRight,
    ShieldCheck,
    Search,
} from 'lucide-react';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { ModalPortal } from '@/components/ui/ModalPortal';

type Competition = {
    id: string;
    name: string;
    type: string;
    status: string;
    approvalStatus: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    clubName?: string;
    playerCount?: number;
};

function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CompetitionHubPage() {
    const { user } = useAuth();
    const params = useParams();
    const assocId = params?.id as string;

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) => ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role));

    const [pending, setPending] = useState<Competition[]>([]);
    const [completed, setCompleted] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
    const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [validateComp, setValidateComp] = useState<Competition | null>(null);
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        if (!isAssocAdmin) return;
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAssocAdmin, assocId]);

    async function load() {
        setLoading(true);
        try {
            const qp: Record<string, string> = {};
            if (assocId && assocId !== 'main') qp.associationId = assocId;
            const all = await api.getCompetitions(qp);
            const list: Competition[] = Array.isArray(all) ? all : all?.competitions ?? all?.data ?? [];
            setPending(list.filter((c) => c.approvalStatus === 'PENDING_APPROVAL'));
            setCompleted(list.filter((c) => c.status === 'COMPLETED'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleApproval() {
        if (!selectedComp || !actionType) return;
        setSubmitting(true);
        try {
            await api.approveCompetition(selectedComp.id, {
                status: actionType,
                ...(actionType === 'REJECTED' && rejectReason ? { reason: rejectReason } : {}),
            });
            setSelectedComp(null); setActionType(null); setRejectReason('');
            load();
        } catch (e) { console.error(e); } finally { setSubmitting(false); }
    }

    async function handleValidate() {
        if (!validateComp) return;
        setValidating(true);
        try {
            await api.approveCompetition(validateComp.id, { status: 'RESULTS_VALIDATED' });
            setValidateComp(null);
            load();
        } catch (e) { console.error(e); } finally { setValidating(false); }
    }

    const filter = (list: Competition[]) =>
        !search ? list : list.filter((c) =>
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.clubName?.toLowerCase().includes(search.toLowerCase()));

    if (!isAssocAdmin) return <AccessDenied />;

    const mgmt = assocId && assocId !== 'main' ? `/association/${assocId}/management` : '/management';
    const pf = filter(pending);
    const cf = filter(completed);

    return (
        <div className="space-y-6 md:space-y-8 pb-16">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl">
                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 shadow-lg">
                            <Trophy className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                                <Link href="/"><Home className="h-3 w-3" /></Link>
                                <ChevronRight className="h-3 w-3" />
                                <Link href={mgmt} className="hover:text-slate-700 dark:hover:text-slate-200">Management</Link>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-slate-700 dark:text-slate-200 font-medium">Tournament Hub</span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tournament Hub</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Approve pending competitions and validate post-tournament results.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-800/40 dark:bg-amber-950/30">
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{pending.length} Awaiting Approval</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 dark:border-purple-800/40 dark:bg-purple-950/30">
                            <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{completed.length} Awaiting Validation</span>
                        </div>
                    </div>
                </div>
                <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-500/5 blur-3xl dark:bg-red-500/10" />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search competitions or clubs..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
            </div>

            {/* Pending Approval */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pending Approval</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Competitions created by clubs that require your sign-off before they go live.</p>
                    </div>
                    <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">{pf.length}</span>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin" /><span className="text-sm">Loading...</span></div>
                ) : pf.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center"><CheckCircle2 className="h-8 w-8 text-green-400" /><p className="text-sm text-slate-500">{search ? 'No matches.' : 'Nothing pending approval.'}</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Competition</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Dates</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">Organiser</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {pf.map((comp) => (
                                    <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40"><Trophy className="h-4 w-4 text-red-600 dark:text-red-400" /></div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{comp.name}</p>
                                                    {comp.location && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{comp.location}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                <CalendarDays className="h-3.5 w-3.5" />{formatDate(comp.startDate)}{comp.endDate && comp.endDate !== comp.startDate && <span> to {formatDate(comp.endDate)}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 hidden lg:table-cell"><span className="text-xs text-slate-600 dark:text-slate-400">{comp.clubName ?? '—'}</span></td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/competition/${comp.id}`} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors flex items-center gap-1">View <ArrowUpRight className="h-3 w-3" /></Link>
                                                <button onClick={() => { setSelectedComp(comp); setActionType('APPROVED'); }} className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-colors flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approve</button>
                                                <button onClick={() => { setSelectedComp(comp); setActionType('REJECTED'); }} className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-red-100 hover:text-red-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-red-950/60 dark:hover:text-red-400 transition-colors flex items-center gap-1"><XCircle className="h-3 w-3" /> Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Results Validation */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/60">
                        <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Results Validation</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Completed competitions where results need to be officially confirmed and locked.</p>
                    </div>
                    <span className="ml-auto rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-400">{cf.length}</span>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin" /><span className="text-sm">Loading...</span></div>
                ) : cf.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center"><ShieldCheck className="h-8 w-8 text-purple-400" /><p className="text-sm text-slate-500">{search ? 'No matches.' : 'No completed competitions awaiting validation.'}</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Competition</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Ended</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Participants</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden lg:table-cell">Organiser</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {cf.map((comp) => (
                                    <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/40"><Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" /></div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{comp.name}</p>
                                                    {comp.location && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{comp.location}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 hidden md:table-cell"><div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{formatDate(comp.endDate)}</div></td>
                                        <td className="px-5 py-4 hidden sm:table-cell"><div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Users className="h-3.5 w-3.5" />{comp.playerCount ?? '—'}</div></td>
                                        <td className="px-5 py-4 hidden lg:table-cell"><span className="text-xs text-slate-600 dark:text-slate-400">{comp.clubName ?? '—'}</span></td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/competition/${comp.id}/results`} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors flex items-center gap-1">Results <ArrowUpRight className="h-3 w-3" /></Link>
                                                <button onClick={() => setValidateComp(comp)} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Validate</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approve/Reject Modal */}
            {selectedComp && actionType && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-xl space-y-5">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${actionType === 'APPROVED' ? 'bg-green-100 dark:bg-green-950/60' : 'bg-red-100 dark:bg-red-950/60'}`}>
                                    {actionType === 'APPROVED' ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{actionType === 'APPROVED' ? 'Approve Competition' : 'Reject Competition'}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedComp.name}</p>
                                </div>
                            </div>
                            {actionType === 'APPROVED' ? (
                                <p className="text-sm text-slate-600 dark:text-slate-300">This will approve <strong>{selectedComp.name}</strong> and make it visible to participants.</p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-600 dark:text-slate-300">Please provide a reason for rejecting this competition:</p>
                                    <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Missing safety documentation..."
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 resize-none" />
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-1">
                                <button onClick={() => { setSelectedComp(null); setActionType(null); setRejectReason(''); }} disabled={submitting} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors">Cancel</button>
                                <button onClick={handleApproval} disabled={submitting || (actionType === 'REJECTED' && !rejectReason.trim())} className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 ${actionType === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {submitting ? 'Saving...' : actionType === 'APPROVED' ? 'Approve' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Validate Results Modal */}
            {validateComp && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-xl space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60"><ShieldCheck className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Validate Results</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{validateComp.name}</p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/30">
                                <div className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" /><p className="text-xs text-amber-700 dark:text-amber-300">Validating results is permanent. This officially locks the final standings, triggers ELO updates, and notifies all participants.</p></div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">Confirm that you have reviewed the results of <strong>{validateComp.name}</strong> and they are correct.</p>
                            <div className="flex justify-end gap-3 pt-1">
                                <button onClick={() => setValidateComp(null)} disabled={validating} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors">Cancel</button>
                                <button onClick={handleValidate} disabled={validating} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50">{validating ? 'Validating...' : 'Confirm & Validate'}</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}