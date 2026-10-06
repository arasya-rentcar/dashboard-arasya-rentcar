'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Eye, ArrowUpDown, BadgeCheck, Loader2 } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TablePagination from '@/components/dashboard/TablePagination';
import { useCustomers } from '@/hooks/useCustomers';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatCurrency, formatDate } from '@/lib/utils';

const PAGE_SIZE = 20;
// Same responsive visibility as the header cells, so the skeleton lines up.
const SKELETON_CELLS = [
  'hidden sm:table-cell',
  '',
  'hidden sm:table-cell',
  'hidden md:table-cell',
  'hidden lg:table-cell',
  '',
  'hidden md:table-cell',
  'hidden lg:table-cell',
  '',
];

export default function CustomersPage() {
  const t = useTranslations('customersPage');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('total_orders');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search.trim());
  const { data, isLoading, isFetching, isError, refetch } = useCustomers({
    search: debouncedSearch || undefined,
    sort,
    order: sort === 'name' ? 'asc' : 'desc',
    page,
    page_size: PAGE_SIZE,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const start = pagination ? (pagination.page - 1) * pagination.page_size : 0;

  // reset to page 1 on filter change
  const key = `${debouncedSearch}|${sort}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="pl-9 pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* Background refetch (search / sort / page): inline, no layout shift. */}
            {isFetching && !isLoading && (
              <Loader2
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
                aria-label={t('updating')}
              />
            )}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <ArrowUpDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_orders">{t('sortMostOrders')}</SelectItem>
                <SelectItem value="last_order_at">{t('sortMostRecent')}</SelectItem>
                <SelectItem value="name">{t('sortNameAz')}</SelectItem>
                <SelectItem value="created_at">{t('sortNewest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError && !data ? (
          <QueryError onRetry={() => refetch()} />
        ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <Th className="hidden w-12 sm:table-cell">{t('colNo')}</Th>
                <Th>{t('colName')}</Th>
                <Th className="hidden sm:table-cell">{t('colPhone')}</Th>
                <Th className="hidden md:table-cell">{t('colIdentity')}</Th>
                <Th className="hidden lg:table-cell">{t('colTags')}</Th>
                <Th className="text-right">{t('colOrders')}</Th>
                <Th className="hidden md:table-cell text-right">{t('colTotalSpent')}</Th>
                <Th className="hidden lg:table-cell">{t('colLastOrder')}</Th>
                <Th>{t('colActions')}</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    {SKELETON_CELLS.map((cls, j) => (
                      <TableCell key={j} className={cls}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    {t('noCustomers')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c, i) => (
                  <TableRow key={c.id} className="hover:bg-gray-50/50">
                    <TableCell className="hidden text-sm text-gray-400 tabular-nums sm:table-cell">
                      {start + i + 1}
                    </TableCell>
                    {/* Wraps: a long company name pushed Orders / View off a phone screen. */}
                    <TableCell className="min-w-[9rem] whitespace-normal break-words">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="font-medium text-sm text-blue-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.company_name && (
                        <p className="text-xs text-gray-400 max-w-56 truncate" title={c.company_name}>
                          {c.company_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden sm:table-cell whitespace-nowrap">
                      {c.phone}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.has_ktp ? (
                          <Badge
                            variant="outline"
                            title={c.id_number_masked ?? undefined}
                            className="text-[10px] bg-sky-50 text-sky-700 border-sky-200"
                          >
                            {t('hasKtp')}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-gray-50 text-gray-400 border-gray-200"
                          >
                            {t('noKtp')}
                          </Badge>
                        )}
                        {c.verified && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            <BadgeCheck className="h-3 w-3 mr-0.5" />
                            {t('verified')}
                          </Badge>
                        )}
                      </div>
                      {c.id_number_masked && (
                        <p className="hidden lg:block mt-1 font-mono text-[11px] text-gray-400">
                          {c.id_number_masked}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {c.tags?.length > 3 && (
                          <span className="text-[10px] text-gray-400">
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`tabular-nums ${
                          c.total_orders >= 10
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : c.total_orders >= 5
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {c.total_orders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 hidden md:table-cell text-right tabular-nums">
                      {formatCurrency(c.total_spent)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 hidden lg:table-cell">
                      {c.last_order_at ? formatDate(c.last_order_at) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/customers/${c.id}`} aria-label={`${t('view')} ${c.name}`}>
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">{t('view')}</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}

        {/* TablePagination lays itself out (stacked on phones); a sibling
            "updating" label used to squeeze it into a corner. */}
        {pagination && (
          <TablePagination
            page={pagination.page}
            pageCount={pagination.page_count}
            total={pagination.total}
            start={start}
            pageSize={pagination.page_size}
            onPageChange={setPage}
            label={t('paginationLabel')}
          />
        )}
      </div>
    </DashboardShell>
  );
}

function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={`text-xs font-medium text-gray-500 uppercase tracking-wide ${className}`}
    >
      {children}
    </TableHead>
  );
}
