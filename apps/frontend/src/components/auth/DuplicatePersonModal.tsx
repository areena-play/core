'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/lib/i18nContext';
import {
    AlertTriangle,
    UserCheck,
    ArrowRight,
    Building2,
    Calendar,
    Award,
    ShieldAlert,
    ExternalLink,
    CheckCircle2,
    Info,
} from 'lucide-react';

export interface DuplicatePersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: Array<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
            birthDate: string | null;
            gender?: string | null;
            eloPoints: number;
            currentLevel?: string;
            licenseId: string | null;
            canLogin: boolean;
            accountStatus: string;
            clubRoles?: {
                id: string;
                role: string;
                club: { id: string; name: string; code: string };
            }[];
            licenses?: {
                id: string;
                type: string;
                status: string;
                club?: { id: string; name: string };
            }[];
        };
        similarity: number;
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        reasons: Array<{ type: string; description: string }>;
        isClaimed: boolean;
        canBeClaimed: boolean;
    }>;
    onProceedAnyway: () => void;
    mode?: 'registration' | 'club_add';
}

export function DuplicatePersonModal({
    isOpen,
    onClose,
    matches,
    onProceedAnyway,
    mode = 'registration',
}: DuplicatePersonModalProps) {
    const { t, formatDate } = useI18n();
    const router = useRouter();

    if (!isOpen || !matches || matches.length === 0) return null;

    const topMatch = matches[0];
    const hasUnclaimedMatch = matches.some((m) => m.canBeClaimed);

    const handleClaimProfile = (match: (typeof matches)[0]) => {
        onClose();
        const birthDateStr = match.user.birthDate
            ? new Date(match.user.birthDate).toISOString().split('T')[0]
            : '';
        const params = new URLSearchParams();
        if (match.user.licenseId) params.set('licenseId', match.user.licenseId);
        if (match.user.lastName) params.set('lastName', match.user.lastName);
        if (birthDateStr) params.set('birthDate', birthDateStr);

        router.push(`/auth/claim?${params.toString()}`);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            title={
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span>{t('duplicates.modalTitle') || 'Similar Existing Profile Detected'}</span>
                </div>
            }
            subtitle={
                t('duplicates.modalSubtitle') ||
                'A person with identical or similar name and date of birth already exists in the system.'
            }
            footer={
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {t('common.cancel') || 'Cancel'}
                    </button>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                onProceedAnyway();
                                onClose();
                            }}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                        >
                            {t('duplicates.proceedAnyway') || 'Proceed Anyway'}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Notice banner */}
                {hasUnclaimedMatch ? (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                        <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold text-blue-900 dark:text-blue-200">
                                {t('duplicates.unclaimedBannerTitle') || 'Existing profile has no active login'}
                            </p>
                            <p className="text-blue-700 dark:text-blue-300 mt-1">
                                {t('duplicates.unclaimedBannerDesc') ||
                                    'This player profile was created by a club or tournament official but has not been claimed yet. You can activate and take ownership of this profile directly.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold text-amber-900 dark:text-amber-200">
                                {t('duplicates.claimedWarningTitle') || 'Possible Duplicate Account Warning'}
                            </p>
                            <p className="text-amber-700 dark:text-amber-300 mt-1">
                                {t('duplicates.claimedWarningDesc') ||
                                    'A user account with these details is already registered. If you proceed with creating a second account, it may be flagged as a duplicate and merged or deleted by an administrator.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Matches List */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t('duplicates.matchedProfiles') || 'Matched Existing Profiles'} ({matches.length})
                    </p>

                    {matches.map((match) => {
                        const clubName =
                            match.user.licenses?.[0]?.club?.name ||
                            match.user.clubRoles?.[0]?.club?.name ||
                            '';

                        return (
                            <div
                                key={match.user.id}
                                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                                {match.user.firstName} {match.user.lastName}
                                            </h4>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                    match.confidence === 'HIGH'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                                }`}
                                            >
                                                {match.similarity}% {t('duplicates.similarityMatch') || 'Match'}
                                            </span>
                                            {match.canBeClaimed ? (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                                    {t('duplicates.unclaimedBadge') || 'Unclaimed Profile'}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                    {t('duplicates.activeBadge') || 'Active Account'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600 dark:text-slate-400">
                                            {match.user.birthDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    {t('profile.birthDate') || 'DOB'}: {formatDate(match.user.birthDate)}
                                                </span>
                                            )}
                                            {clubName && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                                    {clubName}
                                                </span>
                                            )}
                                            {match.user.licenseId && (
                                                <span className="flex items-center gap-1">
                                                    <Award className="h-3.5 w-3.5 text-slate-400" />
                                                    {t('profile.licenseNumber') || 'License'}: {match.user.licenseId}
                                                </span>
                                            )}
                                            {match.user.eloPoints && (
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    ELO: {match.user.eloPoints} ({match.user.currentLevel || 'D1'})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {match.canBeClaimed && (
                                        <button
                                            type="button"
                                            onClick={() => handleClaimProfile(match)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
                                        >
                                            <span>{t('duplicates.claimThisProfile') || 'Claim Profile'}</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Reasons */}
                                {match.reasons && match.reasons.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
                                        {match.reasons.map((r, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            >
                                                <Info className="h-3 w-3 text-slate-400" />
                                                {r.description}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
}

