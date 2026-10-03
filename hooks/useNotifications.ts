import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { driverRequestsApi, notificationsApi } from '@/lib/api';
import { parseResponse } from '@/lib/safeParse';
import {
  driverRequestListSchema,
  notificationListSchema,
  unreadCountSchema,
} from '@/lib/schemas';
import type {
  AdminNotificationList,
  DriverRequest,
  NotificationUnreadCount,
} from '@/types';

/** How often the bell asks the API whether something new arrived. */
export const NOTIFICATION_POLL_MS = 15_000;
/** Page size of the full notifications list ("load more" uses `before`). */
export const NOTIFICATION_PAGE_SIZE = 30;
/** Items shown in the bell dropdown. */
export const BELL_ITEMS = 15;

export const unreadCountKey = ['notifications', 'unread-count'] as const;

export async function fetchNotifications(params: {
  limit: number;
  before?: string;
  unread?: boolean;
}): Promise<AdminNotificationList> {
  const res = await notificationsApi.list({
    limit: params.limit,
    before: params.before,
    unread: params.unread ? 1 : undefined,
  });
  return parseResponse<AdminNotificationList>(notificationListSchema, res.data.data, 'notifications');
}

/**
 * Unread count + id of the newest item. Polled every 15 s, also while the tab is
 * in the background, so a new driver action shows up without touching the page.
 */
export function useUnreadCount() {
  return useQuery<NotificationUnreadCount>({
    queryKey: unreadCountKey,
    queryFn: async () => {
      const res = await notificationsApi.unreadCount();
      return parseResponse<NotificationUnreadCount>(unreadCountSchema, res.data.data, 'unread-count');
    },
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: false,
  });
}

/** Latest items for the bell dropdown (only fetched while it is open). */
export function useLatestNotifications(enabled: boolean) {
  return useQuery<AdminNotificationList>({
    queryKey: ['notifications', 'list', BELL_ITEMS],
    queryFn: () => fetchNotifications({ limit: BELL_ITEMS }),
    enabled,
    staleTime: 0,
  });
}

/** All notifications (last 30 days) for the page, newest first, paged by `before`. */
export function useNotificationFeed(unreadOnly: boolean) {
  return useInfiniteQuery<
    AdminNotificationList,
    Error,
    InfiniteData<AdminNotificationList, string | undefined>,
    readonly unknown[],
    string | undefined
  >({
    queryKey: ['notifications', 'page', unreadOnly ? 'unread' : 'all'],
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      fetchNotifications({ limit: NOTIFICATION_PAGE_SIZE, before: pageParam, unread: unreadOnly }),
    getNextPageParam: (last) =>
      last.items.length >= NOTIFICATION_PAGE_SIZE
        ? last.items[last.items.length - 1].created_at
        : undefined,
    staleTime: 0,
  });
}

// Flip `read` in every cached list at once so the UI reacts before the API answers.
function markReadInCache(qc: QueryClient, target: { ids?: string[]; all?: boolean }) {
  const ids = new Set(target.ids ?? []);
  const flip = (list: AdminNotificationList): AdminNotificationList => ({
    ...list,
    items: list.items.map((n) => (target.all || ids.has(n.id) ? { ...n, read: true } : n)),
  });
  qc.setQueriesData<AdminNotificationList>({ queryKey: ['notifications', 'list'] }, (old) =>
    old ? flip(old) : old,
  );
  qc.setQueriesData<InfiniteData<AdminNotificationList, string | undefined>>(
    { queryKey: ['notifications', 'page'] },
    (old) => (old ? { ...old, pages: old.pages.map(flip) } : old),
  );
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { ids?: string[]; all?: boolean }) => {
      const res = await notificationsApi.markRead(data);
      return res.data.data as { unread_count: number };
    },
    onMutate: (data) => markReadInCache(qc, data),
    onSuccess: (res) => {
      qc.setQueryData<NotificationUnreadCount>(unreadCountKey, (old) =>
        old ? { ...old, unread_count: res.unread_count } : old,
      );
      // The unread filter must now drop the items that were just read.
      qc.invalidateQueries({ queryKey: ['notifications', 'page', 'unread'] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** E-toll top-up requests from drivers, newest first. */
export function useDriverRequests(status: 'OPEN' | 'DONE', enabled = true) {
  return useQuery<DriverRequest[]>({
    enabled,
    queryKey: ['driver-requests', status],
    queryFn: async () => {
      const res = await driverRequestsApi.list({ status });
      return parseResponse<{ items: DriverRequest[] }>(
        driverRequestListSchema,
        res.data.data,
        'driver-requests',
      ).items;
    },
    staleTime: 0,
  });
}

export function useMarkDriverRequestDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await driverRequestsApi.markDone(id, note ? { note } : {});
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-requests'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
