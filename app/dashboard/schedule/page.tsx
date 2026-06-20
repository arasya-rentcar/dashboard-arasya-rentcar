'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, CalendarCheck, Users, ExternalLink, Boxes } from 'lucide-react';
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
import {
  useSchedule,
  useDriverAvailability,
} from '@/hooks/useSchedule';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ScheduleLine, ScheduleStatus } from '@/types';
import ScheduleLineDialog from '@/components/schedule/ScheduleLineDialog';
import StockTab from '@/components/schedule/StockTab';
import ConfirmationCell from '@/components/schedule/ConfirmationCell';

const PAGE_SIZE = 30;

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

function todayStr() {
  // "today" in Asia/Jakarta (WIB), independent of the browser timezone.
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function addDaysStr(base: string, days: number) {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Monday-based start of the ISO week containing `base` (string YYYY-MM-DD).
function weekRange(base: string): { from: string; to: string } {
  const d = new Date(`${base}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const from = addDaysStr(base, -dow);
  const to = addDaysStr(from, 6);
  return { from, to };
}

export default function SchedulePage() {
  const [tab, setTab] = useState<'agenda' | 'availability' | 'stock'>('agenda');

  return (
    <DashboardShell title="Schedule">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('agenda')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'agenda'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CalendarCheck className="h-4 w-4" /> Agenda
          </button>
          <button
            onClick={() => setTab('availability')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'availability'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="h-4 w-4" /> Driver Availability
          </button>
          <button
            onClick={() => setTab('stock')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'stock'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Boxes className="h-4 w-4" /> Stock
          </button>
        </div>

        {tab === 'agenda' ? (
          <AgendaTab />
        ) : tab === 'availability' ? (
          <AvailabilityTab />
        ) : (
          <StockTab />
        )}
      </div>
    </DashboardShell>
  );
}

function AgendaTab() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  // Default to today (WIB) per Sprint 4 — quick chips switch the range.
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ScheduleLine | null>(null);

  const { data, isLoading, isFetching } = useSchedule({
    search: search.trim() || undefined,
    type: type === 'ALL' ? undefined : type,
    status: status === 'ALL' ? undefined : status,
    date_from: dateFrom || undefined,
    // Backend normalizes both ends to WIB day-bounds, so the bare date is fine.
    date_to: dateTo || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const rows = data?.items ?? [];
  const pagination = data?.pagination;
  const totals = data?.totals;
  const start = pagination ? (pagination.page - 1) * pagination.page_size : 0;

  const key = `${search}|${type}|${status}|${dateFrom}|${dateTo}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customer, driver, route, invoice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-end gap-1.5">
            <DateChip
              label="Hari ini"
              active={dateFrom === todayStr() && dateTo === todayStr()}
              onClick={() => {
                setDateFrom(todayStr());
                setDateTo(todayStr());
              }}
            />
            <DateChip
              label="Besok"
              active={
                dateFrom === addDaysStr(todayStr(), 1) &&
                dateTo === addDaysStr(todayStr(), 1)
              }
              onClick={() => {
                const t = addDaysStr(todayStr(), 1);
                setDateFrom(t);
                setDateTo(t);
              }}
            />
            <DateChip
              label="Minggu ini"
              active={
                dateFrom === weekRange(todayStr()).from &&
                dateTo === weekRange(todayStr()).to
              }
              onClick={() => {
                const w = weekRange(todayStr());
                setDateFrom(w.from);
                setDateTo(w.to);
              }}
            />
            <DateChip
              label="Semua"
              active={!dateFrom && !dateTo}
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="EXTERNAL">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Revenue" value={formatCurrency(totals.revenue)} />
          <SummaryCard label="Ops Cost" value={formatCurrency(totals.ops_cost)} />
          <SummaryCard
            label="Margin"
            value={formatCurrency(totals.margin)}
            accent
          />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tgl Service</TableHead>
              <TableHead>Customer / Order</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Konfirmasi</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                  No schedule lines match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((line) => (
                <TableRow key={line.id} className="text-sm">
                  <TableCell className="whitespace-nowrap">
                    {line.service_date ? formatDate(line.service_date) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {line.order?.customer_name || '—'}
                    </div>
                    {line.order?.order_code && (
                      <Link
                        href={`/dashboard/orders/${line.order.id}`}
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {line.order.order_code}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-gray-600">
                    {line.pickup_location}
                    {line.dropoff_location &&
                    line.dropoff_location !== line.pickup_location
                      ? ` → ${line.dropoff_location}`
                      : ''}
                  </TableCell>
                  <TableCell>
                    {line.is_external ? (
                      <div>
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] mb-1"
                        >
                          External
                        </Badge>
                        <div className="text-xs text-gray-700">
                          {line.external_vendor?.name ||
                            line.driver_name_raw ||
                            'Unassigned'}
                          {line.external_car?.model
                            ? ` · ${line.external_car.model}`
                            : ''}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-gray-700">
                          {line.driver?.name ||
                            line.driver_name_raw ||
                            'Unassigned'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {line.car?.plate_number ||
                            line.plate_raw ||
                            ''}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <ConfirmationCell line={line} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(line.total_price)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${
                      Number(line.margin_amount) >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {line.margin_amount == null
                      ? '—'
                      : formatCurrency(line.margin_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${STATUS_STYLES[line.line_status]}`}
                    >
                      {line.line_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(line)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3">
          {pagination && (
            <TablePagination
              page={pagination.page}
              pageCount={pagination.page_count}
              total={pagination.total}
              start={start}
              pageSize={pagination.page_size}
              onPageChange={setPage}
              label="lines"
            />
          )}
        </div>
        {isFetching && !isLoading && (
          <p className="px-3 pb-2 text-xs text-gray-400">Updating…</p>
        )}
      </div>

      <ScheduleLineDialog
        line={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function DateChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function AvailabilityTab() {
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState('INTERNAL');
  const { data, isLoading } = useDriverAvailability(
    date,
    type === 'ALL' ? undefined : type,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL">Internal</SelectItem>
              <SelectItem value="EXTERNAL">External</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm py-10 text-center">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.drivers.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border p-4 ${
                d.availability === 'FREE'
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-amber-200 bg-amber-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{d.name}</span>
                <Badge
                  variant="outline"
                  className={
                    d.availability === 'FREE'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]'
                      : 'bg-amber-100 text-amber-700 border-amber-200 text-[10px]'
                  }
                >
                  {d.availability}
                </Badge>
              </div>
              {d.bookings.length === 0 ? (
                <p className="text-xs text-gray-400">No bookings this day.</p>
              ) : (
                <ul className="space-y-1.5">
                  {d.bookings.map((b) => (
                    <li key={b.line_id} className="text-xs text-gray-600">
                      <Link
                        href={`/dashboard/orders/${b.order_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {b.order_code || b.customer_name}
                      </Link>{' '}
                      · {b.route}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={`text-lg font-semibold ${accent ? 'text-emerald-600' : 'text-gray-900'}`}
      >
        {value}
      </p>
    </div>
  );
}
