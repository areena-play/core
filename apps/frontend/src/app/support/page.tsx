'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    HelpCircle,
    Search,
    ChevronDown,
    ChevronUp,
    Send,
    CheckCircle2,
    AlertCircle,
    Building2,
    Shield,
    Trophy,
    Globe,
    Settings,
    MessageSquare,
    X,
} from 'lucide-react';
import { AdminFaqManagerModal } from '@/components/support/AdminFaqManagerModal';

function SupportPageContent() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { t, locale } = useI18n();

    // Context & selection
    const initialContext = (searchParams.get('context')?.toUpperCase() as any) || 'SYSTEM';
    const initialId = searchParams.get('id') || '';

    const [contextType, setContextType] = useState<'SYSTEM' | 'ASSOCIATION' | 'CLUB' | 'TOURNAMENT'>(
        ['SYSTEM', 'ASSOCIATION', 'CLUB', 'TOURNAMENT'].includes(initialContext) ? initialContext : 'SYSTEM'
    );
    const [contextId, setContextId] = useState<string>(initialId);

    // Entity lists for selectors
    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [competitions, setCompetitions] = useState<any[]>([]);

    // FAQ & Subject Data
    const [faqs, setFaqs] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loadingFaqs, setLoadingFaqs] = useState<boolean>(true);
    const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

    // Contact Form state
    const [senderName, setSenderName] = useState<string>('');
    const [senderEmail, setSenderEmail] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [customSubjectTitle, setCustomSubjectTitle] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [faqsConfirmed, setFaqsConfirmed] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [submittedTicket, setSubmittedTicket] = useState<any | null>(null);

    // Admin Modal
    const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);

    // Pre-fill user data when auth loads
    useEffect(() => {
        if (user) {
            setSenderName(`${user.firstName} ${user.lastName}`.trim());
            setSenderEmail(user.email || '');
        }
    }, [user]);

    // Load available entities for context switching
    useEffect(() => {
        async function loadEntities() {
            try {
                const [assocData, clubData, compData] = await Promise.all([
                    api.getAssociations().catch(() => []),
                    api.getClubs().catch(() => []),
                    api.getCompetitions().catch(() => []),
                ]);
                const aList = Array.isArray(assocData) ? assocData : assocData?.associations || [];
                const cList = Array.isArray(clubData) ? clubData : clubData?.clubs || [];
                const compList = Array.isArray(compData) ? compData : compData?.competitions || [];

                setAssociations(aList);
                setClubs(cList);
                setCompetitions(compList);

                // If contextId not set yet, pick first available
                if (!contextId) {
                    if (contextType === 'ASSOCIATION' && aList[0]) setContextId(aList[0].id);
                    if (contextType === 'CLUB' && cList[0]) setContextId(cList[0].id);
                    if (contextType === 'TOURNAMENT' && compList[0]) setContextId(compList[0].id);
                }
            } catch (err) {
                console.error('Failed to load support context entities', err);
            }
        }
        loadEntities();
    }, []);

    // When contextType changes, ensure a valid contextId is selected
    useEffect(() => {
        if (contextType === 'SYSTEM') {
            setContextId('');
        } else if (contextType === 'ASSOCIATION') {
            if (associations.length > 0 && !associations.some((a) => a.id === contextId)) {
                setContextId(associations[0].id);
            }
        } else if (contextType === 'CLUB') {
            if (clubs.length > 0 && !clubs.some((c) => c.id === contextId)) {
                setContextId(clubs[0].id);
            }
        } else if (contextType === 'TOURNAMENT') {
            if (competitions.length > 0 && !competitions.some((c) => c.id === contextId)) {
                setContextId(competitions[0].id);
            }
        }
    }, [contextType, associations, clubs, competitions, contextId]);

    // Fetch FAQs & Subjects whenever context changes
    const fetchSupportData = async () => {
        setLoadingFaqs(true);
        setLoadingSubjects(true);
        try {
            const queryParams: any = { contextType };
            if (contextId) queryParams.contextId = contextId;

            const [faqsData, subsData] = await Promise.all([
                api.getFaqs(queryParams),
                api.getSupportSubjects(queryParams),
            ]);
            setFaqs(Array.isArray(faqsData) ? faqsData : faqsData?.faqs || []);
            const subjectsList = Array.isArray(subsData) ? subsData : subsData?.subjects || [];
            setSubjects(subjectsList);
            if (subjectsList && subjectsList.length > 0) {
                setSelectedSubjectId(subjectsList[0].id);
            } else {
                setSelectedSubjectId('');
            }
        } catch (err) {
            console.error('Failed to load support FAQs and subjects:', err);
        } finally {
            setLoadingFaqs(false);
            setLoadingSubjects(false);
        }
    };

    useEffect(() => {
        // If an entity context is active but contextId is not resolved yet, wait for it
        if (contextType !== 'SYSTEM' && !contextId) {
            return;
        }
        fetchSupportData();
    }, [contextType, contextId]);

    // Resolve context active name
    const activeContextName = useMemo(() => {
        if (contextType === 'SYSTEM') return 'AREENA Platform (General)';
        if (contextType === 'ASSOCIATION') {
            const a = associations.find((item) => item.id === contextId);
            return a ? `${a.name} (${a.code})` : 'Federation';
        }
        if (contextType === 'CLUB') {
            const c = clubs.find((item) => item.id === contextId);
            return c ? `${c.name} (${c.code})` : 'Club';
        }
        if (contextType === 'TOURNAMENT') {
            const t = competitions.find((item) => item.id === contextId);
            return t ? t.name : 'Tournament';
        }
        return 'AREENA Platform';
    }, [contextType, contextId, associations, clubs, competitions]);

    // Filter FAQs by search & category
    const filteredFaqs = useMemo(() => {
        return faqs.filter((faq) => {
            if (selectedCategory !== 'ALL' && faq.category !== selectedCategory) {
                return false;
            }
            if (!searchQuery.trim()) return true;
            const term = searchQuery.toLowerCase();
            const q = (faq.questionI18n?.[locale] || faq.question || '').toLowerCase();
            const a = (faq.answerI18n?.[locale] || faq.answer || '').toLowerCase();
            return q.includes(term) || a.includes(term);
        });
    }, [faqs, selectedCategory, searchQuery, locale]);

    // Check if user has admin rights for the current context
    const canManageContext = useMemo(() => {
        if (!user) return false;
        if (user.isSuperAdmin) return true;
        if (contextType === 'ASSOCIATION' && contextId) {
            return user.associationRoles?.some((r: any) => r.associationId === contextId);
        }
        if (contextType === 'CLUB' && contextId) {
            return user.clubRoles?.some((r: any) => r.clubId === contextId);
        }
        return false;
    }, [user, contextType, contextId]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!faqsConfirmed) {
            setFormError(t('support.form.faqConfirmationRequired'));
            return;
        }

        if (!senderName.trim() || !senderEmail.trim() || !message.trim()) {
            setFormError('Please fill out all required fields.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.submitSupportInquiry({
                name: senderName.trim(),
                email: senderEmail.trim(),
                subjectId: selectedSubjectId || undefined,
                customSubjectTitle: customSubjectTitle.trim() || undefined,
                contextType,
                contextId: contextId || undefined,
                message: message.trim(),
                faqsConfirmed: true,
            });

            setSubmittedTicket(res.inquiry || res);
            setMessage('');
            setCustomSubjectTitle('');
            setFaqsConfirmed(false);
        } catch (err: any) {
            setFormError(err.message || 'Failed to submit support inquiry.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
            {/* Header / Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-8 sm:p-10 text-white shadow-xl border border-slate-700/50">
                <div className="relative z-10 max-w-3xl space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-300 border border-red-500/30 backdrop-blur-xs">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>{t('support.title')}</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        {t('support.title')}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                        {t('support.subtitle')}
                    </p>
                </div>

                <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
            </div>

            {/* Context Selector Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
                    <button
                        onClick={() => {
                            setContextType('SYSTEM');
                            setContextId('');
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs whitespace-nowrap ${
                            contextType === 'SYSTEM'
                                ? 'bg-red-600 text-white shadow-red-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Globe className="h-4 w-4" />
                        <span>{t('support.tabs.platform')}</span>
                    </button>

                    <button
                        onClick={() => {
                            setContextType('ASSOCIATION');
                            if (associations[0]) setContextId(associations[0].id);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs whitespace-nowrap ${
                            contextType === 'ASSOCIATION'
                                ? 'bg-red-600 text-white shadow-red-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Building2 className="h-4 w-4" />
                        <span>{t('support.tabs.association')}</span>
                    </button>

                    <button
                        onClick={() => {
                            setContextType('CLUB');
                            if (clubs[0]) setContextId(clubs[0].id);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs whitespace-nowrap ${
                            contextType === 'CLUB'
                                ? 'bg-red-600 text-white shadow-red-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Shield className="h-4 w-4" />
                        <span>{t('support.tabs.club')}</span>
                    </button>

                    <button
                        onClick={() => {
                            setContextType('TOURNAMENT');
                            if (competitions[0]) setContextId(competitions[0].id);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs whitespace-nowrap ${
                            contextType === 'TOURNAMENT'
                                ? 'bg-red-600 text-white shadow-red-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Trophy className="h-4 w-4" />
                        <span>{t('support.tabs.tournament')}</span>
                    </button>
                </div>

                {/* Sub-entity dropdown when a specific entity context is active */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {contextType === 'ASSOCIATION' && associations.length > 0 && (
                        <select
                            value={contextId}
                            onChange={(e) => setContextId(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white shadow-xs max-w-[220px]"
                        >
                            {associations.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({a.code})
                                </option>
                            ))}
                        </select>
                    )}

                    {contextType === 'CLUB' && clubs.length > 0 && (
                        <select
                            value={contextId}
                            onChange={(e) => setContextId(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white shadow-xs max-w-[220px]"
                        >
                            {clubs.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    )}

                    {contextType === 'TOURNAMENT' && competitions.length > 0 && (
                        <select
                            value={contextId}
                            onChange={(e) => setContextId(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white shadow-xs max-w-[220px]"
                        >
                            {competitions.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {canManageContext && (
                        <button
                            onClick={() => setAdminModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-xs shrink-0"
                            title="Manage FAQs & Subjects"
                        >
                            <Settings className="h-3.5 w-3.5 text-red-500" />
                            <span className="hidden sm:inline">{t('support.admin.manageFaqs')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content: 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: FAQ Accordion (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {t('support.faqTitle')}
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">
                                {filteredFaqs.length} FAQs
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {t('support.faqSubtitle')}
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('support.searchPlaceholder')}
                            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-red-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {['ALL', 'GENERAL', 'LICENSES', 'TOURNAMENTS', 'ACCOUNT', 'BILLING'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition shrink-0 ${
                                    selectedCategory === cat
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800'
                                }`}
                            >
                                {cat === 'ALL'
                                    ? t('support.allCategories')
                                    : t(`support.categories.${cat}` as any) || cat}
                            </button>
                        ))}
                    </div>

                    {/* FAQ Items List */}
                    {loadingFaqs ? (
                        <div className="py-16 text-center text-xs text-slate-400">Loading FAQs...</div>
                    ) : filteredFaqs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-800">
                            <HelpCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {t('support.noFaqsFound')}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                                Use the contact form on the right to submit your question directly.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFaqs.map((faq) => {
                                const isExpanded = expandedFaqId === faq.id;
                                const questionText = faq.questionI18n?.[locale] || faq.question;
                                const answerText = faq.answerI18n?.[locale] || faq.answer;
                                const categoryLabel =
                                    faq.categoryI18n?.[locale] ||
                                    t(`support.categories.${faq.category}` as any) ||
                                    faq.category;

                                return (
                                    <div
                                        key={faq.id}
                                        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                            isExpanded
                                                ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 shadow-xs'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <button
                                            onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                                            className="flex w-full items-start justify-between p-4 text-left gap-4"
                                        >
                                            <div className="space-y-1">
                                                <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                                    {categoryLabel}
                                                </span>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {questionText}
                                                </h3>
                                            </div>
                                            <div className="shrink-0 text-slate-400 pt-1">
                                                {isExpanded ? (
                                                    <ChevronUp className="h-5 w-5 text-red-500" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5" />
                                                )}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-red-100 dark:border-red-950/40 px-4 pb-4 pt-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50">
                                                {answerText}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Contact Form (5 cols) */}
                <div className="lg:col-span-5">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6 sticky top-24">
                        <div>
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-red-600 dark:text-red-400" />
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {t('support.contactTitle')}
                                </h2>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {t('support.contactSubtitle')}
                            </p>
                        </div>

                        {/* Submission Success Screen */}
                        {submittedTicket ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-center space-y-4">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                                        {t('support.form.successTitle')}
                                    </h3>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        {t('support.form.successMessage')}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-white p-3 dark:bg-slate-900 text-left border border-emerald-100 dark:border-emerald-950 space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('support.form.ticketNumber')}:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                            {submittedTicket.ticketNumber}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('support.form.recipient')}:</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                            {submittedTicket.recipientEmail}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSubmittedTicket(null)}
                                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                                >
                                    {t('support.form.sendAnother')}
                                </button>
                            </div>
                        ) : (
                            /* Contact Form */
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                {formError && (
                                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                {/* Target Context Info Badge */}
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {t('support.form.context')}
                                    </span>
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                                        <span>{activeContextName}</span>
                                        <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-mono">
                                            {contextType}
                                        </span>
                                    </div>
                                </div>

                                {/* Subject / Topic Selector */}
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                        {t('support.form.subject')} *
                                    </label>
                                    <select
                                        required
                                        value={selectedSubjectId ?? ''}
                                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs focus:border-red-500 focus:outline-none"
                                    >
                                        {subjects.map((sub) => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.titleI18n?.[locale] || sub.title}
                                            </option>
                                        ))}
                                        <option value="">-- {t('support.form.customSubject')} --</option>
                                    </select>
                                </div>

                                {!selectedSubjectId && (
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                            {t('support.form.customSubject')}
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={customSubjectTitle}
                                            onChange={(e) => setCustomSubjectTitle(e.target.value)}
                                            placeholder="Enter brief topic description..."
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {/* Name & Email */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                            {t('support.form.yourName')} *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                            {t('support.form.yourEmail')} *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={senderEmail}
                                            onChange={(e) => setSenderEmail(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Message */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                            {t('support.form.message')} *
                                        </label>
                                        <span className="text-[10px] text-slate-400">
                                            {message.length} chars
                                        </span>
                                    </div>
                                    <textarea
                                        required
                                        rows={4}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder={t('support.form.messagePlaceholder')}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs focus:border-red-500 focus:outline-none leading-relaxed"
                                    />
                                </div>

                                {/* Mandatory FAQ Confirmation Checkbox */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={faqsConfirmed}
                                            onChange={(e) => setFaqsConfirmed(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 shrink-0 cursor-pointer"
                                        />
                                        <span className="text-[11px] leading-snug font-medium text-slate-700 dark:text-slate-300">
                                            {t('support.form.faqConfirmation')}
                                        </span>
                                    </label>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm hover:shadow disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                    <span>
                                        {submitting
                                            ? t('support.form.submitting')
                                            : t('support.form.submit')}
                                    </span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Admin Management Modal */}
            <AdminFaqManagerModal
                isOpen={adminModalOpen}
                onClose={() => setAdminModalOpen(false)}
                contextType={contextType}
                contextId={contextId}
                contextName={activeContextName}
                onChanged={fetchSupportData}
            />
        </div>
    );
}

export default function SupportPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Support Portal...</div>}>
            <SupportPageContent />
        </Suspense>
    );
}
