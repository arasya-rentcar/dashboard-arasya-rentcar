'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RefundList from '@/components/orders/RefundList';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import type { CreditEntryKind, OrderCreditEntry, OrderMoney, OrderRefund } from '@/types';

const KIND_KEYS: Record<CreditEntryKind, string> = {
  OPENING: 'kind.OPENING',
  OVERPAYMENT: 'kind.OVERPAYMENT',
  RELEASE: 'kind.RELEASE',
  APPLIED: 'kind.APPLIED',
  UNAPPLIED: 'kind.UNAPPLIED',
  REFUND: 'kind.REFUND',
};

/**
 * Saldo lebih of the order: the balance with the refund button, the refunds
 * made ("Pengembalian dana") and the ledger ("Riwayat saldo lebih", folded).
 * Rendered only when the order has or had saldo lebih.
 */
export default function OrderCreditCard({
  orderId,
  money,
  refunds,
  entries,
  onRefund,
}: {
  orderId: string;
  money: OrderMoney;
  refunds: OrderRefund[];
  entries: OrderCreditEntry[];
  onRefund: () => void;
}) {
  const t = useTranslations('orderCredit');
  const [historyOpen, setHistoryOpen] = useState(false);
  if (money.credit_balance <= 0 && refunds.length === 0 && entries.length === 0) return null;

  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-sky-800">{t('balance')}</p>
            <p className="text-lg font-bold tabular-nums text-sky-900">{formatCurrency(money.credit_balance)}</p>
          </div>
          {money.credit_balance > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-auto min-h-9 whitespace-normal border-sky-300 py-1.5 text-sky-800 hover:bg-sky-100"
              onClick={onRefund}
            >
              <RotateCcw className="h-4 w-4" />
              {t('refundBtn')}
            </Button>
          )}
        </div>
        {money.credit_balance > 0 && <p className="text-xs text-gray-500">{t('balanceHint')}</p>}

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t('refunds')}</p>
            {money.refunded > 0 && (
              <span className="text-xs tabular-nums text-gray-500">
                {t('refundedTotal', { amount: formatCurrency(money.refunded) })}
              </span>
            )}
          </div>
          {refunds.length > 0 ? (
            <RefundList orderId={orderId} refunds={refunds} />
          ) : (
            <p className="text-xs text-gray-400">{t('noRefunds')}</p>
          )}
        </div>

        {entries.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <button
              type="button"
              className="flex min-h-9 w-full items-center justify-between gap-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500 hover:text-gray-700"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
            >
              <span>{t('history', { count: entries.length })}</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', historyOpen && 'rotate-180')} />
            </button>
            {historyOpen && (
              <ul className="mt-2 space-y-2">
                {entries.map((e, i) => {
                  const amount = Number(e.amount);
                  return (
                    <li key={`${e.created_at}-${i}`} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-700">
                          {t(KIND_KEYS[e.kind] ?? 'kind.OPENING')}
                          {e.invoice_number && (
                            <span className="ml-1 break-all font-mono font-normal text-gray-500">{e.invoice_number}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDateTime(e.created_at)}</p>
                        {e.note && <p className="break-words text-[11px] text-gray-500">{e.note}</p>}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 font-semibold tabular-nums',
                          amount >= 0 ? 'text-emerald-700' : 'text-gray-700',
                        )}
                      >
                        {amount >= 0 ? '+' : '−'}
                        {formatCurrency(Math.abs(amount))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
