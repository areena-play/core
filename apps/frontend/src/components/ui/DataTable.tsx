'use client';

import React, { useState, useMemo } from 'react';
import {
    ColumnDef,
    ColumnSort,
    SortingState,
    FilterFn,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
    HeaderContext,
    PaginationState,
    OnChangeFn,
} from '@tanstack/react-table';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    X,
} from 'lucide-react';

/**
 * Standard global search filter that inspects primitive values and custom text representations.
 */
const globalSearchFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemValue = row.getValue(columnId);
    if (itemValue == null) return false;

    const searchLower = String(value).toLowerCase().trim();
    if (!searchLower) return true;

    // Handle boolean strings
    if (typeof itemValue === 'boolean') {
        const boolText = itemValue ? 'yes true active verified' : 'no false inactive unverified pending';
        return boolText.includes(searchLower);
    }

    // Handle string, number, object stringification
    const str = typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue);
    return str.toLowerCase().includes(searchLower);
};

export interface DataTableProps<TData, TValue = any> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchPlaceholder?: string;
    showSearch?: boolean;
    searchSlot?: React.ReactNode;
    defaultPageSize?: number;
    pageSizeOptions?: number[];
    initialSorting?: SortingState;
    emptyMessage?: string;
    loading?: boolean;
    className?: string;
    onRowClick?: (row: TData) => void;

    // Server-side / controlled pagination support
    manualPagination?: boolean;
    pageCount?: number;
    totalCount?: number;
    pageIndex?: number;
    pageSize?: number;
    onPaginationChange?: (pageIndex: number, pageSize: number) => void;
}

/**
 * Helper component for sortable column headers with visual ascending / descending indicators.
 */
export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className = '',
}: {
    column: HeaderContext<TData, TValue>['column'];
    title: string | React.ReactNode;
    className?: string;
}) {
    if (!column.getCanSort()) {
        return <div className={`text-xs font-semibold ${className}`}>{title}</div>;
    }

    const isSorted = column.getIsSorted();

    return (
        <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className={`group inline-flex items-center gap-1.5 text-xs font-semibold hover:text-slate-900 dark:hover:text-white transition select-none ${
                isSorted
                    ? 'text-red-600 dark:text-red-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300'
            } ${className}`}
        >
            <span>{title}</span>
            <span className="p-0.5 rounded transition">
                {isSorted === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                ) : isSorted === 'desc' ? (
                    <ArrowDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                )}
            </span>
        </button>
    );
}

export function DataTable<TData, TValue = any>({
    columns,
    data,
    searchPlaceholder = 'Search records...',
    showSearch = true,
    searchSlot,
    defaultPageSize = 25,
    pageSizeOptions = [10, 25, 50, 100],
    initialSorting = [],
    emptyMessage = 'No records found.',
    loading = false,
    className = '',
    onRowClick,
    manualPagination = false,
    pageCount: controlledPageCount,
    totalCount: controlledTotalCount,
    pageIndex: controlledPageIndex,
    pageSize: controlledPageSize,
    onPaginationChange,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>(initialSorting);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [uncontrolledPagination, setUncontrolledPagination] = useState({
        pageIndex: 0,
        pageSize: defaultPageSize,
    });

    const activePageIndex = manualPagination ? (controlledPageIndex ?? 0) : uncontrolledPagination.pageIndex;
    const activePageSize = manualPagination ? (controlledPageSize ?? defaultPageSize) : uncontrolledPagination.pageSize;

    const pagination = useMemo(
        () => ({
            pageIndex: activePageIndex,
            pageSize: activePageSize,
        }),
        [activePageIndex, activePageSize]
    );

    const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
        const nextPagination = typeof updater === 'function' ? updater(pagination) : updater;
        if (manualPagination) {
            onPaginationChange?.(nextPagination.pageIndex, nextPagination.pageSize);
        } else {
            setUncontrolledPagination(nextPagination);
        }
    };

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        manualPagination,
        pageCount: manualPagination ? controlledPageCount : undefined,
        globalFilterFn: globalSearchFilter,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: handlePaginationChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const rows = table.getRowModel().rows;
    const totalFiltered = manualPagination
        ? (controlledTotalCount ?? data.length)
        : table.getFilteredRowModel().rows.length;
    const pageCount = manualPagination ? (controlledPageCount ?? 1) : table.getPageCount();
    const currentPage = activePageIndex + 1;
    const currentSize = activePageSize;

    const startRow = totalFiltered === 0 ? 0 : activePageIndex * activePageSize + 1;
    const endRow = Math.min((activePageIndex + 1) * activePageSize, totalFiltered);

    return (
        <div className={`space-y-3.5 ${className}`}>
            {/* Top Toolbar: Search & Action Slots */}
            {(showSearch || searchSlot) && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {showSearch && (
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={globalFilter ?? ''}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition shadow-sm"
                            />
                            {globalFilter && (
                                <button
                                    type="button"
                                    onClick={() => setGlobalFilter('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                    {searchSlot && <div className="flex items-center gap-2">{searchSlot}</div>}
                </div>
            )}

            {/* Table Container */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr
                                    key={headerGroup.id}
                                    className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60"
                                >
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {loading ? (
                                Array.from({ length: Math.min(activePageSize, 5) }).map((_, idx) => (
                                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                                        {columns.map((col, cIdx) => (
                                            <td key={`skeleton-td-${cIdx}`} className="px-4 py-3.5">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length > 0 ? (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => onRowClick?.(row.original)}
                                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                                            onRowClick ? 'cursor-pointer' : ''
                                        }`}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-4 py-3.5 align-middle">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-12 text-center text-slate-400 dark:text-slate-500"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search className="w-8 h-8 opacity-30 stroke-1" />
                                            <p>{emptyMessage}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Pagination & Page Size Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs text-slate-600 dark:text-slate-400">
                    {/* Item Count Information */}
                    <div className="flex items-center gap-4">
                        <span>
                            Showing <strong className="text-slate-900 dark:text-white">{startRow}</strong> to{' '}
                            <strong className="text-slate-900 dark:text-white">{endRow}</strong> of{' '}
                            <strong className="text-slate-900 dark:text-white">{totalFiltered}</strong> records
                        </span>

                        {/* Page Size Selector */}
                        {pageSizeOptions.length > 1 && (
                            <div className="flex items-center gap-1.5">
                                <span>Rows:</span>
                                <select
                                    value={currentSize}
                                    onChange={(e) => {
                                        table.setPageSize(Number(e.target.value));
                                    }}
                                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                                >
                                    {pageSizeOptions.map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="First Page"
                        >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                            Page <strong className="text-slate-900 dark:text-white">{pageCount === 0 ? 0 : currentPage}</strong> of{' '}
                            <strong className="text-slate-900 dark:text-white">{pageCount}</strong>
                        </span>

                        <button
                            type="button"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="Next Page"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="Last Page"
                        >
                            <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}