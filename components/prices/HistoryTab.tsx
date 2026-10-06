'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Loader2 } from 'lucide-react';
import QueryError from '@/components/dashboard/QueryError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePriceHistory, usePricePublications } from '@/hooks/usePriceList';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { PriceChangeEntry, PriceListData } from '@/types';
import { DeployStatus } from './PublishCard';

const ENTITIES = ['rate', 'surcharge', 'extra', 'zone', 'city', 'car'];
const FIELDS = [
  'amount',
  'is_proposal',
  'note',
  'name',
  'included',
  'excluded',
  'area',
  'percent',
  'driver_zone_id',
  'all_in_zone_id',
  'quote',
  'price_class',
  'sort_order',
];
const MONEY_FIELDS = new Set(['amount']);
// The API returns at most 500 changes per request.
const HISTORY_STEP = 100;
const HISTORY_MAX = 500;

/** Change log (newest first) and the list of publications. */
export default function HistoryTab({ data }: { data: PriceListData }) {
  const t = useTranslations('priceList');
  const [limit, setLimit] = useState(HISTORY_STEP);
  const history = usePriceHistory(limit);
  const publications = usePricePublications(20);
  const zoneName = (id: string) => data.zones.find((z) => z.id === id)?.name ?? id;

  /** A stored value as the admin reads it: rupiah, yes/no, table names. */
  function show(entry: PriceChangeEntry, v: string | null): string {
    // No amount = "Tanya admin" for rates and fixed-amount extras.
    if (v == null) return (entry.entity === 'rate' || entry.entity === 'extra') && entry.field === 'amount' ? t('askAdmin') : '—';
    if (MONEY_FIELDS.has(entry.field) && Number.isFinite(Number(v))) return formatCurrency(Number(v));
    if (entry.field === 'percent') return `${v}%`;
    if (entry.field === 'is_proposal' || entry.field === 'quote') return v === 'true' ? t('yes') : t('no');
    if (entry.field === 'driver_zone_id' || entry.field === 'all_in_zone_id') return zoneName(v);
    return v;
  }

  const fieldName = (f: string) => (FIELDS.includes(f) ? t(`field.${f}`) : f);

  /** A whole row added or removed. Surcharges are logged as "Bekasi: 100000". */
  function rowText(entry: PriceChangeEntry, v: string | null): string {
    if (v == null) return '—';
    const m = entry.entity === 'surcharge' ? /^(.*): (\d+(?:\.\d+)?)$/.exec(v) : null;
    return m ? `${m[1]}: +${formatCurrency(Number(m[2]))}` : v;
  }

  const items = history.data?.items ?? [];
  // While the longer list loads, the previous one stays on screen (fewer items
  // than the new limit): keep the button, with its spinner, until it arrives.
  const loadingMore = history.isPlaceholderData;
  const canLoadMore = loadingMore || (items.length >= limit && limit < HISTORY_MAX);

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">{t('changesTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton rows={4} />
          ) : history.isError ? (
            <QueryError compact onRetry={() => history.refetch()} />
          ) : !history.data || history.data.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('noChanges')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.data.items.map((c) => {
                const who = (c.changed_by && history.data.users[c.changed_by]) || '—';
                const whole = c.field === 'created' || c.field === 'deleted';
                return (
                  <li key={c.id} className="space-y-0.5 py-2.5 text-sm">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-gray-500">
                      <span className="tabular-nums">{formatDateTime(c.created_at)}</span>
                      <span className="min-w-0 break-all">{who}</span>
                    </p>
                    <p className="font-medium text-gray-900">
                      {c.label ?? (ENTITIES.includes(c.entity) ? t(`entity.${c.entity}`) : c.entity)}
                    </p>
                    {whole ? (
                      <p className="text-xs text-gray-600">
                        {c.field === 'created' ? t('rowCreated') : t('rowDeleted')}
                        {': '}
                        {rowText(c, c.field === 'created' ? c.new_value : c.old_value)}
                      </p>
                    ) : (
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-gray-600">
                        <span className="text-gray-500">{fieldName(c.field)}:</span>
                        <span className="tabular-nums">{show(c, c.old_value)}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        <span className="font-medium tabular-nums text-gray-900">{show(c, c.new_value)}</span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canLoadMore && !history.isError && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={history.isFetching}
                onClick={() => setLimit((l) => Math.min(l + HISTORY_STEP, HISTORY_MAX))}
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('loadMore')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">{t('publicationsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {publications.isLoading ? (
            <Skeleton rows={3} />
          ) : publications.isError ? (
            <QueryError compact onRetry={() => publications.refetch()} />
          ) : !publications.data || publications.data.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('noPublications')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {publications.data.items.map((p) => (
                <li key={p.id} className="space-y-0.5 py-2.5 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                    <span className="tabular-nums">{formatDateTime(p.created_at)}</span>
                    <DeployStatus status={p.deploy_status} />
                  </p>
                  <p className="break-all text-xs text-gray-500">
                    {t('publishedBy', { who: (p.published_by && publications.data.users[p.published_by]) || '—' })}
                  </p>
                  {p.note && <p className="text-xs text-gray-600">{p.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2 pt-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}
