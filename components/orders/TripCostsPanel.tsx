'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, Eye, Loader2, Plus, Receipt, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFilePreview } from '@/components/preview/FilePreview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTripCost, useDeleteTripCost, useUpdateTripCost } from '@/hooks/useTripCosts';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import type { LinePayable, TripCost } from '@/types';

const STATUS_STYLE: Record<TripCost['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

/**
 * Trip costs of one day and their review. Costs from the driver app arrive
 * "waiting" and count only once approved: approved costs the driver paid are
 * reimbursed through the driver payable, costs billed to the customer
 * (X Parkir / XOPS packages) become extra charges for Invoice Tambahan, the
 * rest is Arasya's cost. Finalizing the order waits until none is waiting.
 */
export default function TripCostsPanel({
  lineId,
  costs,
  payable,
  isExternal,
  readOnly,
}: {
  lineId: string;
  costs?: TripCost[] | null;
  payable?: LinePayable | null;
  isExternal?: boolean;
  readOnly?: boolean;
}) {
  const t = useTranslations('tripCosts');
  const { openPreview } = useFilePreview();
  const update = useUpdateTripCost();
  const create = useCreateTripCost();
  const remove = useDeleteTripCost();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<TripCost['type']>('PARKING');
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newPaidBy, setNewPaidBy] = useState<TripCost['paid_by']>('COMPANY');
  // Idempotency key for the add form: a resend after a lost answer is a no-op.
  const [newRef, setNewRef] = useState(() => crypto.randomUUID());
  const busy = update.isPending;
  // Compact controls on desktop, finger-sized (32px) on phones.
  const btn = 'h-8 gap-1 px-2 text-[11px] sm:h-6';

  const list = costs ?? [];
  const pending = list.filter((c) => c.status === 'PENDING').length;
  const approved = list.filter((c) => c.status === 'APPROVED');
  const sum = (xs: TripCost[]) => xs.reduce((s, c) => s + Number(c.amount || 0), 0);
  // Who paid first vs. who finally bears the cost (two separate questions: a
  // cost the driver paid AND billed to the customer is listed on both lines, but
  // it is counted once on each).
  // Only internal drivers are reimbursed (through their fee payable).
  const paidByDriver = isExternal ? 0 : sum(approved.filter((c) => c.paid_by === 'DRIVER'));
  const paidByOffice = sum(approved) - paidByDriver;
  const billed = sum(approved.filter((c) => c.bill_to_customer));
  const arasya = sum(approved) - billed;
  const showPay = !isExternal && payable && payable.kind !== 'VENDOR';

  if (!list.length && !showPay && readOnly) return null;

  /** Saves one change; true when it went through (the reject box stays open otherwise). */
  async function patch(c: TripCost, data: object, okMsg?: string): Promise<boolean> {
    try {
      await update.mutateAsync({ id: c.id, data });
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  }

  // Every receipt photo of this day in one gallery, starting at the clicked one.
  function showReceipt(costId: string) {
    const withPhoto = list.filter((c) => c.trip_report?.file_url);
    const items = withPhoto.map((c) => ({
      url: c.trip_report!.file_url!,
      title: `${t('receipt')} · ${t(`type.${c.type}`)} · ${formatCurrency(c.amount)}`,
    }));
    openPreview(items, Math.max(0, withPhoto.findIndex((c) => c.id === costId)));
  }

  async function addCost(e?: React.FormEvent) {
    e?.preventDefault();
    if (create.isPending) return;
    const amount = Number(newAmount.replace(/[^\d]/g, ''));
    if (!amount) return toast.error(t('amountRequired'));
    try {
      await create.mutateAsync({
        lineId,
        data: {
          type: newType,
          amount,
          note: newNote.trim() || undefined,
          // Partner days have no driver payable to reimburse through.
          paid_by: isExternal ? 'COMPANY' : newPaidBy,
          client_ref: newRef,
        },
      });
      setNewRef(crypto.randomUUID());
      setAdding(false);
      setNewAmount('');
      setNewNote('');
      toast.success(t('added'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2 text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
          <Receipt className="h-3 w-3" /> {t('title')}
          {pending > 0 && (
            <Badge variant="outline" className={`ml-1 text-[10px] ${STATUS_STYLE.PENDING}`}>
              {t('pendingCount', { n: pending })}
            </Badge>
          )}
        </span>
        {!readOnly && !adding && (
          <Button type="button" size="sm" variant="outline" className={btn} onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> {t('add')}
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={addCost} className="mt-2 grid grid-cols-1 gap-1.5 rounded-md bg-gray-50 p-2 min-[400px]:grid-cols-2 lg:grid-cols-4">
          <Select value={newType} onValueChange={(v) => setNewType(v as TripCost['type'])}>
            <SelectTrigger className="h-8 w-full text-xs sm:h-7" aria-label={t('typeLabel')}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['FUEL', 'TOLL', 'PARKING', 'OTHER'] as const).map((k) => (
                <SelectItem key={k} value={k}>{t(`type.${k}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="h-8 text-xs sm:h-7" inputMode="numeric" placeholder={t('amount')} aria-label={t('amount')} value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          {isExternal ? (
            <span className="flex min-h-7 items-center text-xs text-gray-500">{t('paidBy.COMPANY')}</span>
          ) : (
            <Select value={newPaidBy} onValueChange={(v) => setNewPaidBy(v as TripCost['paid_by'])}>
              <SelectTrigger className="h-8 w-full text-xs sm:h-7" aria-label={t('paidByLabel')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY">{t('paidBy.COMPANY')}</SelectItem>
                <SelectItem value="DRIVER">{t('paidBy.DRIVER')}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Input className="h-8 text-xs sm:h-7" placeholder={t('note')} aria-label={t('note')} value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <div className="flex gap-1.5 min-[400px]:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm" className="h-8 text-xs sm:h-7" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {t('save')}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs sm:h-7" disabled={create.isPending} onClick={() => setAdding(false)}>{t('cancel')}</Button>
          </div>
        </form>
      )}

      {list.length === 0 ? (
        !adding && <p className="mt-1 text-gray-400">{t('none')}</p>
      ) : (
        <ul className="mt-1.5 divide-y divide-gray-100">
          {list.map((c) => (
            <li key={c.id} className="py-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-gray-800">{t(`type.${c.type}`)}</span>
                <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(c.amount)}</span>
                <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[c.status]}`}>
                  {t(`status.${c.status}`)}
                </Badge>
                <span className="text-gray-400">{c.created_by ? t('fromAdmin') : t('fromApp')}</span>
                {c.trip_report?.file_url && (
                  <button
                    type="button"
                    onClick={() => showReceipt(c.id)}
                    className="inline-flex min-h-6 items-center gap-0.5 text-blue-600 hover:underline"
                  >
                    <Eye className="h-3 w-3" /> {t('receipt')}
                  </button>
                )}
              </div>
              {c.note && <p className="break-words text-gray-600">{c.note}</p>}
              {c.status === 'APPROVED' && c.bill_to_customer && c.paid_by === 'DRIVER' && !isExternal && (
                <p className="mt-0.5 rounded bg-blue-50 px-1.5 py-1 text-blue-800">
                  {t('billedDriverHint', { amount: formatCurrency(c.amount) })}
                </p>
              )}
              {c.status === 'REJECTED' && c.review_note && (
                <p className="text-red-600">{t('rejectReason', { reason: c.review_note })}</p>
              )}
              {!readOnly && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {c.status !== 'APPROVED' && (
                    <Button type="button" size="sm" variant="outline" className={`${btn} text-emerald-700`} disabled={busy}
                      onClick={() => patch(c, { status: 'APPROVED' }, t('approved'))}>
                      <Check className="h-3 w-3" /> {t('approve')}
                    </Button>
                  )}
                  {c.status !== 'REJECTED' && rejecting !== c.id && (
                    <Button type="button" size="sm" variant="outline" className={`${btn} text-red-700`} disabled={busy}
                      onClick={() => { setRejecting(c.id); setReason(''); }}>
                      <X className="h-3 w-3" /> {t('reject')}
                    </Button>
                  )}
                  {rejecting === c.id && (
                    <span className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
                      <Input className="h-8 min-w-0 flex-1 text-[11px] sm:h-6 sm:w-48 sm:flex-none" placeholder={t('rejectPlaceholder')} aria-label={t('rejectPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
                      <Button type="button" size="sm" className={btn} variant="destructive"
                        disabled={busy}
                        onClick={async () => { if (await patch(c, { status: 'REJECTED', review_note: reason.trim() || null }, t('rejected'))) setRejecting(null); }}>
                        {t('reject')}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className={btn} onClick={() => setRejecting(null)}>{t('cancel')}</Button>
                    </span>
                  )}
                  {!isExternal && (
                    <Select value={c.paid_by} disabled={busy} onValueChange={(v) => patch(c, { paid_by: v })}>
                      <SelectTrigger className="h-8 w-auto max-w-full gap-1 px-2 text-[11px] sm:h-6" aria-label={t('paidByLabel')}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRIVER">{t('paidBy.DRIVER')}</SelectItem>
                        <SelectItem value="COMPANY">{t('paidBy.COMPANY')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <label className="inline-flex min-h-8 items-center gap-1 text-gray-600 sm:min-h-6">
                    <input className="h-3.5 w-3.5" type="checkbox" disabled={busy} checked={c.bill_to_customer} onChange={(e) => patch(c, { bill_to_customer: e.target.checked })} />
                    {t('billCustomer')}
                  </label>
                  {c.created_by && (
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 sm:h-6 sm:w-6" title={t('delete')} aria-label={t('delete')}
                      disabled={remove.isPending && remove.variables === c.id}
                      onClick={async () => { try { await remove.mutateAsync(c.id); } catch (err) { toast.error(getErrorMessage(err)); } }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {(approved.length > 0 || showPay) && (
        <div className="mt-1.5 space-y-0.5 border-t border-gray-100 pt-1.5 text-gray-600">
          {approved.length > 0 && (
            <>
              <p>{t('summaryPaidFirst', { driver: formatCurrency(paidByDriver), office: formatCurrency(paidByOffice) })}</p>
              <p>{t('summaryBorneBy', { billed: formatCurrency(billed), arasya: formatCurrency(arasya) })}</p>
            </>
          )}
          {showPay && payable && (
            <p>
              {t('payable', {
                fee: formatCurrency(payable.base_amount ?? 0),
                reimburse: formatCurrency(payable.reimburse_amount ?? 0),
                advance: formatCurrency(payable.advance_amount ?? 0),
                total: formatCurrency(payable.total_amount ?? 0),
              })}{' '}
              <Badge variant="outline" className={`text-[10px] ${payable.status === 'PAID' ? STATUS_STYLE.APPROVED : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {payable.status === 'PAID' ? t('paid') : t('unpaid')}
              </Badge>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
