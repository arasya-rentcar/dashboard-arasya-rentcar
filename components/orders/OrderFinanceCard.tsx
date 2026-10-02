'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wallet, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateOrderFinance } from '@/hooks/useOrders';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { Order } from '@/types';

const num = (v?: string | number | null) =>
  v == null || v === '' ? '' : String(v);

export default function OrderFinanceCard({ order }: { order: Order }) {
  const t = useTranslations('financeCard');
  const fin = order.final_finance;
  const isExternal = !!order.is_external;
  // Partner driver (and line plate) of each partner line, one entry per
  // distinct driver so a multi-day trip with the same driver shows once.
  const partnerDrivers = [
    ...new Set(
      (order.service_items ?? [])
        .filter((it) => it.is_external)
        .map((it) =>
          [it.driver_name_raw, it.driver_phone_raw, it.plate_raw]
            .filter(Boolean)
            .join(' · '),
        )
        .filter(Boolean),
    ),
  ];
  const [open, setOpen] = useState(false);
  const mutation = useUpdateOrderFinance();

  const [form, setForm] = useState({
    total_driver_amount: num(fin?.total_driver_amount),
    finance_note: fin?.finance_note ?? '',
  });

  function openEditor() {
    setForm({
      total_driver_amount: num(fin?.total_driver_amount),
      finance_note: fin?.finance_note ?? '',
    });
    setOpen(true);
  }

  const toNum = (s: string) =>
    s.trim() === '' ? null : Number(s.replace(/[^\d.-]/g, ''));

  // Total User / Ops Cost / RTR / Margin are owned by the Schedule lines and
  // recomputed by rollupOrderFinance — editing them here would be silently
  // overwritten and would never reach the analytics dashboard. So this card
  // only edits the two fields the rollup explicitly preserves: Driver Cost
  // (a manual override) and the finance note.
  async function save() {
    try {
      await mutation.mutateAsync({
        id: order.id,
        data: {
          total_driver_amount: toNum(form.total_driver_amount),
          finance_note: form.finance_note.trim() || null,
        },
      });
      toast.success(t('savedToast'));
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Card className="shadow-none border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-gray-400" /> {t('title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${
                isExternal
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isExternal ? t('external') : t('internal')}
            </Badge>
            <Button size="sm" variant="outline" onClick={openEditor}>
              <PencilLine className="h-4 w-4 mr-1" /> {t('editDriverNote')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {order.external_vendor && (
          <p className="text-xs text-gray-500 mb-3">
            {t('vendor')}:{' '}
            <span className="font-medium text-gray-700">
              {order.external_vendor.name}
            </span>
            {order.external_car
              ? ` · ${order.external_car.model}${order.external_car.plate_number ? ` (${order.external_car.plate_number})` : ''}`
              : ''}
          </p>
        )}
        {partnerDrivers.length > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            {t('partnerDriver')}:{' '}
            <span className="font-medium text-gray-700">
              {partnerDrivers.join(', ')}
            </span>
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Stat label={t('totalUser')} value={fin?.total_user_amount} />
          {isExternal ? (
            <>
              <Stat label={t('sellPrice')} value={fin?.sell_price} />
              <Stat label={t('rtr')} value={fin?.rtr_amount} />
            </>
          ) : (
            <>
              <Stat label={t('opsCost')} value={fin?.total_ops_cost} />
              <Stat
                label={t('driverFee')}
                value={fin?.total_driver_amount}
              />
            </>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              {t('margin')}
              <span className="ml-1 normal-case">
                ({isExternal ? t('userMinusRtr') : t('userMinusOps')})
              </span>
            </p>
            <p
              className={`text-lg font-semibold ${
                fin?.margin_amount == null
                  ? 'text-gray-400'
                  : Number(fin.margin_amount) >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
              }`}
            >
              {fin?.margin_amount == null
                ? t('notSet')
                : formatCurrency(fin.margin_amount)}
            </p>
          </div>
          {fin?.finance_note && (
            <p className="text-xs text-gray-500 max-w-[50%] text-right">
              {fin.finance_note}
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('editDriverNote')} ({isExternal ? t('external') : t('internal')})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              {t('lineManaged')}
            </p>
            {/* Cost figures are read-only here (owned by Schedule lines). */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ReadOnlyStat label={t('totalUser')} value={fin?.total_user_amount} hint={t('costsReadOnlyHint')} />
              {isExternal ? (
                <ReadOnlyStat label={t('rtr')} value={fin?.rtr_amount} hint={t('costsReadOnlyHint')} />
              ) : (
                <ReadOnlyStat label={t('opsCost')} value={fin?.total_ops_cost} hint={t('costsReadOnlyHint')} />
              )}
            </div>
            <details className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-600">
              <summary className="cursor-pointer font-medium text-gray-700 select-none">
                {t('driverFeeRefTitle')}
              </summary>
              <ul className="mt-2 space-y-1 leading-relaxed">
                <li>{t('driverFeeRefJabodetabek')}</li>
                <li>{t('driverFeeRefLuarKota')}</li>
                <li>{t('driverFeeRefInap')}</li>
                <li>{t('driverFeeRefSemarang')}</li>
                <li>{t('driverFeeRefOvertime')}</li>
                <li className="italic text-gray-400">{t('driverFeeRefNote')}</li>
              </ul>
            </details>
            <Field
              label={t('driverFeeOptional')}
              value={form.total_driver_amount}
              onChange={(v) => setForm({ ...form, total_driver_amount: v })}
            />
            <div className="space-y-1.5">
              <Label>{t('noteOptional')}</Label>
              <Textarea
                rows={2}
                value={form.finance_note}
                onChange={(e) =>
                  setForm({ ...form, finance_note: e.target.value })
                }
              />
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {t('marginPreview')}{' '}
                <span className="normal-case">({t('marginReadOnlyHint')})</span>
              </span>
              <span
                className={`text-sm font-semibold ${
                  fin?.margin_amount == null
                    ? 'text-gray-400'
                    : Number(fin.margin_amount) >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                }`}
              >
                {fin?.margin_amount == null
                  ? t('notSet')
                  : formatCurrency(fin.margin_amount)}
              </span>
            </div>

            <Button
              className="w-full"
              onClick={save}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('saving') : t('saveRecompute')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-900">
        {value == null || value === '' ? '-' : formatCurrency(value)}
      </p>
    </div>
  );
}

function ReadOnlyStat({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string | number | null;
  hint: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-900">
        {value == null || value === '' ? '-' : formatCurrency(value)}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
