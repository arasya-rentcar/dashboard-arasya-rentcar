'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, X, Plus, Trash2, Receipt, Pencil, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateTripCost,
  useUpdateTripCost,
  useDeleteTripCost,
} from '@/hooks/useTripCosts';
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from '@/lib/utils';
import type {
  OrderServiceItem,
  TripExpense,
  TripExpensePayer,
  TripExpenseType,
} from '@/types';

const COST_TYPES: TripExpenseType[] = ['FUEL', 'TOLL', 'PARKING', 'OTHER'];

// Same rule as the API: X Parkir bills parking, X Ops bills fuel/toll/parking.
function billedByPackage(pkg: string | null | undefined, type: TripExpenseType) {
  const p = (pkg ?? '').toUpperCase().trim();
  if (p === 'XOPS') return type !== 'OTHER';
  if (p === 'ALL-IN X PARKIR') return type === 'PARKING';
  return false;
}

const digits = (s: string) => {
  const d = s.replace(/\D/g, '');
  return d === '' ? null : Number(d);
};

/**
 * Per day: the driver's fee and uang jalan, the trip costs (from the driver
 * app or added here) with their review, and what the driver is owed.
 */
export default function TripCostsCard({
  items,
  onEditDay,
}: {
  items: OrderServiceItem[];
  onEditDay: (item: OrderServiceItem) => void;
}) {
  const t = useTranslations('tripCosts');
  const days = items.filter(
    (it) =>
      it.id &&
      (it.line_status !== 'CANCELLED' ||
        (it.expenses?.length ?? 0) > 0 ||
        !!it.payable),
  );
  const pending = days.reduce(
    (n, d) => n + (d.expenses ?? []).filter((e) => e.status === 'PENDING').length,
    0,
  );

  if (days.length === 0) return null;

  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          {pending > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {t('pendingBadge', { count: pending })}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">{t('intro')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map((item) => (
          <DayBlock key={item.id} item={item} onEditDay={onEditDay} />
        ))}
      </CardContent>
    </Card>
  );
}

function DayBlock({
  item,
  onEditDay,
}: {
  item: OrderServiceItem;
  onEditDay: (item: OrderServiceItem) => void;
}) {
  const t = useTranslations('tripCosts');
  const [adding, setAdding] = useState(false);
  const expenses = item.expenses ?? [];
  const p = item.payable;
  const external = !!item.is_external;
  const who = external
    ? item.external_vendor?.name || t('partnerUnset')
    : item.driver?.name || t('driverUnset');

  const approved = expenses.filter((e) => e.status === 'APPROVED');
  const arasya = approved
    .filter((e) => !e.bill_to_customer)
    .reduce((s, e) => s + Number(e.amount), 0);
  const billed = approved
    .filter((e) => e.bill_to_customer)
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {item.service_date ? formatDate(item.service_date) : '—'} ·{' '}
            <span className={external ? 'text-purple-700' : 'text-blue-700'}>
              {external ? t('partner') : t('internal')}
            </span>{' '}
            · {who}
            {item.line_status === 'CANCELLED' && (
              <span className="ml-1.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700">
                {t('cancelledDay')}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {external ? (
              <>
                {t('rtr')}: {formatCurrency(item.rtr_amount ?? 0)}
              </>
            ) : (
              <>
                {t('fee')}: {formatCurrency(item.driver_fee ?? 0)}
                {item.driver_fee_note ? ` (${item.driver_fee_note})` : ''}
                {Number(item.travel_advance ?? 0) > 0 &&
                  ` · ${t('advance')}: ${formatCurrency(item.travel_advance)}`}
              </>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onEditDay(item)}
        >
          <Pencil className="h-3 w-3" />
          {external ? t('editRtr') : t('editFee')}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {expenses.length === 0 && !adding && (
          <p className="text-xs text-gray-400">{t('noCosts')}</p>
        )}
        {expenses.map((e) => (
          <CostRow key={e.id} e={e} />
        ))}
        {adding ? (
          <AddCostForm
            lineId={item.id!}
            servicePackage={item.service_package}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addCost')}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-600">
        <span>
          {t('arasyaCosts')}: <b>{formatCurrency(arasya)}</b>
        </span>
        {billed > 0 && (
          <span>
            {t('billedToCustomer')}: <b>{formatCurrency(billed)}</b>
          </span>
        )}
      </div>

      {p && (
        <div className="mt-2 rounded-md bg-gray-50 px-2.5 py-2 text-xs text-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              {p.kind === 'DRIVER' ? t('payableDriver') : t('payableVendor')}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                p.status === 'PAID'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {p.status === 'PAID' ? t('paid') : t('unpaid')}
            </span>
          </div>
          <p className="mt-1">
            {p.kind === 'DRIVER'
              ? t('payableFormulaDriver', {
                  fee: formatCurrency(p.base_amount),
                  reimburse: formatCurrency(p.reimburse_amount),
                  advance: formatCurrency(p.advance_amount),
                  extras: formatCurrency(p.extras_amount),
                })
              : t('payableFormulaVendor', {
                  rtr: formatCurrency(p.base_amount),
                  extras: formatCurrency(p.extras_amount),
                })}{' '}
            = <b>{formatCurrency(p.total_amount)}</b>
          </p>
          {p.status === 'PAID' && (
            <p className="mt-1 text-[11px] text-gray-500">{t('paidLockedHint')}</p>
          )}
          <Link
            href="/dashboard/payables"
            className="mt-1 inline-block text-[11px] font-medium text-blue-700 hover:underline"
          >
            {t('openPayables')}
          </Link>
        </div>
      )}
    </div>
  );
}

function CostRow({ e }: { e: TripExpense }) {
  const t = useTranslations('tripCosts');
  const update = useUpdateTripCost();
  const remove = useDeleteTripCost();
  const busy = update.isPending || remove.isPending;
  const fromApp = !e.created_by;

  async function patch(data: object, okMsg?: string) {
    try {
      await update.mutateAsync({ id: e.id, data });
      if (okMsg) toast.success(okMsg);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }
  async function del() {
    try {
      await remove.mutateAsync(e.id);
      toast.success(t('deleted'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const statusStyle =
    e.status === 'APPROVED'
      ? 'bg-emerald-50 text-emerald-700'
      : e.status === 'REJECTED'
        ? 'bg-gray-100 text-gray-500 line-through'
        : 'bg-amber-50 text-amber-800';

  return (
    <div className="rounded-md border border-gray-100 px-2.5 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-900">
            <b>{t(`type.${e.type}`)}</b> · {formatCurrency(e.amount)}
            {e.note ? <span className="text-gray-500"> · {e.note}</span> : null}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              {fromApp && <Smartphone className="h-3 w-3" />}
              {fromApp ? t('fromApp') : t('fromAdmin', { by: e.created_by ?? '' })}
            </span>
            <span>{formatDateTime(e.created_at)}</span>
            {e.trip_report?.file_url && (
              <a
                href={e.trip_report.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-blue-700 hover:underline"
              >
                <Receipt className="h-3 w-3" />
                {t('viewReceipt')}
              </a>
            )}
          </p>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${statusStyle}`}>
          {t(`status.${e.status}`)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <div className="inline-flex overflow-hidden rounded-md border border-gray-200">
          {(['DRIVER', 'COMPANY'] as TripExpensePayer[]).map((who) => (
            <button
              key={who}
              type="button"
              disabled={busy || e.paid_by === who}
              onClick={() => patch({ paid_by: who })}
              className={`px-2 py-0.5 ${
                e.paid_by === who
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t(`paidBy.${who}`)}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1 text-gray-700">
          <input
            type="checkbox"
            checked={e.bill_to_customer}
            disabled={busy}
            onChange={(ev) => patch({ bill_to_customer: ev.target.checked })}
          />
          {t('billCustomer')}
        </label>
        <div className="ml-auto flex items-center gap-1.5">
          {e.status !== 'APPROVED' && (
            <Button
              size="sm"
              className="h-7 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
              disabled={busy}
              onClick={() => patch({ status: 'APPROVED' }, t('approved'))}
            >
              <Check className="h-3.5 w-3.5" />
              {t('approve')}
            </Button>
          )}
          {e.status !== 'REJECTED' && fromApp && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={busy}
              onClick={() => patch({ status: 'REJECTED' }, t('rejected'))}
            >
              <X className="h-3.5 w-3.5" />
              {t('reject')}
            </Button>
          )}
          {!fromApp && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-red-600"
              disabled={busy}
              onClick={del}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('delete')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddCostForm({
  lineId,
  servicePackage,
  onDone,
}: {
  lineId: string;
  servicePackage?: string | null;
  onDone: () => void;
}) {
  const t = useTranslations('tripCosts');
  const create = useCreateTripCost();
  const [type, setType] = useState<TripExpenseType>('TOLL');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paidBy, setPaidBy] = useState<TripExpensePayer>('COMPANY');
  const [bill, setBill] = useState(billedByPackage(servicePackage, 'TOLL'));

  async function submit() {
    const n = digits(amount);
    if (!n) {
      toast.error(t('errAmount'));
      return;
    }
    if (type === 'OTHER' && !note.trim()) {
      toast.error(t('errNoteOther'));
      return;
    }
    try {
      await create.mutateAsync({
        lineId,
        data: {
          type,
          amount: n,
          note: note.trim() || undefined,
          paid_by: paidBy,
          bill_to_customer: bill,
        },
      });
      toast.success(t('added'));
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/40 p-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select
          value={type}
          onValueChange={(v) => {
            const next = v as TripExpenseType;
            setType(next);
            setBill(billedByPackage(servicePackage, next));
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COST_TYPES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`type.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="h-8 text-xs"
          inputMode="numeric"
          placeholder={t('amountPlaceholder')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          className="h-8 text-xs"
          placeholder={t('notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <div className="inline-flex overflow-hidden rounded-md border border-gray-200">
          {(['DRIVER', 'COMPANY'] as TripExpensePayer[]).map((who) => (
            <button
              key={who}
              type="button"
              onClick={() => setPaidBy(who)}
              className={`px-2 py-0.5 ${
                paidBy === who ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {t(`paidBy.${who}`)}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1 text-gray-700">
          <input type="checkbox" checked={bill} onChange={(e) => setBill(e.target.checked)} />
          {t('billCustomer')}
        </label>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onDone}>
            {t('cancel')}
          </Button>
          <Button size="sm" className="h-7 text-xs" disabled={create.isPending} onClick={submit}>
            {t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
