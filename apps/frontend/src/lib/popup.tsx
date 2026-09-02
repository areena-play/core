'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Move } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

export interface PopupOptions {
    /**
     * Unique identifier for the popup. If omitted, auto-generated.
     * Opening a popup with an existing id focuses or updates it.
     */
    id?: string;

    /**
     * Title displayed in the draggable header bar.
     */
    title: React.ReactNode;

    /**
     * Optional subtitle or badge in header.
     */
    subtitle?: React.ReactNode;

    /**
     * Optional icon next to title.
     */
    icon?: React.ReactNode;

    /**
     * Dynamic content inside the popup body.
     * Can be:
     * 1. React JSX component
     * 2. Render function: `({ close }) => ReactNode`
     * 3. HTML string (will be safely rendered as HTML markup, e.g. from console or template)
     */
    content: React.ReactNode | ((props: { close: () => void }) => React.ReactNode) | string;

    /**
     * Initial width in pixels or CSS string (e.g. 460 or '460px'). Default: 440.
     */
    width?: number | string;

    /**
     * Initial height in pixels or CSS string. Default: 'auto'.
     */
    height?: number | string;

    /**
     * Initial screen position. Default: centered with slight cascade offset.
     */
    defaultPosition?: { x: number; y: number };

    /**
     * Whether the window can be moved by dragging its header. Default: true.
     */
    draggable?: boolean;

    /**
     * Callback fired when popup is closed.
     */
    onClose?: () => void;
}

export interface PopupInstance {
    id: string;
    close: () => void;
    focus: () => void;
}

interface ActivePopupState extends PopupOptions {
    id: string;
    position: { x: number; y: number };
    zIndex: number;
}

/* -------------------------------------------------------------------------- */
/*                           GLOBAL STATE & LISTENERS                         */
/* -------------------------------------------------------------------------- */

let popupCounter = 1;
let highestZIndex = 5000;
let activePopups: ActivePopupState[] = [];
const listeners = new Set<(popups: ActivePopupState[]) => void>();

function notify() {
    listeners.forEach((fn) => fn([...activePopups]));
}

/* -------------------------------------------------------------------------- */
/*                                PUBLIC UTILITY                              */
/* -------------------------------------------------------------------------- */

/**
 * Open a dynamic, movable floating popup window.
 */
export function popup(options: PopupOptions): PopupInstance {
    const id = options.id || `popup_${popupCounter++}`;
    highestZIndex += 1;

    // Default centered position with slight cascade offset
    const offset = (activePopups.length % 6) * 24;
    const defaultX =
        typeof window !== 'undefined'
            ? Math.max(20, Math.floor(window.innerWidth / 2 - 220) + offset)
            : 100 + offset;
    const defaultY =
        typeof window !== 'undefined'
            ? Math.max(40, Math.floor(window.innerHeight / 2 - 220) + offset)
            : 100 + offset;

    const existingIndex = activePopups.findIndex((p) => p.id === id);

    const newState: ActivePopupState = {
        ...options,
        id,
        position: options.defaultPosition || (existingIndex >= 0 ? activePopups[existingIndex].position : { x: defaultX, y: defaultY }),
        zIndex: highestZIndex,
    };

    if (existingIndex >= 0) {
        activePopups[existingIndex] = newState;
    } else {
        activePopups.push(newState);
    }

    notify();

    return {
        id,
        close: () => popup.close(id),
        focus: () => popup.focus(id),
    };
}

popup.close = function close(id: string) {
    const found = activePopups.find((p) => p.id === id);
    if (found) {
        found.onClose?.();
        activePopups = activePopups.filter((p) => p.id !== id);
        notify();
    }
};

popup.closeAll = function closeAll() {
    activePopups.forEach((p) => p.onClose?.());
    activePopups = [];
    notify();
};

popup.focus = function focus(id: string) {
    const p = activePopups.find((item) => item.id === id);
    if (p) {
        highestZIndex += 1;
        p.zIndex = highestZIndex;
        notify();
    }
};

/* -------------------------------------------------------------------------- */
/*                            DRAGGABLE POPUP ITEM                            */
/* -------------------------------------------------------------------------- */

function DraggablePopupWindow({
    item,
    onClose,
    onFocus,
}: {
    item: ActivePopupState;
    onClose: () => void;
    onFocus: () => void;
}) {
    const windowRef = useRef<HTMLDivElement>(null);
    const posRef = useRef<{ x: number; y: number }>(item.position);
    const handlePointerDown = (e: React.PointerEvent) => {
        if (item.draggable === false) return;
        if ((e.target as HTMLElement).closest('button')) return;

        onFocus();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        const initX = posRef.current.x;
        const initY = posRef.current.y;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            const nextX = Math.max(10, Math.min(window.innerWidth - 80, initX + dx));
            const nextY = Math.max(10, Math.min(window.innerHeight - 60, initY + dy));

            posRef.current = { x: nextX, y: nextY };

            if (windowRef.current) {
                windowRef.current.style.left = `${nextX}px`;
                windowRef.current.style.top = `${nextY}px`;
            }
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            item.position = posRef.current;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
    };

    const widthStyle = typeof item.width === 'number' ? `${item.width}px` : item.width || '440px';
    const heightStyle = typeof item.height === 'number' ? `${item.height}px` : item.height || 'auto';

    // Render content: support ReactNode, render function, or raw HTML strings
    let renderedContent: React.ReactNode;
    if (typeof item.content === 'function') {
        const result = item.content({ close: onClose });
        if (typeof result === 'string' && /<[a-z][\s\S]*>/i.test(result)) {
            renderedContent = <div dangerouslySetInnerHTML={{ __html: result }} />;
        } else {
            renderedContent = result;
        }
    } else if (typeof item.content === 'string' && /<[a-z][\s\S]*>/i.test(item.content)) {
        renderedContent = <div dangerouslySetInnerHTML={{ __html: item.content }} />;
    } else {
        renderedContent = item.content;
    }

    return (
        <div
            ref={windowRef}
            onMouseDown={onFocus}
            style={{
                position: 'fixed',
                left: `${posRef.current.x}px`,
                top: `${posRef.current.y}px`,
                width: widthStyle,
                height: heightStyle,
                zIndex: item.zIndex,
                maxHeight: 'calc(100vh - 40px)',
                boxShadow:
                    '0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(239, 68, 68, 0.25), 0 0 25px rgba(226, 56, 40, 0.12)',
            }}
            className="flex flex-col rounded-2xl border-2 border-slate-700/80 dark:border-red-500/30 bg-white dark:bg-slate-900 overflow-hidden select-none text-slate-900 dark:text-slate-100 ring-1 ring-black/10 dark:ring-white/10"
            role="dialog"
            aria-label={typeof item.title === 'string' ? item.title : 'Popup Window'}
        >
            {/* Draggable Header */}
            <div
                onPointerDown={handlePointerDown}
                className={`flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 touch-none relative ${
                    item.draggable !== false ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
            >
                {/* Subtle top red accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-400 shrink-0">
                        <Move className="w-3.5 h-3.5" />
                    </div>
                    {item.icon && <div className="text-red-500 shrink-0">{item.icon}</div>}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-extrabold uppercase tracking-wide truncate text-slate-900 dark:text-white">
                                {item.title}
                            </h3>
                            {item.subtitle && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 dark:border dark:border-red-800/50 px-2 py-0.5 rounded-full truncate">
                                    {item.subtitle}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition active:scale-95"
                        title="Close Window"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Dynamic Content Body */}
            <div className="flex-1 overflow-y-auto p-5 select-text text-sm leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {renderedContent}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                                REACT CONTAINER                             */
/* -------------------------------------------------------------------------- */

export function PopupContainer() {
    const [popups, setPopups] = useState<ActivePopupState[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        listeners.add(setPopups);
        notify();
        return () => {
            listeners.delete(setPopups);
        };
    }, []);

    if (!mounted || typeof document === 'undefined' || popups.length === 0) {
        return null;
    }

    return createPortal(
        <>
            {popups.map((p) => (
                <DraggablePopupWindow
                    key={p.id}
                    item={p}
                    onClose={() => popup.close(p.id)}
                    onFocus={() => popup.focus(p.id)}
                />
            ))}
        </>,
        document.body
    );
}
