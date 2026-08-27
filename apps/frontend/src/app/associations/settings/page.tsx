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
    Sparkles,
    ChevronLeft,
    Key,
    Building2,
    Image as ImageIcon,
    Upload,
    Trash2,
    FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import { AccessDenied } from '@/components/auth/AccessDenied';

export default function AssociationSettingsPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [topAssoc, setTopAssoc] = useState<any | null>(null);

    // Association Identity & Branding
    const [assocName, setAssocName] = useState('');
    const [assocShortName, setAssocShortName] = useState('');
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);

    // File Upload State for S3
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // License ID Engine
    const [template, setTemplate] = useState('{regionDigit}{year2}{counter3}');
    const [counter, setCounter] = useState(1);
    const [regionDigit, setRegionDigit] = useState(1);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        async function loadAssoc() {
            try {
                const data = await api.getAssociations();
                const top =
                    data.associations?.find((a: any) => a.isTopLevel) || data.associations?.[0];
                if (top) {
                    setTopAssoc(top);
                    setAssocName(top.name || '');
                    setAssocShortName(top.shortName || '');
                    setCurrentLogoUrl(top.logoUrl || null);
                    setTemplate(top.licenseIdTemplate || '{regionDigit}{year2}{counter3}');
                    setCounter(top.licenseCounter || 1);
                    setRegionDigit(top.regionDigit || 1);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadAssoc();
    }, []);

    // Handle File Selection
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

    // Handle Drag & Drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrorMsg('Please drop a valid image file (PNG, JPG, SVG, WebP).');
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

    const handleRemoveCurrentLogo = async () => {
        if (!topAssoc) return;
        setUploadingLogo(true);
        setErrorMsg('');
        try {
            await api.deleteAssociationLogo(topAssoc.id);
            setCurrentLogoUrl(null);
            setSelectedLogoFile(null);
            setLogoPreviewUrl(null);
            setSuccessMsg('Association logo removed successfully.');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to remove logo.');
        } finally {
            setUploadingLogo(false);
        }
    };

    // Compute live preview
    const computePreview = () => {
        const year4 = '2026';
        const year2 = '26';
        const regDigit = String(regionDigit || topAssoc?.regionDigit || 1);
        const regionCode = topAssoc?.code || 'CH';
        const counter3 = String(counter).padStart(3, '0');
        const counter4 = String(counter).padStart(4, '0');
        const counter5 = String(counter).padStart(5, '0');

        return template
            .replace(/\{regionDigit\}/g, regDigit)
            .replace(/\{regionCode\}/g, regionCode)
            .replace(/\{year2\}/g, year2)
            .replace(/\{year4\}/g, year4)
            .replace(/\{counter3\}/g, counter3)
            .replace(/\{counter4\}/g, counter4)
            .replace(/\{counter5\}/g, counter5);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topAssoc) return;
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            // If user selected a new logo file, upload to S3 bucket first
            let finalLogoUrl = currentLogoUrl;
            if (selectedLogoFile) {
                const uploadRes = await api.uploadAssociationLogo(topAssoc.id, selectedLogoFile);
                finalLogoUrl = uploadRes.logoUrl;
                setCurrentLogoUrl(uploadRes.logoUrl);
                setSelectedLogoFile(null);
                setLogoPreviewUrl(null);
            }

            // Update text settings
            await api.updateAssociationSettings(topAssoc.id, {
                name: assocName,
                shortName: assocShortName,
                logoUrl: finalLogoUrl,
                licenseIdTemplate: template,
                counter: Number(counter),
                regionDigit: Number(regionDigit),
            });

            setSuccessMsg('Association settings and S3 logo successfully saved.');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update association settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
        );
    }

    const isAuthorized =
        user?.isSuperAdmin ||
        (topAssoc &&
            user?.associationRoles?.some(
                (r: any) =>
                    r.associationId === topAssoc.id && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
            ));

    if (!isAuthorized) {
        return (
            <AccessDenied
                title="Association Settings Restricted"
                description={`Only authorized federation administrators of ${
                    topAssoc?.name || 'the main sports association'
                } can configure federation branding, S3 logo, and License ID engine parameters.`}
                requiredRole="Association Administrator (STTV / Regional Admin)"
                returnHref="/associations"
            />
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            <Link
                href="/associations"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
                <ChevronLeft className="h-4 w-4" />
                <span>{t('common.back')}</span>
            </Link>

            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 md:p-8 shadow-xl space-y-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sliders className="h-6 w-6 text-red-500" />
                        <span>{t('associations.settingsTitle')}</span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Configure federation branding, S3 logo upload, and license ID engine parameters.
                    </p>
                </div>

                {errorMsg && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/80 p-4 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>{errorMsg}</div>
                    </div>
                )}

                {successMsg && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 p-4 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>{successMsg}</div>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6 text-xs">
                    {/* Association Identity & Header Branding */}
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-4 sm:p-5">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                            <Building2 className="h-4 w-4 text-red-500" />
                            <span>Federation Identity & Navbar Branding</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            The full name or uploaded S3 logo configured here will be displayed dynamically in the top navigation header.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Main Association Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Swiss Table Tennis Federation"
                                    value={assocName}
                                    onChange={(e) => setAssocName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none font-medium"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Short Name / Abbreviation
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. STTV"
                                    value={assocShortName}
                                    onChange={(e) => setAssocShortName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none font-medium"
                                />
                            </div>
                        </div>

                        {/* S3 Logo Upload Area */}
                        <div className="space-y-3 pt-2">
                            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                                <span>Association Logo (Stored in S3 Bucket)</span>
                            </label>

                            {/* Current / Stored Logo Preview */}
                            {(currentLogoUrl || logoPreviewUrl) && (
                                <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                                    <div className="flex h-14 w-28 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800">
                                        <img
                                            src={logoPreviewUrl || currentLogoUrl!}
                                            alt="Association Logo"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {selectedLogoFile ? selectedLogoFile.name : 'Current S3 Stored Logo'}
                                            </span>
                                            {selectedLogoFile && (
                                                <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 text-[10px] px-1.5 py-0.2 font-bold">
                                                    Pending Save
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
                                            {selectedLogoFile
                                                ? `${(selectedLogoFile.size / 1024).toFixed(1)} KB • Will upload to S3 on Save`
                                                : currentLogoUrl}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedLogoFile) {
                                                setSelectedLogoFile(null);
                                                setLogoPreviewUrl(null);
                                            } else {
                                                handleRemoveCurrentLogo();
                                            }
                                        }}
                                        disabled={uploadingLogo}
                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition"
                                        title="Remove Logo"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Drag and Drop Upload Box */}
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 hover:border-red-500/60 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-red-500/60 transition text-center space-y-2"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 group-hover:scale-110 transition">
                                    <Upload className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-slate-900 dark:text-slate-200">
                                        Click to browse or drag and drop logo image
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        PNG, JPG, SVG, or WebP up to 5MB. Files are securely uploaded to the S3 bucket.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* License ID Engine Settings */}
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-4 sm:p-5">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                            <Key className="h-4 w-4 text-red-500" />
                            <span>{t('associations.licenseTemplate')}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Every new user issued their official federation license receives a unique License ID generated from this pattern.
                        </p>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                                Pattern Template
                            </label>
                            <input
                                type="text"
                                required
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                className="mt-1 w-full font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                            />
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                <span>Available tokens:</span>
                                <code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-red-600 dark:text-red-400 font-mono">
                                    &#123;regionDigit&#125;
                                </code>
                                <code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-red-600 dark:text-red-400 font-mono">
                                    &#123;regionCode&#125;
                                </code>
                                <code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-red-600 dark:text-red-400 font-mono">
                                    &#123;year2&#125;
                                </code>
                                <code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-red-600 dark:text-red-400 font-mono">
                                    &#123;year4&#125;
                                </code>
                                <code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-red-600 dark:text-red-400 font-mono">
                                    &#123;counter3&#125;
                                </code>
                                <code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-red-600 dark:text-red-400 font-mono">
                                    &#123;counter4&#125;
                                </code>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Next Sequence Counter
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={counter}
                                    onChange={(e) => setCounter(Number(e.target.value))}
                                    className="mt-1 w-full font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Region Digit
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={9}
                                    value={regionDigit}
                                    onChange={(e) => setRegionDigit(Number(e.target.value))}
                                    className="mt-1 w-full font-mono rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Live Preview Box */}
                        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4 space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                                Live Generated ID Preview:
                            </div>
                            <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-widest">
                                {computePreview()}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Example for national / regional entity (Region Digit #{regionDigit}), year 2026,
                                sequence counter #{counter}.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow transition flex items-center gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            <span>{saving ? t('common.saving') : t('common.save')}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
