'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useHaptics } from '@/lib/pwa/useHaptics';
import { api } from '@/lib/api';
import {
    X,
    RotateCcw,
    Clock,
    Award,
    CheckCircle2,
    RefreshCw,
    Volume2,
    VolumeX,
    Maximize2,
    Sparkles,
} from 'lucide-react';

interface PointHistoryItem {
    player: 1 | 2;
    p1Score: number;
    p2Score: number;
    server: 1 | 2;
}

interface SetRecord {
    p1: number;
    p2: number;
    winner: 1 | 2;
}

interface RefereeScorecardModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchId?: string;
    player1Name?: string;
    player2Name?: string;
    matchCategory?: string;
    unitName?: string;
    pointsToWinSet?: number;
    bestOfSets?: number;
    onScoreSubmitted?: (sets: SetRecord[]) => void;
}

export function RefereeScorecardModal({
    isOpen,
    onClose,
    matchId,
    player1Name = 'Player 1',
    player2Name = 'Player 2',
    matchCategory = "Men's Singles",
    unitName = 'Table 1',
    pointsToWinSet = 11,
    bestOfSets = 3,
    onScoreSubmitted,
}: RefereeScorecardModalProps) {
    const haptics = useHaptics();

    // Live Game State
    const [p1Score, setP1Score] = useState(0);
    const [p2Score, setP2Score] = useState(0);
    const [p1SetsWon, setP1SetsWon] = useState(0);
    const [p2SetsWon, setP2SetsWon] = useState(0);
    const [currentServer, setCurrentServer] = useState<1 | 2>(1);
    const [completedSets, setCompletedSets] = useState<SetRecord[]>([]);
    const [history, setHistory] = useState<PointHistoryItem[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Timeout countdown state
    const [timeoutActive, setTimeoutActive] = useState(false);
    const [timeoutSeconds, setTimeoutSeconds] = useState(60);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Match Completed State
    const [matchWinner, setMatchWinner] = useState<1 | 2 | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Sets needed to win match (e.g. 2 for best of 3, 3 for best of 5)
    const setsNeeded = Math.ceil(bestOfSets / 2);

    // Handle Timeout countdown
    useEffect(() => {
        if (timeoutActive && timeoutSeconds > 0) {
            timeoutRef.current = setTimeout(() => {
                setTimeoutSeconds((prev) => prev - 1);
            }, 1000);
        } else if (timeoutActive && timeoutSeconds === 0) {
            haptics.warning();
            setTimeoutActive(false);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [timeoutActive, timeoutSeconds]);

    // Recalculate server based on total points
    const updateServer = (p1: number, p2: number) => {
        const total = p1 + p2;
        // In deuce (both >= pointsToWinSet - 1), alternate every point
        if (p1 >= pointsToWinSet - 1 && p2 >= pointsToWinSet - 1) {
            return total % 2 === 0 ? 1 : 2;
        }
        // Standard rule: Alternate every 2 points
        const rotation = Math.floor(total / 2);
        return rotation % 2 === 0 ? 1 : 2;
    };

    // Play crisp audio beep
    const playBeep = () => {
        if (!soundEnabled || typeof window === 'undefined') return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(580, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch {}
    };

    // Add Point to Player 1 or 2
    const handleAddPoint = (player: 1 | 2) => {
        if (matchWinner) return;

        haptics.scorePoint();
        playBeep();

        const newP1 = player === 1 ? p1Score + 1 : p1Score;
        const newP2 = player === 2 ? p2Score + 1 : p2Score;
        const nextServer = updateServer(newP1, newP2);

        // Save history for Undo
        setHistory((prev) => [
            ...prev,
            { player, p1Score: newP1, p2Score: newP2, server: currentServer },
        ]);

        // Check if Set is Won (must lead by at least 2 points)
        const isSetWon =
            (newP1 >= pointsToWinSet || newP2 >= pointsToWinSet) &&
            Math.abs(newP1 - newP2) >= 2;

        if (isSetWon) {
            haptics.success();
            const setWinner: 1 | 2 = newP1 > newP2 ? 1 : 2;
            const newSetRecord: SetRecord = { p1: newP1, p2: newP2, winner: setWinner };
            const updatedSets = [...completedSets, newSetRecord];
            setCompletedSets(updatedSets);

            const newP1Sets = setWinner === 1 ? p1SetsWon + 1 : p1SetsWon;
            const newP2Sets = setWinner === 2 ? p2SetsWon + 1 : p2SetsWon;
            setP1SetsWon(newP1Sets);
            setP2SetsWon(newP2Sets);

            // Check if Match is Won
            if (newP1Sets === setsNeeded) {
                setMatchWinner(1);
            } else if (newP2Sets === setsNeeded) {
                setMatchWinner(2);
            } else {
                // Reset for next set
                setP1Score(0);
                setP2Score(0);
                setCurrentServer(setWinner === 1 ? 2 : 1);
            }
        } else {
            setP1Score(newP1);
            setP2Score(newP2);
            setCurrentServer(nextServer);
        }
    };

    // Undo Last Point
    const handleUndo = () => {
        if (history.length === 0) return;
        haptics.warning();

        const newHistory = [...history];
        newHistory.pop(); // remove current

        if (newHistory.length === 0) {
            setP1Score(0);
            setP2Score(0);
            setCurrentServer(1);
            setHistory([]);
            return;
        }

        const last = newHistory[newHistory.length - 1];
        setP1Score(last.p1Score);
        setP2Score(last.p2Score);
        setCurrentServer(last.server);
        setHistory(newHistory);
    };

    // Switch Sides
    const handleSwitchSides = () => {
        haptics.medium();
        // Visual switch can be toggled
    };

    // Start 60s Timeout
    const handleStartTimeout = () => {
        haptics.medium();
        setTimeoutSeconds(60);
        setTimeoutActive(true);
    };

    // Submit Final Score to Backend API
    const handleSubmitScore = async () => {
        if (!matchWinner) return;
        setSubmitting(true);
        haptics.success();

        try {
            if (matchId) {
                await api.competitions.updateMatchScore(matchId, {
                    status: 'FINISHED',
                    winnerId: matchWinner === 1 ? 'home' : 'away',
                    sets: completedSets,
                });
            }
            if (onScoreSubmitted) {
                onScoreSubmitted(completedSets);
            }
            onClose();
        } catch (err: any) {
            alert('Failed to submit score: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col select-none overflow-hidden touch-none font-sans">
            {/* Top Referee Action Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-bold text-xs uppercase tracking-wider text-red-400">
                        {unitName} • {matchCategory}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>

                    <button
                        onClick={handleUndo}
                        disabled={history.length === 0 || !!matchWinner}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold disabled:opacity-30 transition"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Undo</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Set History Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Sets (Best of {bestOfSets}):</span>
                    <span className="font-bold text-red-400">
                        {p1SetsWon} – {p2SetsWon}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {completedSets.map((s, idx) => (
                        <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-[11px]"
                        >
                            {s.p1}–{s.p2}
                        </span>
                    ))}
                    {!matchWinner && (
                        <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/80 text-red-400 font-bold text-[11px] animate-pulse">
                            Set {completedSets.length + 1}
                        </span>
                    )}
                </div>
            </div>

            {/* 50/50 Giant Touch Scoring Canvas */}
            <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800 relative">
                {/* Player 1 Half */}
                <div
                    onClick={() => handleAddPoint(1)}
                    className="flex flex-col items-center justify-between p-6 active:bg-red-950/20 transition-colors cursor-pointer"
                >
                    <div className="text-center space-y-1">
                        <div className="text-sm sm:text-base font-bold text-slate-100 flex items-center justify-center gap-1.5">
                            {player1Name}
                            {currentServer === 1 && (
                                <span className="text-xs text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                                    🏓 Serve
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                            Sets Won: <strong>{p1SetsWon}</strong>
                        </div>
                    </div>

                    {/* Giant Score Number */}
                    <div className="text-7xl sm:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-lg my-auto">
                        {p1Score}
                    </div>

                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Tap anywhere to +1 point
                    </div>
                </div>

                {/* Player 2 Half */}
                <div
                    onClick={() => handleAddPoint(2)}
                    className="flex flex-col items-center justify-between p-6 active:bg-red-950/20 transition-colors cursor-pointer"
                >
                    <div className="text-center space-y-1">
                        <div className="text-sm sm:text-base font-bold text-slate-100 flex items-center justify-center gap-1.5">
                            {player2Name}
                            {currentServer === 2 && (
                                <span className="text-xs text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                                    🏓 Serve
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                            Sets Won: <strong>{p2SetsWon}</strong>
                        </div>
                    </div>

                    {/* Giant Score Number */}
                    <div className="text-7xl sm:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-lg my-auto">
                        {p2Score}
                    </div>

                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Tap anywhere to +1 point
                    </div>
                </div>
            </div>

            {/* Bottom Quick Controls (Timeout & Switch) */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-around gap-2 text-xs">
                <button
                    onClick={handleStartTimeout}
                    disabled={timeoutActive}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition ${
                        timeoutActive
                            ? 'bg-amber-600 text-white animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                >
                    <Clock className="h-4 w-4" />
                    <span>{timeoutActive ? `Timeout: ${timeoutSeconds}s` : '60s Timeout'}</span>
                </button>

                <button
                    onClick={handleSwitchSides}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 transition"
                >
                    <RefreshCw className="h-4 w-4" />
                    <span>Switch Sides</span>
                </button>
            </div>

            {/* Match Finished Victory Modal */}
            {matchWinner && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                        <Award className="h-8 w-8" />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                            Match Completed!
                        </h2>
                        <p className="text-sm text-emerald-400 font-bold">
                            Winner: {matchWinner === 1 ? player1Name : player2Name} ({p1SetsWon} – {p2SetsWon})
                        </p>
                    </div>

                    {/* Final Scores Breakdown */}
                    <div className="flex gap-2 font-mono text-sm">
                        {completedSets.map((s, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                                {s.p1}–{s.p2}
                            </span>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs pt-2">
                        <button
                            onClick={handleSubmitScore}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{submitting ? 'Submitting...' : 'Confirm & Submit'}</span>
                        </button>

                        <button
                            onClick={handleUndo}
                            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 transition"
                        >
                            Undo Point
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

