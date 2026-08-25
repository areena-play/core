'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { GraduationCap, Calendar, MapPin, Clock, CheckCircle2, Plus, Award, Users, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function RefresherCoursesPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAttestModal, setShowAttestModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

    // New Course Form
    const [title, setTitle] = useState('');
    const [type, setType] = useState('COACH_REFRESHER');
    const [associationId, setAssociationId] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [durationHours, setDurationHours] = useState(4);
    const [validityMonths, setValidityMonths] = useState(12);

    // Attest Form
    const [attestUserId, setAttestUserId] = useState('');
    const [attestNotes, setAttestNotes] = useState('');
    const [attesting, setAttesting] = useState(false);
    const [attestSuccess, setAttestSuccess] = useState('');

    const fetchCourses = async () => {
        try {
            const data = await api.getRefresherCourses();
            setCourses(data);
        } catch (err) {
            console.error('Failed to load courses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
        api.getAssociations()
            .then((res) => {
                setAssociations(res.associations || []);
                if (res.associations?.length > 0) setAssociationId(res.associations[0].id);
            })
            .catch(() => {});
        api.getUsers()
            .then(setAllUsers)
            .catch(() => {});
    }, []);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createRefresherCourse({
                associationId,
                title,
                type,
                instructorId: user?.id,
                location,
                date,
                durationHours: Number(durationHours),
                validityExtensionMonths: Number(validityMonths),
            });
            setShowCreateModal(false);
            fetchCourses();
            setTitle('');
            setLocation('');
        } catch (err) {
            alert('Failed to create refresher course');
        }
    };

    const handleAttest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !attestUserId) return;
        setAttesting(true);
        setAttestSuccess('');
        try {
            await api.attestCourseAttendance(selectedCourse.id, {
                userId: attestUserId,
                notes: attestNotes || 'Successfully passed practical and theoretical course modules.',
            });
            setAttestSuccess(
                'Attendance successfully attested! Member license validity extended by ' +
                    selectedCourse.validityExtensionMonths +
                    ' months.',
            );
            fetchCourses();
            setTimeout(() => {
                setShowAttestModal(false);
                setAttestSuccess('');
                setAttestUserId('');
            }, 2000);
        } catch (err: any) {
            alert(err.message || 'Attestation failed');
        } finally {
            setAttesting(false);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-red-500" />
                        Coach & Referee Refresher Courses
                    </h1>
                    <p className="text-sm text-slate-400">
                        Mandatory continuing education seminars. Federation instructors attest attendance to extend
                        license validity periods.
                    </p>
                </div>

                {user && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create Refresher Course</span>
                    </button>
                )}
            </div>

            {/* Course Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.map((c) => (
                    <div
                        key={c.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-5 hover:border-slate-700 transition shadow-sm space-y-4"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span
                                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        c.type === 'COACH_REFRESHER'
                                            ? 'bg-purple-950 text-purple-400 border border-purple-800/50'
                                            : 'bg-blue-950 text-blue-400 border border-blue-800/50'
                                    }`}
                                >
                                    {c.type.replace('_', ' ')}
                                </span>
                                <span className="text-xs font-semibold text-emerald-400">
                                    +{c.validityExtensionMonths} Months Validity Extension
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-white">{c.title}</h3>

                            <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                    <span>
                                        {format(new Date(c.date), 'PPPP p')} ({c.durationHours} hrs)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                                    <span>{c.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5 text-slate-500" />
                                    <span>
                                        Instructor: {c.instructor?.firstName} {c.instructor?.lastName}
                                    </span>
                                </div>
                            </div>

                            {/* Attested Attendees */}
                            {c.attendances?.length > 0 && (
                                <div className="pt-2">
                                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                                        Attested Attendees ({c.attendances.length}):
                                    </span>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {c.attendances.map((att: any) => (
                                            <span
                                                key={att.id}
                                                className="inline-flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300"
                                            >
                                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                                <span>
                                                    {att.user?.firstName} {att.user?.lastName}
                                                </span>
                                                {att.user?.licenseId && (
                                                    <span className="font-mono text-red-400">
                                                        #{att.user?.licenseId}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex justify-end">
                            <button
                                onClick={() => {
                                    setSelectedCourse(c);
                                    setShowAttestModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-red-600 hover:text-white px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition"
                            >
                                <Award className="h-3.5 w-3.5" />
                                <span>Instructor Attestation</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Course Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Create Refresher Course</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-300">Course Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. National Coach Continuing Education 2026"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300">Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="COACH_REFRESHER">Coach Refresher</option>
                                        <option value="REFEREE_REFRESHER">Referee Refresher</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-300">Organizing Association</label>
                                    <select
                                        value={associationId}
                                        onChange={(e) => setAssociationId(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    >
                                        {associations.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-300">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-300">Duration (Hours)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={durationHours}
                                        onChange={(e) => setDurationHours(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300">Location / Venue</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. National Sports Center, Magglingen"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300">
                                    License Validity Extension (Months)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={validityMonths}
                                    onChange={(e) => setValidityMonths(Number(e.target.value))}
                                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                                >
                                    Create Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Attest Attendance Modal */}
            {showAttestModal && selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white">Attest Course Attendance</h3>
                                <p className="text-[11px] text-slate-400">{selectedCourse.title}</p>
                            </div>
                            <button
                                onClick={() => setShowAttestModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {attestSuccess && (
                            <div className="rounded-lg bg-emerald-950/80 border border-emerald-800 p-3 text-xs text-emerald-300">
                                {attestSuccess}
                            </div>
                        )}

                        <form onSubmit={handleAttest} className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-300">Select Member to Attest</label>
                                <select
                                    required
                                    value={attestUserId}
                                    onChange={(e) => setAttestUserId(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                >
                                    <option value="">Select Coach or Referee...</option>
                                    {allUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.firstName} {u.lastName} ({u.email}){' '}
                                            {u.licenseId ? `- ID: ${u.licenseId}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-300">Instructor Evaluation Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Attended full seminar and passed all technical assessments."
                                    value={attestNotes}
                                    onChange={(e) => setAttestNotes(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-[11px] text-slate-400">
                                ⚡ Attesting this course will automatically extend the member's license validity by{' '}
                                <strong>{selectedCourse.validityExtensionMonths} months</strong>.
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAttestModal(false)}
                                    className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={attesting}
                                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    {attesting ? 'Attesting...' : 'Confirm Attestation & Renew'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
