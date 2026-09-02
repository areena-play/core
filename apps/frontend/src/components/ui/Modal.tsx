'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    backdropBlur?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    size?: ModalSize;
    showCloseButton?: boolean;
    closeOnEsc?: boolean;
    closeOnBackdropClick?: boolean;
    className?: string;
    bodyClassName?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-5xl',
};

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    footer,
    size = 'md',
    backdropBlur = 'sm',
    showCloseButton = true,
    closeOnEsc = true,
    closeOnBackdropClick = true,
    className = '',
    bodyClassName = '',
}: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 1. ESC key listener
    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    // 2. Prevent background scroll while open
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    if (!isOpen || !mounted || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 ${
                backdropBlur === 'none' ? '' : `backdrop-blur-${backdropBlur}`
            } transition-opacity animate-in fade-in duration-150`}
            onClick={closeOnBackdropClick ? onClose : undefined}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`w-full ${SIZE_CLASSES[size]} max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-5 sm:px-6 py-4 shrink-0 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3 min-w-0">
                            {icon && <div className="text-red-500 shrink-0">{icon}</div>}
                            <div className="min-w-0">
                                {title && (
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                        {title}
                                    </h3>
                                )}
                                {subtitle && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0 ml-2"
                                aria-label="Close dialog"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Scrollable Content Body */}
                <div className={`p-5 sm:p-6 overflow-y-auto space-y-4 text-xs ${bodyClassName}`}>
                    {children}
                </div>

                {/* Footer Actions */}
                {footer && (
                    <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 px-5 sm:px-6 py-3.5 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
