'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { RupiahInput } from '@/components/forms/RupiahInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, isoToWibDateTimeLocal } from '@/lib/utils';

// Shared pieces of the per-day cancellation fee (API A3): the badge on a
// cancelled day, the reason of a tier and the "jam pelanggan membatalkan" input.

const TIER_PCT: Record<number, number> = { 1: 20, 2: 50, 3: 100 };

/** The charged fee differs from the automatic one (set by hand in Edit Hari / Batalkan Pesanan). */
export function isManualCancelFee(line: {
  cancel_fee?: string | number | null;
  cancel_fee_auto?: string | number | null;
}) {
  return (
    line.cancel_fee != null &&
    line.cancel_fee_auto != null &&
    Number(line.cancel_fee) !== Number(line.cancel_fee_auto)
  );
}

/** "Dibatalkan · biaya Rp X (20%)"; null unless the day is cancelled with a stored fee. */
export function CancelFeeBadge({
  line,
  className = '',
}: {
  line: {
    line_status?: string | null;
    cancel_fee?: string | number | null;
    cancel_tier?: number | null;
    cancel_fee_auto?: string | number | null;
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
      <span>
        {pct ? t('badge', { fee, pct }) : t('badgeNoTier', { fee })}
        {isManualCancelFee(line) && (
          <span className="block font-normal text-amber-700">
            {t('manualNote', { auto: formatCurrency(line.cancel_fee_auto ?? 0) })}
          </span>
        )}
      </span>
    </Badge>
  );
}

/** Why a day falls in its tier (the API's dayCancellation rule). */
export function useTierReason() {
  const t = useTranslations('dayCancel');
  return (tier: number, arrived: boolean) =>
    tier === 1
      ? t('reason1')
      : tier === 2
        ? t('reason2')
        : arrived
          ? t('reason3Started')
          : t('reason3');
}

/**
 * The fee of a cancelled day as the admin sees it. `manual` is the text the
 * admin typed (plain digits) or null while the automatic fee stands; a value
 * equal to the automatic fee counts as automatic (nothing is sent).
 */
export function cancelFeeState(manual: string | null, auto: number, price: number) {
  const value = manual ?? String(auto);
  const invalid = value === '' || Number(value) > price;
  const fee = invalid ? auto : Number(value);
  return { value, invalid, fee, isManual: !invalid && fee !== auto };
}

const percentOf = (fee: number, price: number) =>
  price > 0 ? Math.round((fee / price) * 1000) / 10 : 0;

/**
 * "Biaya pembatalan" for one day: the nominal prefilled with the automatic fee
 * plus a % box that moves with it, bounded 0..price, whole rupiah.
 */
export function CancelFeeField({
  id,
  price,
  auto,
  autoPct,
  reason,
  manual,
  onChange,
}: {
  id: string;
  price: number;
  auto: number;
  autoPct: number;
  reason: string;
  manual: string | null;
  onChange: (manual: string | null) => void;
}) {
  const t = useTranslations('dayCancel');
  const locale = useLocale();
  // What the admin typed in the % box; null = derive it from the nominal.
  const [pctText, setPctText] = useState<string | null>(null);
  const state = cancelFeeState(manual, auto, price);
  const pctShown =
    manual !== null && pctText !== null
      ? pctText
      : state.value === ''
        ? ''
        : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
            percentOf(Number(state.value), price),
          );

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-gray-700">
        {t('feeLabel')}
      </label>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <RupiahInput
            id={id}
            value={state.value}
            onChange={(v) => {
              setPctText(null);
              onChange(v);
            }}
          />
        </div>
        <div className="relative w-20 shrink-0">
          <Input
            inputMode="decimal"
            aria-label={t('feePctLabel')}
            className="pr-7 text-right tabular-nums"
            value={pctShown}
            onChange={(e) => {
              const text = e.target.value;
              if (!/^\d{0,3}([.,]\d{0,2})?$/.test(text)) return;
              setPctText(text);
              const pct = Number(text.replace(',', '.'));
              onChange(text === '' ? '' : String(Math.round((price * pct) / 100)));
            }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            %
          </span>
        </div>
      </div>
      {state.invalid && (
        <p className="text-[11px] leading-snug text-red-600">
          {state.value === ''
            ? t('feeRequired')
            : t('feeAbovePrice', { price: formatCurrency(price) })}
        </p>
      )}
      <p className="text-[11px] leading-snug text-gray-500">
        {t('feeExplain', { pct: autoPct, price: formatCurrency(price), reason })}
      </p>
      {manual !== null && (
        <button
          type="button"
          onClick={() => {
            setPctText(null);
            onChange(null);
          }}
          className="text-[11px] font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          {t('feeUseAuto')}
        </button>
      )}
    </div>
  );
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
