'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, CalendarCheck, ExternalLink, History } from 'lucide-react';
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
import { useSchedule } from '@/hooks/useSchedule';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ScheduleLine, ScheduleStatus } from '@/types';
import ScheduleLineDialog from '@/components/schedule/ScheduleLineDialog';
import WeekTimeline from '@/components/schedule/WeekTimeline';
import DayDrawer from '@/components/schedule/DayDrawer';
import HistoryTab from '@/components/schedule/HistoryTab';
import ConfirmationCell from '@/components/schedule/ConfirmationCell';

const PAGE_SIZE = 30;

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
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
  const tx = useTranslations('schedule');
  const [tab, setTab] = useState<'schedule' | 'history'>('schedule');

  return (
    <DashboardShell title={tx('title')}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('schedule')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'schedule'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CalendarCheck className="h-4 w-4" /> {tx('tabSchedule')}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'history'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <History className="h-4 w-4" /> {tx('tabHistory')}
          </button>
        </div>

        {tab === 'schedule' ? (
          <ScheduleTab />
        ) : (
          <HistoryTab />
        )}
      </div>
    </DashboardShell>
  );
}

function ScheduleTab() {
  // Clicking a timeline day header opens the day drawer (assign-in-context).
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      {/* Read-only availability context: who's free before you assign. */}
      <WeekTimeline onPickDay={setSelectedDay} />
      {/* Operational day-assignment list. */}
      <AgendaTab />
      <DayDrawer date={selectedDay} onClose={() => setSelectedDay(null)} />
    </div>
  );
}

function AgendaTab() {
  const tx = useTranslations('schedule');
  const tt = useTranslations('terms');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  // Default to today (WIB) per Sprint 4 — quick chips switch the range.
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  // "Belum ditutup": open trips dated before yesterday (WIB). The driver app no
  // longer lists them, so they are closed here (Edit → Selesai / Dibatalkan).
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ScheduleLine | null>(null);
  const setRange = (from: string, to: string) => {
    setOverdue(false);
    setDateFrom(from);
    setDateTo(to);
  };

  const debouncedSearch = useDebouncedValue(search.trim());
  const { data, isLoading, isFetching } = useSchedule({
    search: debouncedSearch || undefined,
    type: type === 'ALL' ? undefined : type,
    status: status === 'ALL' ? undefined : status,
    date_from: dateFrom || undefined,
    // Backend normalizes both ends to WIB day-bounds, so the bare date is fine.
    date_to: dateTo || undefined,
    overdue: overdue ? 'true' : undefined,
    page,
    page_size: PAGE_SIZE,
  });
  const overdueCount = useSchedule({ overdue: 'true', page: 1, page_size: 1 }).data?.pagination.total ?? 0;

  const rows = data?.items ?? [];
  const pagination = data?.pagination;
  const totals = data?.totals;
  const start = pagination ? (pagination.page - 1) * pagination.page_size : 0;

  const key = `${debouncedSearch}|${type}|${status}|${dateFrom}|${dateTo}|${overdue}`;
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
            placeholder={tx('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-end gap-1.5">
            <DateChip
              label={tx('today')}
              active={!overdue && dateFrom === todayStr() && dateTo === todayStr()}
              onClick={() => setRange(todayStr(), todayStr())}
            />
            <DateChip
              label={tx('tomorrow')}
              active={
                !overdue &&
                dateFrom === addDaysStr(todayStr(), 1) &&
                dateTo === addDaysStr(todayStr(), 1)
              }
              onClick={() => {
                const t = addDaysStr(todayStr(), 1);
                setRange(t, t);
              }}
            />
            <DateChip
              label={tx('thisWeek')}
              active={
                !overdue &&
                dateFrom === weekRange(todayStr()).from &&
                dateTo === weekRange(todayStr()).to
              }
              onClick={() => {
                const w = weekRange(todayStr());
                setRange(w.from, w.to);
              }}
            />
            <DateChip
              label={tx('all')}
              active={!overdue && !dateFrom && !dateTo}
              onClick={() => setRange('', '')}
            />
            <DateChip
              label={overdueCount ? `${tx('overdue')} (${overdueCount})` : tx('overdue')}
              active={overdue}
              onClick={() => {
                setRange('', '');
                setOverdue(true);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">{tx('from')}</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setRange(e.target.value, dateTo)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">{tx('to')}</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setRange(dateFrom, e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">{tx('type')}</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{tx('allTypes')}</SelectItem>
                <SelectItem value="INTERNAL">{tt('internal')}</SelectItem>
                <SelectItem value="EXTERNAL">{tt('external')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">{tx('status')}</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{tx('allStatus')}</SelectItem>
                <SelectItem value="SCHEDULED">{tx('statusScheduled')}</SelectItem>
                <SelectItem value="ASSIGNED">{tx('statusAssigned')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{tx('statusInProgress')}</SelectItem>
                <SelectItem value="DONE">{tx('statusDone')}</SelectItem>
                <SelectItem value="CANCELLED">{tx('statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {overdue ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {tx('overdueHint')}
        </div>
      ) : overdueCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{tx('overdueBanner', { count: overdueCount })}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRange('', '');
              setOverdue(true);
            }}
          >
            {tx('overdueShow')}
          </Button>
        </div>
      ) : null}

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label={tt('revenue')} value={formatCurrency(totals.revenue)} />
          <SummaryCard label={tx('opsCost')} value={formatCurrency(totals.ops_cost)} />
          <SummaryCard
            label={tt('margin')}
            value={formatCurrency(totals.margin)}
            accent
          />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tx('colServiceDate')}</TableHead>
              <TableHead>{tx('colCustomerOrder')}</TableHead>
              <TableHead>{tx('colRoute')}</TableHead>
              <TableHead>{tx('colAssigned')}</TableHead>
              <TableHead>{tx('colConfirmation')}</TableHead>
              <TableHead className="text-right">{tt('revenue')}</TableHead>
              <TableHead className="text-right">{tt('margin')}</TableHead>
              <TableHead>{tx('status')}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                  {tx('loading')}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                  {tx('noLines')}
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
                          {tt('external')}
                        </Badge>
                        <div className="text-xs text-gray-700">
                          {line.external_vendor?.name ||
                            line.driver_name_raw ||
                            tx('unassigned')}
                          {line.external_car?.model
                            ? ` · ${line.external_car.model}`
                            : ''}
                        </div>
                        {(line.driver_name_raw ||
                          line.driver_phone_raw ||
                          line.plate_raw ||
                          line.external_car?.plate_number) && (
                          <div className="text-[11px] text-gray-500">
                            {[
                              line.driver_name_raw,
                              line.driver_phone_raw,
                              line.plate_raw || line.external_car?.plate_number,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-gray-700">
                          {line.driver?.name ||
                            line.driver_name_raw ||
                            tx('unassigned')}
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
                      {tx('edit')}
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
              label={tx('paginationLabel')}
            />
          )}
        </div>
        {isFetching && !isLoading && (
          <p className="px-3 pb-2 text-xs text-gray-400">{tx('updating')}</p>
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
