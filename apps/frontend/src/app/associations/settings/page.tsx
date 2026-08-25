'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { Sliders, Shield, CheckCircle2, AlertCircle, Sparkles, ChevronLeft, Key } from 'lucide-react';
import Link from 'next/link';

export default function AssociationSettingsPage() {
    const { user } = useAuth();
    const [topAssoc, setTopAssoc] = useState<any | null>(null);
    const [template, setTemplate] = useState('{regionDigit}{year2}{counter3}');
    const [counter, setCounter] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        async function loadAssoc() {
            try {
                const data = await api.getAssociations();
                const top = data.associations?.find((a: any) => a.isTopLevel) || data.associations?.[0];
                if (top) {
                    setTopAssoc(top);
                    setTemplate(top.licenseIdTemplate || '{regionDigit}{year2}{counter3}');
                    setCounter(top.licenseCounter || 1);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadAssoc();
    }, []);

    // Compute live preview
    const computePreview = () => {
        const year4 = '2026';
        const year2 = '26';
        const regionDigit = topAssoc?.regionDigit ? String(topAssoc.regionDigit) : '1';
        const regionCode = topAssoc?.code || 'CH';
        const counter3 = String(counter).padStart(3, '0');
        const counter4 = String(counter).padStart(4, '0');
        const counter5 = String(counter).padStart(5, '0');

        return template
            .replace(/\{regionDigit\}/g, regionDigit)
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
            await api.updateLicenseIdTemplate(topAssoc.id, {
                licenseIdTemplate: template,
                counter: Number(counter),
            });
            setSuccessMsg('License ID template & counter successfully saved.');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update license template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16">
            <Link
                href="/associations"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
                <ChevronLeft className="h-4 w-4" />
                Back to Association Hierarchy
            </Link>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Sliders className="h-6 w-6 text-red-500" />
                        Main Association Settings
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Configure federation-wide parameters, rule overrides, and the automated License ID generation
                        engine.
                    </p>
                </div>

                {errorMsg && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-800 bg-red-950/80 p-4 text-xs text-red-300">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>{errorMsg}</div>
                    </div>
                )}

                {successMsg && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-800 bg-emerald-950/80 p-4 text-xs text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>{successMsg}</div>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6 text-xs">
                    {/* License ID Engine Settings */}
                    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
                        <div className="flex items-center gap-2 font-bold text-sm text-white">
                            <Key className="h-4 w-4 text-red-500" />
                            <span>License ID Format Generator Pattern</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                            Every new user issued their first official license receives a unique License ID generated
                            from this pattern.
                        </p>

                        <div>
                            <label className="font-semibold text-slate-300">Pattern Template</label>
                            <input
                                type="text"
                                required
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                className="mt-1 w-full font-mono rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                            />
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                                <span>Available tokens:</span>
                                <code className="rounded bg-slate-800 px-1 py-0.5 text-red-400 font-mono">
                                    &#123;regionDigit&#125;
                                </code>
                                <code className="rounded bg-slate-800 px-1 py-0.5 text-red-400 font-mono">
                                    &#123;regionCode&#125;
                                </code>
                                <code className="rounded bg-slate-800 px-1 py-0.5 text-red-400 font-mono">
                                    &#123;year2&#125;
                                </code>
                                <code className="rounded bg-slate-800 px-1 py-0.5 text-red-400 font-mono">
                                    &#123;year4&#125;
                                </code>
                                <code className="rounded bg-slate-800 px-1 py-0.5 text-red-400 font-mono">
                                    &#123;counter3&#125;
                                </code>
                                <code className="rounded bg-slate-800 px-1 py-0.5 text-red-400 font-mono">
                                    &#123;counter4&#125;
                                </code>
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-slate-300">Next Sequence Counter</label>
                            <input
                                type="number"
                                min={1}
                                value={counter}
                                onChange={(e) => setCounter(Number(e.target.value))}
                                className="mt-1 w-full font-mono rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        {/* Live Preview Box */}
                        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                                Live Generated ID Preview:
                            </div>
                            <div className="font-mono text-2xl font-black text-white tracking-widest">
                                {computePreview()}
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Example for regional sub-association (Digit 1 = CH, 2 = Zurich, etc.), year 2026,
                                sequence counter #{counter}.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow"
                        >
                            {saving ? 'Saving...' : 'Save Association Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
