'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';
import DashboardShell from '@/components/layout/DashboardShell';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TablePagination from '@/components/dashboard/TablePagination';
import QueryError from '@/components/dashboard/QueryError';
import {
  useExternalVendors,
  useCreateVendor,
} from '@/hooks/useExternalVendors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/utils';
import VendorExtraFields, {
  emptyVendorExtra,
  vendorExtraPayload,
  type VendorExtraForm,
} from '@/components/partners/VendorExtraFields';

const PAGE_SIZE = 20;

export default function ExternalVendorsPage() {
  const t = useTranslations('externalPage');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [extra, setExtra] = useState<VendorExtraForm>(emptyVendorExtra);

  const debouncedSearch = useDebouncedValue(search.trim());
  const { data, isLoading, isFetching, isError, refetch } = useExternalVendors({
    search: debouncedSearch || undefined,
    sort: 'order_count',
    order: 'desc',
    page,
    page_size: PAGE_SIZE,
  });
  const createMutation = useCreateVendor();

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const start = pagination ? (pagination.page - 1) * pagination.page_size : 0;

  const [lastSearch, setLastSearch] = useState(debouncedSearch);
  if (debouncedSearch !== lastSearch) {
    setLastSearch(debouncedSearch);
    setPage(1);
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (createMutation.isPending) return;
    if (!form.name.trim()) {
      toast.error(t('errNameRequired'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        ...vendorExtraPayload(extra),
      });
      toast.success(t('okCreated'));
      setForm({ name: '', phone: '', notes: '' });
      setExtra(emptyVendorExtra);
      setCreateOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:max-w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              type="search"
              aria-label={t('searchPlaceholder')}
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" /> {t('addVendor')}
          </Button>
        </div>

        {isError && !data ? (
          <QueryError onRetry={() => refetch()} />
        ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <Th className="hidden w-12 sm:table-cell">{t('colNo')}</Th>
                <Th>{t('colVendorDriver')}</Th>
                <Th className="hidden sm:table-cell">{t('colPhone')}</Th>
                <Th className="text-right">{t('colCars')}</Th>
                <Th className="text-right">{t('colOrders')}</Th>
                <Th>{t('colActions')}</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    {t('noVendors')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((v, i) => (
                  <TableRow key={v.id} className="hover:bg-gray-50/50">
                    <TableCell className="hidden text-sm text-gray-400 tabular-nums sm:table-cell">
                      {start + i + 1}
                    </TableCell>
                    <TableCell className="min-w-[11rem] whitespace-normal">
                      <Link
                        href={`/dashboard/external/${v.id}`}
                        className="font-medium text-sm text-blue-600 hover:underline"
                      >
                        {v.name}
                      </Link>
                      {(v.pic_name || v.area || v.notes) && (
                        <p
                          className="line-clamp-2 text-xs text-gray-400 sm:block sm:max-w-64 sm:truncate"
                          title={[v.pic_name, v.area, v.notes].filter(Boolean).join(' · ')}
                        >
                          {[v.pic_name, v.area, v.notes].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden sm:table-cell">
                      {v.phone || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="tabular-nums">
                        {v._count?.cars ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className="tabular-nums bg-purple-50 text-purple-700 border-purple-200"
                      >
                        {v._count?.orders ?? v.order_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/external/${v.id}`}>
                          <Eye className="h-4 w-4" /> <span className="sr-only sm:not-sr-only">{t('view')}</span>
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

        {pagination && (
          <div className="space-y-1">
            <p className="min-h-4 text-xs text-gray-400" aria-live="polite">
              {isFetching && !isLoading ? t('updating') : ''}
            </p>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('addExternalVendor')}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreate}>
            <div>
              <label htmlFor="vendor_name" className="text-xs font-medium text-gray-500">
                {t('nameRequired')}
              </label>
              <Input
                id="vendor_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="vendor_phone" className="text-xs font-medium text-gray-500">{t('phone')}</label>
              <Input
                id="vendor_phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08…"
              />
            </div>
            <VendorExtraFields value={extra} onChange={setExtra} />
            <div>
              <label htmlFor="vendor_notes" className="text-xs font-medium text-gray-500">{t('notes')}</label>
              <Input
                id="vendor_notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('optional')}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('creating') : t('createVendor')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
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
