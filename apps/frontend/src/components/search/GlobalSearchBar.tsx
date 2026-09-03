'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    Search,
    User,
    Building2,
    Trophy,
    Network,
    FileText,
    ArrowRight,
    X,
    Loader2,
    CornerDownLeft,
    Calculator,
    BookOpen,
    HelpCircle,
    Code2,
    Table as TableIcon,
    Activity,
    Megaphone,
    Settings,
} from 'lucide-react';

interface GlobalSearchResult {
    type: 'person' | 'club' | 'competition' | 'association' | 'page';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    badge?: string;
    avatarUrl?: string;
}

interface GlobalSearchBarProps {
    className?: string;
    placeholder?: string;
    onSelect?: () => void;
    compact?: boolean;
}

export function GlobalSearchBar({
    className = '',
    placeholder = 'Search people, clubs, competitions, tools...',
    onSelect,
    compact = false,
}: GlobalSearchBarProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GlobalSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounced search query
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await api.globalSearch(trimmed);
                setResults(data?.results || []);
                setSelectedIndex(0);
            } catch (err) {
                console.error('Global search error:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [query]);

    // Click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global keyboard shortcut Ctrl+K / Cmd+K to focus search bar
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsOpen(true);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSelectResult = (item: GlobalSearchResult) => {
        setIsOpen(false);
        setQuery('');
        if (onSelect) onSelect();
        router.push(item.href);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelectResult(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const renderTypeIcon = (item: GlobalSearchResult) => {
        if (item.type === 'person') return <User className="h-4 w-4 text-red-500" />;
        if (item.type === 'club') return <Building2 className="h-4 w-4 text-blue-500" />;
        if (item.type === 'competition') return <Trophy className="h-4 w-4 text-amber-500" />;
        if (item.type === 'association') return <Network className="h-4 w-4 text-purple-500" />;

        // Specific utility & page icons
        if (item.href.includes('/elo-calculator')) return <Calculator className="h-4 w-4 text-emerald-500" />;
        if (item.href === '/manual') return <BookOpen className="h-4 w-4 text-indigo-500" />;
        if (item.href === '/support') return <HelpCircle className="h-4 w-4 text-amber-500" />;
        if (item.href === '/developers' || item.href === '/developer-api') return <Code2 className="h-4 w-4 text-cyan-500" />;
        if (item.href.includes('/level-table')) return <TableIcon className="h-4 w-4 text-teal-500" />;
        if (item.href === '/audit-trail') return <Activity className="h-4 w-4 text-rose-500" />;
        if (item.href === '/notices') return <Megaphone className="h-4 w-4 text-blue-500" />;
        if (item.href === '/profile') return <Settings className="h-4 w-4 text-slate-400" />;

        return <FileText className="h-4 w-4 text-slate-400" />;
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Input Container */}
            <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 pl-10 pr-12 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition shadow-xs ${
                        compact ? 'py-1.5' : 'py-2'
                    }`}
                />

                <div className="absolute right-3 flex items-center gap-1.5">
                    {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setResults([]);
                            }}
                            className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                            ⌘K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Results Dropdown */}
            {isOpen && query.trim().length >= 2 && (
                <div className="absolute left-0 top-full mt-2 z-50 w-full min-w-0 max-w-full md:min-w-[480px] lg:min-w-[580px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[28rem] overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="space-y-1">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 mb-1 pb-2">
                                <span>Site-wide Results ({results.length})</span>
                                <span className="text-[9px] font-normal lowercase flex items-center gap-1">
                                    <CornerDownLeft className="h-2.5 w-2.5" /> to open
                                </span>
                            </div>

                            {results.map((item, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <button
                                        key={`${item.type}-${item.id}`}
                                        type="button"
                                        onClick={() => handleSelectResult(item)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                                            isSelected
                                                ? 'bg-red-50 dark:bg-red-950/40 text-slate-900 dark:text-white'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                                                    isSelected
                                                        ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/80 shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                {renderTypeIcon(item)}
                                            </div>
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                        {item.title}
                                                    </span>
                                                    {item.badge && (
                                                        <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 uppercase">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.subtitle && (
                                                    <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">
                                                        {item.subtitle}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <ArrowRight
                                            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                                                isSelected
                                                    ? 'text-red-600 dark:text-red-400 translate-x-0.5'
                                                    : 'text-slate-300 dark:text-slate-600'
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        !loading && (
                            <div className="py-8 px-4 text-center">
                                <Search className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    No matches found
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Try searching by name, club code, license ID, or competition
                                </p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}