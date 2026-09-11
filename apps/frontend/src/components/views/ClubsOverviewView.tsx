'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';
import {
    Shield,
    Search,
    Plus,
    Building2,
    MapPin,
    Mail,
    Phone,
    ChevronRight,
    Users,
    Trophy,
    ExternalLink,
    Lock,
    ArrowRight,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatPhoneNumber } from '@areena/shared';

interface ClubsOverviewViewProps {
    scopedAssociationId?: string;
}

function ClubsOverviewContent({ scopedAssociationId }: ClubsOverviewViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { user } = useAuth();
    const { t } = useI18n();

    const [clubs, setClubs] = useState<any[]>([]);
    const [associations, setAssociations] = useState<any[]>([]);
    const [scopedAssoc, setScopedAssoc] = useState<any | null>(null);
    const [selectedAssoc, setSelectedAssoc] = useState<string>(scopedAssociationId || '');
    const [loading, setLoading] = useState(true);

    // URL-driven modal state: determined by ?modal=create-club or ?action=new
    const isCreateModalOpen =
        searchParams?.get('modal') === 'create-club' || searchParams?.get('action') === 'new';

    const openCreateModal = () => {
        if (scopedAssociationId) setFormAssocIds([scopedAssociationId]);
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('modal', 'create-club');
        router.push(`${pathname}?${params.toString()}`);
    };

    const closeCreateModal = () => {
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.delete('modal');
        params.delete('action');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
    };

    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formPostalCode, setFormPostalCode] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formAssocIds, setFormAssocIds] = useState<string[]>(
        scopedAssociationId ? [scopedAssociationId] : [],
    );
    const [creating, setCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const isAssocAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) =>
            ['ADMIN', 'PRESIDENT', 'SECRETARY'].includes(r.role),
        );

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clubsData, assocData] = await Promise.all([
                api.getClubs(),
                api.getAssociations().catch(() => ({ associations: [] })),
            ]);
            setClubs(clubsData || []);
            const list = assocData?.associations || [];
            setAssociations(list);
            if (scopedAssociationId) {
                const found = list.find((a: any) =>
                    a.id === scopedAssociationId ||
                    a.slug?.toLowerCase() === scopedAssociationId.toLowerCase() ||
                    a.code?.toUpperCase() === scopedAssociationId.toUpperCase()
                );
                if (found) {
                    setScopedAssoc(found);
                    setSelectedAssoc(found.id);
                }
            }
        } catch (err) {
            console.error('Failed to load clubs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [scopedAssociationId]);

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setErrorMsg('');
        try {
            await api.createClub({
                name: formName,
                code: formCode.toUpperCase(),
                slug: formSlug ? formSlug.trim().toLowerCase() : undefined,
                address: formAddress,
                postalCode: formPostalCode,
                city: formCity,
                email: formEmail,
                phone: formPhone ? formatPhoneNumber(formPhone) : formPhone,
                associationIds: scopedAssociationId ? [scopedAssociationId] : formAssocIds,
            });
            closeCreateModal();
            setFormName('');
            setFormCode('');
            setFormSlug('');
            setFormCity('');
            setFormPostalCode('');
            setFormAddress('');
            setFormEmail('');
            setFormPhone('');
            if (!scopedAssociationId) setFormAssocIds([]);
            fetchData();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create club');
        } finally {
            setCreating(false);
        }
    };

    const effectiveAssocId = scopedAssoc?.id || selectedAssoc || scopedAssociationId;

    // Filter clubs by association scope if selected
    const filteredClubs = useMemo(() => {
        if (!effectiveAssocId && !scopedAssoc) return clubs;
        const targetId = scopedAssoc?.id || effectiveAssocId;
        const targetCode = scopedAssoc?.code || (scopedAssociationId ? scopedAssociationId.toUpperCase() : undefined);
        const targetSlug = scopedAssoc?.slug || (scopedAssociationId ? scopedAssociationId.toLowerCase() : undefined);

        return clubs.filter((c) =>
            c.associations?.some(
                (ca: any) =>
                    ca.associationId === targetId ||
                    ca.association?.id === targetId ||
                    (targetCode && (ca.association?.code?.toUpperCase() === targetCode || ca.associationCode === targetCode)) ||
                    (targetSlug && (ca.association?.slug?.toLowerCase() === targetSlug || ca.associationSlug === targetSlug))
            )
        );
    }, [clubs, effectiveAssocId, scopedAssoc, scopedAssociationId]);

    // Table Column Definitions
    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                id: 'club',
                accessorFn: (c) => `${c.name || ''} ${c.code || ''} ${c.city || ''} ${c.email || ''}`,
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Club / Organization" />
                ),
                cell: ({ row }) => {
                    const c = row.original;
                    const clubHref = `/club/${c.slug || c.id}`;
                    return (
                        <div className="flex items-center gap-3 py-1">
                            <Link href={clubHref} className="group shrink-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-600 dark:text-blue-400 font-black text-xs border border-blue-500/20 group-hover:scale-105 group-hover:border-blue-500/50 transition shadow-2xs">
                                    {c.code || 'CLB'}
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    <Link
                                        href={clubHref}
                                        className="hover:text-blue-600 dark:hover:text-blue-400 transition hover:underline"
                                    >
                                        {c.name}
                                    </Link>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-2">
                                    {c.email ? (
                                        <span className="font-mono text-[10px]">{c.email}</span>
                                    ) : (
                                        <span>{c.address || 'Affiliated Club'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'code',
                accessorKey: 'code',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
                cell: ({ row }) => (
                    <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 uppercase">
                        {row.original.code}
                    </span>
                ),
            },
            {
                id: 'city',
                accessorKey: 'city',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="City & Region" />
                ),
                cell: ({ row }) => {
                    const c = row.original;
                    const locationText = c.postalCode ? `${c.postalCode} ${c.city}` : c.city || 'Switzerland';
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{locationText}</span>
                        </div>
                    );
                },
            },
            {
                id: 'associations',
                header: 'Federation / Association',
                cell: ({ row }) => {
                    const assocs = row.original.associations || [];
                    if (assocs.length === 0) {
                        return <span className="text-xs text-slate-400 italic">Independent</span>;
                    }
                    return (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            {assocs.map((ca: any, idx: number) => {
                                const assoc = ca.association;
                                const label = assoc?.code || assoc?.shortName || assoc?.name || 'Federation';
                                return (
                                    <span
                                        key={ca.id || idx}
                                        className="rounded-md bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                                        title={assoc?.name}
                                    >
                                        {label}
                                    </span>
                                );
                            })}
                        </div>
                    );
                },
            },
            {
                id: 'members',
                accessorFn: (c) => c._count?.licenses || 0,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Members" />,
                cell: ({ row }) => (
                    <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/40 font-mono">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        <span>{row.original._count?.licenses || 0}</span>
                    </div>
                ),
            },
            {
                id: 'teams',
                accessorFn: (c) => c._count?.teams || 0,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Teams" />,
                cell: ({ row }) => (
                    <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 font-mono">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>{row.original._count?.teams || 0}</span>
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const clubHref = `/club/${row.original.slug || row.original.id}`;
                    return (
                        <div className="flex items-center justify-end">
                            <Link
                                href={clubHref}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition group"
                            >
                                <span>Portal</span>
                                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    );
                },
            },
        ],
        [],
    );

    return (
        <div className="space-y-6 pb-16">
            {/* Header Hero Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {scopedAssociationId ? (
                                <>
                                    <Lock className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Regional Sub-Association Directory</span>
                                </>
                            ) : (
                                <>
                                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Affiliated Sports Clubs</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {scopedAssoc ? `${scopedAssoc.name} • Clubs Directory` : t('nav.clubOverview') || 'Clubs Directory'}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            {scopedAssoc
                                ? `Official registered clubs and sports organizations under ${scopedAssoc.name} [${scopedAssoc.code}].`
                                : 'Explore member sports clubs, official headquarters, player rosters, league teams, and regional federation alignments.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {scopedAssociationId && (
                            <Link
                                href="/clubs"
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                            >
                                <span>All Clubs</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        )}
                        {isAssocAdmin && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Register New Club</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Interactive Data Table */}
            <DataTable
                columns={columns}
                data={filteredClubs}
                loading={loading}
                searchPlaceholder="Filter clubs by name, code, city, email..."
                emptyMessage="No clubs match the search criteria."
                defaultPageSize={25}
                pageSizeOptions={[10, 25, 50, 100]}
                initialSorting={[{ id: 'club', desc: false }]}
                searchSlot={
                    <div className="flex items-center gap-2">
                        {scopedAssociationId ? (
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                <Lock className="h-3.5 w-3.5 text-blue-500" />
                                <span className="truncate max-w-[180px]">
                                    {scopedAssoc ? scopedAssoc.name : 'Current Sub-Association'}
                                </span>
                            </div>
                        ) : (
                            <select
                                value={selectedAssoc}
                                onChange={(e) => setSelectedAssoc(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none shadow-xs"
                            >
                                <option value="">All Associations</option>
                                {associations.map((a: any) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} [{a.code}]
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                }
                onRowClick={(club) => {
                    router.push(`/club/${club.slug || club.id}`);
                }}
            />

            {/* Register Club Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title="Register New Sports Club"
                subtitle="Create an affiliated club profile, primary address, and assign parent federations"
                icon={<Shield className="h-5 w-5 text-blue-500" />}
                size="lg"
            >
                {errorMsg && (
                    <div className="rounded-xl p-3 mb-4 text-xs bg-red-50 text-red-700 border border-red-200">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleCreateClub} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Club Official Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. BC Zurich Nord"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Custom URL Slug (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. bc-zurich-nord"
                                value={formSlug}
                                onChange={(e) => setFormSlug(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Club Code *
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="BCZN"
                                value={formCode}
                                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none uppercase"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                City *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Zurich"
                                value={formCity}
                                onChange={(e) => setFormCity(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Postal Code *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="8050"
                                value={formPostalCode}
                                onChange={(e) => setFormPostalCode(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Street Address *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Sportstrasse 12"
                                value={formAddress}
                                onChange={(e) => setFormAddress(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Official Email *
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="info@bczn.ch"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Phone *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="+41 44 123 45 67"
                                value={formPhone}
                                onChange={(e) => setFormPhone(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {!scopedAssociationId && (
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Parent Associations *
                            </label>
                            <select
                                multiple
                                value={formAssocIds}
                                onChange={(e) => {
                                    const selected = Array.from(
                                        e.target.selectedOptions,
                                        (option) => option.value,
                                    );
                                    setFormAssocIds(selected);
                                }}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none h-24"
                            >
                                {associations.map((a: any) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} [{a.code}]
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={closeCreateModal}
                            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
                        >
                            {creating ? 'Creating Club...' : 'Register Club'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export function ClubsOverviewView(props: ClubsOverviewViewProps) {
    return (
        <Suspense fallback={null}>
            <ClubsOverviewContent {...props} />
        </Suspense>
    );
}
