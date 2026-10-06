'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdatePriceCity } from '@/hooks/usePriceList';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import type { PriceCity, PriceExtra, PriceListData, PriceZone } from '@/types';
import { Amount, ProposalBadge, RateGrid, citiesUsing, isAllInZone, isDriverZone, rateOf, zoneDurations } from './common';

/** What the owner reviews: the prices a website city page shows. */
export default function CityTab({ data }: { data: PriceListData }) {
  const t = useTranslations('priceList');
  const [cityId, setCityId] = useState(data.cities[0]?.id ?? '');
  const city = data.cities.find((c) => c.id === cityId) ?? data.cities[0];
  const zoneById = (id: string | null) => data.zones.find((z) => z.id === id);

  if (!city) return <p className="py-10 text-center text-sm text-gray-400">{t('noCities')}</p>;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('city')}</Label>
        <Select value={city.id} onValueChange={setCityId}>
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

      <CityMapping key={city.id} city={city} zones={data.zones} />
    </div>
  );
}

/** One table, read-only, for the selected city. */
function ZoneCard({ label, zone, city, data }: { label: string; zone: PriceZone; city: PriceCity; data: PriceListData }) {
  const t = useTranslations('priceList');
  const others = citiesUsing(zone, data.cities).filter((c) => c.id !== city.id);
  // Area surcharges extend a rental of the city that owns the table (JAKARTA, BANDUNG, SURABAYA).
  const ownTable = zone.code === city.name.toUpperCase();
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
        {ownTable && zone.surcharges.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <p className="font-semibold">{t('surchargeTitle', { city: city.name })}</p>
            <ul className="mt-1 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {zone.surcharges.map((s) => (
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
function CityMapping({ city, zones }: { city: PriceCity; zones: PriceZone[] }) {
  const t = useTranslations('priceList');
  const update = useUpdatePriceCity();
  const [driver, setDriver] = useState(city.driver_zone_id ?? NONE);
  const [allIn, setAllIn] = useState(city.all_in_zone_id ?? NONE);
  const [quote, setQuote] = useState(city.quote);
  const dirty =
    quote !== city.quote ||
    (!quote && (driver !== (city.driver_zone_id ?? NONE) || allIn !== (city.all_in_zone_id ?? NONE)));

  async function save() {
    try {
      await update.mutateAsync({
        id: city.id,
        data: quote
          ? { quote: true }
          : {
              quote: false,
              driver_zone_id: driver === NONE ? null : driver,
              all_in_zone_id: allIn === NONE ? null : allIn,
            },
      });
      toast.success(t('okCitySaved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
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
            onChange={(e) => setQuote(e.target.checked)}
          />
          {t('mappingQuote')}
        </label>
        {!quote && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('packageDriver')}</Label>
              <Select value={driver} onValueChange={setDriver}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectTable')} />
                </SelectTrigger>
                <SelectContent>{options(zones.filter(isDriverZone))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('packageAllIn')}</Label>
              <Select value={allIn} onValueChange={setAllIn}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectTable')} />
                </SelectTrigger>
                <SelectContent>{options(zones.filter(isAllInZone))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
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
