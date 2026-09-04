'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    GraduationCap,
    Calendar,
    MapPin,
    Clock,
    CheckCircle2,
    Plus,
    Award,
    Users,
    Shield,
    Lock,
    ExternalLink,
    Search,
    BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';

interface RefresherCoursesViewProps {
    scopedAssociationId?: string;
}

export function RefresherCoursesView({ scopedAssociationId }: RefresherCoursesViewProps) {
    const { user } = useAuth();
    const { t } = useI18n();

    const [courses, setCourses] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [typeFilter, setTypeFilter] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAttestModal, setShowAttestModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

    // New Course Form
    const [title, setTitle] = useState('');
    const [type, setType] = useState('COACH_REFRESHER');
    const [associationId, setAssociationId] = useState(scopedAssociationId || '');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [durationHours, setDurationHours] = useState(4);
    const [validityMonths, setValidityMonths] = useState(12);
    const [creating, setCreating] = useState(false);

    // Attest Form
    const [attestUserId, setAttestUserId] = useState('');
    const [attestNotes, setAttestNotes] = useState('');
    const [attesting, setAttesting] = useState(false);
    const [attestSuccess, setAttestSuccess] = useState('');

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await api.getRefresherCourses();
            setCourses(data || []);
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
                const list = res.associations || [];
                setAssociations(list);
                if (scopedAssociationId) {
                    const found = list.find((a: any) => a.id === scopedAssociationId);
                    if (found) {
                        setScopedAssoc(found);
                        setAssociationId(found.id);
                    }
                } else if (list.length > 0 && !associationId) {
                    setAssociationId(list[0].id);
                }
            })
            .catch(() => {});

        api.getUsers()
            .then(setAllUsers)
            .catch(() => {});
    }, [scopedAssociationId]);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.createRefresherCourse({
                associationId: scopedAssociationId || associationId,
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
        } catch (err: any) {
            alert(err.message || 'Failed to create refresher course');
        } finally {
            setCreating(false);
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
                `Attendance successfully attested! Member license validity extended by ${selectedCourse.validityExtensionMonths} months.`
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

    const filteredCourses = courses.filter((c) => {
        const matchesScoped = !scopedAssociationId || c.associationId === scopedAssociationId;
        const matchesType = !typeFilter || c.type === typeFilter;
        const matchesSearch =
            !search ||
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.location?.toLowerCase().includes(search.toLowerCase());
        return matchesScoped && matchesType && matchesSearch;
    });

    return (
        <div className="space-y-6 pb-16">
            {/* Header Banner */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Regional Refresher Courses</span>
                                </>
                            ) : (
                                <>
                                    <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Continuing Education & Recertification</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc ? `${scopedAssoc.name} • Refresher Courses` : t('nav.refresherCourses')}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            {scopedAssoc
                                ? `Mandatory license renewal and clinic sessions organized by ${scopedAssoc.name} [${scopedAssoc.code}].`
                                : 'Coaching clinics, referee recertification modules, and license renewal programs.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {scopedAssociationId && (
                            <Link
                                href="/courses"
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>All Courses</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        )}
                        {isAssocAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (scopedAssociationId) setAssociationId(scopedAssociationId);
                                    setShowCreateModal(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Host New Course</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search courses, instructors, venues..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white shadow-xs focus:border-emerald-500 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                    >
                        <option value="">All Categories</option>
                        <option value="COACH_REFRESHER">Coach Refresher</option>
                        <option value="REFEREE_REFRESHER">Referee Refresher</option>
                    </select>

                    {scopedAssociationId && (
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/40 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            <Lock className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="truncate max-w-[200px]">
                                {scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Course Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                    ))}
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
                    <GraduationCap className="h-10 w-10 text-slate-400 mx-auto" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">No courses found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {scopedAssociationId
                            ? 'No refresher courses scheduled under this sub-association matching your criteria.'
                            : 'No continuing education courses scheduled yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCourses.map((c) => (
                        <div
                            key={c.id}
                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition flex flex-col justify-between space-y-4"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                                        {c.type === 'COACH_REFRESHER' ? 'Coach Refresher' : 'Referee Refresher'}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">
                                        +{c.validityExtensionMonths} Mo. Extension
                                    </span>
                                </div>

                                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                    {c.title}
                                </h3>

                                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    {c.association && (
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            <span>{c.association.name}</span>
                                        </div>
                                    )}
                                    {c.date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span>{format(new Date(c.date), 'PPP')}</span>
                                        </div>
                                    )}
                                    {c.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span>{c.location} ({c.durationHours} hours)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{c.attendances?.length || 0} Attested Attendees</span>
                                </span>
                                {isAssocAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCourse(c);
                                            setShowAttestModal(true);
                                        }}
                                        className="rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold transition"
                                    >
                                        Attest Attendance
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Course Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Host New Refresher Course"
                subtitle="Host an official education course to renew referee or coach licenses"
                icon={<GraduationCap className="h-5 w-5 text-emerald-500" />}
                size="lg"
            >
                <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Course Title *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. 2026 Swiss Referee Recertification Module A"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Course Type *
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-medium"
                            >
                                <option value="COACH_REFRESHER">Coach Refresher</option>
                                <option value="REFEREE_REFRESHER">Referee Refresher</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Host Association *
                            </label>
                            {scopedAssociationId ? (
                                <input
                                    type="text"
                                    disabled
                                    value={scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-500"
                                />
                            ) : (
                                <select
                                    value={associationId}
                                    onChange={(e) => setAssociationId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                                >
                                    {associations.map((a: any) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({a.code})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Event Date & Time *
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Duration (Hours)
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={durationHours}
                                onChange={(e) => setDurationHours(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Location / Venue *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Sports Hall Wankdorf, Bern"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Duration (Hours)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={48}
                                value={durationHours}
                                onChange={(e) => setDurationHours(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Validity Extension (Months)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={48}
                                value={validityMonths}
                                onChange={(e) => setValidityMonths(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Course'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Attest Attendance Modal */}
            <Modal
                isOpen={Boolean(showAttestModal && selectedCourse)}
                onClose={() => setShowAttestModal(false)}
                title="Attest Course Attendance"
                subtitle={selectedCourse?.title}
                icon={<Award className="h-5 w-5 text-emerald-500" />}
                size="md"
            >
                {attestSuccess && (
                    <div className="rounded-xl p-3 mb-4 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{attestSuccess}</span>
                    </div>
                )}

                <form onSubmit={handleAttest} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Select Member / Official *
                        </label>
                        <select
                            required
                            value={attestUserId}
                            onChange={(e) => setAttestUserId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="">-- Choose Member --</option>
                            {allUsers.map((u: any) => (
                                <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Evaluation Notes / Comments
                        </label>
                        <textarea
                            rows={2}
                            value={attestNotes}
                            onChange={(e) => setAttestNotes(e.target.value)}
                            placeholder="Passed practical evaluation and theory exam."
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowAttestModal(false)}
                            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={attesting || !attestUserId}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                        >
                            {attesting ? 'Attesting...' : 'Confirm & Extend License'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}