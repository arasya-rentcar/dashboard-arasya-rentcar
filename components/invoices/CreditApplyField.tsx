'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';

/** Saldo lebih (rupiah) an invoice of `gross` would use: all it can, when ticked. */
export const creditToApply = (credit: number, gross: number, apply: boolean) =>
  apply ? Math.max(0, Math.min(credit, gross)) : 0;

/**
 * "Pakai saldo lebih" on an invoice form (owner decision 7 Oct: ticked by
 * default) plus what the customer still has to transfer. Renders nothing when
 * the order has no saldo lebih, unless `alwaysPreview` (then only the cash to
 * transfer). The API applies the same min(credit, gross).
 */
export default function CreditApplyField({
  id,
  credit,
  gross,
  checked,
  onCheckedChange,
  alwaysPreview = false,
}: {
  id: string;
  credit: number;
  gross: number;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  // Show "Yang harus ditransfer" even without saldo lebih (revise form).
  alwaysPreview?: boolean;
}) {
  const t = useTranslations('invoiceCredit');
  if (credit <= 0 && !alwaysPreview) return null;
  const applied = creditToApply(credit, Math.max(0, gross), checked);
  const cash = Math.max(0, gross - applied);
  return (
    <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-sm">
      {credit > 0 && (
        <label htmlFor={id} className="flex cursor-pointer items-start gap-2">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-sky-700"
          />
          <span className="min-w-0">
            <span className="font-medium text-sky-900">
              {t('useCredit', { amount: formatCurrency(credit) })}
            </span>
            <span className="block text-xs text-sky-800/80">
              {checked ? t('useCreditHint') : t('keepCreditHint')}
            </span>
          </span>
        </label>
      )}
      {gross > 0 && (
        <div className={`space-y-1 text-xs ${credit > 0 ? 'border-t border-sky-200 pt-2' : ''}`}>
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-sky-900/70">{t('invoiceValue')}</span>
            <span className="tabular-nums text-sky-950">{formatCurrency(gross)}</span>
          </div>
          {applied > 0 && (
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="text-sky-900/70">{t('creditUsed')}</span>
              <span className="tabular-nums text-sky-950">−{formatCurrency(applied)}</span>
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-x-3 text-sm">
            <span className="font-medium text-sky-950">{t('toTransfer')}</span>
            <span className="font-semibold tabular-nums text-sky-950">{formatCurrency(cash)}</span>
          </div>
          {cash === 0 && applied > 0 && <p className="text-sky-900">{t('paidByCredit')}</p>}
        </div>
      )}
    </div>
  );
}
