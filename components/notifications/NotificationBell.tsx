'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useLatestNotifications,
  useMarkNotificationsRead,
  useUnreadCount,
} from '@/hooks/useNotifications';
import NotificationItem from './NotificationItem';
import type { AdminNotification } from '@/types';

/**
 * Bell in the top bar: unread badge (polled every 15 s), the latest 15 items in
 * a dropdown, mark one / all as read, and links to the page each item is about.
 */
export default function NotificationBell() {
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const { data: counter } = useUnreadCount();
  const unread = counter?.unread_count ?? 0;
  const { data, isLoading, isError, refetch } = useLatestNotifications(open);
  const markRead = useMarkNotificationsRead();
  const items = data?.items ?? [];

  function handleOpen(n: AdminNotification) {
    setOpen(false);
    if (!n.read) markRead.mutate({ ids: [n.id] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          aria-label={unread > 0 ? t('bellUnread', { n: unread }) : t('bell')}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
          <p className="text-sm font-semibold text-gray-900">{t('title')}</p>
          <button
            type="button"
            disabled={unread === 0 || markRead.isPending}
            onClick={() => markRead.mutate({ all: true })}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:pointer-events-none disabled:text-gray-300"
          >
            <CheckCheck className="h-3.5 w-3.5" /> {t('markAllRead')}
          </button>
        </div>

        <div className="max-h-[min(28rem,65vh)] divide-y divide-gray-100 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-xs text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('loading')}
            </div>
          ) : isError ? (
            <div className="space-y-2 p-6 text-center">
              <p className="text-xs text-red-600">{t('loadFailed')}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {t('retry')}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-gray-400">
              <Bell className="h-6 w-6" aria-hidden="true" />
              <p className="text-xs">{t('empty')}</p>
            </div>
          ) : (
            items.map((n) => <NotificationItem key={n.id} n={n} onOpen={handleOpen} />)
          )}
        </div>

        <div className="border-t border-gray-100 p-1.5">
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('viewAll')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
