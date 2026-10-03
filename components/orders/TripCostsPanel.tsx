'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, ExternalLink, Plus, Receipt, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const list = costs ?? [];
  const pending = list.filter((c) => c.status === 'PENDING').length;
  const approved = list.filter((c) => c.status === 'APPROVED');
  const sum = (xs: TripCost[]) => xs.reduce((s, c) => s + Number(c.amount || 0), 0);
  // Only internal drivers are reimbursed (through their payable).
  const reimbursed = isExternal ? 0 : sum(approved.filter((c) => c.paid_by === 'DRIVER'));
  const billed = sum(approved.filter((c) => c.bill_to_customer));
  const arasya = sum(approved.filter((c) => !c.bill_to_customer));
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

  async function addCost() {
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
          <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px]" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> {t('add')}
          </Button>
        )}
      </div>

      {adding && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-md bg-gray-50 p-2 sm:grid-cols-4">
          <Select value={newType} onValueChange={(v) => setNewType(v as TripCost['type'])}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['FUEL', 'TOLL', 'PARKING', 'OTHER'] as const).map((k) => (
                <SelectItem key={k} value={k}>{t(`type.${k}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="h-7 text-xs" inputMode="numeric" placeholder={t('amount')} value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          {isExternal ? (
            <span className="flex h-7 items-center text-xs text-gray-500">{t('paidBy.COMPANY')}</span>
          ) : (
            <Select value={newPaidBy} onValueChange={(v) => setNewPaidBy(v as TripCost['paid_by'])}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY">{t('paidBy.COMPANY')}</SelectItem>
                <SelectItem value="DRIVER">{t('paidBy.DRIVER')}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Input className="h-7 text-xs" placeholder={t('note')} value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <div className="col-span-2 flex gap-1.5 sm:col-span-4">
            <Button size="sm" className="h-7 text-xs" onClick={addCost} disabled={create.isPending}>{t('save')}</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>{t('cancel')}</Button>
          </div>
        </div>
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
                  <a href={c.trip_report.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                    {t('receipt')} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {c.note && <p className="text-gray-600">{c.note}</p>}
              {c.status === 'REJECTED' && c.review_note && (
                <p className="text-red-600">{t('rejectReason', { reason: c.review_note })}</p>
              )}
              {!readOnly && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {c.status !== 'APPROVED' && (
                    <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px] text-emerald-700" disabled={update.isPending}
                      onClick={() => patch(c, { status: 'APPROVED' }, t('approved'))}>
                      <Check className="h-3 w-3" /> {t('approve')}
                    </Button>
                  )}
                  {c.status !== 'REJECTED' && rejecting !== c.id && (
                    <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px] text-red-700" disabled={update.isPending}
                      onClick={() => { setRejecting(c.id); setReason(''); }}>
                      <X className="h-3 w-3" /> {t('reject')}
                    </Button>
                  )}
                  {rejecting === c.id && (
                    <span className="flex items-center gap-1">
                      <Input className="h-6 w-48 text-[11px]" placeholder={t('rejectPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
                      <Button size="sm" className="h-6 px-2 text-[11px]" variant="destructive"
                        disabled={busy}
                        onClick={async () => { if (await patch(c, { status: 'REJECTED', review_note: reason.trim() || null }, t('rejected'))) setRejecting(null); }}>
                        {t('reject')}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setRejecting(null)}>{t('cancel')}</Button>
                    </span>
                  )}
                  {!isExternal && (
                    <Select value={c.paid_by} disabled={busy} onValueChange={(v) => patch(c, { paid_by: v })}>
                      <SelectTrigger className="h-6 w-auto gap-1 px-2 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRIVER">{t('paidBy.DRIVER')}</SelectItem>
                        <SelectItem value="COMPANY">{t('paidBy.COMPANY')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <label className="inline-flex items-center gap-1 text-gray-600">
                    <input type="checkbox" disabled={busy} checked={c.bill_to_customer} onChange={(e) => patch(c, { bill_to_customer: e.target.checked })} />
                    {t('billCustomer')}
                  </label>
                  {c.created_by && (
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-gray-400 hover:text-red-600" title={t('delete')}
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
            <p>{t('summary', { reimbursed: formatCurrency(reimbursed), billed: formatCurrency(billed), arasya: formatCurrency(arasya) })}</p>
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
