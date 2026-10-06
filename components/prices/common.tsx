'use client';

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
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
  danger?: boolean;
}) {
  const t = useTranslations('priceList');
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="outline" onClick={onClose} disabled={busy}>
        {t('cancel')}
      </Button>
      <Button variant={danger ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

/** Segmented-control button style (same look as the e-toll page filter). */
export const segmentClass = (active: boolean) =>
  `shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
    active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
  }`;
