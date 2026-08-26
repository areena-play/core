'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { useI18n } from '@/lib/i18nContext';
import {
    User,
    Award,
    Shield,
    Save,
    CheckCircle2,
    AlertCircle,
    MapPin,
    Mail,
    Phone,
    Calendar,
    GraduationCap,
    Sun,
    Moon,
    Laptop,
    Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { AccessDenied } from '@/components/auth/AccessDenied';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const { theme, resolvedTheme, setTheme } = useTheme();
    const { locale, setLocale, t, locales, supportedLocales } = useI18n();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('Switzerland');

    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setPhone(user.phone || '');
            setStreet(user.street || '');
            setPostalCode(user.postalCode || '');
            setCity(user.city || '');
            setCountry(user.country || 'Switzerland');
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            await api.updateProfile({
                firstName,
                lastName,
                phone,
                street,
                postalCode,
                city,
                country,
            });
            await refreshUser();
            setSuccessMsg(t('profile.profileUpdated'));
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <AccessDenied
                title="Sign In to Access Profile"
                description="You must be logged in to view and edit your AREENA profile, licenses, and security preferences."
                requiredRole="Authenticated User"
                returnHref="/"
            />
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-16">
            {/* Header Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 sm:p-6 md:p-8 shadow-sm dark:shadow-xl transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-red-600 font-extrabold text-xl sm:text-2xl text-white shadow-lg flex-shrink-0">
                            {user.firstName[0]}
                            {user.lastName[0]}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                {user.firstName} {user.lastName}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">User ID: {user.id}</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                                {user.isSuperAdmin && (
                                    <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                                        {t('nav.superAdmin')}
                                    </span>
                                )}
                                {user.licenseId && (
                                    <span className="rounded bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800/40 px-2 py-0.5 text-[10px] font-mono font-bold text-red-700 dark:text-red-400">
                                        LIC #{user.licenseId}
                                    </span>
                                )}
                                <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                    {user.eloPoints} Elo Points {user.rank ? `(Rank #${user.rank})` : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid: Edit Profile & Active Licenses & Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Left 2 Cols: Language Preference, Theme Setting & Edit Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Language Preference Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Globe className="h-4 w-4 text-red-500" />
                            <span>{t('profile.languagePreference')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('profile.languageDescription')}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                            {supportedLocales.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => setLocale(loc)}
                                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                                        locale === loc
                                            ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-sm font-bold'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <span className="text-2xl leading-none">{locales[loc].flag}</span>
                                    <span>{locales[loc].nativeLabel}</span>
                                    <span className="text-[10px] uppercase font-mono text-slate-400">
                                        {loc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Preference Setting Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sun className="h-4 w-4 text-red-500" />
                            <span>{t('profile.themePreference')}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('profile.themeDescription')}
                        </p>

                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={() => setTheme('light')}
                                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                                    theme === 'light'
                                        ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-sm'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                }`}
                            >
                                <Sun className="h-5 w-5 text-amber-500" />
                                <span>{t('common.light')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTheme('dark')}
                                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                                    theme === 'dark'
                                        ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-sm'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                }`}
                            >
                                <Moon className="h-5 w-5 text-indigo-400" />
                                <span>{t('common.dark')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTheme('system')}
                                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                                    theme === 'system'
                                        ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shadow-sm'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700'
                                }`}
                            >
                                <Laptop className="h-5 w-5 text-slate-500" />
                                <span>{t('common.system')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Personal Info Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-6">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <User className="h-4 w-4 text-red-500" />
                            <span>{t('profile.personalInfo')}</span>
                        </h2>

                        {errorMsg && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>{errorMsg}</div>
                            </div>
                        )}

                        {successMsg && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <div>{successMsg}</div>
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.firstName')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.lastName')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('common.email')}
                                </label>
                                <input
                                    type="email"
                                    disabled
                                    value={user.email}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.phone')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.street')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.postalCode')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={postalCode}
                                        onChange={(e) => setPostalCode(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        {t('profile.city')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    {t('profile.country')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow"
                                >
                                    <Save className="h-4 w-4" />
                                    <span>{saving ? t('common.saving') : t('profile.saveProfile')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Col: Active Licenses Card */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-5 space-y-4 shadow-sm dark:shadow-xl">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Award className="h-4 w-4 text-red-500" />
                            <span>{t('profile.activeLicenseBadge')}</span>
                        </h3>

                        <div className="space-y-2.5">
                            {user.licenses && user.licenses.length > 0 ? (
                                user.licenses.map((lic: any) => (
                                    <div
                                        key={lic.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-3 text-xs space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {lic.type.replace('PLAYER_', '')}
                                            </span>
                                            <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40 px-1.5 py-0.2 text-[10px]">
                                                {lic.status}
                                            </span>
                                        </div>
                                        {lic.club && (
                                            <p className="text-slate-600 dark:text-slate-400">
                                                {t('common.club')}: {lic.club.name}
                                            </p>
                                        )}
                                        <p className="text-[11px] font-mono text-slate-500">
                                            {t('licenses.validity')}: {format(new Date(lic.validUntil), 'dd.MM.yyyy')}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('licenses.title')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
