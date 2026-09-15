'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { usePro } from '@/hooks/usePro';
import { ProBadge } from '@/components/common/ProBadge';
import { Sparkles, Crown, Loader2, AlertCircle, CheckCircle2, TrendingUp, Zap, Target, ArrowRight } from 'lucide-react';

interface MatchAiAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchId: string;
    matchSummaryTitle?: string;
}

export function MatchAiAnalysisModal({
    isOpen,
    onClose,
    matchId,
    matchSummaryTitle,
}: MatchAiAnalysisModalProps) {
    const { isPro, upgrade } = usePro();
    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !matchId) {
            setAnalysisData(null);
            setError(null);
            return;
        }

        if (!isPro) {
            return;
        }

        async function fetchAnalysis() {
            setLoading(true);
            setError(null);
            try {
                const res = await api.ai.getMatchAnalysis(matchId);
                if (res?.success) {
                    setAnalysisData(res.analysis);
                } else {
                    setError('Failed to generate AI tactical match analysis.');
                }
            } catch (err: any) {
                console.error('Match AI Analysis error:', err);
                setError(err.message || 'Failed to generate AI match analysis');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalysis();
    }, [isOpen, matchId, isPro]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <span>AREENA AI Match Analysis</span>
                    <ProBadge size="sm" />
                </div>
            }
            subtitle={matchSummaryTitle || 'AI-Powered Tactical & Momentum Breakdown'}
            size="lg"
        >
            {!isPro ? (
                /* Non-Pro Paywall / Upgrade Banner */
                <div className="space-y-6 py-2">
                    <div className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-8 text-center space-y-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                            <Crown className="h-7 w-7" />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                Unlock AI Tactical Match Insights
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                                AI Match Analysis provides deep coaching breakdowns, game-by-game momentum swing analysis, and personalized tactical takeaways on your matches.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                                    <span>Momentum Swings</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Set-by-set breakdown of clutch turning points and score leads.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    <span>Tactical Patterns</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Identify winning serve & return strategies against this opponent.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                                    <Target className="h-4 w-4 text-emerald-500" />
                                    <span>Coach Takeaways</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Concrete, actionable adjustments for your next tournament encounter.
                                </p>
                            </div>
                        </div>

                        <div className="pt-3">
                            <button
                                type="button"
                                onClick={() => upgrade('MONTHLY')}
                                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-6 py-3 text-xs font-black text-white shadow-md shadow-amber-500/20 transition cursor-pointer"
                            >
                                <Crown className="h-4 w-4" />
                                <span>Upgrade to AREENA Pro for AI Analysis</span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : loading ? (
                /* Loading State */
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <div className="text-center space-y-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Analyzing match dynamics with Gemini AI...
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Evaluating score swings, clutch deuce points, and tactical matchflow.
                        </p>
                    </div>
                </div>
            ) : error ? (
                /* Error State */
                <div className="p-6 text-center space-y-3">
                    <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-300 text-left">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>{error}</div>
                    </div>
                </div>
            ) : analysisData ? (
                /* Rendered Analysis */
                <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 text-[11px]">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                            <Sparkles className="h-4 w-4" />
                            <span>Generated by {analysisData.modelUsed || 'Gemini 1.5 Flash'}</span>
                        </div>
                        <span className="text-slate-400">Tactical Coach Engine</span>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                        {analysisData.summaryMarkdown}
                    </div>
                </div>
            ) : null}
        </Modal>
    );
}
