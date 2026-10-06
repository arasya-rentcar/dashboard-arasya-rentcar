'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import CarsTab from '@/components/prices/CarsTab';
import CityTab from '@/components/prices/CityTab';
import ExtrasTab from '@/components/prices/ExtrasTab';
import HistoryTab from '@/components/prices/HistoryTab';
import PublishCard from '@/components/prices/PublishCard';
import ZoneTab from '@/components/prices/ZoneTab';
import { segmentClass } from '@/components/prices/common';
import { usePriceList } from '@/hooks/usePriceList';

const TABS = ['city', 'zone', 'cars', 'extras', 'history'] as const;
type Tab = (typeof TABS)[number];

export default function PriceListPage() {
  const t = useTranslations('priceList');
  const [tab, setTab] = useState<Tab>('city');
  const list = usePriceList();

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <p className="max-w-3xl text-sm text-gray-500">{t('desc')}</p>

        {list.isLoading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          </div>
        ) : list.isError || !list.data ? (
          <QueryError onRetry={() => list.refetch()} />
        ) : (
          <>
            <PublishCard data={list.data} />
            <div className="max-w-full overflow-x-auto">
              <div className="flex w-fit gap-0.5 rounded-lg bg-gray-100 p-0.5">
                {TABS.map((k) => (
                  <button key={k} type="button" className={segmentClass(tab === k)} onClick={() => setTab(k)}>
                    {t(`tab.${k}`)}
                  </button>
                ))}
              </div>
            </div>
            {tab === 'city' && <CityTab data={list.data} />}
            {tab === 'zone' && <ZoneTab data={list.data} />}
            {tab === 'cars' && <CarsTab cars={list.data.cars} />}
            {tab === 'extras' && <ExtrasTab extras={list.data.extras} />}
            {tab === 'history' && <HistoryTab data={list.data} />}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
