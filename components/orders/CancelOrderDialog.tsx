'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CancelFeeField,
  cancelFeeState,
  CustomerCancelTimeInput,
  useTierReason,
} from '@/components/orders/DayCancellation';
import { useClientRef } from '@/hooks/useClientRef';
import {
  useCancelOrder,
  useOrderCancelQuote,
  type CancelOrderResult,
} from '@/hooks/useOrders';
import {
  apiErrorBody,
  formatCurrency,
  formatDate,
  getErrorMessage,
  wibDateTimeToIso,
} from '@/lib/utils';
import type { OrderCancelQuote } from '@/types';

/**
 * "Batalkan Pesanan", per day (API A3): every open day gets its own fee from
 * its own date and price; days cancelled earlier keep theirs; DONE days and
 * extra charges stay billed in full. Shows the API quote, sends the fee total
 * the admin saw (409 CANCEL_FEE_CHANGED when it moved) and a client_ref.
 */
export default function CancelOrderDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('orderDetail');
  const tc = useTranslations('common');
  const td = useTranslations('dayCancel');
  const tierReason = useTierReason();
  const [reason, setReason] = useState('');
  const [requestedLocal, setRequestedLocal] = useState('');
  const [changedQuote, setChangedQuote] = useState<OrderCancelQuote | null>(null);
  // Fees typed by hand, by day (plain digits); a day without an entry keeps its automatic fee.
  const [feeManual, setFeeManual] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CancelOrderResult | null>(null);
  const [clientRef, renewClientRef] = useClientRef(open);
  const requestedIso = wibDateTimeToIso(requestedLocal);
  const quoteQuery = useOrderCancelQuote(orderId, requestedIso, open && !result);
  const quote = changedQuote ?? quoteQuery.data;
  const mutation = useCancelOrder();

  const dayStates = (quote?.days ?? []).map((d) => ({
    day: d,
    state: cancelFeeState(feeManual[d.id] ?? null, d.fee, d.price),
  }));
  const feesInvalid = dayStates.some((x) => x.state.invalid);
  const manualDays = dayStates.filter((x) => x.state.isManual);
  // The penalty the admin is confirming: the automatic total moved by the days changed by hand.
  const finalFeeTotal = quote
    ? quote.fee_total + dayStates.reduce((sum, x) => sum + (x.state.fee - x.day.fee), 0)
    : 0;

  function setOpen(o: boolean) {
    // Closing mid-request would reopen with a new client_ref while the first
    // cancel still commits.
    if (!o && mutation.isPending) return;
    onOpenChange(o);
    if (!o) {
      setReason('');
      setRequestedLocal('');
      setChangedQuote(null);
      setFeeManual({});
      setResult(null);
    }
  }

  async function confirm() {
    if (!reason.trim()) {
      toast.error(t('cancelReasonRequired'));
      return;
    }
    if (!quote) return;
    try {
      const res = await mutation.mutateAsync({
        id: orderId,
        reason: reason.trim(),
        // The automatic total the admin was shown; the manual days go in day_fees.
        expected_fee_total: quote.fee_total,
        ...(manualDays.length
          ? { day_fees: manualDays.map((x) => ({ line_id: x.day.id, fee: x.state.fee })) }
          : {}),
        ...(requestedIso ? { requested_at: requestedIso } : {}),
        client_ref: clientRef,
      });
      renewClientRef();
      setFeeManual({});
      setResult(res);
      setReason('');
      toast.success(t('okOrderCancelled'));
    } catch (err) {
      const body = apiErrorBody(err);
      if (body?.code === 'CANCEL_FEE_CHANGED' && body.quote) {
        setChangedQuote(body.quote as OrderCancelQuote);
        toast.error(td('feeChangedToast'));
      } else {
        // Days, invoices or payments moved meanwhile: show the fresh quote.
        setChangedQuote(null);
        void quoteQuery.refetch();
        toast.error(getErrorMessage(err));
      }
    }
  }

  const row = (label: string, value: number, cls = '') => (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium tabular-nums ${cls}`}>{formatCurrency(value)}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('cancelOrder')}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="min-w-0 space-y-3 text-sm">
            <div className="space-y-1.5 rounded-lg border border-gray-200 p-3">
              {row(t('cqFeeTotal'), result.feeTotal ?? result.penalty, 'text-red-700')}
              {result.newTotal != null &&
                row(t('cqNewTotal'), result.newTotal)}
              {row(t('cancelPaid'), result.netPaid ?? result.paidToDate)}
              {result.refundDue > 0 &&
                row(t('cancelRefundDue'), result.refundDue, 'text-amber-700')}
              {result.stillOwed > 0 &&
                row(t('cancelStillOwed'), result.stillOwed, 'text-emerald-700')}
            </div>
            {!!result.voidedInvoices?.length && (
              <p className="text-xs text-gray-600">
                {t('cqResultVoided', {
                  numbers: result.voidedInvoices.map((v) => v.number).join(', '),
                })}
              </p>
            )}
            {result.refundDue > 0 && (
              <p className="text-xs text-amber-700">{t('cancelRefundHint')}</p>
            )}
            {result.stillOwed > 0 && result.cancellationInvoiceNumber && (
              <p className="text-xs text-gray-600">
                {t('cancelInvoiceIssued', {
                  number: result.cancellationInvoiceNumber,
                  amount: formatCurrency(result.stillOwed),
                })}
              </p>
            )}
            {result.stillOwed === 0 && result.refundDue === 0 && (
              <p className="text-xs text-gray-600">{t('cancelSettled')}</p>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)} size="sm">
                {tc('close')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 space-y-3 text-sm">
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('cancelWarning')}</p>
            </div>

            {quoteQuery.isError && !changedQuote ? (
              <p className="rounded-lg border border-red-200 bg-white p-3 text-xs text-red-700">
                {getErrorMessage(quoteQuery.error)}
              </p>
            ) : !quote ? (
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {td('quoteLoading')}
              </p>
            ) : (
              <div className="space-y-3">
                {changedQuote && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                    {t('cqFeeChanged', { fee: formatCurrency(changedQuote.fee_total) })}
                  </p>
                )}
                {quote.days.length > 0 && (
                  <ul className="space-y-2">
                    {dayStates.map(({ day: d, state }) => (
                      <li key={d.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                          <span className="font-medium text-gray-900">
                            {d.date ? formatDate(d.date) : t('cqNoDate')}
                          </span>
                          <span className="tabular-nums text-gray-500">
                            {t('cqPrice')} {formatCurrency(d.price)}
                          </span>
                        </div>
                        <CancelFeeField
                          id={`cancel-fee-${d.id}`}
                          price={d.price}
                          auto={d.fee}
                          autoPct={d.pct}
                          reason={tierReason(d.tier, d.started)}
                          manual={feeManual[d.id] ?? null}
                          onChange={(v) =>
                            setFeeManual((m) => {
                              const next = { ...m };
                              if (v === null) delete next[d.id];
                              else next[d.id] = v;
                              return next;
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-1 rounded-lg border border-gray-200 p-3 text-xs">
                  {quote.earlier_fee_total > 0 && row(t('cqEarlierFees'), quote.earlier_fee_total)}
                  {row(t('cqFeeTotal'), finalFeeTotal, 'text-red-700')}
                  {manualDays.map(({ day: d, state }) => (
                    <p key={d.id} className="text-[11px] text-amber-700">
                      {d.date ? formatDate(d.date) : t('cqNoDate')}
                      {': '}
                      {formatCurrency(state.fee)} · {td('manualNote', { auto: formatCurrency(d.fee) })}
                    </p>
                  ))}
                  {quote.done_total > 0 && row(t('cqDoneTotal'), quote.done_total)}
                  {quote.charges > 0 && row(t('cqCharges'), quote.charges)}
                  <div className="flex justify-between gap-3 border-t border-gray-100 pt-1">
                    <span className="text-gray-500">{t('cqTotal')}</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(quote.original_total)} → {formatCurrency(quote.new_total)}
                    </span>
                  </div>
                  {row(t('cancelPaid'), quote.net_paid)}
                </div>

                <div className="space-y-1.5 text-xs text-gray-700">
                  {quote.voided_invoices.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-900">{t('cqVoided')}</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {quote.voided_invoices.map((v) => (
                          <li key={v.id} className="flex flex-wrap justify-between gap-x-3">
                            <span>
                              {v.number}
                              {v.credit_applied > 0 &&
                                ` · ${t('cqVoidedCredit', { amount: formatCurrency(v.credit_applied) })}`}
                            </span>
                            <span className="tabular-nums">{formatCurrency(v.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {quote.fee_invoice ? (
                    <p className="rounded-md bg-gray-50 px-2 py-1.5">
                      {t('cqFeeInvoice', { amount: formatCurrency(quote.fee_invoice.amount) })}
                      {quote.fee_invoice.credit_applied > 0 &&
                        ` ${t('cqFeeInvoiceCredit', { amount: formatCurrency(quote.fee_invoice.credit_applied) })}`}
                    </p>
                  ) : quote.credit_after > 0 ? (
                    <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-emerald-800">
                      {t('cqCreditAfter', { amount: formatCurrency(quote.credit_after) })}
                    </p>
                  ) : (
                    <p className="rounded-md bg-gray-50 px-2 py-1.5">{t('cqSettled')}</p>
                  )}
                  {manualDays.length > 0 && (
                    <p className="text-[11px] text-amber-700">{td('manualPreviewNote')}</p>
                  )}
                  <p className="text-[11px] text-gray-500">{td('extraChargesNote')}</p>
                  <p className="text-[11px] text-gray-500">{td('policyShort')}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="cancel-reason" className="block text-xs text-gray-600">
                {t('cancelReasonLabel')} <span className="text-red-600">*</span>
              </label>
              <Textarea
                id="cancel-reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('cancelReasonPlaceholder')}
                rows={2}
              />
            </div>
            <CustomerCancelTimeInput
              id="cancel-requested-at"
              value={requestedLocal}
              onChange={(v) => {
                setRequestedLocal(v);
                setChangedQuote(null);
              }}
            />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mutation.isPending}
                onClick={() => setOpen(false)}
              >
                {tc('cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={confirm}
                disabled={
                  mutation.isPending ||
                  !reason.trim() ||
                  !quote ||
                  quoteQuery.isFetching ||
                  feesInvalid
                }
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {changedQuote ? t('cqConfirmAgain') : t('cancelConfirm')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
