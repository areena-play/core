'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18nContext';
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
    Calculator,
    BookOpen,
    HelpCircle,
    Code2,
    Table as TableIcon,
    Activity,
    Clock,
    Sparkles,
    Tag,
    ChevronRight,
    SlidersHorizontal,
    Layers,
    Shield,
    LayoutGrid,
    List,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/ui/DataTable';

interface GlobalSearchResult {
    type: 'person' | 'club' | 'competition' | 'association' | 'page';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    badge?: string;
    avatarUrl?: string;
}

const TRENDING_SUGGESTIONS = [
    { label: 'Elo Calculator', query: 'Elo Calculator', icon: Calculator },
    { label: 'Level Table', query: 'Level Table', icon: TableIcon },
    { label: 'Tournaments', query: 'Tournament', icon: Trophy },
    { label: 'NLA League', query: 'NLA', icon: Trophy },
    { label: 'User Manual', query: 'Manual', icon: BookOpen },
    { label: 'Swiss Table Tennis', query: 'STT', icon: Network },
    { label: 'Clubs', query: 'Club', icon: Building2 },
    { label: 'Licenses', query: 'License', icon: Shield },
];

function SearchPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const initialType = searchParams.get('type') || 'all';

    const { t } = useI18n();

    const [query, setQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<string>(initialType);
    const [results, setResults] = useState<GlobalSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('auto');

    // Load recent searches from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('areena_recent_searches');
            if (saved) {
                setRecentSearches(JSON.parse(saved).slice(0, 6));
            }
        } catch {}
    }, []);

    const saveRecentSearch = (term: string) => {
        const trimmed = term.trim();
        if (!trimmed || trimmed.length < 2) return;
        try {
            const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
            setRecentSearches(updated);
            localStorage.setItem('areena_recent_searches', JSON.stringify(updated));
        } catch {}
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        try {
            localStorage.removeItem('areena_recent_searches');
        } catch {}
    };

    // Perform search when query changes (fetches full results)
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
                const data = await api.globalSearch(trimmed, { full: true });
                setResults(data?.results || []);
                saveRecentSearch(trimmed);

                // Sync URL query without full reload
                const url = new URL(window.location.href);
                url.searchParams.set('q', trimmed);
                if (activeTab !== 'all') {
                    url.searchParams.set('type', activeTab);
                } else {
                    url.searchParams.delete('type');
                }
                window.history.replaceState({}, '', url.toString());
            } catch (err) {
                console.error('Search error:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [query]);

    // Filter results by active category tab
    const filteredResults = useMemo(() => {
        if (activeTab === 'all') return results;
        return results.filter((r) => r.type === activeTab);
    }, [results, activeTab]);

    const countsByType = useMemo(() => {
        return {
            all: results.length,
            person: results.filter((r) => r.type === 'person').length,
            club: results.filter((r) => r.type === 'club').length,
            competition: results.filter((r) => r.type === 'competition').length,
            association: results.filter((r) => r.type === 'association').length,
            page: results.filter((r) => r.type === 'page').length,
        };
    }, [results]);

    const isTableView = viewMode === 'table' || (viewMode === 'auto' && results.length > 12);

    const handleSelectSuggestion = (suggestion: string) => {
        setQuery(suggestion);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'person':
                return <User className="h-4 w-4 text-blue-500" />;
            case 'club':
                return <Building2 className="h-4 w-4 text-emerald-500" />;
            case 'competition':
                return <Trophy className="h-4 w-4 text-amber-500" />;
            case 'association':
                return <Network className="h-4 w-4 text-red-500" />;
            case 'page':
            default:
                return <Sparkles className="h-4 w-4 text-purple-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'person':
                return 'Athlete / Member';
            case 'club':
                return 'Club';
            case 'competition':
                return 'Competition / Tournament';
            case 'association':
                return 'Association / Federation';
            case 'page':
                return 'Tool / Guide';
            default:
                return 'Item';
        }
    };

    const searchColumns = useMemo<ColumnDef<GlobalSearchResult>[]>(
        () => [
            {
                id: 'title',
                accessorFn: (item) => `${item.title} ${item.badge || ''} ${item.subtitle || ''}`,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Item / Name" />,
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className="flex items-center gap-3 py-1">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                {item.avatarUrl ? (
                                    <div className="relative h-9 w-9 rounded-xl overflow-hidden">
                                        <Image src={item.avatarUrl} alt={item.title} fill className="object-cover" />
                                    </div>
                                ) : (
                                    getTypeIcon(item.type)
                                )}
                            </div>
                            <div className="min-w-0">
                                <Link
                                    href={item.href}
                                    className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 block truncate transition hover:underline"
                                >
                                    {item.title}
                                </Link>
                                {item.subtitle && (
                                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                        {item.subtitle}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'type',
                accessorFn: (item) => item.type,
                header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {getTypeLabel(item.type)}
                            </span>
                            {item.badge && (
                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-bold font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 uppercase">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'details',
                accessorFn: (item) => item.subtitle || '',
                header: ({ column }) => <DataTableColumnHeader column={column} title="Details / Info" />,
                cell: ({ row }) => (
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate block max-w-md">
                        {row.original.subtitle || '—'}
                    </span>
                ),
            },
            {
                id: 'action',
                accessorFn: () => '',
                enableSorting: false,
                enableGlobalFilter: false,
                header: () => <span className="sr-only">Action</span>,
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className="flex justify-end">
                            <Link
                                href={item.href}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200/60 dark:border-red-800/60 transition shadow-2xs whitespace-nowrap"
                            >
                                <span>Open</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    );
                },
            },
        ],
        []
    );

    const categoryTabsSlot = useMemo(
        () => (
            <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                        { id: 'all', label: 'All Results', count: countsByType.all },
                        { id: 'person', label: 'Athletes & Members', count: countsByType.person },
                        { id: 'club', label: 'Clubs', count: countsByType.club },
                        { id: 'competition', label: 'Competitions & Tournaments', count: countsByType.competition },
                        { id: 'association', label: 'Federations', count: countsByType.association },
                        { id: 'page', label: 'Tools & Manual', count: countsByType.page },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono ${
                                    activeTab === tab.id
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-0.5">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition ${
                            !isTableView
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title="Grid View"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded-lg transition ${
                            isTableView
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title="Table View"
                    >
                        <List className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        ),
        [activeTab, countsByType, isTableView]
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                    <Search className="h-6 w-6 text-red-500" />
                    <span>Universal Sports Search</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Find licensed players, regional clubs, tournaments, federation bodies, rating tools, and rulebooks.
                </p>
            </div>

            {/* Main Interactive Search Input */}
            <div className="relative">
                <div className="relative flex items-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus-within:border-red-500 dark:focus-within:border-red-500 transition">
                    <div className="pl-4 pr-2 text-slate-400">
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                        ) : (
                            <Search className="h-5 w-5" />
                        )}
                    </div>

                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by player name, license number, club, tournament, city, or tool..."
                        className="w-full bg-transparent py-4 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:outline-none focus:ring-0 ring-0 border-none shadow-none"
                    />

                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="mr-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Trending & Recent Searches Bar (When query is empty or short) */}
            {query.trim().length < 2 && (
                <div className="space-y-6">
                    {/* Trending Quick Suggestions */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>Suggested & Popular Searches</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {TRENDING_SUGGESTIONS.map((s, idx) => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectSuggestion(s.query)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-red-500 hover:text-red-600 dark:hover:border-red-500 dark:hover:text-red-400 transition shadow-2xs"
                                    >
                                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Recent Searches</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearRecentSearches}
                                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    Clear history
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((term, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectSuggestion(term)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        <span>{term}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Results Section */}
            {query.trim().length >= 2 && (
                <div className="space-y-5">
                    {/* Results Content */}
                    {loading ? (
                        <div className="py-12 text-center space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto" />
                            <p className="text-xs text-slate-500">Searching across all AREENA database records...</p>
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className="space-y-4">
                            {categoryTabsSlot}
                            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-10 text-center space-y-3">
                                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                                    <Search className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    No results found for &ldquo;{query}&rdquo;
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Try checking for spelling errors, searching by license ID number, or selecting another category filter.
                                </p>
                            </div>
                        </div>
                    ) : isTableView ? (
                        /* DATA TABLE VIEW (Rendered when results > 12 or user selected Table View) */
                        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/80">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Search Directory ({filteredResults.length} matches)
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Showing complete indexed results across the platform
                                    </p>
                                </div>
                            </div>

                            <DataTable
                                columns={searchColumns}
                                data={filteredResults}
                                searchPlaceholder="Filter results by keyword, city, license..."
                                searchSlot={categoryTabsSlot}
                                defaultPageSize={10}
                                pageSizeOptions={[10, 20, 50, 100]}
                                emptyMessage="No items match your category selection."
                            />
                        </div>
                    ) : (
                        /* CARD GRID VIEW (Rendered when results <= 12 or user selected Grid View) */
                        <div className="space-y-4">
                            {categoryTabsSlot}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredResults.map((item, idx) => (
                                    <Link
                                        key={item.id || idx}
                                        href={item.href}
                                        className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 hover:border-red-500/60 dark:hover:border-red-500/60 hover:shadow-md transition shadow-2xs"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                                {item.avatarUrl ? (
                                                    <div className="relative h-10 w-10 rounded-xl overflow-hidden">
                                                        <Image
                                                            src={item.avatarUrl}
                                                            alt={item.title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    getTypeIcon(item.type)
                                                )}
                                            </div>

                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        {getTypeLabel(item.type)}
                                                    </span>
                                                    {item.badge && (
                                                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition truncate">
                                                    {item.title}
                                                </h3>

                                                {item.subtitle && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {item.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-2 rounded-lg text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition shrink-0 self-center">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <div className="py-20 text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto" />
                    <p className="text-xs text-slate-500">Loading search...</p>
                </div>
            }
        >
            <SearchPageContent />
        </Suspense>
    );
}

