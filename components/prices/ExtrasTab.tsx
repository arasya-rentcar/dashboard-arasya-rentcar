'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RupiahInput, rupiahValue } from '@/components/forms/RupiahInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePriceExtra } from '@/hooks/usePriceList';
import { getErrorMessage } from '@/lib/utils';
import type { PriceExtra } from '@/types';

/** Driver costs and overtime: a fixed amount per unit, or a percent of the Fullday price. */
export default function ExtrasTab({ extras }: { extras: PriceExtra[] }) {
  const t = useTranslations('priceList');
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-gray-500">{t('extrasDesc')}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {extras.map((e) => (
          <ExtraCard key={e.id} extra={e} />
        ))}
      </div>
    </div>
  );
}

function ExtraCard({ extra }: { extra: PriceExtra }) {
  const t = useTranslations('priceList');
  const update = useUpdatePriceExtra();
  const isPercent = extra.percent != null;
  const [amount, setAmount] = useState(extra.amount == null ? '' : String(extra.amount));
  const [percent, setPercent] = useState(extra.percent == null ? '' : String(extra.percent));
  const [note, setNote] = useState(extra.note ?? '');
  const dirty =
    note !== (extra.note ?? '') ||
    (isPercent ? percent !== String(extra.percent) : amount !== (extra.amount == null ? '' : String(extra.amount)));

  async function save() {
    const data: { amount?: number | null; percent?: number | null; note: string | null } = { note: note.trim() || null };
    if (isPercent) {
      const p = Number(percent.replace(',', '.'));
      if (percent.trim() === '' || !Number.isFinite(p) || p < 0 || p > 100) return toast.error(t('errPercent'));
      data.percent = p;
    } else {
      const a = rupiahValue(amount);
      if (a == null) return toast.error(t('errAmount'));
      data.amount = a;
    }
    try {
      await update.mutateAsync({ id: extra.id, data });
      toast.success(t('okExtraSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">
          {extra.label} <span className="font-normal text-gray-500">· {t('perUnit', { unit: t(`unit.${extra.unit}`) })}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`extra_${extra.id}`}>{isPercent ? t('percentLabel') : t('amountLabel')}</Label>
          {isPercent ? (
            <div className="relative w-32">
              <Input
                id={`extra_${extra.id}`}
                inputMode="decimal"
                className="pr-8 tabular-nums"
                value={percent}
                onChange={(e) => setPercent(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
            </div>
          ) : (
            <RupiahInput id={`extra_${extra.id}`} value={amount} onChange={setAmount} />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`extra_note_${extra.id}`}>{t('noteOptional')}</Label>
          <Textarea id={`extra_note_${extra.id}`} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
