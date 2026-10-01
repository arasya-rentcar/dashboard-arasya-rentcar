'use client';

import { Fragment, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Search,
  Eye,
  X,
  Download,
  Upload,
  RefreshCw,
  Star,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Card, CardContent } from '@/components/ui/card';
import CreateOrderForm, { type CreateOrderPrefill } from '@/components/forms/CreateOrderForm';
import { useLead } from '@/hooks/useLeads';
import OrderInvoiceHistory from '@/components/orders/OrderInvoiceHistory';
import TablePagination from '@/components/dashboard/TablePagination';
import { useOrdersSearch, useCreateOrder } from '@/hooks/useOrders';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ordersApi } from '@/lib/api';
import {
  usePreviewSheetImport,
  useRunSheetImport,
} from '@/hooks/useFinalOrders';
import {
  useOrderFilters,
  useFilterPresets,
  DEFAULT_FILTERS,
} from '@/hooks/useOrderFilters';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
  exportToCsv,
} from '@/lib/utils';
import { OrderStatus } from '@/types';
import { ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES } from '@/lib/statusStyles';

const PAGE_SIZE = 20;

const ORDER_STATUS_KEYS: Record<OrderStatus, string> = {
  CREATED: 'statusCreated',
  ASSIGNED: 'statusAssigned',
  IN_PROGRESS: 'statusInProgress',
  DONE: 'statusDone',
  CANCELLED: 'statusCancelled',
};

const PAYMENT_STATUS_KEYS: Record<string, string> = {
  UNPAID: 'payUnpaid',
  DP_PAID: 'payDpPaid',
  PAID: 'payPaid',
};

function OrdersPageInner() {
  const t = useTranslations('ordersPage');
  const { filters, setFilter, setFilters, clear, hasActive } =
    useOrderFilters();
  const { presets, savePreset, deletePreset } = useFilterPresets();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const [presetName, setPresetName] = useState('');

  const createMutation = useCreateOrder();

  // Lead Website → "Buat order": /dashboard/orders?lead=<id> opens the create
  // dialog prefilled from the website booking request.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // Captured once on arrival: the filter hook rewrites the query string, so the
  // param itself does not survive until the lead has loaded.
  const [leadId, setLeadId] = useState(() => searchParams.get('lead'));
  const { data: lead } = useLead(leadId);
  const [prefill, setPrefill] = useState<CreateOrderPrefill | null>(null);
  useEffect(() => {
    if (!lead || lead.status !== 'NEW') return;
    const extras = [
      lead.unit && `Unit diminta: ${lead.unit}`,
      lead.passenger_count && `Penumpang: ${lead.passenger_count}`,
      lead.duration && `Durasi: ${lead.duration}`,
      lead.notes,
      `Lead website ${lead.lead_code}`,
    ].filter(Boolean);
    setPrefill({
      webLeadId: lead.id,
      leadCode: lead.lead_code,
      customerName: lead.name,
      serviceDate: lead.trip_date ?? undefined,
      startAt: lead.trip_date && lead.pickup_time ? `${lead.trip_date}T${lead.pickup_time}` : undefined,
      pickup: lead.pickup_location,
      dropoff: lead.destination ?? undefined,
      notes: extras.join('\n'),
    });
    setCreateOpen(true);
  }, [lead]);
  function clearLeadParam() {
    if (!leadId) return;
    setLeadId(null);
    setPrefill(null);
    if (searchParams.has('lead')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('lead');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }
  const previewMutation = usePreviewSheetImport();
  const importMutation = useRunSheetImport();
  const [exportingAll, setExportingAll] = useState(false);

  // Debounce the free-text search so we don't hit the API on every keystroke.
  // The Input stays bound to filters.search (instant + URL-synced); only the
  // value that drives the query/page-reset is debounced.
  const debouncedSearch = useDebouncedValue(filters.search ?? '');
  const queryFilters = { ...filters, search: debouncedSearch };

  // Reset to page 1 whenever the effective (debounced) filters change.
  const filterKey = JSON.stringify(queryFilters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, isError, isFetching, refetch } = useOrdersSearch({
    ...queryFilters,
    page,
    page_size: PAGE_SIZE,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  const start = pagination ? (pagination.page - 1) * pagination.page_size : 0;

  async function handleCreate(
    payload: Parameters<typeof createMutation.mutateAsync>[0] & {
      additionals?: {
        type: string;
        description: string;
        amount: number;
        quantity?: number;
        is_billable?: boolean;
      }[];
    },
  ) {
    try {
      const { additionals, ...orderPayload } = payload;
      const created = await createMutation.mutateAsync(orderPayload);
      const orderId = created?.id;
      let failedAdjustments = 0;
      let totalAdjustments = 0;
      if (orderId && additionals && additionals.length) {
        totalAdjustments = additionals.length;
        for (const adj of additionals) {
          try {
            await ordersApi.addAdjustment(orderId, adj);
          } catch {
            failedAdjustments += 1;
            toast.error(t('errAddAdditional', { desc: adj.description }));
          }
        }
      }
      // Don't claim full success if some charges silently failed — the order
      // exists but is financially incomplete. Surface a blocking warning so the
      // admin knows to open the order and retry the missing charges.
      if (failedAdjustments > 0) {
        toast.warning(
          t('warnOrderPartialCharges', {
            failed: failedAdjustments,
            total: totalAdjustments,
          }),
        );
      } else {
        toast.success(t('okOrderCreated'));
      }
      setCreateOpen(false);
      if (orderPayload.web_lead_id) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        clearLeadParam();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handlePreview() {
    try {
      const d = await previewMutation.mutateAsync({});
      toast.success(
        t('okPreview', { rows: d.meaningful_rows, warnings: d.warning_count }),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleImport() {
    try {
      const d = await importMutation.mutateAsync({});
      toast.success(
        t('okImported', { imported: d.imported, updated: d.updated, warnings: d.warning_count }),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const toCsvRow = (
    o: (typeof rows)[number],
    index: number,
  ): Record<string, unknown> => ({
    no: index + 1,
    order_id: o.id,
    order_code: o.order_code ?? '',
    source: o.source ?? 'WEB',
    customer: o.customer_name,
    phone: o.customer_phone,
    pickup: o.pickup_location,
    dropoff: o.dropoff_location,
    order_date: o.order_date ? formatDate(o.order_date) : '',
    service_date: o.service_start_at ? formatDate(o.service_start_at) : '',
    status: o.order_status,
    payment: o.payment_status,
    final_price: o.final_price,
    total_user: o.final_finance?.total_user_amount ?? '',
    ops_cost: o.final_finance?.total_ops_cost ?? '',
    driver_cost: o.final_finance?.total_driver_amount ?? '',
    margin: o.final_finance?.margin_amount ?? '',
    invoice_no: o.final_finance?.invoice_no_raw ?? '',
  });

  function handleExport() {
    if (!rows.length) {
      toast.error(t('errNothingExportPage'));
      return;
    }
    const csvRows = rows.map((o, i) => toCsvRow(o, start + i));
    exportToCsv(`arasya-orders-${new Date().toISOString().slice(0, 10)}`, csvRows);
    toast.success(t('okExportedPage', { count: csvRows.length }));
  }

  async function handleExportAll() {
    setExportingAll(true);
    try {
      const FETCH_SIZE = 200;
      let p = 1;
      let pageCount = 1;
      const all: (typeof rows)[number][] = [];
      do {
        const res = await ordersApi.search({
          ...filters,
          page: p,
          page_size: FETCH_SIZE,
        } as Record<string, string | number | undefined>);
        const batch = (res.data.data ?? []) as (typeof rows)[number][];
        all.push(...batch);
        pageCount = res.data.pagination?.page_count ?? 1;
        p += 1;
      } while (p <= pageCount);

      if (!all.length) {
        toast.error(t('errNoMatchingExport'));
        return;
      }
      const csvRows = all.map((o, i) => toCsvRow(o, i));
      exportToCsv(
        `arasya-orders-all-${new Date().toISOString().slice(0, 10)}`,
        csvRows,
      );
      toast.success(t('okExportedAll', { count: csvRows.length }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExportingAll(false);
    }
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) {
      toast.error(t('errPresetName'));
      return;
    }
    savePreset(name, filters);
    setPresetName('');
    toast.success(t('okPresetSaved', { name }));
  }

  const num = (v?: string | number | null) => Number(v ?? 0);

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: t('sumOrders'), value: String(summary.count) },
      { label: t('sumTurnover'), value: formatCurrency(num(summary.final_price_total)) },
      {
        label: t('sumUserTotal'),
        value: formatCurrency(num(summary.total_user_amount)),
      },
      { label: t('sumOpsCost'), value: formatCurrency(num(summary.total_ops_cost)) },
      {
        label: t('sumDriverCost'),
        value: formatCurrency(num(summary.total_driver_amount)),
      },
      { label: t('sumMargin'), value: formatCurrency(num(summary.margin_amount)) },
    ];
  }, [summary, t]);

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> {t('exportPage')}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportAll}
              disabled={exportingAll}
            >
              {exportingAll ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('exportAll')}
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" /> {t('previewSheet')}
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t('importSheet')}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t('createOrder')}
            </Button>
          </div>
        </div>

        {/* Bucket chips */}
        <div className="flex flex-wrap gap-2">
          {[
            ['ALL', t('bucketAll')],
            ['ACTIVE', t('bucketActive')],
            ['AWAITING_FINAL', t('bucketAwaitingFinal')],
            ['MISSING_INVOICE', t('bucketMissingInvoice')],
            ['NOT_FINAL', t('bucketNotFinal')],
            ['CANCELLED', t('bucketCancelled')],
            ['REFUNDED', t('bucketRefunded')],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter('bucket', val)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                filters.bucket === val
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <FilterSelect
            label={t('filterStatus')}
            value={filters.order_status}
            onChange={(v) => setFilter('order_status', v)}
            options={[
              ['ALL', t('allStatus')],
              ['CREATED', t('statusCreated')],
              ['ASSIGNED', t('statusAssigned')],
              ['IN_PROGRESS', t('statusInProgress')],
              ['DONE', t('statusDone')],
              ['CANCELLED', t('statusCancelled')],
            ]}
          />
          <FilterSelect
            label={t('filterPayment')}
            value={filters.payment_status}
            onChange={(v) => setFilter('payment_status', v)}
            options={[
              ['ALL', t('allPayment')],
              ['UNPAID', t('payUnpaid')],
              ['DP_PAID', t('payDpPaid')],
              ['PAID', t('payPaid')],
            ]}
          />
          <FilterSelect
            label={t('filterSource')}
            value={filters.source}
            onChange={(v) => setFilter('source', v)}
            options={[
              ['ALL', t('allSources')],
              ['WEB', t('sourceWeb')],
              ['WHATSAPP', t('sourceWhatsapp')],
              ['IMPORT', t('sourceImport')],
            ]}
          />
          <FilterSelect
            label={t('filterFinance')}
            value={filters.has_finance}
            onChange={(v) => setFilter('has_finance', v)}
            options={[
              ['ALL', t('allFinance')],
              ['true', t('hasFinance')],
              ['false', t('noFinance')],
            ]}
          />
          <FilterSelect
            label={t('filterDateField')}
            value={filters.date_field}
            onChange={(v) => setFilter('date_field', v)}
            width="w-40"
            options={[
              ['order_date', t('fieldOrderDate')],
              ['service_start_at', t('fieldServiceDate')],
            ]}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t('from')}</label>
            <Input
              type="date"
              className="w-40"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t('to')}</label>
            <Input
              type="date"
              className="w-40"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
            />
          </div>
          {hasActive && (
            <Button variant="outline" size="sm" onClick={clear}>
              <X className="h-3.5 w-3.5 mr-1" /> {t('clear')}
            </Button>
          )}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{t('presets')}</span>
          {presets.length === 0 && (
            <span className="text-xs text-gray-400">{t('noneSaved')}</span>
          )}
          {presets.map((p) => (
            <span
              key={p.name}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white pl-2.5 pr-1 py-0.5 text-xs"
            >
              <button
                type="button"
                className="font-medium text-gray-700 hover:text-gray-900"
                onClick={() => setFilters({ ...DEFAULT_FILTERS, ...p.filters })}
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => deletePreset(p.name)}
                className="text-gray-300 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Input
              placeholder={t('saveCurrentAs')}
              className="h-7 w-44 text-xs"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={handleSavePreset}>
              <Star className="h-3.5 w-3.5 mr-1" /> {t('save')}
            </Button>
          </div>
        </div>

        {/* Summary totals */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {summaryCards.map((c) => (
              <Card key={c.label} className="shadow-none border border-gray-200">
                <CardContent className="p-3">
                  <p className="text-xs text-gray-400">{c.label}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {c.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <Th className="w-8"></Th>
                <Th className="w-12">{t('colNo')}</Th>
                <Th>{t('colCustomer')}</Th>
                <Th className="hidden lg:table-cell">{t('colRoute')}</Th>
                <Th className="hidden lg:table-cell">{t('colDate')}</Th>
                <Th>{t('colStatus')}</Th>
                <Th className="hidden sm:table-cell">{t('colPayment')}</Th>
                <Th className="hidden md:table-cell">{t('colSource')}</Th>
                <Th className="hidden lg:table-cell text-right">{t('colPrice')}</Th>
                <Th className="hidden xl:table-cell text-right">{t('colMargin')}</Th>
                <Th>{t('colActions')}</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(11)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={11} className="p-4">
                    <QueryError onRetry={() => refetch()} compact />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    {t('noOrders')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((order, idx) => (
                  <Fragment key={order.id}>
                  <TableRow className="hover:bg-gray-50/50">
                    <TableCell className="w-8 pr-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        aria-label={expanded.has(order.id) ? 'Collapse' : 'Expand'}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        {expanded.has(order.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-gray-400 tabular-nums">
                      {start + idx + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-medium text-sm text-blue-600 hover:underline"
                      >
                        {order.customer_name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {order.invoice_missing && (
                          <span className="inline-flex rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                            {t('tagNoInvoice')}
                          </span>
                        )}
                        {order.is_refunded && (
                          <span className="inline-flex rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            {t('tagRefund')}
                          </span>
                        )}
                        {order.order_status !== 'CANCELLED' &&
                          order.is_final === false && (
                            <span className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              {t('tagNotFinal')}
                            </span>
                          )}
                        {order.is_final && (
                          <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            {t('tagFinal')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {order.customer_phone}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden lg:table-cell max-w-48 truncate">
                      {order.pickup_location} → {order.dropoff_location}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden lg:table-cell">
                      {order.order_date ? formatDate(order.order_date) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${ORDER_STATUS_STYLES[order.order_status]}`}
                      >
                        {t(ORDER_STATUS_KEYS[order.order_status])}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={`text-xs ${PAYMENT_STATUS_STYLES[order.payment_status]}`}
                      >
                        {PAYMENT_STATUS_KEYS[order.payment_status]
                          ? t(PAYMENT_STATUS_KEYS[order.payment_status])
                          : order.payment_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <SourceBadge source={order.source} />
                        {order.final_finance && (
                          <span
                            title="Has imported sheet finance data"
                            className="inline-flex items-center rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700"
                          >
                            ₱
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900 hidden lg:table-cell text-right">
                      {formatCurrency(order.final_price)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 hidden xl:table-cell text-right">
                      {order.final_finance?.margin_amount
                        ? formatCurrency(order.final_finance.margin_amount)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Eye className="h-4 w-4 mr-1" /> {t('view')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded.has(order.id) && (
                    <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                      <TableCell colSpan={11} className="p-0">
                        <OrderInvoiceHistory order={order} />
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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

      {/* Create Order Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) clearLeadParam();
        }}
      >
        <DialogContent className="!w-[96vw] !max-w-[1500px] max-h-[96vh] overflow-hidden p-4 sm:p-5 lg:p-6">
          <DialogHeader>
            <DialogTitle>{t('createNewOrder')}</DialogTitle>
          </DialogHeader>
          <CreateOrderForm
            key={prefill?.webLeadId ?? 'blank'}
            prefill={prefill}
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
  width = 'w-36',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  width?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={width}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([val, lbl]) => (
            <SelectItem key={val} value={val}>
              {lbl}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SourceBadge({ source }: { source?: string }) {
  const t = useTranslations('ordersPage');
  const s = source ?? 'WEB';
  const map: Record<string, string> = {
    WEB: 'bg-blue-50 text-blue-700 border-blue-200',
    WHATSAPP: 'bg-green-50 text-green-700 border-green-200',
    IMPORT: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const label: Record<string, string> = {
    WEB: t('badgeWeb'),
    WHATSAPP: t('badgeWa'),
    IMPORT: t('badgeSheet'),
  };
  return (
    <Badge variant="outline" className={`text-xs ${map[s] ?? map.WEB}`}>
      {label[s] ?? s}
    </Badge>
  );
}
