'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Camera,
  Car,
  CreditCard,
  Flag,
  MapPin,
  PlayCircle,
  Receipt,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import type { AdminNotification, AdminNotificationType } from '@/types';

// One icon + colour per notification type. TRIP_COST is amber because the cost
// waits for the office to approve or reject it.
const TYPE_META: Record<AdminNotificationType, { icon: LucideIcon; tint: string }> = {
  TRIP_ACCEPTED: { icon: UserCheck, tint: 'bg-blue-100 text-blue-700' },
  TRIP_STARTED: { icon: PlayCircle, tint: 'bg-indigo-100 text-indigo-700' },
  TRIP_ARRIVED: { icon: MapPin, tint: 'bg-emerald-100 text-emerald-700' },
  TRIP_BOARDED: { icon: Car, tint: 'bg-teal-100 text-teal-700' },
  TRIP_FINISHED: { icon: Flag, tint: 'bg-gray-200 text-gray-700' },
  TRIP_REPORT: { icon: Camera, tint: 'bg-sky-100 text-sky-700' },
  TRIP_COST: { icon: Receipt, tint: 'bg-amber-100 text-amber-700' },
  DRIVER_REQUEST: { icon: CreditCard, tint: 'bg-violet-100 text-violet-700' },
};

export function notificationMeta(type: string) {
  return TYPE_META[type as AdminNotificationType] ?? TYPE_META.TRIP_REPORT;
}

/** "baru saja", "5 menit lalu", "3 jam lalu", otherwise the WIB date and time. */
export function useTimeAgo() {
  const t = useTranslations('notifications');
  return (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '';
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return t('agoNow');
    if (minutes < 60) return t('agoMinutes', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('agoHours', { n: hours });
    return formatDateTime(iso);
  };
}

/**
 * One row of the bell dropdown and the notifications page. A click opens the
 * linked page; the parent marks the item read through `onOpen`.
 */
export default function NotificationItem({
  n,
  onOpen,
  className,
}: {
  n: AdminNotification;
  onOpen: (n: AdminNotification) => void;
  className?: string;
}) {
  const t = useTranslations('notifications');
  const timeAgo = useTimeAgo();
  const { icon: Icon, tint } = notificationMeta(n.type);
  const needsReview = n.type === 'TRIP_COST';

  return (
    <Link
      href={n.link || '/dashboard/notifications'}
      onClick={() => onOpen(n)}
      className={cn(
        'flex gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50',
        !n.read && (needsReview ? 'bg-amber-50/70' : 'bg-blue-50/40'),
        className,
      )}
    >
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tint)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              'text-sm leading-snug text-gray-900',
              n.read ? 'font-normal' : 'font-semibold',
            )}
          >
            {n.title}
          </span>
          {!n.read && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
              aria-label={t('unreadDot')}
            />
          )}
        </span>
        {n.body && <span className="mt-0.5 block text-xs leading-snug text-gray-500">{n.body}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] text-gray-400">{timeAgo(n.created_at)}</span>
          {needsReview && (
            <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800">
              {t('needsReview')}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
