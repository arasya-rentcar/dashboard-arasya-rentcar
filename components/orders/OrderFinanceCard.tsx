'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wallet, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

/**
 * Order money at a glance. Every figure comes from the days (Edit Hari: driver
 * fee, uang jalan, RTR) and the reviewed trip costs, so the card is read-only;
 * only the finance note is edited here.
 */
export default function OrderFinanceCard({ order }: { order: Order }) {
  const t = useTranslations('financeCard');
  const fin = order.final_finance;
  const lines = order.service_items ?? [];
  const hasInternal = lines.some((it) => !it.is_external);
  const hasExternal = lines.some((it) => it.is_external);
  const label = hasExternal && hasInternal
    ? t('mixed')
    : hasExternal
      ? t('external')
      : t('internal');
  // Partner driver (and line plate) of each partner line, one entry per
  // distinct driver so a multi-day trip with the same driver shows once.
  const partnerDrivers = [
    ...new Set(
      lines
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
  const [note, setNote] = useState(fin?.finance_note ?? '');
  const mutation = useUpdateOrderFinance();

  async function save() {
    try {
      await mutation.mutateAsync({
        id: order.id,
        data: { finance_note: note.trim() || null },
      });
      toast.success(t('savedToast'));
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const formula = [
    t('formulaUser'),
    hasInternal ? t('formulaFee') : null,
    t('formulaCosts'),
    hasExternal ? t('formulaRtr') : null,
  ]
    .filter(Boolean)
    .join(' − ');

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
                hasExternal
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {label}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNote(fin?.finance_note ?? '');
                setOpen(true);
              }}
            >
              <PencilLine className="h-4 w-4 mr-1" /> {t('editNote')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {partnerDrivers.length > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            {t('partnerDriver')}:{' '}
            <span className="font-medium text-gray-700">
              {partnerDrivers.join(', ')}
            </span>
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Stat label={t('totalUser')} value={fin?.total_user_amount} />
          {hasInternal && (
            <Stat label={t('driverFeeTotal')} value={fin?.total_driver_amount} />
          )}
          <Stat label={t('tripCostsArasya')} value={fin?.total_ops_cost} />
          {hasExternal && <Stat label={t('rtr')} value={fin?.rtr_amount} />}
        </div>
        <p className="mt-2 text-[11px] text-gray-400">{t('fromDaysHint')}</p>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              {t('margin')}
              <span className="ml-1 normal-case">({formula})</span>
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
            <DialogTitle>{t('editNote')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900">
              {t('lineManaged')}
            </p>
            <div className="space-y-1.5">
              <Label>{t('noteOptional')}</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button className="w-full" onClick={save} disabled={mutation.isPending}>
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
