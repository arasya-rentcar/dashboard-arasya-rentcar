'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RupiahInput, rupiahValue } from '@/components/forms/RupiahInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreatePriceSurcharge,
  useDeletePriceSurcharge,
  useUpdatePriceRates,
  useUpdatePriceSurcharge,
  useUpdatePriceZone,
  type RateUpdateInput,
} from '@/hooks/usePriceList';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import type { PriceListData, PriceSurcharge, PriceZone } from '@/types';
import { DialogActions, DialogShell, RateGrid, citiesUsing, rateOf, zoneDurations } from './common';

type Edit = { amount: string; proposal: boolean };

const amountText = (v: number | null | undefined) => (v == null ? '' : String(v));

/** Editing: the rate grid of one table, its texts and its area surcharges. */
export default function ZoneTab({ data }: { data: PriceListData }) {
  const t = useTranslations('priceList');
  const [zoneId, setZoneId] = useState(data.zones[0]?.id ?? '');
  // Unsaved cells by rate id. They stay while another table is shown.
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const saveRates = useUpdatePriceRates();
  const zone = data.zones.find((z) => z.id === zoneId) ?? data.zones[0];

  if (!zone) return <p className="py-10 text-center text-sm text-gray-400">{t('noZones')}</p>;

  const users = citiesUsing(zone, data.cities);
  const changedCount = Object.keys(edits).length;

  /** Keep only cells that really differ from what is saved. */
  function setCell(rateId: string, original: { amount: number | null; is_proposal: boolean }, patch: Partial<Edit>) {
    setEdits((prev) => {
      const next: Edit = {
        amount: prev[rateId]?.amount ?? amountText(original.amount),
        proposal: prev[rateId]?.proposal ?? original.is_proposal,
        ...patch,
      };
      const copy = { ...prev };
      if (next.amount === amountText(original.amount) && next.proposal === original.is_proposal) delete copy[rateId];
      else copy[rateId] = next;
      return copy;
    });
  }

  async function save() {
    const items: RateUpdateInput[] = Object.entries(edits).map(([id, e]) => ({
      id,
      amount: rupiahValue(e.amount) ?? null,
      is_proposal: e.proposal,
    }));
    try {
      await saveRates.mutateAsync(items);
      setEdits({});
      toast.success(t('okRatesSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('table')}</Label>
        <Select value={zone.id} onValueChange={setZoneId}>
          <SelectTrigger className="w-full sm:w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {data.zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {users.length > 1 && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('usedByWarning', { cities: users.map((c) => c.name).join(', ') })}
        </p>
      )}

      <Card className="shadow-none">
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">{t('gridHint')}</p>
          <RateGrid
            cars={data.cars}
            durations={zoneDurations(zone)}
            cellMin={190}
            cellClass={(car, d) => {
              const rate = rateOf(zone, car.id, d);
              return rate && edits[rate.id] ? 'bg-amber-50' : undefined;
            }}
            renderCell={(car, d) => {
              const rate = rateOf(zone, car.id, d);
              if (!rate) return <span className="text-sm text-gray-300">—</span>;
              const e = edits[rate.id];
              const amount = e?.amount ?? amountText(rate.amount);
              const proposal = e?.proposal ?? rate.is_proposal;
              return (
                <div className="space-y-1">
                  <RupiahInput
                    value={amount}
                    placeholder={t('askAdmin')}
                    onChange={(v) => setCell(rate.id, rate, { amount: v })}
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300"
                      checked={proposal}
                      onChange={(ev) => setCell(rate.id, rate, { proposal: ev.target.checked })}
                    />
                    {t('proposal')}
                  </label>
                  {rate.note && <p className="text-[11px] leading-snug text-gray-500">{rate.note}</p>}
                </div>
              );
            }}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {changedCount > 0 && <span className="mr-auto text-xs text-amber-700">{t('unsavedCells', { count: changedCount })}</span>}
            <Button variant="outline" onClick={() => setEdits({})} disabled={changedCount === 0 || saveRates.isPending}>
              {t('reset')}
            </Button>
            <Button onClick={save} disabled={changedCount === 0 || saveRates.isPending}>
              {saveRates.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ZoneTexts key={zone.id} zone={zone} />
      <Surcharges zone={zone} />
    </div>
  );
}

/** Name, "sudah termasuk", "belum termasuk" and note of the table. */
function ZoneTexts({ zone }: { zone: PriceZone }) {
  const t = useTranslations('priceList');
  const update = useUpdatePriceZone();
  const [name, setName] = useState(zone.name);
  const [included, setIncluded] = useState(zone.included);
  const [excluded, setExcluded] = useState(zone.excluded);
  const [note, setNote] = useState(zone.note ?? '');
  const dirty =
    name !== zone.name || included !== zone.included || excluded !== zone.excluded || note !== (zone.note ?? '');

  async function save() {
    if (!name.trim() || !included.trim() || !excluded.trim()) return toast.error(t('errZoneTexts'));
    try {
      await update.mutateAsync({
        id: zone.id,
        data: { name: name.trim(), included: included.trim(), excluded: excluded.trim(), note: note.trim() || null },
      });
      toast.success(t('okZoneSaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{t('zoneTextsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="zone_name">{t('zoneName')}</Label>
          <Input id="zone_name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="zone_included">{t('included')}</Label>
            <Textarea id="zone_included" rows={3} maxLength={500} value={included} onChange={(e) => setIncluded(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zone_excluded">{t('excluded')}</Label>
            <Textarea id="zone_excluded" rows={3} maxLength={500} value={excluded} onChange={(e) => setExcluded(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zone_note">{t('noteOptional')}</Label>
          <Textarea id="zone_note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
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

/** Area surcharges of the table: add, edit, delete. */
function Surcharges({ zone }: { zone: PriceZone }) {
  const t = useTranslations('priceList');
  // null = closed, 'new' = adding.
  const [editing, setEditing] = useState<PriceSurcharge | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PriceSurcharge | null>(null);
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="text-sm">{t('surchargesTitle')}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> {t('addArea')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-gray-500">{t('surchargesHint')}</p>
        {zone.surcharges.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">{t('noSurcharges')}</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-gray-200">
            {zone.surcharges.map((s) => (
              <li key={s.id} className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{s.area}</span>
                <span className="text-sm font-medium tabular-nums text-gray-900">+{formatCurrency(s.amount)}</span>
                <Button size="icon" variant="ghost" aria-label={t('edit')} onClick={() => setEditing(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={t('delete')} onClick={() => setDeleting(s)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {editing && (
        <SurchargeDialog
          zone={zone}
          surcharge={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && <DeleteSurchargeDialog surcharge={deleting} onClose={() => setDeleting(null)} />}
    </Card>
  );
}

function SurchargeDialog({
  zone,
  surcharge,
  onClose,
}: {
  zone: PriceZone;
  surcharge: PriceSurcharge | null;
  onClose: () => void;
}) {
  const t = useTranslations('priceList');
  const create = useCreatePriceSurcharge();
  const update = useUpdatePriceSurcharge();
  const [area, setArea] = useState(surcharge?.area ?? '');
  const [amount, setAmount] = useState(amountText(surcharge?.amount));
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  async function save() {
    const value = rupiahValue(amount);
    if (!area.trim()) return setError(t('errArea'));
    if (value == null) return setError(t('errAmount'));
    setError(null);
    try {
      if (surcharge) await update.mutateAsync({ id: surcharge.id, data: { area: area.trim(), amount: value } });
      else await create.mutateAsync({ zone_id: zone.id, area: area.trim(), amount: value });
      toast.success(t('okSurchargeSaved'));
      onClose();
    } catch (err) {
      // e.g. 409: the area already exists in this table.
      setError(getErrorMessage(err));
    }
  }

  return (
    <DialogShell title={surcharge ? t('editAreaTitle') : t('addAreaTitle')} onClose={onClose}>
      <p className="text-sm text-gray-600">{zone.name}</p>
      <div className="space-y-1.5">
        <Label htmlFor="sc_area">{t('area')}</Label>
        <Input id="sc_area" maxLength={60} value={area} onChange={(e) => setArea(e.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sc_amount">{t('surchargeAmount')}</Label>
        <RupiahInput id="sc_amount" value={amount} onChange={setAmount} />
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <DialogActions busy={busy} onClose={onClose} onConfirm={save} label={t('save')} />
    </DialogShell>
  );
}

function DeleteSurchargeDialog({ surcharge, onClose }: { surcharge: PriceSurcharge; onClose: () => void }) {
  const t = useTranslations('priceList');
  const remove = useDeletePriceSurcharge();

  async function confirm() {
    try {
      await remove.mutateAsync(surcharge.id);
      toast.success(t('okSurchargeDeleted'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    onClose();
  }

  return (
    <DialogShell title={t('deleteAreaTitle')} onClose={onClose}>
      <p className="text-sm text-gray-700">
        {t('deleteAreaBody', { area: surcharge.area, amount: formatCurrency(surcharge.amount) })}
      </p>
      <p className="text-xs text-gray-500">{t('deleteAreaHint')}</p>
      <DialogActions busy={remove.isPending} onClose={onClose} onConfirm={confirm} label={t('delete')} danger />
    </DialogShell>
  );
}
