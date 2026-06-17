'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination hook. Returns the current page slice plus controls.
 * Auto-clamps the page when the underlying list shrinks (e.g. filtering).
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize],
  );
  return {
    page: safePage,
    setPage,
    pageCount,
    total,
    start,
    pageItems,
  };
}

interface Props {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export default function TablePagination({
  page,
  pageCount,
  total,
  start,
  pageSize,
  onPageChange,
  label = 'items',
}: Props) {
  if (total === 0) return null;
  const from = start + 1;
  const to = Math.min(start + pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-1">
      <p className="text-xs text-gray-400">
        Showing <span className="font-medium text-gray-600">{from}</span>–
        <span className="font-medium text-gray-600">{to}</span> of{' '}
        <span className="font-medium text-gray-600">{total}</span> {label}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-xs text-gray-500">
            Page {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            disabled={page >= pageCount}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
