'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useWebSocket } from '@/lib/useWebSocket';
import {
  Trophy,
  Calendar,
  MapPin,
  Flame,
  CheckCircle2,
  ChevronLeft,
  Edit3,
  Award,
  Radio,
  Plus,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

export default function EncounterScoreSheetPage() {
  const params = useParams();
  const competitionId = params.id as string;
  const encounterId = params.encounterId as string;
  const { user } = useAuth();

  const [encounter, setEncounter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScoringMatch, setActiveScoringMatch] = useState<any | null>(null);
  const [setsInput, setSetsInput] = useState<Array<{ home: number; away: number }>>([]);
  const [isFinishedMatch, setIsFinishedMatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEncounter = async () => {
    try {
      const data = await api.getEncounter(encounterId);
      setEncounter(data);
    } catch (err) {
      console.error('Failed to load encounter:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounter();
  }, [encounterId]);

  // Realtime Live Score sync via WebSocket
  useWebSocket((event) => {
    if (event.channel === 'areena:scores' || event.channel === 'areena:encounters') {
      fetchEncounter();
    }
  });

  const openScoringModal = (match: any) => {
    setActiveScoringMatch(match);
    const existingSets = Array.isArray(match.sets) && match.sets.length > 0
      ? match.sets
      : [{ home: 11, away: 8 }, { home: 11, away: 9 }, { home: 11, away: 7 }];
    setSetsInput(existingSets);
    setIsFinishedMatch(match.status === 'FINISHED');
  };

  const handleAddSet = () => {
    setSetsInput([...setsInput, { home: 0, away: 0 }]);
  };

  const handleRemoveSet = (idx: number) => {
    setSetsInput(setsInput.filter((_, i) => i !== idx));
  };

  const handleSetChange = (idx: number, field: 'home' | 'away', val: number) => {
    const updated = [...setsInput];
    updated[idx][field] = val;
    setSetsInput(updated);
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScoringMatch) return;
    setSubmitting(true);
    try {
      await api.updateMatchScore(activeScoringMatch.id, {
        sets: setsInput,
        isFinished: isFinishedMatch,
      });
      setActiveScoringMatch(null);
      fetchEncounter();
    } catch (err: any) {
      alert(err.message || 'Failed to update match score');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-400">Loading match sheet...</div>;
  }

  if (!encounter) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-300">Encounter not found.</div>;
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Back link */}
      <Link
        href={`/competitions/${competitionId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Competition Standings
      </Link>

      {/* Encounter Header Scoreboard */}
      <div className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-500">{encounter.category?.competition?.name}</span>
            <span>•</span>
            <span>{encounter.category?.name}</span>
            <span>•</span>
            <span>Round {encounter.round}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase ${
                encounter.status === 'LIVE'
                  ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                  : encounter.status === 'FINISHED'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {encounter.status}
            </span>
          </div>
        </div>

        {/* Big Match Scoreboard */}
        <div className="my-6 grid grid-cols-1 items-center gap-6 md:grid-cols-3">
          {/* Home Team */}
          <div className="text-center md:text-right">
            <h2 className="text-2xl font-black text-white md:text-3xl">
              {encounter.homeTeam?.name}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Home Team</p>
          </div>

          {/* Center Score */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-4 rounded-2xl bg-slate-950 px-6 py-3 border border-slate-800 shadow-inner">
              <span className="font-mono text-4xl font-extrabold text-white">
                {encounter.homeScore}
              </span>
              <span className="text-2xl font-bold text-slate-600">:</span>
              <span className="font-mono text-4xl font-extrabold text-white">
                {encounter.awayScore}
              </span>
            </div>
            <span className="mt-2 text-[11px] font-mono text-slate-400 uppercase tracking-widest">
              Total Matches Won
            </span>
          </div>

          {/* Away Team */}
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black text-white md:text-3xl">
              {encounter.awayTeam?.name}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Away Team</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            {format(new Date(encounter.scheduledAt), 'PPPP p')}
          </span>
          {encounter.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-500" />
              {encounter.location}
            </span>
          )}
        </div>
      </div>

      {/* Official Match Sheet / Matches List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-red-500" />
              Official Match Sheet (Davis Cup Decomposition)
            </h3>
            <p className="text-xs text-slate-400">
              Individual singles and doubles rubbers contributing to the encounter score.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Home Player</th>
                <th className="px-4 py-3">Away Player</th>
                <th className="px-4 py-3 text-center">Sets Breakdown</th>
                <th className="px-3 py-3 text-center">Sets Score</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {encounter.matches?.map((m: any) => {
                const sets = (m.sets as Array<{ home: number; away: number }>) || [];
                return (
                  <tr key={m.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-300">
                      {m.label || `Match ${m.orderIndex}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                        {m.matchType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {m.homePlayer1 ? `${m.homePlayer1.firstName} ${m.homePlayer1.lastName}` : 'Home Player'}
                      {m.homePlayer2 && ` / ${m.homePlayer2.firstName} ${m.homePlayer2.lastName}`}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {m.awayPlayer1 ? `${m.awayPlayer1.firstName} ${m.awayPlayer1.lastName}` : 'Away Player'}
                      {m.awayPlayer2 && ` / ${m.awayPlayer2.firstName} ${m.awayPlayer2.lastName}`}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {sets.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {sets.map((s, idx) => (
                            <span
                              key={idx}
                              className={`rounded px-1.5 py-0.5 text-[11px] ${
                                s.home > s.away
                                  ? 'bg-red-950 text-red-300 border border-red-800/40 font-bold'
                                  : s.away > s.home
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              {s.home}:{s.away}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-sm text-white">
                      {m.homeWonSets} : {m.awayWonSets}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          m.status === 'FINISHED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : m.status === 'LIVE'
                            ? 'bg-red-950 text-red-400 border border-red-800/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openScoringModal(m)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-red-600 hover:text-white px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Referee Score</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referee Match Scoring Modal */}
      {activeScoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  Live Scoring: {activeScoringMatch.label || `Match ${activeScoringMatch.orderIndex}`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Enter points per set. Live standings and encounter score update immediately.
                </p>
              </div>
              <button
                onClick={() => setActiveScoringMatch(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitScore} className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400 uppercase">
                  <div className="col-span-2">Set</div>
                  <div className="col-span-4 text-center">Home Points</div>
                  <div className="col-span-4 text-center">Away Points</div>
                  <div className="col-span-2"></div>
                </div>

                {setsInput.map((set, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2 font-mono font-bold text-slate-300">Set {idx + 1}</div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min={0}
                        value={set.home}
                        onChange={(e) => handleSetChange(idx, 'home', Number(e.target.value))}
                        className="w-full text-center rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min={0}
                        value={set.away}
                        onChange={(e) => handleSetChange(idx, 'away', Number(e.target.value))}
                        className="w-full text-center rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      {setsInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSet(idx)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddSet}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Another Set
                </button>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={isFinishedMatch}
                    onChange={(e) => setIsFinishedMatch(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-red-500"
                  />
                  <span>Mark Match as Finished</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveScoringMatch(null)}
                  className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 shadow"
                >
                  {submitting ? 'Submitting...' : 'Save & Publish Live Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

