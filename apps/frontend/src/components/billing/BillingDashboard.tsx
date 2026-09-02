'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Modal } from '@/components/ui/Modal';
import {
    Receipt,
    Plus,
    RefreshCw,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    Sliders,
    Building2,
    User as UserIcon,
    Award,
    FileText,
    QrCode,
    Trash2,
    Send,
    ExternalLink,
    DollarSign,
    Sparkles,
    Check,
    X,
    Printer,
    Layers,
    Shield,
    TrendingUp,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface BillingDashboardProps {
    associationId?: string;
    isSubAssociation?: boolean;
}

export function BillingDashboard({ associationId, isSubAssociation = false }: BillingDashboardProps) {
    const { user } = useAuth();
    const { t } = useI18n();

    // Data State
    const [invoices, setInvoices] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [bexioConfig, setBexioConfig] = useState<any>(null);
    const [associations, setAssociations] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentAssoc, setCurrentAssoc] = useState<any>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBexioModal, setShowBexioModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [qrPayload, setQrPayload] = useState<any>(null);

    // Create Invoice Form State
    const [targetType, setTargetType] = useState('MEMBER_CLUB');
    const [recipientClubId, setRecipientClubId] = useState('');
    const [recipientUserId, setRecipientUserId] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [category, setCategory] = useState('MEMBERSHIP_FEE');
    const [taxRate, setTaxRate] = useState(0);
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(addDays(new Date(), 30).toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('Payment due within 30 days of issue date.');
    const [syncToBexioNow, setSyncToBexioNow] = useState(true);
    const [lineItems, setLineItems] = useState<any[]>([
        { description: 'Annual Federation Membership Fee 2026', quantity: 1, unit: 'year', unitPrice: 500, taxRate: 0 },
    ]);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');

    // Bexio Config Form State
    const [bexioToken, setBexioToken] = useState('');
    const [bexioCompanyName, setBexioCompanyName] = useState('');
    const [bexioCompanyAddress, setBexioCompanyAddress] = useState('');
    const [bexioQrIban, setBexioQrIban] = useState('CH4431999123000889012');
    const [bexioAutoSync, setBexioAutoSync] = useState(true);
    const [testingBexio, setTestingBexio] = useState(false);
    const [bexioTestStatus, setBexioTestStatus] = useState<any>(null);
    const [savingBexio, setSavingBexio] = useState(false);

    // Auth check
    const isAuthorized = useMemo(() => {
        if (!user) return false;
        if (user.isSuperAdmin) return true;
        if (associationId) {
            return user.associationRoles?.some(
                (r: any) =>
                    r.associationId === associationId && ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
            );
        }
        return (user.associationRoles?.length ?? 0) > 0;
    }, [user, associationId]);

    // Load Data
    const loadDashboard = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
            if (associationId) params.associationId = associationId;

            const [invRes, statsRes, bexioRes, assocRes, clubsRes, usersRes] = await Promise.all([
                api.getInvoices(params),
                api.getInvoiceStats(params),
                api.getBexioConfig(params),
                api.getAssociations(),
                api.getClubs(),
                api.getUsers(),
            ]);

            setInvoices(invRes || []);
            setStats(statsRes || null);
            setBexioConfig(bexioRes || null);
            setAssociations(assocRes.associations || []);
            setClubs(clubsRes || []);
            setUsersList(usersRes || []);

            if (bexioRes) {
                setBexioToken(bexioRes.apiToken || '');
                setBexioCompanyName(bexioRes.companyName || '');
                setBexioCompanyAddress(bexioRes.companyAddress || '');
                setBexioQrIban(bexioRes.qrIban || 'CH4431999123000889012');
                setBexioAutoSync(bexioRes.autoSync ?? true);
            }

            if (associationId) {
                const cur = assocRes.associations?.find((a: any) => a.id === associationId);
                setCurrentAssoc(cur || null);
            } else {
                const top = assocRes.associations?.find((a: any) => a.isTopLevel) || assocRes.associations?.[0];
                setCurrentAssoc(top || null);
            }
        } catch (err) {
            console.error('Failed to load billing dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            loadDashboard();
        }
    }, [associationId, isAuthorized]);

    // Handle club/user recipient selection
    useEffect(() => {
        if (targetType === 'MEMBER_CLUB' && clubs.length > 0) {
            const club = clubs.find((c) => c.id === recipientClubId) || clubs[0];
            if (club) {
                setRecipientClubId(club.id);
                setRecipientName(club.name);
                setRecipientEmail(club.email);
                setRecipientAddress(`${club.address}, ${club.postalCode} ${club.city}`);
            }
        } else if (targetType === 'CLUB_MEMBER' && usersList.length > 0) {
            const u = usersList.find((usr) => usr.id === recipientUserId) || usersList[0];
            if (u) {
                setRecipientUserId(u.id);
                setRecipientName(`${u.firstName} ${u.lastName}`);
                setRecipientEmail(u.email);
                setRecipientAddress(`${u.street || ''}, ${u.postalCode || ''} ${u.city || ''}`.trim());
            }
        } else if (targetType === 'SUB_ASSOCIATION' && associations.length > 0) {
            const sub = associations.find((a) => !a.isTopLevel) || associations[0];
            if (sub) {
                setRecipientName(sub.name);
                setRecipientEmail('finance@areena.ch');
                setRecipientAddress('Regional Secretariat');
            }
        }
    }, [targetType, recipientClubId, recipientUserId, clubs, usersList, associations]);

    // Calculations for create invoice
    const calculatedSubtotal = useMemo(() => {
        return lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
    }, [lineItems]);

    const calculatedTax = useMemo(() => {
        return Math.round(((calculatedSubtotal * (Number(taxRate) || 0)) / 100) * 100) / 100;
    }, [calculatedSubtotal, taxRate]);

    const calculatedTotal = useMemo(() => {
        return Math.round((calculatedSubtotal + calculatedTax) * 100) / 100;
    }, [calculatedSubtotal, calculatedTax]);

    // Apply Quick Template
    const applyTemplate = (type: 'CLUB_ANNUAL' | 'LICENSE_BUNDLE' | 'TOURNAMENT_ENTRY') => {
        if (type === 'CLUB_ANNUAL') {
            setCategory('MEMBERSHIP_FEE');
            setLineItems([
                { description: 'Annual Federation Club Affiliation Fee 2026', quantity: 1, unit: 'year', unitPrice: 500, taxRate: 0 },
                { description: 'Official Association League Registration Fee', quantity: 1, unit: 'package', unitPrice: 150, taxRate: 0 },
            ]);
        } else if (type === 'LICENSE_BUNDLE') {
            setCategory('LICENSE_FEE');
            setLineItems([
                { description: 'Federation Player Regular License (Adult)', quantity: 5, unit: 'licenses', unitPrice: 45, taxRate: 0 },
                { description: 'Federation Junior License Pass', quantity: 5, unit: 'licenses', unitPrice: 25, taxRate: 0 },
            ]);
        } else if (type === 'TOURNAMENT_ENTRY') {
            setCategory('COMPETITION_ENTRY');
            setLineItems([
                { description: 'National Championship - Single Event Open', quantity: 4, unit: 'entries', unitPrice: 30, taxRate: 0 },
                { description: 'National Championship - Team Category B', quantity: 1, unit: 'team', unitPrice: 80, taxRate: 0 },
            ]);
        }
    };

    // Add / remove line items
    const addLineItem = () => {
        setLineItems([
            ...lineItems,
            { description: 'New Position', quantity: 1, unit: 'pc', unitPrice: 50, taxRate: 0 },
        ]);
    };

    const updateLineItem = (index: number, field: string, val: any) => {
        const copy = [...lineItems];
        copy[index] = { ...copy[index], [field]: val };
        setLineItems(copy);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length <= 1) return;
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    // Create Invoice Submit
    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setCreating(true);

        try {
            const payload = {
                associationId: currentAssoc?.id || associationId,
                targetType,
                recipientClubId: targetType === 'MEMBER_CLUB' ? recipientClubId : null,
                recipientUserId: targetType === 'CLUB_MEMBER' ? recipientUserId : null,
                recipientName,
                recipientEmail: recipientEmail || null,
                recipientAddress: recipientAddress || null,
                category,
                currency: 'CHF',
                taxRate: Number(taxRate) || 0,
                issueDate,
                dueDate,
                notes,
                terms,
                lineItems,
                syncToBexio: syncToBexioNow,
            };

            await api.createInvoice(payload);
            setShowCreateModal(false);
            loadDashboard();
        } catch (err: any) {
            setFormError(err.message || 'Failed to create invoice');
        } finally {
            setCreating(false);
        }
    };

    // Actions on invoice
    const handleSendInvoice = async (id: string) => {
        try {
            await api.sendInvoice(id);
            loadDashboard();
        } catch (err: any) {
            alert(err.message || 'Failed to issue invoice');
        }
    };

    const handleMarkPaid = async (id: string) => {
        try {
            await api.markInvoicePaid(id);
            loadDashboard();
        } catch (err: any) {
            alert(err.message || 'Failed to mark as paid');
        }
    };

    const handleSyncBexio = async (id: string) => {
        try {
            await api.syncInvoiceBexio(id);
            loadDashboard();
        } catch (err: any) {
            alert(err.message || 'Failed to sync with Bexio');
        }
    };

    const handleDeleteInvoice = async (id: string) => {
        if (!confirm('Are you sure you want to delete or cancel this invoice?')) return;
        try {
            await api.deleteInvoice(id);
            loadDashboard();
        } catch (err: any) {
            alert(err.message || 'Failed to delete invoice');
        }
    };

    const handleViewQr = async (invoice: any) => {
        setSelectedInvoice(invoice);
        try {
            const qr = await api.getInvoiceQrBill(invoice.id);
            setQrPayload(qr);
        } catch (err) {
            console.error('Failed to load QR bill:', err);
        }
    };

    // Bexio Test Connection
    const handleTestBexio = async () => {
        setTestingBexio(true);
        setBexioTestStatus(null);
        try {
            const payload = {
                associationId: currentAssoc?.id || associationId,
                apiToken: bexioToken,
                companyName: bexioCompanyName,
                companyAddress: bexioCompanyAddress,
                qrIban: bexioQrIban,
                autoSync: bexioAutoSync,
            };
            const res = await api.updateBexioConfig(payload);
            setBexioTestStatus(res.testResult);
            setBexioConfig(res.config);
        } catch (err: any) {
            setBexioTestStatus({ connected: false, error: err.message });
        } finally {
            setTestingBexio(false);
        }
    };

    // Save Bexio Config
    const handleSaveBexio = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingBexio(true);
        try {
            const payload = {
                associationId: currentAssoc?.id || associationId,
                apiToken: bexioToken,
                companyName: bexioCompanyName,
                companyAddress: bexioCompanyAddress,
                qrIban: bexioQrIban,
                autoSync: bexioAutoSync,
            };
            const res = await api.updateBexioConfig(payload);
            setBexioConfig(res.config);
            setShowBexioModal(false);
            loadDashboard();
        } catch (err: any) {
            alert(err.message || 'Failed to save Bexio configuration');
        } finally {
            setSavingBexio(false);
        }
    };

    // Filter Invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
            if (categoryFilter !== 'ALL' && inv.category !== categoryFilter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                const num = inv.invoiceNumber.toLowerCase();
                const rec = inv.recipientName.toLowerCase();
                const mail = (inv.recipientEmail || '').toLowerCase();
                return num.includes(q) || rec.includes(q) || mail.includes(q);
            }
            return true;
        });
    }, [invoices, statusFilter, categoryFilter, search]);

    if (!isAuthorized) {
        return (
            <AccessDenied
                title="Finances & Billing Restricted"
                description="Only authorized federation administrators can access the financial billing ledger, issue invoices, and configure Bexio accounting integration."
                requiredRole="Federation / Association Administrator"
                returnHref={isSubAssociation ? `/association/${associationId}` : '/'}
            />
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Receipt className="h-6 w-6 text-red-500" />
                        <span>{t('billing.title')}</span>
                        {currentAssoc && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
                                {currentAssoc.shortName || currentAssoc.name}
                            </span>
                        )}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('billing.subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setShowBexioModal(true)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold border transition shadow-xs ${
                            bexioConfig?.isConnected
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Sliders className="h-4 w-4 text-emerald-500" />
                        <span>Bexio</span>
                        <span
                            className={`h-2 w-2 rounded-full ${
                                bexioConfig?.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                        />
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-md transition"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('billing.createBill')}</span>
                    </button>
                </div>
            </div>

            {/* Financial KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {/* Total Billed */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                        <span>{t('billing.totalInvoiced')}</span>
                        <DollarSign className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        CHF {(stats?.totalBilled || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {stats?.totalCount || 0} {t('billing.allInvoices').toLowerCase()}
                    </div>
                </div>

                {/* Collected */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-950 dark:bg-emerald-950/20 p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                        <span>{t('billing.collected')}</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                        CHF {(stats?.totalCollected || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-emerald-600/80 dark:text-emerald-500 font-medium">
                        {stats?.totalBilled
                            ? Math.round(((stats.totalCollected || 0) / stats.totalBilled) * 100)
                            : 0}
                        % settled
                    </div>
                </div>

                {/* Outstanding */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-950 dark:bg-amber-950/20 p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold">
                        <span>{t('billing.outstanding')}</span>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400">
                        CHF {(stats?.totalOutstanding || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-amber-600/80 dark:text-amber-500 font-medium">
                        Pending payment
                    </div>
                </div>

                {/* Overdue */}
                <div
                    className={`rounded-2xl border p-4 space-y-2 shadow-xs ${
                        (stats?.totalOverdue || 0) > 0
                            ? 'border-red-300 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80'
                    }`}
                >
                    <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-xs font-semibold">
                        <span>{t('billing.overdue')}</span>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400">
                        CHF {(stats?.totalOverdue || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-red-500 dark:text-red-400 font-medium">
                        {stats?.overdueCount || 0} overdue bills
                    </div>
                </div>

                {/* Bexio Synced */}
                <div className="col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                        <span>{t('billing.bexioSynced')}</span>
                        <Layers className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {stats?.bexioSyncedCount || 0} / {stats?.totalCount || 0}
                    </div>
                    <div className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium">
                        {bexioConfig?.isConnected ? '✓ Bexio Connected' : 'Mock / Unlinked'}
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-3 sm:p-4 shadow-xs">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('billing.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                    />
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-2">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                    >
                        <option value="ALL">{t('billing.catAll')}</option>
                        <option value="MEMBERSHIP_FEE">{t('billing.catMembership')}</option>
                        <option value="LICENSE_FEE">{t('billing.catLicense')}</option>
                        <option value="COMPETITION_ENTRY">{t('billing.catCompetition')}</option>
                        <option value="COURSE_FEE">{t('billing.catCourse')}</option>
                        <option value="EQUIPMENT">{t('billing.catEquipment')}</option>
                        <option value="PENALTY">{t('billing.catPenalty')}</option>
                        <option value="OTHER">{t('billing.catOther')}</option>
                    </select>

                    <button
                        onClick={loadDashboard}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                        title="Reload Ledger"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                    { key: 'ALL', label: t('billing.statusAll') },
                    { key: 'DRAFT', label: t('billing.statusDraft') },
                    { key: 'SENT', label: t('billing.statusSent') },
                    { key: 'PAID', label: t('billing.statusPaid') },
                    { key: 'OVERDUE', label: t('billing.statusOverdue') },
                    { key: 'CANCELLED', label: t('billing.statusCancelled') },
                ].map((st) => (
                    <button
                        key={st.key}
                        onClick={() => setStatusFilter(st.key)}
                        className={`rounded-xl px-3.5 py-1.5 font-bold transition flex-shrink-0 ${
                            statusFilter === st.key
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {st.label}
                    </button>
                ))}
            </div>

            {/* Invoices Table */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                        <Receipt className="mx-auto h-10 w-10 text-slate-400" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No Invoices Found</h3>
                        <p className="text-xs max-w-sm mx-auto">
                            No billing records matched your search or filters. Click below to issue a new bill.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                            <Plus className="h-4 w-4" />
                            <span>{t('billing.createBill')}</span>
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-4">{t('billing.billNumber')}</th>
                                    <th className="py-3.5 px-4">{t('billing.recipient')}</th>
                                    <th className="py-3.5 px-4">{t('billing.category')}</th>
                                    <th className="py-3.5 px-4">{t('billing.dueDate')}</th>
                                    <th className="py-3.5 px-4 text-right">{t('billing.amount')}</th>
                                    <th className="py-3.5 px-4 text-center">{t('billing.bexioStatus')}</th>
                                    <th className="py-3.5 px-4 text-center">{t('billing.status')}</th>
                                    <th className="py-3.5 px-4 text-right">{t('billing.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filteredInvoices.map((inv) => {
                                    const isOverdue =
                                        new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' && inv.status !== 'CANCELLED';

                                    return (
                                        <tr
                                            key={inv.id}
                                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                                        >
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                {inv.invoiceNumber}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold flex-shrink-0">
                                                        {inv.targetType === 'MEMBER_CLUB' ? (
                                                            <Building2 className="h-3.5 w-3.5 text-blue-500" />
                                                        ) : (
                                                            <UserIcon className="h-3.5 w-3.5 text-emerald-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                                                            {inv.recipientName}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                                            {inv.recipientEmail || 'No email provided'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                    {inv.category.replace('_', ' ')}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div
                                                    className={`font-semibold ${
                                                        isOverdue
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-slate-600 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {format(new Date(inv.dueDate), 'MMM dd, yyyy')}
                                                </div>
                                                {isOverdue && (
                                                    <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                                                        Overdue
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                CHF {inv.totalAmount.toFixed(2)}
                                            </td>

                                            {/* Bexio Sync Status */}
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {inv.bexioSyncStatus === 'SYNCED' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[10px] font-bold">
                                                        <Check className="h-3 w-3" />
                                                        <span>Bexio #{inv.bexioId}</span>
                                                    </span>
                                                ) : inv.bexioSyncStatus === 'FAILED' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800 px-2 py-0.5 text-[10px] font-bold">
                                                        <X className="h-3 w-3" />
                                                        <span>Sync Failed</span>
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 text-[10px] font-mono">
                                                        Not Synced
                                                    </span>
                                                )}
                                            </td>

                                            {/* Invoice Status */}
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                <span
                                                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
                                                        inv.status === 'PAID'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                                            : inv.status === 'SENT'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                                            : inv.status === 'OVERDUE'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800'
                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {inv.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleViewQr(inv)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                        title={t('billing.viewQr')}
                                                    >
                                                        <QrCode className="h-4 w-4" />
                                                    </button>

                                                    {inv.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => handleSendInvoice(inv.id)}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                                                            title={t('billing.sendBill')}
                                                        >
                                                            <Send className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                                                        <button
                                                            onClick={() => handleMarkPaid(inv.id)}
                                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                                                            title={t('billing.markPaid')}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {inv.bexioSyncStatus !== 'SYNCED' && (
                                                        <button
                                                            onClick={() => handleSyncBexio(inv.id)}
                                                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                                                            title={t('billing.syncBexio')}
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {inv.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => handleDeleteInvoice(inv.id)}
                                                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition"
                                                            title={t('billing.deleteBill')}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE INVOICE MODAL */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title={t('billing.modalTitle')}
                subtitle={t('billing.modalSubtitle')}
                icon={<Receipt className="h-5 w-5 text-red-500" />}
                size="2xl"
            >
                <div className="space-y-6 text-xs">

                            {/* Quick Templates */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    {t('billing.templates')}
                                </label>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => applyTemplate('CLUB_ANNUAL')}
                                        className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:border-red-500 transition"
                                    >
                                        🏢 {t('billing.templateClubAnnual')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyTemplate('LICENSE_BUNDLE')}
                                        className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:border-red-500 transition"
                                    >
                                        🎫 {t('billing.templateLicenseBundle')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyTemplate('TOURNAMENT_ENTRY')}
                                        className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:border-red-500 transition"
                                    >
                                        🏆 {t('billing.templateTournamentEntry')}
                                    </button>
                                </div>
                            </div>

                        <form onSubmit={handleCreateInvoice} className="space-y-5 text-xs">
                            {/* Recipient Selector */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300">
                                        {t('billing.recipientType')}
                                    </label>
                                    <select
                                        value={targetType}
                                        onChange={(e) => setTargetType(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="MEMBER_CLUB">{t('billing.targetClub')}</option>
                                        <option value="CLUB_MEMBER">{t('billing.targetMember')}</option>
                                        <option value="SUB_ASSOCIATION">{t('billing.targetSubAssoc')}</option>
                                        <option value="OTHER">{t('billing.targetOther')}</option>
                                    </select>
                                </div>

                                {targetType === 'MEMBER_CLUB' && (
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300">
                                            {t('billing.selectClub')}
                                        </label>
                                        <select
                                            value={recipientClubId}
                                            onChange={(e) => setRecipientClubId(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                        >
                                            {clubs.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} ({c.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {targetType === 'CLUB_MEMBER' && (
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300">
                                            {t('billing.selectUser')}
                                        </label>
                                        <select
                                            value={recipientUserId}
                                            onChange={(e) => setRecipientUserId(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                        >
                                            {usersList.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.firstName} {u.lastName} ({u.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Recipient Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300">
                                        {t('billing.customRecipientName')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300">
                                        {t('billing.recipientEmail')}
                                    </label>
                                    <input
                                        type="email"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Dates & Category */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300">
                                        {t('billing.category')}
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="MEMBERSHIP_FEE">{t('billing.catMembership')}</option>
                                        <option value="LICENSE_FEE">{t('billing.catLicense')}</option>
                                        <option value="COMPETITION_ENTRY">{t('billing.catCompetition')}</option>
                                        <option value="COURSE_FEE">{t('billing.catCourse')}</option>
                                        <option value="EQUIPMENT">{t('billing.catEquipment')}</option>
                                        <option value="PENALTY">{t('billing.catPenalty')}</option>
                                        <option value="OTHER">{t('billing.catOther')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300">
                                        {t('billing.issueDate')}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300">
                                        {t('billing.dueDate')}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Line Items Editor */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="font-bold text-slate-900 dark:text-white">
                                        {t('billing.lineItemsTitle')}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addLineItem}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>{t('billing.addItem')}</span>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {lineItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex flex-col sm:flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-2.5"
                                        >
                                            <input
                                                type="text"
                                                required
                                                placeholder={t('billing.itemDescription')}
                                                value={item.description}
                                                onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                                                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                            />
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
                                                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                />
                                                <input
                                                    type="number"
                                                    step="0.05"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateLineItem(idx, 'unitPrice', Number(e.target.value))}
                                                    className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                                                />
                                                <span className="font-mono font-bold text-slate-900 dark:text-white w-20 text-right">
                                                    CHF {((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeLineItem(idx)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-4 space-y-1.5 text-xs text-right">
                                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                    <span>{t('billing.subtotal')}:</span>
                                    <span className="font-mono font-bold">CHF {calculatedSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                    <span>{t('billing.vat')} ({taxRate}%):</span>
                                    <span className="font-mono font-bold">CHF {calculatedTax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <span>{t('billing.total')}:</span>
                                    <span className="font-mono text-red-600 dark:text-red-400">
                                        CHF {calculatedTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Bexio Auto-Sync checkbox */}
                            <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 dark:border-indigo-950 dark:bg-indigo-950/30 p-3 text-xs">
                                <input
                                    type="checkbox"
                                    id="syncBexioCheck"
                                    checked={syncToBexioNow}
                                    onChange={(e) => setSyncToBexioNow(e.target.checked)}
                                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                                />
                                <label htmlFor="syncBexioCheck" className="font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer">
                                    {t('billing.syncToBexioNow')}
                                </label>
                            </div>

                            {formError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/60 p-3 text-xs text-red-700 dark:text-red-300">
                                    {formError}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-300"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="rounded-xl bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50 shadow transition flex items-center gap-1.5"
                                >
                                    <Receipt className="h-4 w-4" />
                                    <span>{creating ? t('common.saving') : t('billing.createAndIssue')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
            </Modal>

            {/* BEXIO CONFIG MODAL */}
            <Modal
                isOpen={showBexioModal}
                onClose={() => setShowBexioModal(false)}
                title={t('bexio.title')}
                subtitle={t('bexio.subtitle')}
                icon={<Sliders className="h-5 w-5 text-emerald-500" />}
                size="lg"
            >
                <div className="space-y-5 text-xs">

                        {/* Status Alert */}
                        {bexioConfig?.isConnected ? (
                            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/60 p-3.5 text-xs text-emerald-800 dark:text-emerald-200">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                <div>
                                    <div className="font-bold">{t('bexio.connected')}</div>
                                    <div className="text-[11px] opacity-80">
                                        {bexioConfig.companyName || currentAssoc?.name || 'Sports Federation'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/60 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                <div>
                                    <div className="font-bold">{t('bexio.notConnected')}</div>
                                    <div className="text-[11px] opacity-80">
                                        Enter token or &quot;demo&quot; to enable full Bexio simulation &amp; Swiss QR bill generation.
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSaveBexio} className="space-y-4 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 dark:text-slate-300">
                                    {t('bexio.apiToken')}
                                </label>
                                <div className="mt-1 flex gap-2">
                                    <input
                                        type="password"
                                        placeholder={t('bexio.apiTokenPlaceholder')}
                                        value={bexioToken}
                                        onChange={(e) => setBexioToken(e.target.value)}
                                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleTestBexio}
                                        disabled={testingBexio}
                                        className="rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 px-3.5 py-2 font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition disabled:opacity-50"
                                    >
                                        {testingBexio ? t('bexio.testing') : t('bexio.testConnection')}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 dark:text-slate-300">
                                    {t('bexio.qrIban')}
                                </label>
                                <input
                                    type="text"
                                    value={bexioQrIban}
                                    onChange={(e) => setBexioQrIban(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 dark:text-slate-300">
                                    {t('bexio.companyAddress')}
                                </label>
                                <input
                                    type="text"
                                    value={bexioCompanyAddress}
                                    onChange={(e) => setBexioCompanyAddress(e.target.value)}
                                    placeholder="Haus des Sports, Talgut-Zentrum 27, 3063 Ittigen"
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-2.5 pt-1">
                                <input
                                    type="checkbox"
                                    id="bexioAutoSyncCheck"
                                    checked={bexioAutoSync}
                                    onChange={(e) => setBexioAutoSync(e.target.checked)}
                                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <label htmlFor="bexioAutoSyncCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    {t('bexio.autoSync')}
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowBexioModal(false)}
                                    className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-300"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingBexio}
                                    className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow transition"
                                >
                                    {savingBexio ? t('bexio.saving') : t('bexio.saveSettings')}
                                </button>
                            </div>
                        </form>
                    </div>
            </Modal>

            {/* SWISS QR-BILL & INVOICE VIEWER MODAL */}
            <Modal
                isOpen={Boolean(selectedInvoice)}
                onClose={() => setSelectedInvoice(null)}
                title={selectedInvoice?.invoiceNumber || ''}
                subtitle={selectedInvoice ? `${selectedInvoice.recipientName} • Issued ${format(new Date(selectedInvoice.issueDate), 'PPP')}` : undefined}
                icon={<FileText className="h-5 w-5 text-red-500" />}
                size="2xl"
            >
                {selectedInvoice && (
                    <div className="space-y-6 text-xs">

                        {/* Invoice Summary Box */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-4 sm:p-5 space-y-3 text-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">Creditor</div>
                                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                                        {currentAssoc?.name || 'Sports Federation'}
                                    </div>
                                    <div className="text-slate-500 text-[11px]">Federation Administration, Central Sports Office</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">Debtor</div>
                                    <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedInvoice.recipientName}</div>
                                    <div className="text-slate-500 text-[11px]">{selectedInvoice.recipientAddress || 'Switzerland'}</div>
                                </div>
                            </div>

                            {/* Positions */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                                {selectedInvoice.lineItems?.map((li: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                        <span>
                                            {li.quantity}x {li.description}
                                        </span>
                                        <span className="font-mono font-bold">CHF {li.totalPrice.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-black text-slate-900 dark:text-white">
                                <span>{t('billing.total')}</span>
                                <span className="font-mono text-red-600 dark:text-red-400">
                                    CHF {selectedInvoice.totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Swiss QR Payment Slip Preview */}
                        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 space-y-4">
                            <div className="flex items-center justify-between text-xs font-black text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <QrCode className="h-4 w-4 text-red-600" />
                                    <span>{t('billing.qrTitle')}</span>
                                </div>
                                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                    QR-IBAN: {qrPayload?.creditor?.iban || 'CH44 3199 9123 0008 8901 2'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                {/* Swiss QR Graphic Mock */}
                                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                    <div className="h-28 w-28 bg-black rounded-lg flex items-center justify-center text-white relative shadow-inner">
                                        <div className="h-6 w-6 bg-red-600 rounded flex items-center justify-center font-bold text-xs">
                                            +
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-2 font-mono">Swiss QR-Code</span>
                                </div>

                                {/* Payment Details */}
                                <div className="sm:col-span-2 space-y-2 text-[11px]">
                                    <div>
                                        <div className="font-bold text-slate-400 uppercase text-[9px]">{t('billing.qrCreditor')}</div>
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            {qrPayload?.creditor?.name || currentAssoc?.name || 'Sports Federation'}
                                        </div>
                                        <div className="text-slate-500 font-mono">
                                            {qrPayload?.creditor?.iban || 'CH44 3199 9123 0008 8901 2'}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="font-bold text-slate-400 uppercase text-[9px]">{t('billing.qrReference')}</div>
                                        <div className="font-mono text-slate-900 dark:text-white font-bold">
                                            {qrPayload?.payment?.reference || '2100 0000 0000 0000 0000 0000 001'}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="font-bold text-slate-400 uppercase text-[9px]">{t('billing.qrDebtor')}</div>
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            {selectedInvoice.recipientName}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-500">{t('billing.qrAmount')}</span>
                                        <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                                            CHF {selectedInvoice.totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Viewer Actions */}
                        <div className="flex justify-between items-center pt-2">
                            {selectedInvoice.status !== 'PAID' && (
                                <button
                                    onClick={() => {
                                        handleMarkPaid(selectedInvoice.id);
                                        setSelectedInvoice(null);
                                    }}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>{t('billing.markPaid')}</span>
                                </button>
                            )}

                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    onClick={() => window.print()}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5"
                                >
                                    <Printer className="h-4 w-4" />
                                    <span>{t('billing.printQr')}</span>
                                </button>
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300"
                                >
                                    {t('billing.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

