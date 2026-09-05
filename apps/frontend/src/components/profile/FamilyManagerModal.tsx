'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { triggerHaptic } from '@/lib/pwa/useHaptics';
import {
    Users,
    UserPlus,
    UserCheck,
    Shield,
    Key,
    Phone,
    Copy,
    Check,
    X,
    Loader2,
    Calendar,
    Trophy,
    Award,
    HeartHandshake,
    AlertCircle,
    ChevronRight,
    ExternalLink,
} from 'lucide-react';
import type { ManagedProfileItem } from '@/lib/api/modules/relationships.api';

interface FamilyManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPlayerContext?: (player: any) => void;
}

export function FamilyManagerModal({
    isOpen,
    onClose,
    onSelectPlayerContext,
}: FamilyManagerModalProps) {
    const [profiles, setProfiles] = useState<ManagedProfileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sub-modal views
    const [viewMode, setViewMode] = useState<'list' | 'add_child' | 'add_guardian' | 'claim_invite'>('list');
    const [selectedProfile, setSelectedProfile] = useState<ManagedProfileItem | null>(null);

    // Add child form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Add co-guardian state
    const [coGuardianIdentifier, setCoGuardianIdentifier] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');

    // Claim invite link state
    const [claimUrl, setClaimUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const loadProfiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.relationships.getManagedProfiles();
            setProfiles(data.profiles || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load family & dependents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadProfiles();
            setViewMode('list');
        }
    }, [isOpen]);

    const handleCreateChild = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        triggerHaptic('medium');
        try {
            await api.relationships.createDependent({
                firstName,
                lastName,
                birthDate: birthDate || undefined,
                gender,
                emergencyPhone: emergencyPhone || undefined,
                relationshipType: 'PARENT_GUARDIAN',
            });
            triggerHaptic('success');
            // Reset form & reload
            setFirstName('');
            setLastName('');
            setBirthDate('');
            setEmergencyPhone('');
            await loadProfiles();
            setViewMode('list');
        } catch (err: any) {
            setError(err.message || 'Failed to create child profile');
            triggerHaptic('warning');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddCoGuardian = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfile) return;
        setSubmitting(true);
        triggerHaptic('medium');
        try {
            await api.relationships.addCoGuardian({
                managedUserId: selectedProfile.player.id,
                coGuardianIdentifier,
                emergencyPhone: guardianPhone || undefined,
                type: 'PARENT_GUARDIAN',
            });
            triggerHaptic('success');
            setCoGuardianIdentifier('');
            setGuardianPhone('');
            await loadProfiles();
            setViewMode('list');
        } catch (err: any) {
            setError(err.message || 'Failed to link co-guardian');
            triggerHaptic('warning');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateClaim = async (profile: ManagedProfileItem) => {
        setSubmitting(true);
        triggerHaptic('light');
        setSelectedProfile(profile);
        try {
            const res = await api.relationships.createClaimInvite(profile.player.id);
            const fullUrl = typeof window !== 'undefined'
                ? `${window.location.origin}${res.invite.claimUrl}`
                : res.invite.claimUrl;
            setClaimUrl(fullUrl);
            setViewMode('claim_invite');
            triggerHaptic('success');
        } catch (err: any) {
            setError(err.message || 'Failed to generate claim invite');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = () => {
        if (!claimUrl) return;
        navigator.clipboard.writeText(claimUrl);
        setCopied(true);
        triggerHaptic('light');
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                Family & Managed Dependents
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Co-manage children, view licenses, and tournament alerts
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            onClose();
                        }}
                        className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* VIEW: PROFILES LIST */}
                    {viewMode === 'list' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    Managed Athletes ({profiles.length})
                                </span>
                                <button
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setViewMode('add_child');
                                    }}
                                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 transition active:scale-95"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    <span>Add Child</span>
                                </button>
                            </div>

                            {loading ? (
                                <div className="py-12 flex justify-center items-center text-slate-400">
                                    <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                                </div>
                            ) : profiles.length === 0 ? (
                                <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <Users className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">No Dependents Added Yet</h4>
                                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                                        Add your children or youth players to manage their licenses, tournament registrations, and live match alerts.
                                    </p>
                                    <button
                                        onClick={() => setViewMode('add_child')}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                                    >
                                        + Add First Child
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {profiles.map((item) => (
                                        <div
                                            key={item.relationshipId}
                                            className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-red-500/20">
                                                        {item.player.firstName[0]}{item.player.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                                                            <span>{item.player.fullName}</span>
                                                            {item.player.accountStatus === 'MANAGED' ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                                                    Managed (No Login)
                                                                </span>
                                                            ) : item.player.accountStatus === 'INVITED' ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                                                                    Claim Invited
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                                                    Claimed & Active
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                                                            <span>{item.player.eloPoints} ELO</span>
                                                            <span>•</span>
                                                            <span>License: {item.player.licenseId || 'Pending'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {onSelectPlayerContext && (
                                                    <button
                                                        onClick={() => {
                                                            triggerHaptic('medium');
                                                            onSelectPlayerContext(item.player);
                                                            onClose();
                                                        }}
                                                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
                                                    >
                                                        <span>View Passport</span>
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Action bar for child */}
                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                                <button
                                                    onClick={() => {
                                                        setSelectedProfile(item);
                                                        setViewMode('add_guardian');
                                                    }}
                                                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                                                >
                                                    <HeartHandshake className="h-3.5 w-3.5 text-red-500" />
                                                    <span>Add Co-Guardian</span>
                                                </button>

                                                {item.player.accountStatus !== 'ACTIVE' && (
                                                    <button
                                                        onClick={() => handleGenerateClaim(item)}
                                                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                                                    >
                                                        <Key className="h-3.5 w-3.5 text-amber-500" />
                                                        <span>Invite Child to Claim</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW: ADD CHILD */}
                    {viewMode === 'add_child' && (
                        <form onSubmit={handleCreateChild} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="e.g. Leo"
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="e.g. Sonderegger"
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Birth Date
                                    </label>
                                    <input
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        value={gender}
                                        onChange={(e: any) => setGender(e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    >
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Emergency / Tournament Phone
                                </label>
                                <input
                                    type="tel"
                                    value={emergencyPhone}
                                    onChange={(e) => setEmergencyPhone(e.target.value)}
                                    placeholder="+41 79 123 45 67"
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                                <span className="text-[11px] text-slate-500">
                                    Used for on-site match callout SMS and emergency contacts.
                                </span>
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 flex items-center space-x-1.5"
                                >
                                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Create Child Profile</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* VIEW: ADD CO-GUARDIAN */}
                    {viewMode === 'add_guardian' && selectedProfile && (
                        <form onSubmit={handleAddCoGuardian} className="space-y-4">
                            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300">
                                Linking a co-guardian for <strong>{selectedProfile.player.fullName}</strong>. Both guardians will receive table calls and can manage tournament entries.
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Co-Guardian Email or Phone *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={coGuardianIdentifier}
                                    onChange={(e) => setCoGuardianIdentifier(e.target.value)}
                                    placeholder="e.g. father@example.com or +4179..."
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 flex items-center space-x-1.5"
                                >
                                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Link Co-Guardian</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* VIEW: CLAIM INVITE */}
                    {viewMode === 'claim_invite' && selectedProfile && claimUrl && (
                        <div className="space-y-4 text-center">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                                <Key className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    Invite {selectedProfile.player.firstName} to Claim Account
                                </h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                                    Share this link with your child. They can set up their own email & password on their phone without losing any past matches, trophies, or ELO rating!
                                </p>
                            </div>

                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono select-all break-all text-left">
                                <span className="text-slate-700 dark:text-slate-300 truncate mr-2">{claimUrl}</span>
                                <button
                                    onClick={handleCopy}
                                    className="px-3 py-1.5 bg-red-600 text-white font-sans font-bold text-xs rounded-xl shrink-0 flex items-center space-x-1 shadow-sm"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setViewMode('list')}
                                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl"
                            >
                                Back to Family List
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
