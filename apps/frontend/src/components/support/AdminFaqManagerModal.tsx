'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
import { HelpCircle, Plus, Trash2, Edit3, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminFaqManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    contextType?: string;
    contextId?: string;
    contextName?: string;
    onChanged?: () => void;
}

export function AdminFaqManagerModal({
    isOpen,
    onClose,
    contextType = 'SYSTEM',
    contextId,
    contextName,
    onChanged,
}: AdminFaqManagerModalProps) {
    const { t, locale } = useI18n();
    const [activeTab, setActiveTab] = useState<'FAQS' | 'SUBJECTS'>('FAQS');
    const [faqs, setFaqs] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state for FAQ
    const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
    const [faqQuestionEn, setFaqQuestionEn] = useState('');
    const [faqQuestionDe, setFaqQuestionDe] = useState('');
    const [faqQuestionFr, setFaqQuestionFr] = useState('');
    const [faqQuestionIt, setFaqQuestionIt] = useState('');
    const [faqAnswerEn, setFaqAnswerEn] = useState('');
    const [faqAnswerDe, setFaqAnswerDe] = useState('');
    const [faqAnswerFr, setFaqAnswerFr] = useState('');
    const [faqAnswerIt, setFaqAnswerIt] = useState('');
    const [faqCategory, setFaqCategory] = useState('GENERAL');
    const [faqOrder, setFaqOrder] = useState<number>(0);
    const [showFaqForm, setShowFaqForm] = useState(false);

    // Form state for Subject
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [subTitleEn, setSubTitleEn] = useState('');
    const [subTitleDe, setSubTitleDe] = useState('');
    const [subTitleFr, setSubTitleFr] = useState('');
    const [subTitleIt, setSubTitleIt] = useState('');
    const [subDescEn, setSubDescEn] = useState('');
    const [subRecipientEmail, setSubRecipientEmail] = useState('');
    const [subOrder, setSubOrder] = useState<number>(0);
    const [showSubForm, setShowSubForm] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [faqsData, subsData] = await Promise.all([
                api.getFaqs({ contextType, contextId }),
                api.getSupportSubjects({ contextType, contextId }),
            ]);
            setFaqs(faqsData || []);
            setSubjects(subsData || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load support settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
            setShowFaqForm(false);
            setShowSubForm(false);
            setError(null);
            setSuccessMessage(null);
        }
    }, [isOpen, contextType, contextId]);

    const resetFaqForm = () => {
        setEditingFaqId(null);
        setFaqQuestionEn('');
        setFaqQuestionDe('');
        setFaqQuestionFr('');
        setFaqQuestionIt('');
        setFaqAnswerEn('');
        setFaqAnswerDe('');
        setFaqAnswerFr('');
        setFaqAnswerIt('');
        setFaqCategory('GENERAL');
        setFaqOrder(0);
        setShowFaqForm(false);
    };

    const startEditFaq = (faq: any) => {
        setEditingFaqId(faq.id);
        setFaqQuestionEn(faq.questionI18n?.en || faq.question || '');
        setFaqQuestionDe(faq.questionI18n?.de || '');
        setFaqQuestionFr(faq.questionI18n?.fr || '');
        setFaqQuestionIt(faq.questionI18n?.it || '');
        setFaqAnswerEn(faq.answerI18n?.en || faq.answer || '');
        setFaqAnswerDe(faq.answerI18n?.de || '');
        setFaqAnswerFr(faq.answerI18n?.fr || '');
        setFaqAnswerIt(faq.answerI18n?.it || '');
        setFaqCategory(faq.category || 'GENERAL');
        setFaqOrder(faq.order ?? 0);
        setShowFaqForm(true);
    };

    const handleSaveFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload = {
                question: faqQuestionEn || faqQuestionDe || 'Untitled FAQ',
                answer: faqAnswerEn || faqAnswerDe || '',
                questionI18n: {
                    en: faqQuestionEn,
                    de: faqQuestionDe,
                    fr: faqQuestionFr,
                    it: faqQuestionIt,
                },
                answerI18n: {
                    en: faqAnswerEn,
                    de: faqAnswerDe,
                    fr: faqAnswerFr,
                    it: faqAnswerIt,
                },
                category: faqCategory,
                order: Number(faqOrder) || 0,
                associationId: contextType === 'ASSOCIATION' ? contextId : null,
                clubId: contextType === 'CLUB' ? contextId : null,
                competitionId: contextType === 'TOURNAMENT' ? contextId : null,
            };

            if (editingFaqId) {
                await api.updateFaq(editingFaqId, payload);
                setSuccessMessage('FAQ updated successfully!');
            } else {
                await api.createFaq(payload);
                setSuccessMessage('FAQ created successfully!');
            }

            resetFaqForm();
            await loadData();
            onChanged?.();
        } catch (err: any) {
            setError(err.message || 'Failed to save FAQ');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFaq = async (id: string) => {
        if (!confirm(t('support.admin.deleteFaqConfirm'))) return;
        try {
            await api.deleteFaq(id);
            setSuccessMessage('FAQ deleted');
            await loadData();
            onChanged?.();
        } catch (err: any) {
            setError(err.message || 'Failed to delete FAQ');
        }
    };

    // Subject handlers
    const resetSubForm = () => {
        setEditingSubjectId(null);
        setSubTitleEn('');
        setSubTitleDe('');
        setSubTitleFr('');
        setSubTitleIt('');
        setSubDescEn('');
        setSubRecipientEmail('');
        setSubOrder(0);
        setShowSubForm(false);
    };

    const startEditSub = (sub: any) => {
        setEditingSubjectId(sub.id);
        setSubTitleEn(sub.titleI18n?.en || sub.title || '');
        setSubTitleDe(sub.titleI18n?.de || '');
        setSubTitleFr(sub.titleI18n?.fr || '');
        setSubTitleIt(sub.titleI18n?.it || '');
        setSubDescEn(sub.descriptionI18n?.en || sub.description || '');
        setSubRecipientEmail(sub.recipientEmail || '');
        setSubOrder(sub.order ?? 0);
        setShowSubForm(true);
    };

    const handleSaveSub = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload = {
                title: subTitleEn || subTitleDe || 'New Subject',
                titleI18n: {
                    en: subTitleEn,
                    de: subTitleDe,
                    fr: subTitleFr,
                    it: subTitleIt,
                },
                description: subDescEn,
                targetType: subRecipientEmail ? 'CUSTOM_EMAIL' : contextType,
                recipientEmail: subRecipientEmail || null,
                order: Number(subOrder) || 0,
                associationId: contextType === 'ASSOCIATION' ? contextId : null,
                clubId: contextType === 'CLUB' ? contextId : null,
                competitionId: contextType === 'TOURNAMENT' ? contextId : null,
            };

            if (editingSubjectId) {
                await api.updateSupportSubject(editingSubjectId, payload);
                setSuccessMessage('Support Subject updated!');
            } else {
                await api.createSupportSubject(payload);
                setSuccessMessage('Support Subject created!');
            }

            resetSubForm();
            await loadData();
            onChanged?.();
        } catch (err: any) {
            setError(err.message || 'Failed to save subject');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSub = async (id: string) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;
        try {
            await api.deleteSupportSubject(id);
            setSuccessMessage('Subject deleted');
            await loadData();
            onChanged?.();
        } catch (err: any) {
            setError(err.message || 'Failed to delete subject');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
            <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                            <HelpCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {t('support.admin.manageFaqs')}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {contextName ? `Scope: ${contextName} (${contextType})` : 'Scope: Global / Platform'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-6 pt-2 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => {
                            setActiveTab('FAQS');
                            setShowFaqForm(false);
                        }}
                        className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                            activeTab === 'FAQS'
                                ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {t('support.admin.manageFaqs')} ({faqs.length})
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('SUBJECTS');
                            setShowSubForm(false);
                        }}
                        className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                            activeTab === 'SUBJECTS'
                                ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {t('support.admin.manageSubjects')} ({subjects.length})
                    </button>
                </div>

                {/* Body Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* ======================= TAB 1: FAQS ======================= */}
                    {activeTab === 'FAQS' && (
                        <div>
                            {!showFaqForm ? (
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <p className="text-xs text-slate-500">
                                            Custom FAQs defined here will appear for users viewing this organization's support tab.
                                        </p>
                                        <button
                                            onClick={() => {
                                                resetFaqForm();
                                                setShowFaqForm(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition shadow-xs"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>{t('support.admin.addFaq')}</span>
                                        </button>
                                    </div>

                                    {loading ? (
                                        <div className="py-12 text-center text-xs text-slate-400">Loading FAQs...</div>
                                    ) : faqs.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                                            No FAQs created for this scope yet. Click "Add New FAQ" to create one.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {faqs.map((faq) => (
                                                <div
                                                    key={faq.id}
                                                    className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                                                >
                                                    <div className="space-y-1 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                                {faq.category}
                                                            </span>
                                                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                                {faq.questionI18n?.[locale] || faq.question}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                                            {faq.answerI18n?.[locale] || faq.answer}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => startEditFaq(faq)}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 transition"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFaq(faq.id)}
                                                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* FAQ Edit / Create Form */
                                <form onSubmit={handleSaveFaq} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                            {editingFaqId ? t('support.admin.editFaq') : t('support.admin.addFaq')}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={resetFaqForm}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                                                {t('support.admin.category')}
                                            </label>
                                            <select
                                                value={faqCategory}
                                                onChange={(e) => setFaqCategory(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            >
                                                <option value="GENERAL">General</option>
                                                <option value="LICENSES">Licenses</option>
                                                <option value="TOURNAMENTS">Tournaments</option>
                                                <option value="ACCOUNT">Account & Security</option>
                                                <option value="BILLING">Billing</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                                                {t('support.admin.order')}
                                            </label>
                                            <input
                                                type="number"
                                                value={faqOrder}
                                                onChange={(e) => setFaqOrder(Number(e.target.value))}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Multi-language Questions */}
                                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Questions (Multilingual)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇬🇧 {t('support.admin.questionEn')} *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={faqQuestionEn}
                                                    onChange={(e) => setFaqQuestionEn(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇩🇪 {t('support.admin.questionDe')}</label>
                                                <input
                                                    type="text"
                                                    value={faqQuestionDe}
                                                    onChange={(e) => setFaqQuestionDe(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇫🇷 {t('support.admin.questionFr')}</label>
                                                <input
                                                    type="text"
                                                    value={faqQuestionFr}
                                                    onChange={(e) => setFaqQuestionFr(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇮🇹 {t('support.admin.questionIt')}</label>
                                                <input
                                                    type="text"
                                                    value={faqQuestionIt}
                                                    onChange={(e) => setFaqQuestionIt(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Multi-language Answers */}
                                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Answers (Multilingual)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇬🇧 {t('support.admin.answerEn')} *</label>
                                                <textarea
                                                    required
                                                    rows={3}
                                                    value={faqAnswerEn}
                                                    onChange={(e) => setFaqAnswerEn(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇩🇪 {t('support.admin.answerDe')}</label>
                                                <textarea
                                                    rows={3}
                                                    value={faqAnswerDe}
                                                    onChange={(e) => setFaqAnswerDe(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇫🇷 {t('support.admin.answerFr')}</label>
                                                <textarea
                                                    rows={3}
                                                    value={faqAnswerFr}
                                                    onChange={(e) => setFaqAnswerFr(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇮🇹 {t('support.admin.answerIt')}</label>
                                                <textarea
                                                    rows={3}
                                                    value={faqAnswerIt}
                                                    onChange={(e) => setFaqAnswerIt(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetFaqForm}
                                            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : t('support.admin.save')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ======================= TAB 2: SUBJECTS ======================= */}
                    {activeTab === 'SUBJECTS' && (
                        <div>
                            {!showSubForm ? (
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <p className="text-xs text-slate-500">
                                            Custom support topics allow visitors to route inquiries directly to specific committees or emails.
                                        </p>
                                        <button
                                            onClick={() => {
                                                resetSubForm();
                                                setShowSubForm(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition shadow-xs"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Subject</span>
                                        </button>
                                    </div>

                                    {loading ? (
                                        <div className="py-12 text-center text-xs text-slate-400">Loading subjects...</div>
                                    ) : subjects.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                                            No subjects created yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {subjects.map((sub) => (
                                                <div
                                                    key={sub.id}
                                                    className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                                                >
                                                    <div className="space-y-1 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                                {sub.titleI18n?.[locale] || sub.title}
                                                            </span>
                                                            {sub.recipientEmail && (
                                                                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-mono text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                                                    to: {sub.recipientEmail}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {sub.description && (
                                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                                {sub.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => startEditSub(sub)}
                                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 transition"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSub(sub.id)}
                                                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Subject Form */
                                <form onSubmit={handleSaveSub} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                            {editingSubjectId ? 'Edit Subject' : 'Add Support Subject'}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={resetSubForm}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                                                {t('support.admin.recipientEmail')}
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="e.g. licensing@association.ch"
                                                value={subRecipientEmail}
                                                onChange={(e) => setSubRecipientEmail(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                                                {t('support.admin.order')}
                                            </label>
                                            <input
                                                type="number"
                                                value={subOrder}
                                                onChange={(e) => setSubOrder(Number(e.target.value))}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Title (Multilingual)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇬🇧 English Title *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={subTitleEn}
                                                    onChange={(e) => setSubTitleEn(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇩🇪 German Title</label>
                                                <input
                                                    type="text"
                                                    value={subTitleDe}
                                                    onChange={(e) => setSubTitleDe(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇫🇷 French Title</label>
                                                <input
                                                    type="text"
                                                    value={subTitleFr}
                                                    onChange={(e) => setSubTitleFr(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">🇮🇹 Italian Title</label>
                                                <input
                                                    type="text"
                                                    value={subTitleIt}
                                                    onChange={(e) => setSubTitleIt(e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                                            Description / Help Text
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={subDescEn}
                                            onChange={(e) => setSubDescEn(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetSubForm}
                                            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : t('support.admin.saveSubject')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
