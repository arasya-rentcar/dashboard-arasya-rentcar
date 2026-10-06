'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReloadPriceList, useUpdatePriceCity } from '@/hooks/usePriceList';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import type { PriceCity, PriceExtra, PriceListData, PriceZone } from '@/types';
import {
  Amount,
  ProposalBadge,
  RateGrid,
  citiesUsing,
  isAllInZone,
  isConflict,
  isDriverZone,
  rateOf,
  useReportDirty,
  useRowForm,
  zoneDurations,
} from './common';

/** What the owner reviews: the prices a website city page shows. */
export default function CityTab({ data }: { data: PriceListData }) {
  const t = useTranslations('priceList');
  const [cityId, setCityId] = useState(data.cities[0]?.id ?? '');
  // The table settings form has unsaved edits: switching cities asks first (it remounts).
  const [mappingDirty, setMappingDirty] = useState(false);
  const city = data.cities.find((c) => c.id === cityId) ?? data.cities[0];
  const zoneById = (id: string | null) => data.zones.find((z) => z.id === id);

  if (!city) return <p className="py-10 text-center text-sm text-gray-400">{t('noCities')}</p>;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('city')}</Label>
        <Select
          value={city.id}
          onValueChange={(id) => {
            if (mappingDirty && !window.confirm(t('switchCityUnsaved'))) return;
            setCityId(id);
          }}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {data.cities.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {city.quote ? (
        <Card className="border border-dashed border-gray-200 shadow-none">
          <CardContent className="space-y-1 py-8 text-center">
            <p className="text-sm font-semibold text-gray-900">{t('quotePerTrip')}</p>
            <p className="text-xs text-gray-500">{t('quoteHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {t('usesTables', {
              driver: zoneById(city.driver_zone_id)?.name ?? '—',
              allIn: zoneById(city.all_in_zone_id)?.name ?? '—',
            })}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <ProposalBadge /> {t('proposalHint')}
          </p>
          {[
            { label: t('packageDriver'), zone: zoneById(city.driver_zone_id) },
            { label: t('packageAllIn'), zone: zoneById(city.all_in_zone_id) },
          ].map(({ label, zone }) =>
            zone ? <ZoneCard key={label} label={label} zone={zone} city={city} data={data} /> : null,
          )}
          <ExtrasCard extras={data.extras} />
        </>
      )}

      <CityMapping key={city.id} city={city} zones={data.zones} onDirtyChange={setMappingDirty} />
    </div>
  );
}

/** One table, read-only, for the selected city. */
function ZoneCard({ label, zone, city, data }: { label: string; zone: PriceZone; city: PriceCity; data: PriceListData }) {
  const t = useTranslations('priceList');
  const others = citiesUsing(zone, data.cities).filter((c) => c.id !== city.id);
  // Area surcharges extend a rental of the city that owns the table (JAKARTA, BANDUNG, SURABAYA).
  // Same rule as the website (arasya-web surchargesFor): all-in table whose code is the
  // city name. The price list has no stable city -> owned table link, so a renamed city
  // loses its surcharges here and on the website alike.
  const ownTable = isAllInZone(zone) && zone.code === city.name.trim().toUpperCase();
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">
          {label} <span className="font-normal text-gray-500">· {zone.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <RateGrid
          cars={data.cars}
          durations={zoneDurations(zone)}
          cellMin={150}
          renderCell={(car, d) => {
            const rate = rateOf(zone, car.id, d);
            return (
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Amount value={rate?.amount ?? null} />
                  {rate?.is_proposal && <ProposalBadge />}
                </div>
                {rate?.note && <p className="text-[11px] leading-snug text-gray-500">{rate.note}</p>}
              </div>
            );
          }}
        />
        <div className="space-y-1 text-xs leading-5 text-gray-600">
          <p>
            <b>{t('included')}:</b> {zone.included}
          </p>
          <p>
            <b>{t('excluded')}:</b> {zone.excluded}
          </p>
          {zone.note && <p className="text-gray-500">{zone.note}</p>}
          {others.length > 0 && (
            <p className="text-gray-500">{t('alsoUsedBy', { cities: others.map((c) => c.name).join(', ') })}</p>
          )}
        </div>
        {ownTable && zone.surcharges.some((s) => s.amount > 0) && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <p className="font-semibold">{t('surchargeTitle', { city: city.name })}</p>
            <ul className="mt-1 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {zone.surcharges.filter((s) => s.amount > 0).map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span>{s.area}</span>
                  <span className="font-medium tabular-nums">+{formatCurrency(s.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Driver meal / lodging and overtime. */
function ExtrasCard({ extras }: { extras: PriceExtra[] }) {
  const t = useTranslations('priceList');
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{t('extrasTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-3">
          {extras.map((e) => (
            <li key={e.id} className="rounded-lg border border-gray-100 p-3">
              <p className="text-xs text-gray-500">{e.label}</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900">
                {e.percent != null
                  ? t('percentPer', { percent: e.percent, unit: t(`unit.${e.unit}`) })
                  : e.amount != null
                    ? t('amountPer', { amount: formatCurrency(e.amount), unit: t(`unit.${e.unit}`) })
                    : t('askAdmin')}
              </p>
              {e.note && <p className="mt-1 text-[11px] leading-snug text-gray-500">{e.note}</p>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const NONE = '__none__';

/** Which tables the city page shows (or: priced per trip). */
function CityMapping({
  city,
  zones,
  onDirtyChange,
}: {
  city: PriceCity;
  zones: PriceZone[];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations('priceList');
  const update = useUpdatePriceCity();
  const reload = useReloadPriceList();
  const { form, setForm, expectedAt, adopt, discard } = useRowForm(city, (c) => ({
    driver: c.driver_zone_id ?? NONE,
    allIn: c.all_in_zone_id ?? NONE,
    quote: c.quote,
  }));
  const { driver, allIn, quote } = form;
  const dirty =
    quote !== city.quote ||
    (!quote && (driver !== (city.driver_zone_id ?? NONE) || allIn !== (city.all_in_zone_id ?? NONE)));
  // Without "penawaran" the city page needs both tables (the API refuses otherwise).
  const missingTable = !quote && (driver === NONE || allIn === NONE);
  useReportDirty('city-mapping', dirty);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  async function save() {
    if (missingTable) return;
    try {
      const list = await update.mutateAsync({
        id: city.id,
        data: quote
          ? { quote: true, expected_updated_at: expectedAt }
          : { quote: false, driver_zone_id: driver, all_in_zone_id: allIn, expected_updated_at: expectedAt },
      });
      const saved = list.cities.find((c) => c.id === city.id);
      if (saved) adopt(saved, form);
      toast.success(t('okCitySaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
      // Changed by another admin: show their version.
      if (isConflict(err)) {
        discard();
        void reload();
      }
    }
  }

  const options = (list: PriceZone[]) =>
    list.map((z) => (
      <SelectItem key={z.id} value={z.id}>
        {z.name}
      </SelectItem>
    ));

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{t('mappingTitle', { city: city.name })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">{t('mappingHint')}</p>
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={quote}
            onChange={(e) => setForm((f) => ({ ...f, quote: e.target.checked }))}
          />
          {t('mappingQuote')}
        </label>
        {!quote && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('packageDriver')}</Label>
              <Select value={driver} onValueChange={(v) => setForm((f) => ({ ...f, driver: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectTable')} />
                </SelectTrigger>
                <SelectContent>{options(zones.filter(isDriverZone))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('packageAllIn')}</Label>
              <Select value={allIn} onValueChange={(v) => setForm((f) => ({ ...f, allIn: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectTable')} />
                </SelectTrigger>
                <SelectContent>{options(zones.filter(isAllInZone))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty && missingTable && <span className="mr-auto text-xs text-red-600">{t('errMappingTables')}</span>}
          <Button onClick={save} disabled={!dirty || missingTable || update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
