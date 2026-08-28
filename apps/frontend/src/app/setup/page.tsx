'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useMainView } from '@/lib/mainViewContext';
import {
    Shield,
    Building2,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Globe,
    UserCheck,
    Lock,
    Mail,
    User,
    Tag,
    Layers,
    AlertCircle,
    Loader2,
} from 'lucide-react';

export default function SetupPage() {
    const router = useRouter();
    const { login } = useAuth();
    const { refetchAssociations } = useMainView();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Form state: Super Admin
    const [admin, setAdmin] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // Form state: Main Association
    const [association, setAssociation] = useState({
        name: '',
        shortName: '',
        code: '',
        sport: 'General Sports',
        country: 'Switzerland',
        licenseIdTemplate: '{regionDigit}{year2}{counter4}',
        regionDigit: 1,
    });

    useEffect(() => {
        async function checkStatus() {
            try {
                const status = await api.getSetupStatus();
                if (status.isInitialized) {
                    router.replace('/');
                }
            } catch (err: any) {
                console.error('Setup status check failed:', err);
            } finally {
                setLoading(false);
            }
        }
        checkStatus();
    }, [router]);

    const handleNextStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!admin.firstName || !admin.lastName || !admin.email || !admin.password) {
            setError('Please fill in all super administrator fields.');
            return;
        }

        if (admin.password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (admin.password !== admin.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setStep(2);
    };

    const handleNextStep2 = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!association.name) {
            setError('Please enter the primary association name.');
            return;
        }

        setStep(3);
    };

    const handleCompleteSetup = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                admin: {
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    email: admin.email,
                    password: admin.password,
                },
                association: {
                    name: association.name,
                    shortName: association.shortName || association.name.substring(0, 8).toUpperCase(),
                    code: association.code || 'MAIN',
                    level: 'NATIONAL',
                    country: association.country,
                    licenseIdTemplate: association.licenseIdTemplate,
                    regionDigit: association.regionDigit,
                    rules: {
                        rankingSystem: 'ELO_OFFICIAL',
                        autoApproveDomesticTCards: true,
                        defaultSeasonLengthMonths: 12,
                        sport: association.sport,
                    },
                },
            };

            const response = await api.initializeSetup(payload);

            if (response.success && response.token) {
                // Log in new super admin
                login(response.token, response.user);
                await refetchAssociations();
                router.replace('/');
            } else {
                throw new Error(response.message || 'Setup failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to initialize system. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <p className="text-sm font-medium">Checking AREENA platform state...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10">
                {/* Header Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-3">
                        <Sparkles className="w-3.5 h-3.5" /> Initial Platform Setup
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        Welcome to AREENA
                    </h1>
                    <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-md mx-auto">
                        Configure your root super administrator account and initialize your primary sports federation.
                    </p>
                </div>

                {/* Stepper Indicator */}
                <div className="flex items-center justify-between mb-8 px-4 sm:px-12">
                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                step === 1
                                    ? 'bg-primary-600 text-white ring-4 ring-primary-500/20'
                                    : step > 1
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-800 text-slate-400'
                            }`}
                        >
                            {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                        </div>
                        <span className="text-xs font-medium text-slate-300">Administrator</span>
                    </div>

                    <div className={`flex-1 h-0.5 mx-2 transition-all ${step > 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />

                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                step === 2
                                    ? 'bg-primary-600 text-white ring-4 ring-primary-500/20'
                                    : step > 2
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-800 text-slate-400'
                            }`}
                        >
                            {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                        </div>
                        <span className="text-xs font-medium text-slate-300">Federation</span>
                    </div>

                    <div className={`flex-1 h-0.5 mx-2 transition-all ${step > 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />

                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                step === 3
                                    ? 'bg-primary-600 text-white ring-4 ring-primary-500/20'
                                    : 'bg-slate-800 text-slate-400'
                            }`}
                        >
                            3
                        </div>
                        <span className="text-xs font-medium text-slate-300">Review</span>
                    </div>
                </div>

                {/* Card Container */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* STEP 1: SUPER ADMINISTRATOR */}
                    {/* ------------------------------------------------------------- */}
                    {step === 1 && (
                        <form onSubmit={handleNextStep1} className="space-y-4">
                            <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm mb-2">
                                <Shield className="w-4 h-4" /> Root Super Administrator Account
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">First Name</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            required
                                            value={admin.firstName}
                                            onChange={(e) => setAdmin({ ...admin, firstName: e.target.value })}
                                            placeholder="e.g. Dominic"
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Last Name</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            required
                                            value={admin.lastName}
                                            onChange={(e) => setAdmin({ ...admin, lastName: e.target.value })}
                                            placeholder="e.g. Sonderegger"
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type="email"
                                        required
                                        value={admin.email}
                                        onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                                        placeholder="admin@your-federation.org"
                                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={admin.password}
                                            onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                                            placeholder="Min. 8 characters"
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                        <input
                                            type="password"
                                            required
                                            value={admin.confirmPassword}
                                            onChange={(e) => setAdmin({ ...admin, confirmPassword: e.target.value })}
                                            placeholder="Repeat password"
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 transition-all"
                                >
                                    Continue to Federation Details <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* STEP 2: MAIN ASSOCIATION */}
                    {/* ------------------------------------------------------------- */}
                    {step === 2 && (
                        <form onSubmit={handleNextStep2} className="space-y-4">
                            <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm mb-2">
                                <Building2 className="w-4 h-4" /> Primary Association / Federation Details
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Association Full Name</label>
                                <div className="relative">
                                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type="text"
                                        required
                                        value={association.name}
                                        onChange={(e) => setAssociation({ ...association, name: e.target.value })}
                                        placeholder="e.g. National Sports Federation"
                                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Short Name / Acronym</label>
                                    <div className="relative">
                                        <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            value={association.shortName}
                                            onChange={(e) => setAssociation({ ...association, shortName: e.target.value })}
                                            placeholder="e.g. NSF"
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Federation Code</label>
                                    <div className="relative">
                                        <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            value={association.code}
                                            onChange={(e) => setAssociation({ ...association, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. NAT / CH"
                                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors uppercase font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Sport / Discipline</label>
                                    <input
                                        type="text"
                                        value={association.sport}
                                        onChange={(e) => setAssociation({ ...association, sport: e.target.value })}
                                        placeholder="e.g. Tennis, Volleyball, Table Tennis"
                                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Country / Jurisdiction</label>
                                    <input
                                        type="text"
                                        value={association.country}
                                        onChange={(e) => setAssociation({ ...association, country: e.target.value })}
                                        placeholder="e.g. Switzerland"
                                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">Player License ID Template</label>
                                <div className="relative">
                                    <Layers className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type="text"
                                        value={association.licenseIdTemplate}
                                        onChange={(e) => setAssociation({ ...association, licenseIdTemplate: e.target.value })}
                                        placeholder="{regionDigit}{year2}{counter4}"
                                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Available tags: <code className="text-slate-400">{"{regionDigit}"}</code>, <code className="text-slate-400">{"{year2}"}</code>, <code className="text-slate-400">{"{counter4}"}</code>
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 transition-all"
                                >
                                    Review Setup <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* STEP 3: REVIEW & LAUNCH */}
                    {/* ------------------------------------------------------------- */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm">
                                <CheckCircle2 className="w-4 h-4" /> Review Configuration
                            </div>

                            <div className="space-y-4">
                                {/* Administrator Summary */}
                                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5 text-primary-400" /> Super Administrator
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Name:</span>
                                        <span className="font-medium text-white">{admin.firstName} {admin.lastName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Email:</span>
                                        <span className="font-medium text-white">{admin.email}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Role:</span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Super Admin (Full Access)
                                        </span>
                                    </div>
                                </div>

                                {/* Federation Summary */}
                                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-primary-400" /> Primary Association
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Association Name:</span>
                                        <span className="font-medium text-white">{association.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Acronym / Code:</span>
                                        <span className="font-mono text-white">{association.shortName || 'NSF'} ({association.code || 'MAIN'})</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Sport:</span>
                                        <span className="font-medium text-white">{association.sport}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Country:</span>
                                        <span className="font-medium text-white">{association.country}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setStep(2)}
                                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleCompleteSetup}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Initializing Platform...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" /> Launch AREENA Platform
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

