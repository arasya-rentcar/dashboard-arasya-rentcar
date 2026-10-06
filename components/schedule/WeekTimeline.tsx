'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Car as CarIcon,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import QueryError from '@/components/dashboard/QueryError';
import { useScheduleWeek } from '@/hooks/useSchedule';
import { WeekRow, WeekDayCapacity } from '@/types';

// Parse a bare WIB YYYY-MM-DD as a plain calendar date (no timezone shift).
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dowLabel(s: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
    parseYmd(s),
  );
}

function dayNum(s: string): string {
  return String(parseYmd(s).getDate());
}

// Move a YYYY-MM-DD by N days, returning YYYY-MM-DD.
function shiftYmd(s: string, days: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function todayWibYmd(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

// Compact week-range label, e.g. "22–28 Jun" or "29 Jun–5 Jul" (cross-month).
function weekRangeLabel(start: string, end: string, locale: string): string {
  const s = parseYmd(start);
  const e = parseYmd(end);
  const mon = (d: Date) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  const sameMonth = s.getMonth() === e.getMonth();
  return sameMonth
    ? `${s.getDate()}–${e.getDate()} ${mon(e)}`
    : `${s.getDate()} ${mon(s)} – ${e.getDate()} ${mon(e)}`;
}

export default function WeekTimeline({
  onPickDay,
}: {
  // Optional: clicking a day header bubbles the date up (Phase 2 drawer).
  onPickDay?: (date: string) => void;
}) {
  const t = useTranslations('timeline');
  const locale = useLocale() === 'en' ? 'en-GB' : 'id-ID';
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [resource, setResource] = useState<'drivers' | 'cars'>('drivers');
  const { data, isLoading, isError, refetch } = useScheduleWeek(from, resource);

  const days = data?.days ?? [];
  const rows = data?.rows ?? [];
  const capacity = data?.capacity ?? [];
  const today = data?.today ?? todayWibYmd();
  // Are we viewing the week that contains today? (controls the middle button).
  const onCurrentWeek =
    !!data && today >= data.week_start && today <= data.week_end;
  const rangeLabel =
    data && days.length
      ? weekRangeLabel(data.week_start, data.week_end, locale)
      : '';

  function prevWeek() {
    setFrom(shiftYmd(data?.week_start ?? todayWibYmd(), -7));
  }
  function nextWeek() {
    setFrom(shiftYmd(data?.week_start ?? todayWibYmd(), 7));
  }
  function thisWeek() {
    setFrom(undefined);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header: title, resource toggle, week nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
            {rangeLabel && (
              <p className="text-xs text-gray-400">{rangeLabel}</p>
            )}
          </div>
          <div className="flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label={t('title')}>
            <button
              type="button"
              aria-pressed={resource === 'drivers'}
              onClick={() => setResource('drivers')}
              className={`flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                resource === 'drivers'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> {t('drivers')}
            </button>
            <button
              type="button"
              aria-pressed={resource === 'cars'}
              onClick={() => setResource('cars')}
              className={`flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                resource === 'cars'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <CarIcon className="h-3.5 w-3.5" /> {t('cars')}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={prevWeek}
            aria-label={t('prevWeek')}
            title={t('prevWeek')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {/* Middle button: a passive "This week" label when already on the
              current week, or an active "Today" jump-back once navigated away. */}
          <Button
            variant={onCurrentWeek ? 'outline' : 'default'}
            size="sm"
            onClick={thisWeek}
            disabled={onCurrentWeek}
          >
            {onCurrentWeek ? t('thisWeek') : t('today')}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={nextWeek}
            aria-label={t('nextWeek')}
            title={t('nextWeek')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">{t('loading')}</p>
      ) : isError ? (
        <div className="p-4">
          <QueryError onRetry={() => refetch()} compact />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[628px] sm:min-w-[760px]">
            {/* Day header row with capacity ribbon */}
            <div className="grid grid-cols-[96px_repeat(7,minmax(76px,1fr))] sm:grid-cols-[140px_repeat(7,minmax(80px,1fr))] border-b border-gray-100">
              <div className="sticky left-0 z-20 bg-white px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-400 shadow-[1px_0_0_0_rgb(243,244,246)] sm:px-3">
                {resource === 'drivers' ? t('drivers') : t('cars')}
              </div>
              {days.map((d, i) => {
                const cap = capacity[i];
                const isToday = d === today;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onPickDay?.(d)}
                    title={t('openDay')}
                    aria-label={`${t('openDay')} ${dowLabel(d, locale)} ${dayNum(d)}`}
                    aria-current={isToday ? 'date' : undefined}
                    className={`min-w-0 border-l border-gray-100 px-1 py-2 text-center transition-colors hover:bg-gray-50 sm:px-2 ${
                      isToday ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div
                      className={`text-[11px] font-medium uppercase ${
                        isToday ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {dowLabel(d, locale)}
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        isToday ? 'text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {dayNum(d)}
                    </div>
                    {cap && <CapacityBadge cap={cap} resource={resource} />}
                  </button>
                );
              })}
            </div>

            {/* Unassigned lane: scheduled trips with no driver/car yet. */}
            {data?.unassigned && (
              <UnassignedLane
                row={data.unassigned}
                today={today}
                days={days}
                label={t('unassigned')}
              />
            )}

            {/* Resource rows */}
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                {t('noResources')}
              </p>
            ) : (
              rows.map((row) => (
                <TimelineRow
                  key={row.id}
                  row={row}
                  today={today}
                  days={days}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CapacityBadge({
  cap,
  resource,
}: {
  cap: WeekDayCapacity;
  resource: 'drivers' | 'cars';
}) {
  const t = useTranslations('timeline');
  const c = resource === 'drivers' ? cap.drivers : cap.cars;
  const tight = c.free === 0;
  return (
    <div
      className="mt-1 flex flex-wrap items-center justify-center gap-x-1 text-[10px]"
      title={t('capacityTitle', { free: c.free, trips: cap.trips })}
    >
      <span
        className={`rounded px-1 font-medium ${
          tight
            ? 'bg-red-50 text-red-600'
            : c.free <= 1
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {t('freeShort', { n: c.free })}
      </span>
      {cap.trips > 0 && (
        <span className="text-gray-400">{t('tripsShort', { n: cap.trips })}</span>
      )}
    </div>
  );
}

// Highlighted lane for scheduled-but-unassigned trips. Same day grid as a
// resource row, but amber-styled to flag pending work that needs a driver/car.
function UnassignedLane({
  row,
  today,
  days,
  label,
}: {
  row: WeekRow;
  today: string;
  days: string[];
  label: string;
}) {
  return (
    <div className="group grid grid-cols-[96px_repeat(7,minmax(76px,1fr))] sm:grid-cols-[140px_repeat(7,minmax(80px,1fr))] border-b border-amber-200 bg-amber-50/40">
      <div className="sticky left-0 z-10 flex items-center gap-1.5 bg-amber-50 px-2 py-2 shadow-[1px_0_0_0_rgb(253,230,138)] sm:px-3" title={label}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-amber-700">
          {label}
        </span>
      </div>
      {row.cells.map((cell, i) => {
        const isToday = days[i] === today;
        if (cell.bookings.length === 0) {
          return (
            <div
              key={i}
              className={`min-h-[44px] border-l border-amber-100 ${
                isToday ? 'bg-blue-50/30' : ''
              }`}
            />
          );
        }
        return (
          <div
            key={i}
            className={`min-h-[44px] min-w-0 space-y-1 overflow-hidden border-l border-amber-100 p-1 ${
              isToday ? 'bg-blue-50/30' : ''
            }`}
          >
            {cell.bookings.map((b) => (
              <Link
                key={b.line_id}
                href={`/dashboard/orders/${b.order_id}`}
                className="block min-w-0 rounded bg-amber-200 px-1.5 py-1 leading-tight text-amber-900 hover:bg-amber-300"
                title={`${b.order_code || b.customer_name} · ${b.route}`}
              >
                <span className="block truncate text-[9px] font-medium">
                  {b.order_code || b.customer_name}
                </span>
                <span className="block truncate text-[10px] opacity-80">
                  {b.route}
                </span>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TimelineRow({
  row,
  today,
  days,
}: {
  row: WeekRow;
  today: string;
  days: string[];
}) {
  return (
    <div className="group grid grid-cols-[96px_repeat(7,minmax(76px,1fr))] sm:grid-cols-[140px_repeat(7,minmax(80px,1fr))] border-b border-gray-50 last:border-b-0">
      {/* Resource label (frozen first column) */}
      <div className="sticky left-0 z-10 flex items-center gap-1.5 bg-white px-2 py-2 shadow-[1px_0_0_0_rgb(243,244,246)] group-hover:bg-gray-50 sm:px-3">
        <div className="min-w-0 flex-1">
          <span
            className={`block truncate text-xs font-medium ${
              row.down ? 'text-gray-300 line-through' : 'text-gray-700'
            }`}
            title={
              row.plate_number ? `${row.name} · ${row.plate_number}` : row.name
            }
          >
            {row.name}
          </span>
          {row.plate_number && (
            <span className="block truncate text-[10px] text-gray-400">
              {row.plate_number}
            </span>
          )}
        </div>
        {row.down && <Wrench className="h-3 w-3 shrink-0 text-gray-300" />}
      </div>

      {/* 7 day cells */}
      {row.cells.map((cell, i) => {
        const isToday = days[i] === today;
        if (row.down) {
          return (
            <div
              key={i}
              className={`min-h-[44px] border-l border-gray-100 bg-gray-50/50 ${
                isToday ? 'bg-blue-50/30' : ''
              }`}
            />
          );
        }
        if (cell.free) {
          return (
            <div
              key={i}
              className={`min-h-[44px] border-l border-gray-100 ${
                isToday ? 'bg-blue-50/30' : ''
              }`}
            />
          );
        }
        return (
          <div
            key={i}
            className={`min-h-[44px] min-w-0 space-y-1 overflow-hidden border-l border-gray-100 p-1 ${
              isToday ? 'bg-blue-50/30' : ''
            }`}
          >
            {cell.bookings.map((b) => (
              <Link
                key={b.line_id}
                href={`/dashboard/orders/${b.order_id}`}
                className={`block min-w-0 rounded px-1.5 py-1 leading-tight ${
                  b.status === 'IN_PROGRESS'
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
                title={`${b.order_code || b.customer_name} · ${b.route}`}
              >
                <span className="block truncate text-[9px] font-medium">
                  {b.order_code || b.customer_name}
                </span>
                <span className="block truncate text-[10px] opacity-70">
                  {b.route}
                </span>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
