'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTour } from '@/lib/tourContext';
import { useI18n } from '@/lib/i18nContext';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, HelpCircle } from 'lucide-react';

interface ElementRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export function SpotlightTourOverlay() {
    const { isActive, currentStep, currentStepIndex, steps, nextStep, prevStep, endTour } = useTour();
    const { t } = useI18n();

    const [mounted, setMounted] = useState(false);
    const [targetRect, setTargetRect] = useState<ElementRect | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Update target element bounding rectangle
    const updateTargetRect = useCallback(() => {
        if (!isActive || !currentStep) {
            setTargetRect(null);
            return;
        }

        const el = document.querySelector(currentStep.targetSelector);
        if (el) {
            const rect = el.getBoundingClientRect();
            // Scroll into view if needed
            if (
                rect.top < 0 ||
                rect.bottom > window.innerHeight ||
                rect.left < 0 ||
                rect.right > window.innerWidth
            ) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            setTargetRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            });
        } else {
            // Target not found on current page, default to center
            setTargetRect(null);
        }
    }, [isActive, currentStep]);

    useEffect(() => {
        if (!isActive) return;

        updateTargetRect();
        const handleResize = () => updateTargetRect();
        const handleScroll = () => updateTargetRect();

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isActive, currentStepIndex, updateTargetRect]);

    // Keyboard navigation
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                endTour();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                e.preventDefault();
                nextStep();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevStep();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, nextStep, prevStep, endTour]);

    if (!mounted || !isActive || !currentStep) return null;

    const isLastStep = currentStepIndex === steps.length - 1;
    const isFirstStep = currentStepIndex === 0;

    // Calculate Popover position relative to target
    const getCardPosition = () => {
        if (!targetRect) {
            // Centered fallback
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const padding = 16;
        const cardWidth = 360;
        const cardHeight = 220;

        let top = targetRect.top + targetRect.height + padding;
        let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;

        // If overflowing bottom, position above target
        if (top + cardHeight > window.innerHeight - 20) {
            top = Math.max(20, targetRect.top - cardHeight - padding);
        }

        // Clamp horizontal position within viewport
        if (left < 16) left = 16;
        if (left + cardWidth > window.innerWidth - 16) {
            left = window.innerWidth - cardWidth - 16;
        }

        return {
            top: `${top}px`,
            left: `${left}px`,
        };
    };

    const cardPos = getCardPosition();

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
            {/* Darkened Spotlight Cutout Overlay */}
            {targetRect ? (
                <div
                    className="fixed rounded-2xl transition-all duration-300 pointer-events-none"
                    style={{
                        top: Math.max(0, targetRect.top - 6),
                        left: Math.max(0, targetRect.left - 6),
                        width: targetRect.width + 12,
                        height: targetRect.height + 12,
                        boxShadow: '0 0 0 9999px rgba(5, 8, 16, 0.78)',
                        border: '2px solid rgba(239, 68, 68, 0.9)',
                    }}
                />
            ) : (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity" />
            )}

            {/* Floating Tethered Tour Card */}
            <div
                style={cardPos}
                className="fixed z-[10000] w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md p-5 text-white shadow-2xl shadow-black/80 transition-all duration-300 animate-in fade-in zoom-in-95"
            >
                {/* Header with Step indicator and Skip button */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold">
                            <Sparkles className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                            {t('tour.stepIndicator', { current: currentStepIndex + 1, total: steps.length }) ||
                                `Step ${currentStepIndex + 1} of ${steps.length}`}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={endTour}
                        className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title={t('common.close') || 'Skip Tour'}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="py-3.5 space-y-1.5">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                        {currentStep.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        {currentStep.content}
                    </p>
                </div>

                {/* Footer Controls & Progress Dots */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    {/* Progress Dots */}
                    <div className="flex items-center gap-1">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentStepIndex
                                        ? 'w-5 bg-red-500'
                                        : idx < currentStepIndex
                                        ? 'w-1.5 bg-red-500/50'
                                        : 'w-1.5 bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {!isFirstStep && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                <span>{t('common.back') || 'Back'}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={nextStep}
                            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md shadow-red-950 transition flex items-center gap-1.5 active:scale-95"
                        >
                            <span>
                                {isLastStep
                                    ? t('tour.finishButton') || 'Finish Tour'
                                    : t('tour.nextButton') || 'Next'}
                            </span>
                            {isLastStep ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

