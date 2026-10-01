'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Eye, ArrowUpDown, BadgeCheck } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
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

export default function CustomersPage() {
  const t = useTranslations('customersPage');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('total_orders');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search.trim());
  const { data, isLoading, isFetching } = useCustomers({
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44">
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

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <Th className="w-12">{t('colNo')}</Th>
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
                    {[...Array(9)].map((__, j) => (
                      <TableCell key={j}>
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
                    <TableCell className="text-sm text-gray-400 tabular-nums">
                      {start + i + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="font-medium text-sm text-blue-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.company_name && (
                        <p className="text-xs text-gray-400 max-w-56 truncate">
                          {c.company_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden sm:table-cell">
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
                        <Link href={`/dashboard/customers/${c.id}`}>
                          <Eye className="h-4 w-4 mr-1" /> {t('view')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {isFetching ? t('updating') : ' '}
            </span>
            <TablePagination
              page={pagination.page}
              pageCount={pagination.page_count}
              total={pagination.total}
              start={start}
              pageSize={pagination.page_size}
              onPageChange={setPage}
              label={t('paginationLabel')}
            />
          </div>
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
