'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { Award, Shield, CheckCircle2, AlertCircle, Clock, Sparkles, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ApplyLicensePage() {
    const router = useRouter();
    const { user } = useAuth();

    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Form
    const [targetUserId, setTargetUserId] = useState<string>('');
    const [licenseType, setLicenseType] = useState<string>('PLAYER_REGULAR');
    const [associationId, setAssociationId] = useState<string>('');
    const [clubId, setClubId] = useState<string>('');
    const [seasonId, setSeasonId] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [customUntil, setCustomUntil] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                const [assocRes, clubsRes, usersRes] = await Promise.all([
                    api.getAssociations(),
                    api.getClubs(),
                    api.getUsers(),
                ]);
                setAssociations(assocRes.associations || []);
                setClubs(clubsRes || []);
                setAllUsers(usersRes || []);

                if (assocRes.associations?.length > 0) {
                    const top = assocRes.associations.find((a: any) => a.isTopLevel) || assocRes.associations[0];
                    setAssociationId(top.id);
                    const seasonsRes = await api.getSeasons(top.id);
                    setSeasons(seasonsRes || []);
                    if (seasonsRes?.length > 0) {
                        setSeasonId(seasonsRes[0].id);
                    }
                }
                if (clubsRes?.length > 0) {
                    setClubId(clubsRes[0].id);
                }
            } catch {}
        }
        loadData();
    }, []);

    const handleAssociationChange = async (newAssocId: string) => {
        setAssociationId(newAssocId);
        try {
            const s = await api.getSeasons(newAssocId);
            setSeasons(s || []);
            if (s?.length > 0) setSeasonId(s[0].id);
        } catch {}
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const payload: any = {
                userId: targetUserId || user?.id,
                type: licenseType,
                associationId,
                clubId: licenseType === 'PLAYER_REGULAR' || licenseType === 'PLAYER_WOMEN' ? clubId : null,
                seasonId: seasonId || null,
                validUntil: customUntil || undefined,
                notes,
            };

            const result = await api.applyLicense(payload);

            if (result.autoApproved) {
                setSuccessMsg(
                    '🎉 T-Card License has been AUTO-APPROVED based on domestic country criteria! Your license is active immediately.',
                );
            } else if (result.status === 'PENDING_CLUB') {
                setSuccessMsg('Application submitted. Awaiting approval by the Club Administration.');
            } else {
                setSuccessMsg('Application submitted. Awaiting official Association approval.');
            }

            setTimeout(() => {
                router.push('/licenses');
            }, 2500);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to submit license application');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16">
            <Link
                href="/licenses"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
                <ChevronLeft className="h-4 w-4" />
                Back to License Hub
            </Link>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Award className="h-6 w-6 text-red-500" />
                        Apply for Sports License
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Choose your role and license category. Roles grant official eligibility for league encounters,
                        ranked tournaments, or coaching & refereeing.
                    </p>
                </div>

                {errorMsg && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-800 bg-red-950/80 p-4 text-xs text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <strong className="font-semibold">Application Rule Restriction:</strong>
                            <div className="mt-0.5">{errorMsg}</div>
                        </div>
                    </div>
                )}

                {successMsg && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-800 bg-emerald-950/80 p-4 text-xs text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>{successMsg}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {/* Admin Apply for another user */}
                    {(user?.isSuperAdmin || (user?.clubRoles && user.clubRoles.length > 0)) && (
                        <div>
                            <label className="font-semibold text-slate-300">Apply on Behalf of Member (Optional)</label>
                            <select
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                            >
                                <option value="">
                                    Apply for Myself ({user?.firstName} {user?.lastName})
                                </option>
                                {allUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName} ({u.email}){' '}
                                        {u.licenseId ? `- ID: ${u.licenseId}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* License Type Selector */}
                    <div>
                        <label className="font-semibold text-slate-300">License Category</label>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label
                                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                                    licenseType === 'PLAYER_REGULAR'
                                        ? 'border-red-500 bg-red-950/20 text-white'
                                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="licenseType"
                                    value="PLAYER_REGULAR"
                                    checked={licenseType === 'PLAYER_REGULAR'}
                                    onChange={(e) => setLicenseType(e.target.value)}
                                    className="sr-only"
                                />
                                <div className="font-bold text-white flex items-center justify-between">
                                    <span>Regular Player License</span>
                                    <span className="text-[10px] rounded bg-red-600/30 text-red-400 px-1.5 py-0.5">
                                        Club Attached
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">
                                    Strictly 1 regular license per player per season. Valid for all national and
                                    regional league encounters.
                                </p>
                            </label>

                            <label
                                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                                    licenseType === 'PLAYER_TCARD'
                                        ? 'border-red-500 bg-red-950/20 text-white'
                                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="licenseType"
                                    value="PLAYER_TCARD"
                                    checked={licenseType === 'PLAYER_TCARD'}
                                    onChange={(e) => setLicenseType(e.target.value)}
                                    className="sr-only"
                                />
                                <div className="font-bold text-white flex items-center justify-between">
                                    <span>Tournament Card (T-Card)</span>
                                    <span className="text-[10px] rounded bg-emerald-600/30 text-emerald-400 px-1.5 py-0.5">
                                        Auto-Approval
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">
                                    For ranked tournament participation. No club attachment required. Instant
                                    auto-approval for domestic players.
                                </p>
                            </label>

                            <label
                                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                                    licenseType === 'COACH'
                                        ? 'border-red-500 bg-red-950/20 text-white'
                                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="licenseType"
                                    value="COACH"
                                    checked={licenseType === 'COACH'}
                                    onChange={(e) => setLicenseType(e.target.value)}
                                    className="sr-only"
                                />
                                <div className="font-bold text-white flex items-center justify-between">
                                    <span>Official Coach License</span>
                                    <span className="text-[10px] rounded bg-purple-600/30 text-purple-400 px-1.5 py-0.5">
                                        Refresher Required
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">
                                    Accredited coaching certification. Requires periodic refresher courses attested by
                                    federation instructors.
                                </p>
                            </label>

                            <label
                                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                                    licenseType === 'REFEREE'
                                        ? 'border-red-500 bg-red-950/20 text-white'
                                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="licenseType"
                                    value="REFEREE"
                                    checked={licenseType === 'REFEREE'}
                                    onChange={(e) => setLicenseType(e.target.value)}
                                    className="sr-only"
                                />
                                <div className="font-bold text-white flex items-center justify-between">
                                    <span>Official Referee License</span>
                                    <span className="text-[10px] rounded bg-blue-600/30 text-blue-400 px-1.5 py-0.5">
                                        Refresher Required
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">
                                    Federation match referee credential. Requires attendance at annual rule update
                                    refresher seminars.
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* Association Selection */}
                    <div>
                        <label className="font-semibold text-slate-300">Granting Association / Region</label>
                        <select
                            value={associationId}
                            onChange={(e) => handleAssociationChange(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                        >
                            {associations.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({a.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Club Selection (for regular licenses) */}
                    {(licenseType === 'PLAYER_REGULAR' || licenseType === 'PLAYER_WOMEN') && (
                        <div>
                            <label className="font-semibold text-slate-300">Attached Sports Club</label>
                            <select
                                value={clubId}
                                onChange={(e) => setClubId(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                            >
                                {clubs.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.code}) - {c.city}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Season Selection */}
                    {seasons.length > 0 && (
                        <div>
                            <label className="font-semibold text-slate-300">Season Validity Period</label>
                            <select
                                value={seasonId}
                                onChange={(e) => setSeasonId(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                            >
                                {seasons.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        Season {s.name} {s.isCurrent ? '(Current Official Season)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="font-semibold text-slate-300">Notes / Supporting Information</label>
                        <textarea
                            rows={2}
                            placeholder="Any additional remarks for federation verification..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <Link
                            href="/licenses"
                            className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow"
                        >
                            {submitting ? 'Processing Application...' : 'Submit License Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
