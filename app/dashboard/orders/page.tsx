'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, X } from 'lucide-react';
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
import CreateOrderForm from '@/components/forms/CreateOrderForm';
import TablePagination, {
  usePagination,
} from '@/components/dashboard/TablePagination';
import { useOrders, useCreateOrder } from '@/hooks/useOrders';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
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

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [dateField, setDateField] = useState<'order_date' | 'service_start_at'>(
    'order_date',
  );
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: orders, isLoading } = useOrders();
  const createMutation = useCreateOrder();

  const filtered = orders?.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      q === '' ||
      [
        o.customer_name,
        o.customer_phone,
        o.id,
        o.order_code,
        o.pickup_location,
        o.dropoff_location,
        o.trip?.driver?.name,
        o.trip?.car?.plate_number,
        o.trip?.car?.model,
        ...(o.customers?.flatMap((c) => [c.name, c.phone]) ?? []),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    const matchStatus =
      statusFilter === 'ALL' || o.order_status === statusFilter;
    const matchPayment =
      paymentFilter === 'ALL' || o.payment_status === paymentFilter;

    const refRaw = o[dateField] || o.order_date;
    const ref = refRaw ? new Date(refRaw) : null;
    const matchFrom =
      !dateFrom || (ref && ref >= new Date(`${dateFrom}T00:00:00`));
    const matchTo =
      !dateTo || (ref && ref <= new Date(`${dateTo}T23:59:59`));

    return matchSearch && matchStatus && matchPayment && matchFrom && matchTo;
  });

  const hasActiveFilter =
    search !== '' ||
    statusFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    dateFrom !== '' ||
    dateTo !== '';

  function clearFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setDateFrom('');
    setDateTo('');
  }

  const PAGE_SIZE = 10;
  const {
    page,
    setPage,
    pageCount,
    total,
    start,
    pageItems,
  } = usePagination(filtered ?? [], PAGE_SIZE);

  async function handleCreate(data: Parameters<typeof createMutation.mutateAsync>[0]) {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Order created successfully');
      setCreateOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DashboardShell title="Orders">
      <div className="space-y-4">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search name, phone, route, driver, car, ID…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="CREATED">Created</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Payment</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payment</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="DP_PAID">DP Paid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Date field</label>
            <Select
              value={dateField}
              onValueChange={(v) =>
                setDateField(v as 'order_date' | 'service_start_at')
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order_date">Order Date</SelectItem>
                <SelectItem value="service_start_at">Service Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <Input
              type="date"
              className="w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <Input
              type="date"
              className="w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {hasActiveFilter && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide w-12">No</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order ID</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Pickup</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Dropoff</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Pickup / Dropoff</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Payment</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Price</TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-gray-400 text-sm">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((order, idx) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm text-gray-400 tabular-nums">
                      {start + idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {order.id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{order.customer_name}</p>
                        <p className="text-xs text-gray-400">{order.customer_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden md:table-cell max-w-32 truncate">
                      {order.pickup_location}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden md:table-cell max-w-32 truncate">
                      {order.dropoff_location}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 hidden lg:table-cell">
                      <div>
                        <p>{order.service_start_at ? formatDate(order.service_start_at) : '-'}</p>
                        {order.service_end_at && <p className="text-xs text-gray-400">until {formatDate(order.service_end_at)}</p>}
                      </div>
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
                    <TableCell className="text-sm font-medium text-gray-900 hidden lg:table-cell">
                      {formatCurrency(order.final_price)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
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
        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          start={start}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="orders"
        />
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
