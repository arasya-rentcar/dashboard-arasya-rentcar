'use client';

import { useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface Column<T> {
  header: string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

interface Props<T> {
  title: string;
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  loading?: boolean;
  emptyText?: string;
  rowKey: (row: T, index: number) => string;
}

export default function PaginatedTable<T>({
  title,
  rows,
  columns,
  pageSize = 5,
  loading = false,
  emptyText = 'No data.',
  rowKey,
}: Props<T>) {
  const [page, setPage] = useState(0);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500">
          {title}
          {!loading && (
            <span className="ml-2 text-xs text-gray-400">({total})</span>
          )}
        </h2>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Page {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-lg border border-gray-200 p-1 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-lg border border-gray-200 p-1 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <Card className="shadow-none border border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(pageSize)].map((_, i) => (
                <div
                  key={i}
                  className="h-9 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : pageRows.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-12">
                    No
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.header}
                      className={`text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${col.className ?? ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={rowKey(row, start + i)}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-4 py-3 text-gray-400 tabular-nums">
                      {start + i + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.header}
                        className={`px-4 py-3 ${col.className ?? ''}`}
                      >
                        {col.cell(row, start + i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              {emptyText}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
