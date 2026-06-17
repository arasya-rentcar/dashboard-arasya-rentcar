'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardShell from '@/components/layout/DashboardShell';
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
import CreateOrderForm from '@/components/forms/CreateOrderForm';
import TablePagination from '@/components/dashboard/TablePagination';
import { useOrdersSearch, useCreateOrder } from '@/hooks/useOrders';
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
import { OrderStatus, PaymentStatus } from '@/types';

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  CREATED: 'bg-gray-100 text-gray-700 border-gray-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-50 text-red-700 border-red-200',
  DP_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PAGE_SIZE = 20;

function OrdersPageInner() {
  const { filters, setFilter, setFilters, clear, hasActive } =
    useOrderFilters();
  const { presets, savePreset, deletePreset } = useFilterPresets();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const createMutation = useCreateOrder();
  const previewMutation = usePreviewSheetImport();
  const importMutation = useRunSheetImport();

  // Reset to page 1 whenever filters change.
  const filterKey = JSON.stringify(filters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, isFetching } = useOrdersSearch({
    ...filters,
    page,
    page_size: PAGE_SIZE,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  const start = pagination ? (pagination.page - 1) * pagination.page_size : 0;

  async function handleCreate(
    payload: Parameters<typeof createMutation.mutateAsync>[0],
  ) {
    try {
      await createMutation.mutateAsync(payload);
      toast.success('Order created successfully');
      setCreateOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handlePreview() {
    try {
      const d = await previewMutation.mutateAsync({});
      toast.success(
        `Preview: ${d.meaningful_rows} rows, ${d.warning_count} warnings`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleImport() {
    try {
      const d = await importMutation.mutateAsync({});
      toast.success(
        `Imported ${d.imported}, updated ${d.updated}, warnings ${d.warning_count}`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleExport() {
    if (!rows.length) {
      toast.error('Nothing to export on this page.');
      return;
    }
    const csvRows = rows.map((o, i) => ({
      no: start + i + 1,
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
    }));
    exportToCsv(`arasya-orders-${new Date().toISOString().slice(0, 10)}`, csvRows);
    toast.success(`Exported ${csvRows.length} rows (current page).`);
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) {
      toast.error('Enter a preset name.');
      return;
    }
    savePreset(name, filters);
    setPresetName('');
    toast.success(`Preset "${name}" saved.`);
  }

  const num = (v?: string | number | null) => Number(v ?? 0);

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Orders', value: String(summary.count) },
      { label: 'Turnover', value: formatCurrency(num(summary.final_price_total)) },
      {
        label: 'User Total',
        value: formatCurrency(num(summary.total_user_amount)),
      },
      { label: 'Ops Cost', value: formatCurrency(num(summary.total_ops_cost)) },
      {
        label: 'Driver Cost',
        value: formatCurrency(num(summary.total_driver_amount)),
      },
      { label: 'Margin', value: formatCurrency(num(summary.margin_amount)) },
    ];
  }, [summary]);

  return (
    <DashboardShell title="Orders">
      <div className="space-y-4">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search name, phone, route, driver, car, invoice, code…"
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" /> Preview Sheet
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import Sheet
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Order
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <FilterSelect
            label="Status"
            value={filters.order_status}
            onChange={(v) => setFilter('order_status', v)}
            options={[
              ['ALL', 'All Status'],
              ['CREATED', 'Created'],
              ['ASSIGNED', 'Assigned'],
              ['IN_PROGRESS', 'In Progress'],
              ['DONE', 'Done'],
              ['CANCELLED', 'Cancelled'],
            ]}
          />
          <FilterSelect
            label="Payment"
            value={filters.payment_status}
            onChange={(v) => setFilter('payment_status', v)}
            options={[
              ['ALL', 'All Payment'],
              ['UNPAID', 'Unpaid'],
              ['DP_PAID', 'DP Paid'],
              ['PAID', 'Paid'],
            ]}
          />
          <FilterSelect
            label="Source"
            value={filters.source}
            onChange={(v) => setFilter('source', v)}
            options={[
              ['ALL', 'All Sources'],
              ['WEB', 'Web'],
              ['WHATSAPP', 'WhatsApp'],
              ['IMPORT', 'Sheet Import'],
            ]}
          />
          <FilterSelect
            label="Finance"
            value={filters.has_finance}
            onChange={(v) => setFilter('has_finance', v)}
            options={[
              ['ALL', 'All'],
              ['true', 'Has Finance'],
              ['false', 'No Finance'],
            ]}
          />
          <FilterSelect
            label="Date field"
            value={filters.date_field}
            onChange={(v) => setFilter('date_field', v)}
            width="w-40"
            options={[
              ['order_date', 'Order Date'],
              ['service_start_at', 'Service Date'],
            ]}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <Input
              type="date"
              className="w-40"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <Input
              type="date"
              className="w-40"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
            />
          </div>
          {hasActive && (
            <Button variant="outline" size="sm" onClick={clear}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Presets:</span>
          {presets.length === 0 && (
            <span className="text-xs text-gray-400">none saved</span>
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
              placeholder="Save current as…"
              className="h-7 w-44 text-xs"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={handleSavePreset}>
              <Star className="h-3.5 w-3.5 mr-1" /> Save
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
                <Th className="w-12">No</Th>
                <Th>Customer</Th>
                <Th className="hidden lg:table-cell">Route</Th>
                <Th className="hidden lg:table-cell">Date</Th>
                <Th>Status</Th>
                <Th className="hidden sm:table-cell">Payment</Th>
                <Th className="hidden md:table-cell">Source</Th>
                <Th className="hidden lg:table-cell text-right">Price</Th>
                <Th className="hidden xl:table-cell text-right">Margin</Th>
                <Th>Actions</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(10)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((order, idx) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/50">
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
                        {order.order_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={`text-xs ${PAYMENT_STATUS_STYLES[order.payment_status]}`}
                      >
                        {order.payment_status.replace('_', ' ')}
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
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {isFetching ? 'Updating…' : ' '}
            </span>
            <TablePagination
              page={pagination.page}
              pageCount={pagination.page_count}
              total={pagination.total}
              start={start}
              pageSize={pagination.page_size}
              onPageChange={setPage}
              label="orders"
            />
          </div>
        )}
      </div>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="!w-[96vw] !max-w-[1500px] max-h-[96vh] overflow-hidden p-4 sm:p-5 lg:p-6">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <CreateOrderForm
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
  const s = source ?? 'WEB';
  const map: Record<string, string> = {
    WEB: 'bg-blue-50 text-blue-700 border-blue-200',
    WHATSAPP: 'bg-green-50 text-green-700 border-green-200',
    IMPORT: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const label: Record<string, string> = {
    WEB: 'Web',
    WHATSAPP: 'WA',
    IMPORT: 'Sheet',
  };
  return (
    <Badge variant="outline" className={`text-xs ${map[s] ?? map.WEB}`}>
      {label[s] ?? s}
    </Badge>
  );
}
