'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, CreditCard, Plus, Search } from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import { BalanceText, CardFormDialog, ISSUER_TINT, formatCardNumber } from '@/components/etoll/etoll';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEtollCards } from '@/hooks/useEtollCards';
import { cn, formatDateTime, segmentClass } from '@/lib/utils';
import type { EtollCard } from '@/types';

type Filter = 'ACTIVE' | 'INACTIVE' | 'ALL';

export default function EtollCardsPage() {
  const t = useTranslations('etoll');
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const cards = useEtollCards('ALL');

  const all = cards.data ?? [];
  const q = search.trim().toLowerCase();
  const items = all.filter(
    (c) =>
      (filter === 'ALL' || c.status === filter) &&
      (!q ||
        c.name.toLowerCase().includes(q) ||
        c.card_number.includes(q.replace(/\s/g, '')) ||
        c.issuer_label.toLowerCase().includes(q) ||
        c.holder?.driver.name.toLowerCase().includes(q)),
  );
  const count = (f: Filter) => all.filter((c) => f === 'ALL' || c.status === f).length;
  const held = all.filter((c) => c.status === 'ACTIVE' && c.holder).length;
  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <p className="max-w-3xl text-sm text-gray-500">{t('desc')}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <Input
                type="search"
                aria-label={t('searchPlaceholder')}
                className="pl-9"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex w-fit gap-0.5 rounded-lg bg-gray-100 p-0.5" role="group">
              {(['ACTIVE', 'INACTIVE', 'ALL'] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  className={segmentClass(filter === f, 'whitespace-nowrap')}
                  onClick={() => setFilter(f)}
                >
                  {t(`filter${f}`)} ({count(f)})
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => setAdding(true)} className="w-full sm:ml-auto sm:w-auto">
            <Plus className="h-4 w-4" /> {t('add')}
          </Button>
        </div>
        {all.length > 0 && (
          <p className="text-xs text-gray-500">
            {t('summary', { held, office: all.filter((c) => c.status === 'ACTIVE' && !c.holder).length })}
          </p>
        )}

        {cards.isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : cards.isError ? (
          <QueryError onRetry={() => cards.refetch()} />
        ) : items.length === 0 ? (
          <Card className="border border-dashed border-gray-200 shadow-none">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-gray-400">
              <CreditCard className="h-7 w-7" aria-hidden="true" />
              <p className="text-sm">{all.length === 0 ? t('empty') : t('emptyFiltered')}</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {items.map((c) => (
              <li key={c.id} className="border-b border-gray-100 last:border-b-0">
                <CardRow c={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {adding && <CardFormDialog open={adding} onOpenChange={setAdding} />}
    </DashboardShell>
  );
}

function CardRow({ c }: { c: EtollCard }) {
  const t = useTranslations('etoll');
  return (
    <Link
      href={`/dashboard/etoll-cards/${c.id}`}
      className={cn(
        'grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-gray-50 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_10rem_1rem] sm:items-center sm:px-5',
        c.status === 'INACTIVE' && 'opacity-60',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 break-words text-sm font-semibold text-gray-900">
            {c.name}
            <Badge variant="outline" className={cn('text-[11px] font-medium', ISSUER_TINT[c.issuer])}>
              {c.issuer_label || t('issuerOther')}
            </Badge>
            {c.status === 'INACTIVE' && (
              <Badge variant="outline" className="max-w-full whitespace-normal border-gray-300 text-left text-[11px] text-gray-500">
                {t('inactive')}
                {c.inactive_reason ? ` · ${c.inactive_reason}` : ''}
              </Badge>
            )}
            {c.open_request && (
              <Badge className="border-transparent bg-violet-600 text-[11px] text-white">{t('topupRequested')}</Badge>
            )}
          </p>
          <p className="font-mono text-xs tabular-nums text-gray-500">{formatCardNumber(c.card_number)}</p>
        </div>
      </div>
      <div className="min-w-0 text-sm">
        {c.status === 'INACTIVE' ? (
          <span className="text-gray-400">—</span>
        ) : c.holder ? (
          <span className="flex flex-col">
            <span className="font-medium text-gray-900">{t('heldBy', { name: c.holder.driver.name })}</span>
            <span className="text-[11px] text-gray-400">{t('since', { at: formatDateTime(c.holder.taken_at) })}</span>
          </span>
        ) : (
          <span className="font-medium text-emerald-700">{t('atOffice')}</span>
        )}
      </div>
      <BalanceText card={c} className="text-sm" />
      <ChevronRight className="hidden h-4 w-4 text-gray-300 sm:block" aria-hidden="true" />
    </Link>
  );
}
