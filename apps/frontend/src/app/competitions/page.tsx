'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import {
  Trophy,
  Plus,
  Filter,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  Shield,
  Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function CompetitionsPage() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [associations, setAssociations] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assocFilter, setAssocFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Competition Form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('LEAGUE');
  const [formAssocId, setFormAssocId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCompetitions = async () => {
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (assocFilter) params.associationId = assocFilter;

      const data = await api.getCompetitions(params);
      setCompetitions(data);
    } catch (err) {
      console.error('Failed to load competitions:', err);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const assocData = await api.getAssociations();
        setAssociations(assocData.associations || []);
        if (assocData.associations && assocData.associations.length > 0) {
          setFormAssocId(assocData.associations[0].id);
        }
      } catch {}
    }
    init();
  }, []);

  useEffect(() => {
    fetchCompetitions();
  }, [typeFilter, statusFilter, assocFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');
    try {
      await api.createCompetition({
        name: formName,
        description: formDesc,
        type: formType,
        associationId: formAssocId,
        startDate: formStartDate,
        endDate: formEndDate,
        location: formLocation,
      });
      setShowCreateModal(false);
      fetchCompetitions();
      setFormName('');
      setFormDesc('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create competition');
    } finally {
      setCreating(false);
    }
  };

  const filteredComps = competitions.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-red-500" />
            Competitions & Leagues
          </h1>
          <p className="text-sm text-slate-400">
            Unified competition engine supporting long-running national/regional leagues and multi-category tournaments.
          </p>
        </div>

        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Create Competition</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search leagues & tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
          >
            <option value="">All Types (Leagues & Tournaments)</option>
            <option value="LEAGUE">🛡️ Leagues Only</option>
            <option value="TOURNAMENT">🏆 Tournaments Only</option>
          </select>

          <select
            value={assocFilter}
            onChange={(e) => setAssocFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
          >
            <option value="">All Organizing Associations</option>
            {associations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="REGISTRATION_OPEN">Registration Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredComps.map((comp) => (
          <div
            key={comp.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition group shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    comp.type === 'LEAGUE'
                      ? 'bg-red-950 text-red-400 border border-red-800/50'
                      : 'bg-blue-950 text-blue-400 border border-blue-800/50'
                  }`}
                >
                  {comp.type}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  {comp.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition line-clamp-1">
                  {comp.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                  {comp.description || 'Championship competition organized by the federation.'}
                </p>
              </div>

              <div className="space-y-1.5 border-t border-slate-800 pt-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">{comp.association?.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {format(new Date(comp.startDate), 'MMM yyyy')} -{' '}
                    {format(new Date(comp.endDate), 'MMM yyyy')}
                  </span>
                </div>
                {comp.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                    <span className="truncate">{comp.location}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {comp.categories?.length || 0} Categories
              </span>
              <Link
                href={`/competitions/${comp.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300"
              >
                <span>Details & Standings</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Competition Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-red-500" />
                Create New Competition
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-red-950/80 border border-red-800 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Competition Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiss National League B 2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="LEAGUE">🛡️ League (Long-running)</option>
                    <option value="TOURNAMENT">🏆 Tournament</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Organizing Association</label>
                  <select
                    value={formAssocId}
                    onChange={(e) => setFormAssocId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  >
                    {associations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Competition rules, description, and eligibility..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300">End Date</label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Location / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. National Sports Complex / Regional Arenas"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Competition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

