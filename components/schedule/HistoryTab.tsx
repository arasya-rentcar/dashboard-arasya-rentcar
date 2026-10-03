'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  Car as CarIcon,
  User as UserIcon,
  Clock,
  MapPin,
  FileText,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TablePagination from '@/components/dashboard/TablePagination';
import { useTripHistory } from '@/hooks/useSchedule';
import { useDrivers } from '@/hooks/useDrivers';
import { useCars } from '@/hooks/useCars';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { TripHistoryRow } from '@/types';
import ArrivalEvidence from '@/components/orders/ArrivalEvidence';

const PAGE_SIZE = 20;

// Human label for a TripReport.report_type (driver app + WhatsApp bot types).
// Unknown types fall back to the raw string.
function useReportTypeLabel() {
  const t = useTranslations('history');
  return (type: string) => {
    const key = `reportType.${type}`;
    return !type.includes('.') && t.has(key) ? t(key) : type;
  };
}

function todayStr() {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

export default function HistoryTab() {
  const t = useTranslations('history');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [driverId, setDriverId] = useState('ALL');
  const [carId, setCarId] = useState('ALL');
  const [finance, setFinance] = useState<'all' | 'finalized' | 'awaiting'>('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: drivers } = useDrivers();
  const { data: cars } = useCars();
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data, isLoading } = useTripHistory({
    search: debouncedSearch || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    driver_id: driverId === 'ALL' ? undefined : driverId,
    car_id: carId === 'ALL' ? undefined : carId,
    finance,
    page,
    page_size: PAGE_SIZE,
  });

  const rows = data?.items ?? [];
  const pagination = data?.pagination;

  const key = `${debouncedSearch}|${dateFrom}|${dateTo}|${driverId}|${carId}|${finance}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">{t('search')}</label>
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('dateFrom')}</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('dateTo')}</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('driver')}</label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('allDrivers')}</SelectItem>
              {(drivers ?? [])
                .filter((d) => d.type === 'INTERNAL')
                .map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('car')}</label>
          <Select value={carId} onValueChange={setCarId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('allCars')}</SelectItem>
              {(cars ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.model} · {c.plate_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">{t('finance')}</label>
          <Select
            value={finance}
            onValueChange={(v) => setFinance(v as typeof finance)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('financeAll')}</SelectItem>
              <SelectItem value="finalized">{t('financeFinalized')}</SelectItem>
              <SelectItem value="awaiting">{t('financeAwaiting')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-gray-400 text-sm py-10 text-center">{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <HistoryRow
              key={row.id}
              row={row}
              open={expanded.has(row.id)}
              onToggle={() => toggle(row.id)}
            />
          ))}
        </div>
      )}

      {pagination && pagination.page_count > 1 && (
        <TablePagination
          page={pagination.page}
          pageCount={pagination.page_count}
          total={pagination.total}
          start={(pagination.page - 1) * pagination.page_size}
          pageSize={pagination.page_size}
          onPageChange={setPage}
          label={t('paginationLabel')}
        />
      )}
    </div>
  );
}

function HistoryRow({
  row,
  open,
  onToggle,
}: {
  row: TripHistoryRow;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('history');
  const reportLabel = useReportTypeLabel();
  const awaiting = row.finance_status === 'AWAITING';
  // Internal driver set but the trip not yet accepted in the driver app.
  const awaitingAccept =
    !!row.driver?.id &&
    !row.driver_accepted_at &&
    (row.line_status === 'SCHEDULED' || row.line_status === 'ASSIGNED');
  const driverLabel = row.is_external
    ? [row.external_vendor?.name || t('externalVendor'), row.driver_name_raw]
        .filter(Boolean)
        .join(' · ')
    : row.driver?.name || '—';
  const partnerDriver = row.is_external
    ? [row.driver_name_raw, row.driver_phone_raw, row.plate_raw]
        .filter(Boolean)
        .join(' · ')
    : '';
  // Partner lines: the plate typed on the line wins over the vendor car's.
  const carLabel = row.is_external
    ? [
        row.external_car?.model,
        row.plate_raw || row.external_car?.plate_number,
      ]
        .filter(Boolean)
        .join(' · ') || '—'
    : row.car
      ? `${row.car.model}${row.car.plate_number ? ` · ${row.car.plate_number}` : ''}`
      : '—';

  // Money cell: real value when finalized, muted "Pending" when awaiting.
  const money = (value: string | number | null | undefined) =>
    awaiting ? (
      <span className="text-gray-400 italic">{t('pending')}</span>
    ) : (
      <span>{formatCurrency(value ?? 0)}</span>
    );

  const driverFee = row.payable?.total_amount;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="text-gray-400">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-center text-sm">
          <span className="font-mono font-medium text-gray-900">
            {row.order?.order_code || '—'}
          </span>
          <span className="text-gray-700 truncate">
            {row.order?.customer_name || '—'}
          </span>
          <span
            className="text-gray-600 flex items-center gap-1 truncate"
            title={driverLabel}
          >
            <UserIcon className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate">{driverLabel}</span>
          </span>
          <span
            className="text-gray-600 flex items-center gap-1 truncate"
            title={carLabel}
          >
            <CarIcon className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate">{carLabel}</span>
          </span>
          <span className="text-gray-500 text-xs">
            {row.service_date ? formatDate(row.service_date) : '—'}
          </span>
          <span className="text-xs text-gray-600">{money(driverFee)}</span>
          <span>
            <Badge
              variant="outline"
              className={
                awaiting
                  ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
              }
            >
              {awaiting ? t('badgeAwaiting') : t('badgeFinalized')}
            </Badge>
          </span>
        </div>
      </button>

      {/* Detail panel */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trip timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {t('timeline')}
              </h4>
              <ul className="space-y-1.5 text-sm">
                {row.driver_accepted_at ? (
                  <TimelineItem
                    label={t('tsDriverAccepted')}
                    value={row.driver_accepted_at}
                  />
                ) : awaitingAccept ? (
                  <li className="text-xs italic text-gray-400">
                    {t('driverNotAccepted')}
                  </li>
                ) : null}
                <TimelineItem
                  label={t('tsDepart')}
                  value={row.actual_start_at}
                />
                <TimelineItem
                  label={t('tsArrive')}
                  value={row.actual_pickup_at}
                />
                <TimelineItem
                  label={t('tsDropoff')}
                  value={row.trip_finished_at}
                />
                <TimelineItem
                  label={t('tsFinishReported')}
                  value={row.finish_reported_at}
                  muted
                />
              </ul>
              <p className="text-xs text-gray-500 pt-1">
                {row.pickup_location} → {row.dropoff_location}
              </p>
              {partnerDriver && (
                <p className="text-xs text-purple-700">
                  {t('partnerDriver')}: {partnerDriver}
                </p>
              )}
            </div>

            {/* Finance */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('finance')}
              </h4>
              {awaiting ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {t('financePendingNote')}
                </div>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  <FinanceRow label={t('opsCost')} value={formatCurrency(row.ops_cost ?? 0)} />
                  <FinanceRow
                    label={t('driverFeeBase')}
                    value={formatCurrency(row.payable?.base_amount ?? 0)}
                  />
                  {Number(row.payable?.reimburse_amount ?? 0) !== 0 && (
                    <FinanceRow
                      label={`+ ${t('reimbursed')}`}
                      value={formatCurrency(row.payable?.reimburse_amount ?? 0)}
                      muted
                    />
                  )}
                  {Number(row.payable?.advance_amount ?? 0) !== 0 && (
                    <FinanceRow
                      label={`− ${t('travelAdvance')}`}
                      value={formatCurrency(row.payable?.advance_amount ?? 0)}
                      muted
                    />
                  )}
                  {(row.payable?.extras ?? []).map((ex) => (
                    <FinanceRow
                      key={ex.id || ex.label}
                      label={`+ ${ex.label}`}
                      value={formatCurrency(ex.amount)}
                      muted
                    />
                  ))}
                  <FinanceRow
                    label={t('driverFeeTotal')}
                    value={formatCurrency(row.payable?.total_amount ?? 0)}
                    bold
                  />
                  <FinanceRow
                    label={t('margin')}
                    value={formatCurrency(row.margin_amount ?? 0)}
                  />
                  {row.payable && (
                    <li className="flex justify-between pt-1">
                      <span className="text-gray-500">{t('driverFeeStatus')}</span>
                      <Badge
                        variant="outline"
                        className={
                          row.payable.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                            : 'bg-gray-100 text-gray-600 border-gray-200 text-[10px]'
                        }
                      >
                        {row.payable.status}
                      </Badge>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Driver reports */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> {t('reports')}
              </h4>
              {!row.is_external && (
                <ArrivalEvidence
                  reports={row.reports}
                  pickupLocation={row.pickup_location}
                  arrivedAt={row.actual_pickup_at}
                />
              )}
              {(row.reports ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">{t('noReports')}</p>
              ) : (
                <ul className="space-y-2">
                  {(row.reports ?? []).map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-gray-200 bg-white p-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex flex-wrap items-center gap-1">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-[10px]"
                          >
                            {reportLabel(r.report_type)}
                          </Badge>
                          {r.source === 'API' && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-0.5"
                            >
                              <Smartphone className="h-2.5 w-2.5" />
                              {t('sourceApp')}
                            </Badge>
                          )}
                        </span>
                        <span className="text-gray-400 shrink-0">
                          {formatDateTime(r.created_at)}
                        </span>
                      </div>
                      {r.amount != null && r.amount !== '' && (
                        <p className="mt-1 font-medium text-gray-800 tabular-nums">
                          {r.report_type.startsWith('ODOMETER')
                            ? `${Number(r.amount).toLocaleString('id-ID')} km`
                            : formatCurrency(r.amount)}
                        </p>
                      )}
                      {r.notes && (
                        <p className="text-gray-600 mt-1 break-words">{r.notes}</p>
                      )}
                      {r.file_url && (
                        <Link
                          href={r.file_url}
                          target="_blank"
                          className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          <MapPin className="h-3 w-3" /> {t('viewMedia')}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href={`/dashboard/orders/${row.order?.id}`}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              {t('openOrder')} <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({
  label,
  value,
  muted,
}: {
  label: string;
  value?: string | null;
  muted?: boolean;
}) {
  const t = useTranslations('history');
  return (
    <li className="flex justify-between gap-2">
      <span className={muted ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
      <span className={value ? 'text-gray-800' : 'text-gray-300'}>
        {value ? formatDateTime(value) : t('notRecorded')}
      </span>
    </li>
  );
}

function FinanceRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <li className="flex justify-between gap-2">
      <span className={muted ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
      <span
        className={`${bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
      >
        {value}
      </span>
    </li>
  );
}
