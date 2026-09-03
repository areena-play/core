'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useI18n } from '@/lib/i18nContext';
import {
    MapPin,
    Building2,
    Shield,
    Trophy,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    ExternalLink,
    ChevronLeft,
    Loader2,
    Phone,
    Mail,
    Globe,
    Layers,
    Trash2,
    Wrench,
    Video,
    Sun,
    Award,
    X,
    Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

export default function LocationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useI18n();

    const idOrSlug = params.id as string;

    const [location, setLocation] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Active Tab: 'units' | 'schedule'
    const [activeTab, setActiveTab] = useState<'units' | 'schedule'>('units');

    // Modals
    const [reserveModalOpen, setReserveModalOpen] = useState(false);
    const [reserving, setReserving] = useState(false);
    const [reserveErr, setReserveErr] = useState('');
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [reserveType, setReserveType] = useState<'USER_RESERVATION' | 'COMPETITION_BLOCK' | 'CLUB_TRAINING' | 'MAINTENANCE'>('USER_RESERVATION');
    const [reserveTitle, setReserveTitle] = useState('');
    const [reserveDesc, setReserveDesc] = useState('');
    const [reserveDate, setReserveDate] = useState(new Date().toISOString().substring(0, 10));
    const [reserveStartTime, setReserveStartTime] = useState('09:00');
    const [reserveEndTime, setReserveEndTime] = useState('11:00');
    const [selectedCompetitionId, setSelectedCompetitionId] = useState('');
    const [competitions, setCompetitions] = useState<any[]>([]);

    // Unit Management Modal (Add Unit)
    const [addUnitModalOpen, setAddUnitModalOpen] = useState(false);
    const [addingUnit, setAddingUnit] = useState(false);
    const [unitName, setUnitName] = useState('');
    const [unitNumber, setUnitNumber] = useState<number | ''>('');
    const [unitFeatures, setUnitFeatures] = useState<string[]>([]);

    const isAdmin =
        user?.isSuperAdmin ||
        user?.associationRoles?.some((r: any) => ['ADMIN', 'PRESIDENT'].includes(r.role)) ||
        user?.clubRoles?.some((r: any) => ['ADMIN', 'PRESIDENT'].includes(r.role));

    const loadLocation = async () => {
        setLoading(true);
        setError('');
        try {
            const [locData, compsData] = await Promise.all([
                api.getLocation(idOrSlug),
                api.getCompetitions().catch(() => []),
            ]);
            setLocation(locData);
            setCompetitions(Array.isArray(compsData) ? compsData : (compsData?.competitions || []));
        } catch (err: any) {
            setError(err.message || 'Failed to load location details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (idOrSlug) {
            loadLocation();
        }
    }, [idOrSlug]);

    const handleCreateReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        setReserveErr('');
        setReserving(true);

        try {
            const startDateTime = new Date(`${reserveDate}T${reserveStartTime}:00`);
            const endDateTime = new Date(`${reserveDate}T${reserveEndTime}:00`);

            await api.createLocationReservation(location.id, {
                unitIds: selectedUnitIds,
                type: reserveType,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                title: reserveTitle,
                description: reserveDesc,
                competitionId: selectedCompetitionId || undefined,
            });

            setReserveModalOpen(false);
            setSelectedUnitIds([]);
            setReserveTitle('');
            setReserveDesc('');
            loadLocation();
        } catch (err: any) {
            setReserveErr(err.message || 'Failed to create reservation.');
        } finally {
            setReserving(false);
        }
    };

    const handleCancelReservation = async (resId: string) => {
        if (!confirm('Are you sure you want to cancel this reservation or competition block?')) return;
        try {
            await api.deleteLocationReservation(location.id, resId);
            loadLocation();
        } catch (err: any) {
            alert(err.message || 'Failed to cancel reservation.');
        }
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingUnit(true);
        try {
            await api.createLocationUnit(location.id, {
                name: unitName,
                unitNumber: unitNumber || undefined,
                features: unitFeatures,
                status: 'AVAILABLE',
            });
            setAddUnitModalOpen(false);
            setUnitName('');
            setUnitNumber('');
            setUnitFeatures([]);
            loadLocation();
        } catch (err: any) {
            alert(err.message || 'Failed to add playing unit.');
        } finally {
            setAddingUnit(false);
        }
    };

    const handleToggleUnitMaintenance = async (unit: any) => {
        const nextStatus = unit.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
        try {
            await api.updateLocationUnit(location.id, unit.id, { status: nextStatus });
            loadLocation();
        } catch (err: any) {
            alert(err.message || 'Failed to update unit status.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                <p className="text-xs text-slate-500">Loading sports arena & playing units...</p>
            </div>
        );
    }

    if (error || !location) {
        return (
            <div className="min-h-[60vh] max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-600">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Location Not Found</h2>
                <p className="text-xs text-slate-500">{error || 'This sports location does not exist.'}</p>
                <Link
                    href="/locations"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-bold"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back to Locations</span>
                </Link>
            </div>
        );
    }

    const primaryAssoc = location.associations?.[0]?.association;
    const unitWord = primaryAssoc?.rules?.unitNaming || 'Table';

    // Collect all reservations across units
    const allReservations = (location.units || []).flatMap((u: any) =>
        (u.reservations || []).map((r: any) => ({ ...r, unitName: u.name, unitNumber: u.unitNumber }))
    ).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
            {/* Top Navigation */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/locations" className="hover:text-amber-600 flex items-center gap-1 font-semibold">
                    <ChevronLeft className="h-4 w-4" />
                    <span>All Locations</span>
                </Link>
                <span>/</span>
                <span className="text-slate-900 dark:text-white font-bold">{location.name}</span>
            </div>

            {/* Location Banner Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full">
                                <MapPin className="w-3.5 h-3.5" />
                                {location.city}, {location.country}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full">
                                <Layers className="w-3.5 h-3.5" />
                                {location.units?.length || 0} {unitWord}s
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {location.name}
                        </h1>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                            {location.description || 'Official sports arena and playing facility.'}
                        </p>

                        {/* Contact details & Address */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2">
                            <div className="flex items-center gap-1.5 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                <span>{location.address}, {location.postalCode} {location.city}</span>
                            </div>
                            {location.phone && (
                                <div className="flex items-center gap-1.5 font-mono">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{location.phone}</span>
                                </div>
                            )}
                            {location.email && (
                                <div className="flex items-center gap-1.5 font-mono">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{location.email}</span>
                                </div>
                            )}
                            {location.website && (
                                <a
                                    href={location.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline"
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>Website</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {location.googleMapsUrl && (
                            <a
                                href={location.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Google Maps</span>
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setReserveModalOpen(true);
                                setSelectedUnitIds(location.units?.map((u: any) => u.id) || []);
                                setReserveType(isAdmin ? 'COMPETITION_BLOCK' : 'USER_RESERVATION');
                                setReserveTitle(isAdmin ? 'Tournament / Competition Block' : 'Training Session');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition"
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{isAdmin ? 'Block for Tournament' : 'Reserve Unit'}</span>
                        </button>

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setAddUnitModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add {unitWord}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Affiliated Clubs & Associations */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                        Affiliations:
                    </span>
                    {location.associations?.map((a: any) => (
                        <span
                            key={a.association.id}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold"
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            {a.association.name} ({a.association.shortName || a.association.code})
                        </span>
                    ))}
                    {location.clubs?.map((c: any) => (
                        <span
                            key={c.club.id}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                        >
                            <Shield className="w-3.5 h-3.5" />
                            {c.club.name} {c.isPrimary && '(Home Club)'}
                        </span>
                    ))}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('units')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === 'units'
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    <span>{unitWord}s Matrix & Status ({location.units?.length || 0})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('schedule')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === 'schedule'
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Clock className="h-4 w-4" />
                    <span>Reservations & Schedule ({allReservations.length})</span>
                </button>
            </div>

            {/* TAB 1: Units Matrix Board */}
            {activeTab === 'units' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {location.units?.map((unit: any) => {
                        const isAvailable = unit.status === 'AVAILABLE';
                        const isMaintenance = unit.status === 'MAINTENANCE';
                        const hasReservations = unit.reservations && unit.reservations.length > 0;

                        return (
                            <div
                                key={unit.id}
                                className={`rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                                    isMaintenance
                                        ? 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20'
                                        : hasReservations
                                        ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold font-mono text-slate-400">
                                            #{unit.unitNumber}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                isMaintenance
                                                    ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                                                    : hasReservations
                                                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                            }`}
                                        >
                                            {isMaintenance
                                                ? 'Maintenance'
                                                : hasReservations
                                                ? 'Reserved / Blocked'
                                                : 'Available'}
                                        </span>
                                    </div>

                                    <div className="text-base font-black text-slate-900 dark:text-white">
                                        {unit.name}
                                    </div>

                                    {/* Features Badges */}
                                    {unit.features && unit.features.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {unit.features.map((f: string) => (
                                                <span
                                                    key={f}
                                                    className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                >
                                                    {f.replace('_', ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Active / Upcoming reservation on this unit */}
                                {hasReservations && (
                                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-950/60 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1">
                                        <div className="font-bold text-indigo-900 dark:text-indigo-300 truncate">
                                            {unit.reservations[0].title}
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                                            <Clock className="w-3 h-3 text-indigo-500" />
                                            <span>
                                                {format(new Date(unit.reservations[0].startTime), 'dd.MM HH:mm')} - {format(new Date(unit.reservations[0].endTime), 'HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Unit Actions */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedUnitIds([unit.id]);
                                            setReserveModalOpen(true);
                                            setReserveTitle(`Booking for ${unit.name}`);
                                        }}
                                        className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline"
                                    >
                                        + Reserve
                                    </button>

                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleUnitMaintenance(unit)}
                                            title="Toggle Maintenance Mode"
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            <Wrench className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TAB 2: Schedule & Reservations Table */}
            {activeTab === 'schedule' && (
                <DataTable
                    columns={[
                        {
                            id: 'unit',
                            accessorFn: (row: any) => row.unitName || '',
                            header: ({ column }) => <DataTableColumnHeader column={column} title={unitWord} />,
                            cell: ({ row }) => (
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {(row.original as any).unitName}
                                </span>
                            ),
                        },
                        {
                            id: 'title',
                            accessorFn: (row: any) => `${row.title || ''} ${row.competition?.name || ''}`,
                            header: ({ column }) => <DataTableColumnHeader column={column} title="Purpose / Title" />,
                            cell: ({ row }) => {
                                const res = row.original as any;
                                return (
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{res.title}</div>
                                        {res.competition && (
                                            <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                                                <Trophy className="w-3 h-3" />
                                                <span>{res.competition.name}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            },
                        },
                        {
                            id: 'type',
                            accessorFn: (row: any) => row.type,
                            header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
                            cell: ({ row }) => (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {String((row.original as any).type).replace('_', ' ')}
                                </span>
                            ),
                        },
                        {
                            id: 'timeWindow',
                            accessorFn: (row: any) => new Date(row.startTime).getTime(),
                            header: ({ column }) => <DataTableColumnHeader column={column} title="Time Window" />,
                            cell: ({ row }) => {
                                const res = row.original as any;
                                return (
                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                        {format(new Date(res.startTime), 'EEE, dd MMM yyyy HH:mm')} - {format(new Date(res.endTime), 'HH:mm')}
                                    </span>
                                );
                            },
                        },
                        {
                            id: 'bookedBy',
                            accessorFn: (row: any) => `${row.reservedByUser?.firstName || ''} ${row.reservedByUser?.lastName || ''}`,
                            header: ({ column }) => <DataTableColumnHeader column={column} title="Booked By" />,
                            cell: ({ row }) => {
                                const res = row.original as any;
                                return (
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {res.reservedByUser ? `${res.reservedByUser.firstName} ${res.reservedByUser.lastName}` : 'System / Club'}
                                    </span>
                                );
                            },
                        },
                        ...(isAdmin
                            ? [
                                  {
                                      id: 'actions',
                                      header: () => <div className="text-right">Actions</div>,
                                      cell: ({ row }: any) => (
                                          <div className="text-right">
                                              <button
                                                  type="button"
                                                  onClick={() => handleCancelReservation(row.original.id)}
                                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                                                  title="Cancel reservation"
                                              >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                          </div>
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                    data={allReservations}
                    searchPlaceholder="Search reservations by title, table, user, competition..."
                    emptyMessage="No active reservations or tournament blocks scheduled."
                    defaultPageSize={10}
                    pageSizeOptions={[5, 10, 25, 50]}
                />
            )}

            {/* Modal: Reserve / Block Units */}
            {reserveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {isAdmin ? 'Block Units for Competition / Practice' : `Reserve ${unitWord}`}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReserveModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {reserveErr && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <div>{reserveErr}</div>
                            </div>
                        )}

                        <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
                            {/* Target Units Selection */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Select {unitWord}(s) *
                                </label>
                                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                    {location.units?.map((u: any) => {
                                        const isSelected = selectedUnitIds.includes(u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedUnitIds(selectedUnitIds.filter((id) => id !== u.id));
                                                    } else {
                                                        setSelectedUnitIds([...selectedUnitIds, u.id]);
                                                    }
                                                }}
                                                className={`p-2 rounded-xl text-center font-bold text-xs transition ${
                                                    isSelected
                                                        ? 'bg-amber-600 text-white shadow-xs'
                                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500'
                                                }`}
                                            >
                                                {u.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                                    <span>{selectedUnitIds.length} unit(s) selected</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUnitIds(location.units?.map((u: any) => u.id) || [])}
                                        className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                                    >
                                        Select All
                                    </button>
                                </div>
                            </div>

                            {/* Reservation Type */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Type
                                    </label>
                                    <select
                                        value={reserveType}
                                        onChange={(e: any) => setReserveType(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                    >
                                        <option value="USER_RESERVATION">User / Player Booking</option>
                                        <option value="COMPETITION_BLOCK">Competition / Tournament Block</option>
                                        <option value="CLUB_TRAINING">Club Team Practice</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                    </select>
                                </div>
                                {reserveType === 'COMPETITION_BLOCK' && (
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Link Competition
                                        </label>
                                        <select
                                            value={selectedCompetitionId}
                                            onChange={(e) => setSelectedCompetitionId(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                        >
                                            <option value="">None / Custom</option>
                                            {competitions.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Title / Purpose *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Regional Championship Semifinals"
                                    value={reserveTitle}
                                    onChange={(e) => setReserveTitle(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            {/* Date and Time slots */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={reserveDate}
                                        onChange={(e) => setReserveDate(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Start Time *
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={reserveStartTime}
                                        onChange={(e) => setReserveStartTime(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        End Time *
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={reserveEndTime}
                                        onChange={(e) => setReserveEndTime(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setReserveModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={reserving || selectedUnitIds.length === 0}
                                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow transition disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    {reserving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{reserving ? 'Saving...' : 'Confirm Reservation'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Playing Unit */}
            {addUnitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Add {unitWord} Unit
                            </h3>
                            <button
                                type="button"
                                onClick={() => setAddUnitModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddUnit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {unitWord} Name / Identifier *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={`e.g. ${unitWord} ${(location.units?.length || 0) + 1} or Center Court`}
                                    value={unitName}
                                    onChange={(e) => setUnitName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setAddUnitModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingUnit}
                                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow transition disabled:opacity-50"
                                >
                                    {addingUnit ? 'Adding...' : `Add ${unitWord}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
