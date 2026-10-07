'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import CarsTab from '@/components/prices/CarsTab';
import CityTab from '@/components/prices/CityTab';
import ExtrasTab from '@/components/prices/ExtrasTab';
import HistoryTab from '@/components/prices/HistoryTab';
import PublishCard from '@/components/prices/PublishCard';
import ZoneTab from '@/components/prices/ZoneTab';
import { DirtyContext } from '@/components/prices/common';
import { usePriceList } from '@/hooks/usePriceList';
import { setLeaveQuestion } from '@/lib/leaveGuard';
import { segmentClass } from '@/lib/utils';

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
                  <button
                    key={k}
                    type="button"
                    aria-pressed={tab === k}
                    // Taller on phones: the shared segment pill is ~28px, below a comfortable tap size.
                    className={segmentClass(tab === k, 'shrink-0 whitespace-nowrap py-2 sm:py-1.5')}
                    onClick={() => setTab(k)}
                  >
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

// Marks the extra history entry pushed while there are unsaved edits.
const GUARD_KEY = 'priceListLeaveGuard';
const onGuardEntry = () => !!(window.history.state as Record<string, unknown> | null)?.[GUARD_KEY];
// Removing the extra entry waits a tick, so a quick dirty -> clean -> dirty
// (or React's dev double effect) keeps the entry instead of racing history.back().
let pendingUnguard: number | null = null;

/**
 * Unsaved edits: ask before every way of leaving the page.
 * - reload / tab close: beforeunload;
 * - an in-app link (sidebar): a capture click handler, since Next.js
 *   navigation never fires beforeunload;
 * - browser Back / Forward: an extra history entry for this same page is
 *   pushed, so Back first lands on this page again (popstate) and asks there;
 * - buttons that navigate in code (sidebar logout, notification toast) ask
 *   through lib/leaveGuard.
 */
function useLeaveWarning(active: boolean, message: string) {
  const messageRef = useRef(message);
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    if (!active) return;
    const ask = () => window.confirm(messageRef.current);
    let leaving = false;

    if (pendingUnguard != null) {
      window.clearTimeout(pendingUnguard);
      pendingUnguard = null;
    }
    // No URL: Next.js copies its own state into the entry, and Back to the
    // entry below is a no-op traversal to this same page.
    if (!onGuardEntry()) window.history.pushState({ [GUARD_KEY]: true }, '');

    const onPopState = () => {
      if (leaving || onGuardEntry()) return;
      if (ask()) {
        leaving = true;
        window.history.back();
      } else {
        window.history.pushState({ [GUARD_KEY]: true }, '');
      }
    };
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
      if (!ask()) {
        e.preventDefault();
        // Capture phase on document runs before React's handler: the Link never navigates.
        e.stopPropagation();
      }
    };
    setLeaveQuestion(() => messageRef.current);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      setLeaveQuestion(null);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
      // Saved or discarded: drop the extra entry so Back works in one press.
      // After leaving the page another entry is current, and nothing happens.
      pendingUnguard = window.setTimeout(() => {
        pendingUnguard = null;
        if (onGuardEntry()) window.history.back();
      }, 0);
    };
  }, [active]);
}
