'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { PriceCar, PriceCity, PriceDuration, PriceRate, PriceZone } from '@/types';

// Same rules as the API: drop tables price one trip, the others 12 hours and Fullday.
export const isDropZone = (z: Pick<PriceZone, 'code'>) => z.code.startsWith('DROP');
export const isDriverZone = (z: Pick<PriceZone, 'service_package'>) => z.service_package === 'XOPS';
export const isAllInZone = (z: PriceZone) => !isDriverZone(z) && !isDropZone(z);
export const zoneDurations = (z: Pick<PriceZone, 'code'>): PriceDuration[] =>
  isDropZone(z) ? ['DROP'] : ['12H', 'FULLDAY'];

export const citiesUsing = (zone: PriceZone, cities: PriceCity[]) =>
  cities.filter((c) => c.driver_zone_id === zone.id || c.all_in_zone_id === zone.id);

export const rateOf = (zone: PriceZone, carId: string, duration: PriceDuration): PriceRate | undefined =>
  zone.rates.find((r) => r.car_id === carId && r.duration === duration);

/** "Rp 500.000", or "Tanya admin" when there is no price. */
export function Amount({ value }: { value: number | null }) {
  const t = useTranslations('priceList');
  if (value == null) return <span className="text-sm italic text-gray-400">{t('askAdmin')}</span>;
  return <span className="text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(value)}</span>;
}

/** "usulan": proposed by the team, the owner still has to confirm. */
export function ProposalBadge() {
  const t = useTranslations('priceList');
  return (
    <Badge
      variant="outline"
      className="border-amber-300 bg-amber-50 text-[10px] font-medium text-amber-800"
      title={t('proposalHint')}
    >
      {t('proposal')}
    </Badge>
  );
}

/**
 * Cars as rows, durations as columns. Scrolls sideways inside its own box with
 * the car name frozen, so it works at phone width.
 */
export function RateGrid({
  cars,
  durations,
  cellMin,
  renderCell,
  cellClass,
}: {
  cars: PriceCar[];
  durations: PriceDuration[];
  cellMin: number;
  renderCell: (car: PriceCar, duration: PriceDuration) => React.ReactNode;
  cellClass?: (car: PriceCar, duration: PriceDuration) => string | undefined;
}) {
  const t = useTranslations('priceList');
  const firstCol = 150;
  const cols = `${firstCol}px repeat(${durations.length}, minmax(${cellMin}px, 1fr))`;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <div style={{ minWidth: firstCol + durations.length * cellMin }}>
        <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: cols }}>
          <div className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 shadow-[1px_0_0_0_rgb(229,231,235)]">
            {t('car')}
          </div>
          {durations.map((d) => (
            <div key={d} className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {t(`duration.${d}`)}
            </div>
          ))}
        </div>
        {cars.map((car) => (
          <div key={car.id} className="grid border-b border-gray-100 last:border-b-0" style={{ gridTemplateColumns: cols }}>
            <div className="sticky left-0 z-10 min-w-0 bg-white px-3 py-2 shadow-[1px_0_0_0_rgb(243,244,246)]">
              <p className="text-sm font-medium leading-snug text-gray-900">{car.name}</p>
              {car.price_class && <p className="text-[11px] text-gray-400">{car.price_class}</p>}
            </div>
            {durations.map((d) => (
              <div key={d} className={`px-3 py-2 ${cellClass?.(car, d) ?? ''}`}>
                {renderCell(car, d)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function DialogActions({
  busy,
  onClose,
  onConfirm,
  label,
  danger,
  disabled,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('priceList');
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="outline" onClick={onClose} disabled={busy}>
        {t('cancel')}
      </Button>
      <Button variant={danger ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy || disabled}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

/** 409: someone else changed the row since this page loaded it (expected_updated_at). */
export const isConflict = (err: unknown) =>
  !!err && typeof err === 'object' && (err as { response?: { status?: number } }).response?.status === 409;

/**
 * 409 because the row is stale (the API sends conflict_ids), not another 409
 * such as an area or slug that already exists.
 */
export const isStaleConflict = (err: unknown) =>
  isConflict(err) &&
  Array.isArray((err as { response?: { data?: { conflict_ids?: unknown } } }).response?.data?.conflict_ids);

// ─── Unsaved edits ──────────────────────────────────────────────────────────

type DirtyReporter = (key: string, dirty: boolean) => void;

/** The price list page listens: unsaved edits block publishing and warn before leaving. */
export const DirtyContext = createContext<DirtyReporter | null>(null);

/** Tell the page whether this form has unsaved edits (cleared when it unmounts). */
export function useReportDirty(key: string, dirty: boolean) {
  const report = useContext(DirtyContext);
  useEffect(() => {
    report?.(key, dirty);
  }, [report, key, dirty]);
  useEffect(() => () => report?.(key, false), [report, key]);
}

const sameValues = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Local copy of one server row for a form. It follows the row whenever the row
 * changes on the server (another admin, or this admin's own save) unless the
 * admin has unsaved edits; those are kept, and `expectedAt` stays the version
 * they started from, so saving answers 409 instead of silently overwriting.
 */
export function useRowForm<R extends { updated_at: string }, T>(row: R, toForm: (r: R) => T) {
  const [form, setForm] = useState<T>(() => toForm(row));
  const [base, setBase] = useState(() => ({ at: row.updated_at, values: toForm(row) }));
  const dirty = !sameValues(form, base.values);
  if (row.updated_at !== base.at) {
    const fresh = toForm(row);
    // Adjusting state while rendering: React re-renders at once with the new row.
    if (!dirty || sameValues(form, fresh)) {
      setForm(fresh);
      setBase({ at: row.updated_at, values: fresh });
    }
  }
  return {
    form,
    setForm,
    dirty,
    expectedAt: base.at,
    /**
     * After a save: take the saved row as answered by the API (trimmed,
     * normalised). `sent` is the form that was saved; text typed while the
     * request ran is kept (still unsaved, now based on the saved version).
     */
    adopt: (saved: R, sent: T) => {
      const values = toForm(saved);
      setForm((cur) => (sameValues(cur, sent) ? values : cur));
      setBase({ at: saved.updated_at, values });
    },
    /** Drop the edits; the form then follows the (refetched) server row. */
    discard: () => setForm(base.values),
  };
}
