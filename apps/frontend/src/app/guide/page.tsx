'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { useMainView } from '@/lib/mainViewContext';
import { useTheme } from '@/lib/themeContext';
import {
    Trophy,
    Award,
    Users,
    Calendar,
    Shield,
    ArrowRight,
    Sparkles,
    Network,
    BookOpen,
    HelpCircle,
    Building2,
    Mail,
    Phone,
    Globe,
    ExternalLink,
    MapPin,
    Calculator,
    UserCheck,
    CheckCircle2,
    FileText,
    Activity,
    Lock,
    Zap,
    GraduationCap,
} from 'lucide-react';

export default function GuidePage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const { associations, mainAssoc } = useMainView();
    const { resolvedTheme } = useTheme();

    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoleTab, setSelectedRoleTab] = useState<'players' | 'clubs' | 'referees' | 'guardians'>('players');

    useEffect(() => {
        api.getClubs()
            .then((data) => setClubs(data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const nationalAssoc = useMemo(() => {
        return associations.find((a) => a.isTopLevel) || mainAssoc || associations[0];
    }, [associations, mainAssoc]);

    const regionalAssocs = useMemo(() => {
        return associations.filter((a) => !a.isTopLevel);
    }, [associations]);

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-16 pt-2">
            {/* Header Hero */}
            <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50/50 p-6 sm:p-10 shadow-sm dark:border-red-900/40 dark:bg-gradient-to-br dark:from-red-950/80 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl">
                <div className="relative z-10 max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-600/10 dark:bg-red-600/20 px-3.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>AREENA Knowledge Hub & Guide</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                        Getting Started with AREENA
                    </h1>

                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                        Complete handbook for athletes, club managers, referees, and parents. Learn how to obtain a Swiss table tennis license, enter official competitions, track your Elo rating, and manage federation operations.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <a
                            href="#role-guides"
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-red-700 transition"
                        >
                            <Users className="h-4 w-4" />
                            <span>Role-by-Role Guides</span>
                        </a>
                        <a
                            href="#quick-licenses"
                            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            <Award className="h-4 w-4 text-emerald-500" />
                            <span>License Request Hub</span>
                        </a>
                        <a
                            href="#hierarchy"
                            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            <Network className="h-4 w-4 text-purple-500" />
                            <span>Federation Hierarchy</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Quick 4-Track Overview Cards */}
            <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Core Platform Capabilities
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Track 1: Find Clubs & Play */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                1. Find a Club & Train
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Join a licensed table tennis club in your region, participate in group training, and join official league rosters.
                            </p>
                        </div>
                        <Link
                            href="/clubs"
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-2"
                        >
                            <span>Browse Clubs ({clubs.length})</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Track 2: Open Tournaments */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                2. Compete in Tournaments
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Register for open tournaments, Swiss circuit series, youth rankings, and regional championships across Switzerland.
                            </p>
                        </div>
                        <Link
                            href="/competitions"
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-2"
                        >
                            <span>Explore Calendar</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Track 3: Licenses & Passports */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <Award className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                3. Get Your License ID
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Your permanent license number is generated upon first approval. Choose from seasonal passes or tournament-only cards.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-2"
                        >
                            <span>Request License</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* Track 4: Elo & Level Matrix */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                4. Elo & Level Classification
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Track your official skill tier (D1 to A20), simulate rating deltas, and review monthly ranking list updates.
                            </p>
                        </div>
                        <Link
                            href="/utilities/level-table"
                            className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-2"
                        >
                            <span>View Level Matrix</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Role-Specific Interactive Guides */}
            <div id="role-guides" className="space-y-6 pt-4">
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        Guides by Role
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Choose your primary role in the table tennis community for step-by-step guidance.
                    </p>
                </div>

                {/* Role Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <button
                        onClick={() => setSelectedRoleTab('players')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                            selectedRoleTab === 'players'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Zap className="h-4 w-4" />
                        <span>Players & Competitors</span>
                    </button>
                    <button
                        onClick={() => setSelectedRoleTab('clubs')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                            selectedRoleTab === 'clubs'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Building2 className="h-4 w-4" />
                        <span>Club Officials & Coaches</span>
                    </button>
                    <button
                        onClick={() => setSelectedRoleTab('referees')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                            selectedRoleTab === 'referees'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <GraduationCap className="h-4 w-4" />
                        <span>Referees & Umpires</span>
                    </button>
                    <button
                        onClick={() => setSelectedRoleTab('guardians')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                            selectedRoleTab === 'guardians'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        <span>Parents & Guardians</span>
                    </button>
                </div>

                {/* Role Content */}
                <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-6 sm:p-8 space-y-6">
                    {selectedRoleTab === 'players' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-red-500" />
                                    <span>Player & Athlete Roadmap</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    From beginner to competitive league player: how AREENA supports your sports journey.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-950 text-red-600 text-xs font-bold flex items-center justify-center">1</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Create Account & Link License</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Register with your email and link your existing Swiss license number or apply for a new license directly from your profile.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-950 text-red-600 text-xs font-bold flex items-center justify-center">2</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Join Club & Team Rosters</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Your club administrators will assign you to league teams (e.g. 3. Liga, O40, Junior). Your upcoming fixtures appear automatically on your home dashboard.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-950 text-red-600 text-xs font-bold flex items-center justify-center">3</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Track Elo, H2H & Live Scores</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Every official set and match updates your rating history. Check head-to-head statistics against any opponent in Switzerland.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link href="/profile?tab=licenses" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition">
                                    <span>Go to My Profile</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                                <Link href="/utilities/elo-calculator" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                    <Calculator className="h-3.5 w-3.5" />
                                    <span>Elo Calculator</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {selectedRoleTab === 'clubs' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-500" />
                                    <span>Club Official & Coach Hub</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Tools for presidents, technical directors, and team captains.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 text-xs font-bold flex items-center justify-center">1</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Roster & Member Management</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Add club members, assign club official roles (President, Treasurer, Coach), and process annual federation license requests.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 text-xs font-bold flex items-center justify-center">2</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">League Team Registration</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Configure team lineups for Interclub championships, submit player order confirmations, and handle match reschedulings.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 text-xs font-bold flex items-center justify-center">3</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Invoicing & Club Finances</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Track club license fees, federation levies, and tournament entry billing seamlessly with automated PDF statements.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link href="/clubs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">
                                    <span>Club Management</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                                <Link href="/team-hub" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>Team Hub</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {selectedRoleTab === 'referees' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-purple-500" />
                                    <span>Referee & Umpire Digital Center</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Official match officiating, digital scoresheets, and credential tracking.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 text-xs font-bold flex items-center justify-center">1</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Live Match Digital Scoresheet</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Officiate point-by-point live matches from your tablet or mobile. Scores stream instantaneously to federation tickers and spectators.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 text-xs font-bold flex items-center justify-center">2</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Referee Credentials & Refresher Courses</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Keep your certification active with automated course attendance records, exam attestations, and regional credential management.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 text-xs font-bold flex items-center justify-center">3</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Incident & Match Reports</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Log official yellow/red card disciplinary reports and submit verified scoresheets with digital referee signatures.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link href="/management/licenses/refresher-courses" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition">
                                    <span>Refresher Courses</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {selectedRoleTab === 'guardians' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5 text-emerald-500" />
                                    <span>Parent & Legal Guardian Management</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Manage youth licenses, tournament registrations, and privacy settings for your children.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-xs font-bold flex items-center justify-center">1</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Family Account Linking</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Link your child's athlete account under your verified guardian profile to manage competition registrations and license renewals.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-xs font-bold flex items-center justify-center">2</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Junior Ranking & Safety</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Control public visibility settings, media consent, and track regional youth championship qualification tables.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-xs font-bold flex items-center justify-center">3</span>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Tournament Entries</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Register junior athletes for age-group tournaments (U11, U13, U15, U17, U19) with one-click entry fee checkout.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link href="/profile?tab=relationships" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition">
                                    <span>Manage Managed Profiles</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick License Request Hub */}
            <div id="quick-licenses" className="space-y-4 pt-4">
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        <Award className="h-5 w-5 text-emerald-500" />
                        <span>License Request Hub</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Apply for digital competition passports, short-term tournament passes, or official referee/coach credentials.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Regular Player License */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-mono">
                                    FULL SEASON
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">Club Affiliated</span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                Regular Player License
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Valid for all interclub league matches and open national tournaments throughout the entire season.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true&type=PLAYER_REGULAR"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition shadow-xs"
                        >
                            <span>Apply Regular License</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* 2. Tournament / Short-term Pass */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 font-mono">
                                    EVENT PASS / T-CARD
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">No Club Required</span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                Short-Term Tournament Pass
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Single event or day license for guest participants, foreign players, and open recreational competitions.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true&type=PLAYER_TCARD"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold transition shadow-xs"
                        >
                            <span>Get Tournament Pass</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {/* 3. Official Coach / Referee Pass */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 font-mono">
                                    OFFICIAL
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">Refresher Compliant</span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                Referee & Coach Pass
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Federation certified official credentials with automated refresher course attendance tracking.
                            </p>
                        </div>
                        <Link
                            href="/profile?tab=licenses&apply=true&type=REFEREE"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white py-2.5 text-xs font-bold transition shadow-xs"
                        >
                            <span>Request Official Pass</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Federation Hierarchy DAG */}
            <div id="hierarchy" className="space-y-5 pt-4">
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        <Network className="h-5 w-5 text-red-500" />
                        <span>Federation & Sub-Associations Structure</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Multi-tier governance network connecting the National Swiss Federation to regional sub-associations.
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm space-y-6">
                    {/* Top Level Federation Node */}
                    <div className="flex flex-col items-center">
                        <div className="rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/80 p-5 shadow-md text-center max-w-md w-full space-y-2">
                            <span className="rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase">
                                Top-Level National Federation
                            </span>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                {nationalAssoc?.name || 'Swiss Table Tennis (STT)'}
                            </h3>
                            <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400 pt-1">
                                <span>Code: <strong>{nationalAssoc?.code || 'STT'}</strong></span>
                                <span>•</span>
                                <span>Clubs: <strong>{clubs.length}</strong></span>
                                <span>•</span>
                                <span>Regions: <strong>{regionalAssocs.length}</strong></span>
                            </div>
                        </div>

                        {/* Connection Tree Line */}
                        <div className="h-8 w-0.5 bg-red-300 dark:bg-red-800 my-1" />
                        <div className="h-0.5 w-3/4 max-w-2xl bg-red-300 dark:bg-red-800" />
                    </div>

                    {/* Regional Sub-Associations Nodes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                        {regionalAssocs.length === 0 ? (
                            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    No regional sub-associations created yet.
                                </p>
                            </div>
                        ) : (
                            regionalAssocs.map((ra) => (
                                <Link
                                    key={ra.id}
                                    href={`/association/${ra.id}`}
                                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 text-center space-y-1.5 hover:border-red-500 transition shadow-xs"
                                >
                                    <span className="font-mono font-black text-xs text-red-600 dark:text-red-400 group-hover:underline">
                                        {ra.code}
                                    </span>
                                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {ra.shortName || ra.name}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        Level: {ra.level}
                                    </p>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
