'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Car as CarIcon,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function WeekTimeline({
  onPickDay,
}: {
  // Optional: clicking a day header bubbles the date up (Phase 2 drawer).
  onPickDay?: (date: string) => void;
}) {
  const t = useTranslations('timeline');
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [resource, setResource] = useState<'drivers' | 'cars'>('drivers');
  const { data, isLoading } = useScheduleWeek(from, resource);

  const days = data?.days ?? [];
  const rows = data?.rows ?? [];
  const capacity = data?.capacity ?? [];
  const today = data?.today ?? todayWibYmd();

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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            <button
              onClick={() => setResource('drivers')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                resource === 'drivers'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> {t('drivers')}
            </button>
            <button
              onClick={() => setResource('cars')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
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
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={thisWeek}>
            {t('thisWeek')}
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">{t('loading')}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Day header row with capacity ribbon */}
            <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-gray-100">
              <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {resource === 'drivers' ? t('drivers') : t('cars')}
              </div>
              {days.map((d, i) => {
                const cap = capacity[i];
                const isToday = d === today;
                return (
                  <button
                    key={d}
                    onClick={() => onPickDay?.(d)}
                    className={`border-l border-gray-100 px-2 py-2 text-center transition-colors hover:bg-gray-50 ${
                      isToday ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div
                      className={`text-[11px] font-medium uppercase ${
                        isToday ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {dowLabel(d, 'id-ID')}
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
  const c = resource === 'drivers' ? cap.drivers : cap.cars;
  const tight = c.free === 0;
  return (
    <div className="mt-1 flex items-center justify-center gap-1 text-[10px]">
      <span
        className={`rounded px-1 font-medium ${
          tight
            ? 'bg-red-50 text-red-600'
            : c.free <= 1
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {c.free} free
      </span>
      {cap.trips > 0 && (
        <span className="text-gray-400">{cap.trips}t</span>
      )}
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
    <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-gray-50 last:border-b-0">
      {/* Resource label */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span
          className={`truncate text-xs font-medium ${
            row.down ? 'text-gray-300 line-through' : 'text-gray-700'
          }`}
          title={row.name}
        >
          {row.name}
        </span>
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
            className={`min-h-[44px] space-y-1 border-l border-gray-100 p-1 ${
              isToday ? 'bg-blue-50/30' : ''
            }`}
          >
            {cell.bookings.map((b) => (
              <Link
                key={b.line_id}
                href={`/dashboard/orders/${b.order_id}`}
                className={`block rounded px-1.5 py-1 text-[10px] leading-tight ${
                  b.status === 'IN_PROGRESS'
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
                title={`${b.order_code || b.customer_name} · ${b.route}`}
              >
                <span className="block truncate font-medium">
                  {b.order_code || b.customer_name}
                </span>
                <span className="block truncate opacity-70">{b.route}</span>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
