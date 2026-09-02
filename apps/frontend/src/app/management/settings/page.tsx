'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    Sliders,
    Shield,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    Key,
    Building2,
    Image as ImageIcon,
    Upload,
    Trash2,
    Trophy,
    Calendar,
    Users,
    Plus,
    Edit3,
    X,
    Save,
} from 'lucide-react';
import Link from 'next/link';
import { AccessDenied } from '@/components/auth/AccessDenied';

interface AgeSeriesItem {
    id: string;
    code: string;
    name: string;
    type: 'YOUTH' | 'ACTIVES' | 'SENIORS' | 'CUSTOM';
    minAge?: number; // inclusive minimum age
    maxAge?: number; // inclusive maximum age
    description: string;
    active: boolean;
}

const DEFAULT_AGE_SERIES: AgeSeriesItem[] = [
    // Youth Series
    { id: 'u9', code: 'U9', name: 'Under 9', type: 'YOUTH', maxAge: 9, description: 'Youth athletes aged 8 and under', active: true },
    { id: 'u11', code: 'U11', name: 'Under 11', type: 'YOUTH', minAge: 9, maxAge: 11, description: 'Youth athletes aged 9 to 10', active: true },
    { id: 'u13', code: 'U13', name: 'Under 13', type: 'YOUTH', minAge: 11, maxAge: 13, description: 'Youth athletes aged 11 to 12', active: true },
    { id: 'u15', code: 'U15', name: 'Under 15 / Cadets', type: 'YOUTH', minAge: 13, maxAge: 15, description: 'Cadet athletes aged 13 to 14', active: true },
    { id: 'u18', code: 'U18', name: 'Under 18 / Juniors', type: 'YOUTH', minAge: 15, maxAge: 18, description: 'Junior athletes aged 15 to 17', active: true },
    { id: 'u21', code: 'U21', name: 'Under 21 / Espoirs', type: 'YOUTH', minAge: 18, maxAge: 21, description: 'Espoir athletes aged 18 to 20', active: true },

    // Actives / Open Series
    { id: 'actives', code: 'ACTIVES', name: 'Actives / Open Division', type: 'ACTIVES', minAge: 18, maxAge: 39, description: 'Standard open adult competition category', active: true },

    // Seniors / Masters Series (Over X)
    { id: 'o40', code: 'O40', name: 'Seniors / Masters 40+', type: 'SENIORS', minAge: 40, maxAge: 49, description: 'Veteran athletes aged 40 and older', active: true },
    { id: 'o50', code: 'O50', name: 'Seniors / Masters 50+', type: 'SENIORS', minAge: 50, maxAge: 59, description: 'Veteran athletes aged 50 and older', active: true },
    { id: 'o60', code: 'O60', name: 'Seniors / Masters 60+', type: 'SENIORS', minAge: 60, maxAge: 69, description: 'Veteran athletes aged 60 and older', active: true },
    { id: 'o70', code: 'O70', name: 'Seniors / Masters 70+', type: 'SENIORS', minAge: 70, maxAge: 79, description: 'Veteran athletes aged 70 and older', active: true },
    { id: 'o80', code: 'O80', name: 'Seniors / Masters 80+', type: 'SENIORS', minAge: 80, description: 'Veteran athletes aged 80 and older', active: true },
];

export default function AssociationSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const [topAssoc, setTopAssoc] = useState<any | null>(null);

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'branding' | 'sports' | 'age-series' | 'sub-associations' | 'seasons' | 'license-engine'>('branding');

    // 1. Identity & Branding
    const [assocName, setAssocName] = useState('');
    const [assocShortName, setAssocShortName] = useState('');
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 2. Sports & Competition Configuration
    const [sportType, setSportType] = useState('Table Tennis');
    const [unitNaming, setUnitNaming] = useState('Table');
    const [matchFormat, setMatchFormat] = useState('BEST_OF_5');
    const [pointsPerSet, setPointsPerSet] = useState(11);
    const [maxForeignersPerTeam, setMaxForeignersPerTeam] = useState(2);
    const [allowTCardDualRegistration, setAllowTCardDualRegistration] = useState(true);
    const [requireRefereeCourseForSenior, setRequireRefereeCourseForSenior] = useState(false);
    const [refresherCourseValidityMonths, setRefresherCourseValidityMonths] = useState(24);
    const [eloKFactor, setEloKFactor] = useState(32);

    // 3. Age Series Configuration
    const [ageSeries, setAgeSeries] = useState<AgeSeriesItem[]>(DEFAULT_AGE_SERIES);
    const [ageCutoffDate, setAgeCutoffDate] = useState('07-01'); // July 1st cutoff
    const [compAllowedCreators, setCompAllowedCreators] = useState<string>('CLUB_ADMIN');
    const [compRequireApproval, setCompRequireApproval] = useState<boolean>(true);
    const [compLeagueCreator, setCompLeagueCreator] = useState<string>('ASSOCIATION_ADMIN');
    const [compTournCreator, setCompTournCreator] = useState<string>('CLUB_ADMIN');
    const [compInofficialCreator, setCompInofficialCreator] = useState<string>('ANY_USER');
    const [compTournApproval, setCompTournApproval] = useState<boolean>(true);
    const [ageModalOpen, setAgeModalOpen] = useState(false);
    const [editingAgeItem, setEditingAgeItem] = useState<AgeSeriesItem | null>(null);
    const [ageFormCode, setAgeFormCode] = useState('');
    const [ageFormName, setAgeFormName] = useState('');
    const [ageFormType, setAgeFormType] = useState<'YOUTH' | 'ACTIVES' | 'SENIORS' | 'CUSTOM'>('YOUTH');
    const [ageFormMin, setAgeFormMin] = useState<number | ''>('');
    const [ageFormMax, setAgeFormMax] = useState<number | ''>('');
    const [ageFormDesc, setAgeFormDesc] = useState('');

    // 4. Seasons Management
    const [seasons, setSeasons] = useState<any[]>([]);
    const [seasonModalOpen, setSeasonModalOpen] = useState(false);
    const [seasonName, setSeasonName] = useState('');
    const [seasonStartDate, setSeasonStartDate] = useState('');
    const [seasonEndDate, setSeasonEndDate] = useState('');
    const [seasonIsCurrent, setSeasonIsCurrent] = useState(false);
    const [seasonSubmitting, setSeasonSubmitting] = useState(false);

    // 5. License ID Engine
    const [template, setTemplate] = useState('{regionDigit}{year2}{counter3}');
    const [counter, setCounter] = useState(1);
    const [regionDigit, setRegionDigit] = useState(1);

    // General state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const isAuthorized =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) => ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role));

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getAssociations();
            const top = data.associations?.find((a: any) => a.isTopLevel) || data.associations?.[0];
            if (top) {
                setTopAssoc(top);
                setAssocName(top.name || '');
                setAssocShortName(top.shortName || '');
                setCurrentLogoUrl(top.logoUrl || null);
                setTemplate(top.licenseIdTemplate || '{regionDigit}{year2}{counter3}');
                setCounter(top.licenseCounter || 1);
                setRegionDigit(top.regionDigit || 1);

                // Load rules
                const rules = top.rules || {};
                if (rules.sportType) setSportType(rules.sportType);
                if (rules.unitNaming) setUnitNaming(rules.unitNaming);
                if (rules.matchFormat) setMatchFormat(rules.matchFormat);
                if (rules.pointsPerSet !== undefined) setPointsPerSet(rules.pointsPerSet);
                if (rules.maxForeignersPerTeam !== undefined) setMaxForeignersPerTeam(rules.maxForeignersPerTeam);
                if (rules.allowTCardDualRegistration !== undefined) setAllowTCardDualRegistration(rules.allowTCardDualRegistration);
                if (rules.requireRefereeCourseForSenior !== undefined) setRequireRefereeCourseForSenior(rules.requireRefereeCourseForSenior);
                if (rules.refresherCourseValidityMonths !== undefined) setRefresherCourseValidityMonths(rules.refresherCourseValidityMonths);
                if (rules.eloKFactor !== undefined) setEloKFactor(rules.eloKFactor);
                if (rules.competitionGovernance) {
                    const cg = rules.competitionGovernance;
                    if (cg.allowedCreators) setCompAllowedCreators(cg.allowedCreators);
                    if (cg.requireApproval !== undefined) setCompRequireApproval(cg.requireApproval);
                    if (cg.allowedCreatorsByType?.LEAGUE) setCompLeagueCreator(cg.allowedCreatorsByType.LEAGUE);
                    if (cg.allowedCreatorsByType?.TOURNAMENT) setCompTournCreator(cg.allowedCreatorsByType.TOURNAMENT);
                    if (cg.allowedCreatorsByType?.INOFFICIAL) setCompInofficialCreator(cg.allowedCreatorsByType.INOFFICIAL);
                    if (cg.requireApprovalByType?.TOURNAMENT !== undefined) setCompTournApproval(cg.requireApprovalByType.TOURNAMENT);
                }

                if (Array.isArray(rules.ageSeries) && rules.ageSeries.length > 0) {
                    setAgeSeries(rules.ageSeries);
                }
                if (rules.ageCutoffDate) {
                    setAgeCutoffDate(rules.ageCutoffDate);
                }

                // Load seasons
                const seasonsData = await api.getSeasons(top.id).catch(() => []);
                setSeasons(Array.isArray(seasonsData) ? seasonsData : []);
            }
        } catch (err) {
            console.error('Failed to load association settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // File selection for Logo
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrorMsg('Please select a valid image file (PNG, JPG, SVG, WebP).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg('Image size cannot exceed 5MB.');
            return;
        }

        setErrorMsg('');
        setSelectedLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Save All Settings
    const handleSaveAllSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topAssoc) return;

        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            let logoUrlToSave = currentLogoUrl;

            // Upload Logo to S3 if a new file is chosen
            if (selectedLogoFile) {
                setUploadingLogo(true);
                const uploadRes = await api.uploadAssociationLogo(topAssoc.id, selectedLogoFile);
                if (uploadRes && uploadRes.logoUrl) {
                    logoUrlToSave = uploadRes.logoUrl;
                    setCurrentLogoUrl(logoUrlToSave);
                    setSelectedLogoFile(null);
                    setLogoPreviewUrl(null);
                }
                setUploadingLogo(false);
            }

            const updatedRules = {
                ...(topAssoc.rules || {}),
                sportType,
                unitNaming,
                matchFormat,
                pointsPerSet: Number(pointsPerSet),
                maxForeignersPerTeam: Number(maxForeignersPerTeam),
                allowTCardDualRegistration: Boolean(allowTCardDualRegistration),
                requireRefereeCourseForSenior: Boolean(requireRefereeCourseForSenior),
                refresherCourseValidityMonths: Number(refresherCourseValidityMonths),
                eloKFactor: Number(eloKFactor),
                ageSeries,
                ageCutoffDate,
            };

            await api.updateAssociationSettings(topAssoc.id, {
                name: assocName,
                shortName: assocShortName,
                logoUrl: logoUrlToSave,
                licenseIdTemplate: template,
                counter: Number(counter),
                regionDigit: Number(regionDigit),
                rules: updatedRules,
            });

            setSuccessMsg('Association settings and configuration saved successfully!');
            setTimeout(() => setSuccessMsg(''), 5000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to save settings.');
        } finally {
            setSaving(false);
            setUploadingLogo(false);
        }
    };

    // Delete Logo
    const handleDeleteLogo = async () => {
        if (!topAssoc) return;
        setUploadingLogo(true);
        try {
            await api.deleteAssociationLogo(topAssoc.id);
            setCurrentLogoUrl(null);
            setSelectedLogoFile(null);
            setLogoPreviewUrl(null);
            setSuccessMsg('Association logo removed successfully.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to delete logo.');
        } finally {
            setUploadingLogo(false);
        }
    };

    // Age Series handlers
    const toggleAgeActive = (id: string) => {
        setAgeSeries(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
    };

    const handleSaveAgeSeries = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAgeItem) {
            setAgeSeries(prev => prev.map(item => item.id === editingAgeItem.id ? {
                ...item,
                code: ageFormCode.toUpperCase(),
                name: ageFormName,
                type: ageFormType,
                minAge: ageFormMin !== '' ? Number(ageFormMin) : undefined,
                maxAge: ageFormMax !== '' ? Number(ageFormMax) : undefined,
                description: ageFormDesc,
            } : item));
        } else {
            const newItem: AgeSeriesItem = {
                id: `custom_${Date.now()}`,
                code: ageFormCode.toUpperCase(),
                name: ageFormName,
                type: ageFormType,
                minAge: ageFormMin !== '' ? Number(ageFormMin) : undefined,
                maxAge: ageFormMax !== '' ? Number(ageFormMax) : undefined,
                description: ageFormDesc,
                active: true,
            };
            setAgeSeries(prev => [...prev, newItem]);
        }
        setAgeModalOpen(false);
        setEditingAgeItem(null);
    };

    const handleDeleteAgeSeries = (id: string) => {
        setAgeSeries(prev => prev.filter(item => item.id !== id));
    };

    // Seasons handlers
    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topAssoc) return;
        setSeasonSubmitting(true);
        setErrorMsg('');
        try {
            await api.createSeason(topAssoc.id, {
                name: seasonName,
                startDate: new Date(seasonStartDate).toISOString(),
                endDate: new Date(seasonEndDate).toISOString(),
                isCurrent: seasonIsCurrent,
            });
            setSeasonModalOpen(false);
            setSeasonName('');
            setSeasonStartDate('');
            setSeasonEndDate('');
            setSeasonIsCurrent(false);
            setSuccessMsg('New season created successfully!');
            setTimeout(() => setSuccessMsg(''), 4000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create season.');
        } finally {
            setSeasonSubmitting(false);
        }
    };

    const handleActivateSeason = async (seasonId: string) => {
        if (!topAssoc) return;
        try {
            await api.setCurrentSeason(topAssoc.id, seasonId);
            setSuccessMsg('Active season updated successfully.');
            setTimeout(() => setSuccessMsg(''), 4000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to set active season.');
        }
    };

    const handleDeleteSeason = async (seasonId: string) => {
        if (!topAssoc) return;
        if (!confirm('Are you sure you want to delete this season?')) return;
        try {
            await api.deleteSeason(topAssoc.id, seasonId);
            setSuccessMsg('Season deleted successfully.');
            setTimeout(() => setSuccessMsg(''), 4000);
            loadData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to delete season.');
        }
    };

    // Preview Generator for License ID Engine
    const previewId = (() => {
        const year = new Date().getFullYear();
        const year4 = String(year);
        const year2 = year4.slice(-2);
        const pad = (n: number, len: number) => String(n).padStart(len, '0');

        return template
            .replace('{year4}', year4)
            .replace('{year2}', year2)
            .replace('{regionDigit}', String(regionDigit))
            .replace('{counter3}', pad(counter, 3))
            .replace('{counter4}', pad(counter, 4))
            .replace('{counter5}', pad(counter, 5))
            .replace('{counter6}', pad(counter, 6));
    })();

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return <AccessDenied />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                    <p className="text-xs text-slate-500">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
            {/* Breadcrumb & Navigation Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="space-y-1">
                    <Link
                        href="/associations"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>{t('nav.associations')}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Sliders className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {topAssoc?.name || 'Association Settings'}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configure sports rules, age categories, competition structures, seasons, and licensing engine.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSaveAllSettings}
                        disabled={saving || uploadingLogo}
                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        <span>{saving ? t('common.saving') : t('common.save')}</span>
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {successMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>{successMsg}</div>
                </div>
            )}

            {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-300 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>{errorMsg}</div>
                </div>
            )}

            {/* Section Tab Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
                <button
                    type="button"
                    onClick={() => setActiveTab('branding')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'branding'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>Identity & Branding</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('sports')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'sports'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Trophy className="h-4 w-4" />
                    <span>Sports & Rules</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('age-series')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'age-series'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    <span>Age Series & Divisions</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ageSeries.filter(a => a.active).length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('sub-associations')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'sub-associations'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Building2 className="h-4 w-4" />
                    <span>Sub-Associations</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('seasons')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'seasons'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Calendar className="h-4 w-4" />
                    <span>Seasons & Transition</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {seasons.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('license-engine')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === 'license-engine'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Key className="h-4 w-4" />
                    <span>License ID Engine</span>
                </button>
            </div>

            {/* TAB 1: IDENTITY & BRANDING */}
            {activeTab === 'branding' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-amber-500" />
                                <span>Association Identity & Details</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Set official organization name, acronym, and governance level.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Official Association Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={assocName}
                                    onChange={(e) => setAssocName(e.target.value)}
                                    placeholder="e.g. Swiss Table Tennis Federation"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Short Name / Acronym *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={assocShortName}
                                    onChange={(e) => setAssocShortName(e.target.value)}
                                    placeholder="e.g. STTF"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Federation Code
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={topAssoc?.code || ''}
                                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 px-4 py-2.5 text-xs font-mono text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Hierarchy Level
                                </label>
                                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                    <Shield className="h-4 w-4" />
                                    <span>{topAssoc?.level || 'NATIONAL'} (Top Level Federation)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logo & Visual Branding Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-amber-500" />
                                <span>Official Logo & S3 Media Storage</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Upload the federation emblem for official player license passes, PDF diplomas, and tournament branding.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                            <div className="relative h-28 w-28 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                                {logoPreviewUrl || currentLogoUrl ? (
                                    <img
                                        src={logoPreviewUrl || currentLogoUrl!}
                                        alt="Association Logo"
                                        className="h-full w-full object-contain p-2"
                                    />
                                ) : (
                                    <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                                )}
                            </div>

                            <div className="space-y-3 flex-1 text-center sm:text-left">
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Recommended: Square or transparent PNG / SVG emblem (Max 5MB)
                                </div>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition shadow-xs"
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        <span>Choose Logo</span>
                                    </button>

                                    {(currentLogoUrl || logoPreviewUrl) && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteLogo}
                                            disabled={uploadingLogo}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-semibold transition"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Remove Logo</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SPORTS & RULES CONFIGURATION */}
            {activeTab === 'sports' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                <span>Sport Definition & Playing Facilities</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configure the sport discipline, court/table terminology, and live scoring structure.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Sport Discipline *
                                </label>
                                <select
                                    value={sportType}
                                    onChange={(e) => setSportType(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                >
                                    <option value="Table Tennis">Table Tennis (Tischtennis)</option>
                                    <option value="Tennis">Tennis</option>
                                    <option value="Squash">Squash</option>
                                    <option value="Badminton">Badminton</option>
                                    <option value="Padel">Padel</option>
                                    <option value="Volleyball">Volleyball</option>
                                    <option value="Floorball">Floorball / Unihockey</option>
                                    <option value="Football">Football / Soccer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Playing Unit Terminology *
                                </label>
                                <select
                                    value={unitNaming}
                                    onChange={(e) => setUnitNaming(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                >
                                    <option value="Table">Table (Tisch / Table)</option>
                                    <option value="Court">Court (Platz / Terrain)</option>
                                    <option value="Pitch">Pitch (Spielfeld / Terrain)</option>
                                    <option value="Lane">Lane (Bahn / Piste)</option>
                                    <option value="Board">Board (Brett / Échiquier)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Default Match Format
                                </label>
                                <select
                                    value={matchFormat}
                                    onChange={(e) => setMatchFormat(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                >
                                    <option value="BEST_OF_3">Best of 3 Sets</option>
                                    <option value="BEST_OF_5">Best of 5 Sets (Standard)</option>
                                    <option value="BEST_OF_7">Best of 7 Sets (Championship Finals)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Competition Rules & Regulations Card */}
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-amber-500" />
                                <span>Federation Competition Regulations</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Define player eligibility limits, dual club registrations, and referee requirements.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                                        Max Foreign / Non-National Players per Team
                                    </label>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                        Quota of foreign licensed athletes allowed per league team encounter.
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={maxForeignersPerTeam}
                                    onChange={(e) => setMaxForeignersPerTeam(Number(e.target.value))}
                                    className="w-28 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                                        Referee Course Validity Period (Months)
                                    </label>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                        Duration before an official must complete a refresher course.
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min="6"
                                    max="60"
                                    value={refresherCourseValidityMonths}
                                    onChange={(e) => setRefresherCourseValidityMonths(Number(e.target.value))}
                                    className="w-28 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Allow T-Card / Dual Club Registration
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Enables athletes to compete in secondary regional club leagues.
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allowTCardDualRegistration}
                                        onChange={(e) => setAllowTCardDualRegistration(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                                </label>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Mandatory Refresher Course for Seniors
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Requires captain/referee certification for top league teams.
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={requireRefereeCourseForSenior}
                                        onChange={(e) => setRequireRefereeCourseForSenior(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: AGE SERIES & DIVISIONS */}
            {activeTab === 'age-series' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="h-5 w-5 text-amber-500" />
                                    <span>Age Series & Competition Brackets</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Official age categories for youth (U9–U21), open adult leagues, and senior/veteran divisions (O40–O80).
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setEditingAgeItem(null);
                                    setAgeFormCode('');
                                    setAgeFormName('');
                                    setAgeFormType('YOUTH');
                                    setAgeFormMin('');
                                    setAgeFormMax('');
                                    setAgeFormDesc('');
                                    setAgeModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Custom Age Series</span>
                            </button>
                        </div>

                        {/* Cutoff Date Setting */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                    Annual Birth Year Cutoff Reference Date
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Determines age series eligibility based on the athlete's birth date during the active season.
                                </div>
                            </div>
                            <select
                                value={ageCutoffDate}
                                onChange={(e) => setAgeCutoffDate(e.target.value)}
                                className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                            >
                                <option value="07-01">July 1st (European / ITTF Standard Season)</option>
                                <option value="01-01">January 1st (Calendar Year Cutoff)</option>
                                <option value="09-01">September 1st (Academic Year Cutoff)</option>
                            </select>
                        </div>

                        {/* Age Categories Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Code</th>
                                        <th className="px-4 py-3">Series Name</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Age Bracket</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {ageSeries.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                            <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                                                {item.code}
                                            </td>
                                            <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">
                                                {item.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    item.type === 'YOUTH'
                                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                        : item.type === 'ACTIVES'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                {item.minAge && item.maxAge
                                                    ? `${item.minAge} – ${item.maxAge} yrs`
                                                    : item.maxAge
                                                    ? `≤ ${item.maxAge} yrs`
                                                    : item.minAge
                                                    ? `≥ ${item.minAge} yrs`
                                                    : 'Open'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                                                {item.description}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAgeActive(item.id)}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                                        item.active
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                                                    }`}
                                                >
                                                    {item.active ? 'Active' : 'Disabled'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingAgeItem(item);
                                                            setAgeFormCode(item.code);
                                                            setAgeFormName(item.name);
                                                            setAgeFormType(item.type);
                                                            setAgeFormMin(item.minAge ?? '');
                                                            setAgeFormMax(item.maxAge ?? '');
                                                            setAgeFormDesc(item.description);
                                                            setAgeModalOpen(true);
                                                        }}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                    {item.type === 'CUSTOM' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAgeSeries(item.id)}
                                                            className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-ASSOCIATIONS CONFIGURATION */}
            {activeTab === 'sub-associations' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-amber-500" />
                                    <span>Sub-Associations Configuration</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Manage sub-associations and their configurations.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSeasonName('');
                                    setSeasonStartDate('');
                                    setSeasonEndDate('');
                                    setSeasonIsCurrent(false);
                                    setSeasonModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create New Season</span>
                            </button>
                        </div>

                        {/* Seasons List Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Season Name</th>
                                        <th className="px-4 py-3">Start Date</th>
                                        <th className="px-4 py-3">End Date</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {seasons.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                No seasons registered yet. Create your first season.
                                            </td>
                                        </tr>
                                    ) : (
                                        seasons.map((season) => (
                                            <tr key={season.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">
                                                    {season.name}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                    {new Date(season.startDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                    {new Date(season.endDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {season.isCurrent ? (
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            ACTIVE CURRENT
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {!season.isCurrent && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleActivateSeason(season.id)}
                                                                className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition"
                                                            >
                                                                Set as Current
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSeason(season.id)}
                                                            className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: SEASONS CONFIGURATION */}
            {activeTab === 'seasons' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-amber-500" />
                                    <span>Seasons & Periodicity Management</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Manage federation sporting years, license validity periods, and active competition seasons.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSeasonName('');
                                    setSeasonStartDate('');
                                    setSeasonEndDate('');
                                    setSeasonIsCurrent(false);
                                    setSeasonModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create New Season</span>
                            </button>
                        </div>

                        {/* Seasons List Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Season Name</th>
                                        <th className="px-4 py-3">Start Date</th>
                                        <th className="px-4 py-3">End Date</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {seasons.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                No seasons registered yet. Create your first season.
                                            </td>
                                        </tr>
                                    ) : (
                                        seasons.map((season) => (
                                            <tr key={season.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">
                                                    {season.name}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                    {new Date(season.startDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                    {new Date(season.endDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {season.isCurrent ? (
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            ACTIVE CURRENT
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {!season.isCurrent && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleActivateSeason(season.id)}
                                                                className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition"
                                                            >
                                                                Set as Current
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSeason(season.id)}
                                                            className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: LICENSE ID ENGINE */}
            {activeTab === 'license-engine' && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Key className="h-5 w-5 text-amber-500" />
                                <span>License ID Format Generator</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Customize the automatic numbering format for all newly issued licenses.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Template Pattern *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={template}
                                    onChange={(e) => setTemplate(e.target.value)}
                                    placeholder="{regionDigit}{year2}{counter3}"
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Region Digit (1-9)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="9"
                                    value={regionDigit}
                                    onChange={(e) => setRegionDigit(Number(e.target.value))}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Current Sequential Counter
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={counter}
                                    onChange={(e) => setCounter(Number(e.target.value))}
                                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Next Issued ID Preview
                                </label>
                                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                    <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                                        {previewId}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-400/70">
                                        Live Preview
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Available Tags Documentation */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">Supported Template Variables:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                <div><code className="text-amber-600 dark:text-amber-400">{'{year4}'}</code> → 2026</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{year2}'}</code> → 26</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{regionDigit}'}</code> → 1..9</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter3}'}</code> → 001</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter4}'}</code> → 0001</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter5}'}</code> → 00001</div>
                                <div><code className="text-amber-600 dark:text-amber-400">{'{counter6}'}</code> → 000001</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AGE SERIES MODAL */}
            {ageModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {editingAgeItem ? 'Edit Age Category' : 'Add Age Category'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setAgeModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAgeSeries} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. U10"
                                        value={ageFormCode}
                                        onChange={(e) => setAgeFormCode(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Type *</label>
                                    <select
                                        value={ageFormType}
                                        onChange={(e) => setAgeFormType(e.target.value as any)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="YOUTH">Youth</option>
                                        <option value="ACTIVES">Actives</option>
                                        <option value="SENIORS">Seniors</option>
                                        <option value="CUSTOM">Custom</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Under 10 Juniors"
                                    value={ageFormName}
                                    onChange={(e) => setAgeFormName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Age</label>
                                    <input
                                        type="number"
                                        placeholder="Optional"
                                        value={ageFormMin}
                                        onChange={(e) => setAgeFormMin(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Age</label>
                                    <input
                                        type="number"
                                        placeholder="Optional"
                                        value={ageFormMax}
                                        onChange={(e) => setAgeFormMax(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Description of the category..."
                                    value={ageFormDesc}
                                    onChange={(e) => setAgeFormDesc(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setAgeModalOpen(false)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
                                >
                                    Save Category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SEASONS MODAL */}
            {seasonModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Create New Season
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSeasonModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSeason} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Season Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 2026/2027"
                                    value={seasonName}
                                    onChange={(e) => setSeasonName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={seasonStartDate}
                                        onChange={(e) => setSeasonStartDate(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={seasonEndDate}
                                        onChange={(e) => setSeasonEndDate(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isCurrentSeason"
                                    checked={seasonIsCurrent}
                                    onChange={(e) => setSeasonIsCurrent(e.target.checked)}
                                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                                />
                                <label htmlFor="isCurrentSeason" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Set as Active Current Season
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setSeasonModalOpen(false)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={seasonSubmitting}
                                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                                >
                                    {seasonSubmitting ? 'Creating...' : 'Create Season'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
