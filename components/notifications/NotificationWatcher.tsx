'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  BELL_ITEMS,
  fetchNotifications,
  useUnreadCount,
} from '@/hooks/useNotifications';
import { invalidateLineMoneyViews } from '@/hooks/useTripCosts';

// At most this many toasts per new batch; the rest is summarised in one line.
const MAX_TOASTS = 3;

// Pages that show what drivers just did: refetch the ones that are open so they
// update without a manual refresh (inactive ones are only marked stale).
function refreshLiveViews(qc: QueryClient) {
  // orders (+ detail with trip costs), schedule, payables, revenue, dashboards.
  invalidateLineMoneyViews(qc);
  for (const key of [
    'drivers',
    'driver-detail',
    'driver-availability',
    'driver-requests',
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
  qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
  qc.invalidateQueries({ queryKey: ['notifications', 'page'] });
}

const COUNT_PREFIX = /^\(\d+\+?\)\s*/;

/**
 * Mounted once in the dashboard layout (so it survives page changes). Watches the
 * 15 s poll: when the newest notification changes it shows a toast for the new
 * items, refreshes the open pages, and keeps "(3)" in the browser tab title.
 */
export default function NotificationWatcher() {
  const qc = useQueryClient();
  const router = useRouter();
  const t = useTranslations('notifications');
  const { data } = useUnreadCount();

  // `undefined` = first answer not seen yet (never toast for what was already there).
  const seenId = useRef<string | null | undefined>(undefined);
  const seenAt = useRef<string | null>(null);

  const latestId = data ? (data.latest_id ?? null) : undefined;
  const latestAt = data?.latest_at ?? null;

  useEffect(() => {
    if (latestId === undefined) return;
    if (seenId.current === undefined) {
      seenId.current = latestId;
      seenAt.current = latestAt;
      return;
    }
    if (latestId === seenId.current) return;

    const since = seenAt.current;
    seenId.current = latestId;
    seenAt.current = latestAt;
    refreshLiveViews(qc);

    void (async () => {
      try {
        const list = await qc.fetchQuery({
          queryKey: ['notifications', 'list', BELL_ITEMS],
          queryFn: () => fetchNotifications({ limit: BELL_ITEMS }),
          staleTime: 0,
        });
        const fresh = list.items
          .filter((n) => !n.read && (!since || n.created_at > since))
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        for (const n of fresh.slice(-MAX_TOASTS)) {
          const show = n.type === 'TRIP_COST' ? toast.warning : toast.info;
          show(n.title, {
            description: n.body || undefined,
            duration: 10_000,
            action: n.link
              ? { label: t('open'), onClick: () => router.push(n.link) }
              : undefined,
          });
        }
        if (fresh.length > MAX_TOASTS) {
          toast.info(t('moreNew', { n: fresh.length - MAX_TOASTS }), { duration: 10_000 });
        }
      } catch {
        // The bell keeps working; just no toast this time.
      }
    })();
  }, [latestId, latestAt, qc, router, t]);

  // Browser tab title: "(3) Arasya RentCar – Admin". Next rewrites the title on
  // every page change, so re-apply the prefix when it does.
  const unread = data?.unread_count ?? 0;
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(COUNT_PREFIX, '');
      const next = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = document.title.replace(COUNT_PREFIX, '');
    };
  }, [unread]);

  return null;
}
