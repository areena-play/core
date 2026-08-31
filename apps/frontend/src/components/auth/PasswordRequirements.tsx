'use client';

import React from 'react';
import { Check, X, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';

export interface PasswordRequirementsProps {
    password?: string;
    className?: string;
    showStrengthBar?: boolean;
}

export function checkPasswordRequirements(password: string = '') {
    const minLength = password.length >= 8;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    const passedCount = [minLength, hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    const isAllValid = passedCount === 5;

    return {
        minLength,
        hasLower,
        hasUpper,
        hasNumber,
        hasSpecial,
        passedCount,
        isAllValid,
    };
}

export function PasswordRequirements({
    password = '',
    className = '',
    showStrengthBar = true,
}: PasswordRequirementsProps) {
    const { t } = useI18n();
    const stats = checkPasswordRequirements(password);

    const rules = [
        {
            key: 'minLength',
            label: t('auth.reqMinLength') || 'At least 8 characters',
            valid: stats.minLength,
        },
        {
            key: 'hasLower',
            label: t('auth.reqLower') || 'At least 1 lowercase letter (a-z)',
            valid: stats.hasLower,
        },
        {
            key: 'hasUpper',
            label: t('auth.reqUpper') || 'At least 1 uppercase letter (A-Z)',
            valid: stats.hasUpper,
        },
        {
            key: 'hasNumber',
            label: t('auth.reqNumber') || 'At least 1 number (0-9)',
            valid: stats.hasNumber,
        },
        {
            key: 'hasSpecial',
            label: t('auth.reqSpecial') || 'At least 1 special character (!@#$...)',
            valid: stats.hasSpecial,
        },
    ];

    const getStrengthColor = () => {
        if (stats.passedCount <= 2) return 'bg-red-500 text-red-500';
        if (stats.passedCount <= 4) return 'bg-amber-500 text-amber-500';
        return 'bg-emerald-500 text-emerald-500';
    };

    const getStrengthLabel = () => {
        if (stats.passedCount === 0) return t('auth.strengthEmpty') || 'Enter a password';
        if (stats.passedCount <= 2) return t('auth.strengthWeak') || 'Weak password';
        if (stats.passedCount <= 4) return t('auth.strengthMedium') || 'Moderate password';
        return t('auth.strengthStrong') || 'Strong password';
    };

    return (
        <div className={`p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs space-y-2.5 ${className}`}>
            {showStrengthBar && password.length > 0 && (
                <div className="space-y-1.5 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            {t('auth.passwordStrength') || 'Password Strength'}
                        </span>
                        <span className={`font-bold ${getStrengthColor().split(' ')[1]}`}>
                            {getStrengthLabel()}
                        </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
                        {[1, 2, 3, 4, 5].map((level) => (
                            <div
                                key={level}
                                className={`rounded-full transition-all duration-300 ${
                                    level <= stats.passedCount
                                        ? stats.passedCount <= 2
                                            ? 'bg-red-500'
                                            : stats.passedCount <= 4
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                        : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {t('auth.passwordRequirementsTitle') || 'Password Requirements:'}
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11.5px]">
                {rules.map((rule) => (
                    <li
                        key={rule.key}
                        className={`flex items-center gap-2 transition-colors ${
                            rule.valid
                                ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                rule.valid
                                    ? 'bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            {rule.valid ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="w-1 h-1 rounded-full bg-current" />}
                        </span>
                        <span>{rule.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
