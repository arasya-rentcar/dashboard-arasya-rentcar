'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, isoToWibDateTimeLocal } from '@/lib/utils';

// Shared pieces of the per-day cancellation fee (API A3): the badge on a
// cancelled day, the reason of a tier and the "jam pelanggan membatalkan" input.

const TIER_PCT: Record<number, number> = { 1: 20, 2: 50, 3: 100 };

/** "Dibatalkan · biaya Rp X (20%)"; null unless the day is cancelled with a stored fee. */
export function CancelFeeBadge({
  line,
  className = '',
}: {
  line: {
    line_status?: string | null;
    cancel_fee?: string | number | null;
    cancel_tier?: number | null;
  };
  className?: string;
}) {
  const t = useTranslations('dayCancel');
  if (line.line_status !== 'CANCELLED' || line.cancel_fee == null) return null;
  const fee = formatCurrency(line.cancel_fee);
  const pct = line.cancel_tier ? TIER_PCT[line.cancel_tier] : undefined;
  return (
    <Badge
      variant="outline"
      className={`whitespace-normal text-left text-[10px] bg-red-50 text-red-700 border-red-200 ${className}`}
    >
      {pct ? t('badge', { fee, pct }) : t('badgeNoTier', { fee })}
    </Badge>
  );
}

/** Why a day falls in its tier (the API's dayCancellation rule). */
export function useTierReason() {
  const t = useTranslations('dayCancel');
  return (tier: number, started: boolean) =>
    tier === 1
      ? t('reason1')
      : tier === 2
        ? t('reason2')
        : started
          ? t('reason3Started')
          : t('reason3');
}

/**
 * Optional "Jam pelanggan membatalkan" (WIB). The API accepts at most 3 days
 * back and not in the future; the fee is worked out from this time.
 */
export function CustomerCancelTimeInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations('dayCancel');
  const now = Date.now();
  const max = isoToWibDateTimeLocal(new Date(now).toISOString());
  const min = isoToWibDateTimeLocal(new Date(now - 3 * 86_400_000).toISOString());
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-gray-600">
        {t('requestedAtLabel')}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="datetime-local"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 rounded-md px-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            {t('requestedAtClear')}
          </button>
        )}
      </div>
      <p className="text-[11px] text-gray-500">{t('requestedAtHint')}</p>
    </div>
  );
}
