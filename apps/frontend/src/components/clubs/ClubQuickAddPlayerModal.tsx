'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { triggerHaptic } from '@/lib/pwa/useHaptics';
import {
    UserPlus,
    X,
    Loader2,
    CheckCircle2,
    Shield,
    AlertCircle,
    Calendar,
    Phone,
} from 'lucide-react';

interface ClubQuickAddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    clubId: string;
    clubName?: string;
    onPlayerAdded?: (player: any) => void;
}

export function ClubQuickAddPlayerModal({
    isOpen,
    onClose,
    clubId,
    clubName = 'Club',
    onPlayerAdded,
}: ClubQuickAddPlayerModalProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);
        triggerHaptic('medium');

        try {
            const res = await api.relationships.quickAddClubMember(clubId, {
                firstName,
                lastName,
                birthDate: birthDate || undefined,
                gender,
                emergencyPhone: emergencyPhone || undefined,
            });

            triggerHaptic('success');
            setSuccessMessage(`Successfully registered ${firstName} ${lastName} to ${clubName}!`);

            if (onPlayerAdded) {
                onPlayerAdded(res.player);
            }

            // Reset after short delay
            setTimeout(() => {
                setFirstName('');
                setLastName('');
                setBirthDate('');
                setEmergencyPhone('');
                setSuccessMessage(null);
                onClose();
            }, 1200);
        } catch (err: any) {
            setError(err.message || 'Failed to add player to club');
            triggerHaptic('warning');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-900 dark:text-white">
                                Quick-Add Youth Member
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Enroll player into {clubName} roster
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

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

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
                            Guardian / Emergency Phone
                        </label>
                        <input
                            type="tel"
                            value={emergencyPhone}
                            onChange={(e) => setEmergencyPhone(e.target.value)}
                            placeholder="+41 79 123 45 67"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2">
                        <button
                            type="button"
                            onClick={() => onClose()}
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
                            <span>Enroll Player</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
