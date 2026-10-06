'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RupiahInput, rupiahTooLarge, rupiahValue } from '@/components/forms/RupiahInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReloadPriceList, useUpdatePriceExtra } from '@/hooks/usePriceList';
import { getErrorMessage } from '@/lib/utils';
import type { PriceExtra } from '@/types';
import { isConflict, useReportDirty, useRowForm } from './common';

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
  const reload = useReloadPriceList();
  const isPercent = extra.percent != null;
  const { form, setForm, dirty, expectedAt, adopt, discard } = useRowForm(extra, (e) => ({
    amount: e.amount == null ? '' : String(e.amount),
    percent: e.percent == null ? '' : String(e.percent),
    note: e.note ?? '',
  }));
  const { amount, percent, note } = form;
  useReportDirty(`extra-${extra.id}`, dirty);

  async function save() {
    const data: { amount?: number | null; percent?: number | null; note: string | null; expected_updated_at: string } = {
      note: note.trim() || null,
      expected_updated_at: expectedAt,
    };
    if (isPercent) {
      const p = Number(percent.replace(',', '.'));
      if (percent.trim() === '' || !Number.isFinite(p) || p < 0 || p > 100) return toast.error(t('errPercent'));
      data.percent = p;
    } else {
      const a = rupiahValue(amount);
      if (a == null) return toast.error(t('errAmount'));
      if (rupiahTooLarge(amount)) return toast.error(t('errTooLarge'));
      data.amount = a;
    }
    try {
      const list = await update.mutateAsync({ id: extra.id, data });
      const saved = list.extras.find((e) => e.id === extra.id);
      if (saved) adopt(saved);
      toast.success(t('okExtraSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
      // Changed by another admin: show their version.
      if (isConflict(err)) {
        discard();
        void reload();
      }
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
                onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value.replace(/[^\d.,]/g, '').slice(0, 6) }))}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
            </div>
          ) : (
            <RupiahInput id={`extra_${extra.id}`} value={amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`extra_note_${extra.id}`}>{t('noteOptional')}</Label>
          <Textarea
            id={`extra_note_${extra.id}`}
            rows={3}
            maxLength={300}
            value={note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
          <p className="text-xs text-gray-500">{t('shownOnWebsite')}</p>
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
