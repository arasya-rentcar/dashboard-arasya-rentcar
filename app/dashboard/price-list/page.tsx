'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import CarsTab from '@/components/prices/CarsTab';
import CityTab from '@/components/prices/CityTab';
import ExtrasTab from '@/components/prices/ExtrasTab';
import HistoryTab from '@/components/prices/HistoryTab';
import PublishCard from '@/components/prices/PublishCard';
import ZoneTab from '@/components/prices/ZoneTab';
import { DirtyContext, segmentClass } from '@/components/prices/common';
import { usePriceList } from '@/hooks/usePriceList';

const TABS = ['city', 'zone', 'cars', 'extras', 'history'] as const;
type Tab = (typeof TABS)[number];

export default function PriceListPage() {
  const t = useTranslations('priceList');
  const [tab, setTab] = useState<Tab>('city');
  const list = usePriceList();
  // Forms with unsaved edits, by key (rate grid, table texts, city mapping, extras).
  const [dirtyForms, setDirtyForms] = useState<Record<string, true>>({});
  const report = useCallback((key: string, dirty: boolean) => {
    setDirtyForms((prev) => {
      if (!!prev[key] === dirty) return prev;
      const next = { ...prev };
      if (dirty) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);
  const unsaved = Object.keys(dirtyForms).length > 0;
  useLeaveWarning(unsaved, t('leaveUnsaved'));

  return (
    <DashboardShell title={t('title')}>
      <div className="space-y-4">
        <p className="max-w-3xl text-sm text-gray-500">{t('desc')}</p>

        {/* Data first: a failed background refetch must not unmount the forms (unsaved edits). */}
        {!list.data && list.isLoading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          </div>
        ) : !list.data ? (
          <QueryError onRetry={() => list.refetch()} />
        ) : (
          <DirtyContext.Provider value={report}>
            <PublishCard data={list.data} unsaved={unsaved} />
            <div className="max-w-full overflow-x-auto">
              <div className="flex w-fit gap-0.5 rounded-lg bg-gray-100 p-0.5">
                {TABS.map((k) => (
                  <button key={k} type="button" className={segmentClass(tab === k)} onClick={() => setTab(k)}>
                    {t(`tab.${k}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Editing tabs stay mounted (hidden) so unsaved edits survive a tab switch. */}
            <div hidden={tab !== 'city'}>
              <CityTab data={list.data} />
            </div>
            <div hidden={tab !== 'zone'}>
              <ZoneTab data={list.data} />
            </div>
            <div hidden={tab !== 'cars'}>
              <CarsTab cars={list.data.cars} />
            </div>
            <div hidden={tab !== 'extras'}>
              <ExtrasTab extras={list.data.extras} />
            </div>
            {tab === 'history' && <HistoryTab data={list.data} />}
          </DirtyContext.Provider>
        )}
      </div>
    </DashboardShell>
  );
}

/**
 * Unsaved edits: the browser asks before a reload / tab close, and a click on
 * an in-app link (sidebar) asks first, since Next.js navigation never fires
 * beforeunload.
 */
function useLeaveWarning(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        // Capture phase on document runs before React's handler: the Link never navigates.
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, message]);
}
