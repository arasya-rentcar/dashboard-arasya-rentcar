'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import NotificationItem, { useTimeAgo } from '@/components/notifications/NotificationItem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RupiahInput, rupiahValue } from '@/components/forms/RupiahInput';
import { useEtollCards } from '@/hooks/useEtollCards';
import {
  useDriverRequests,
  useMarkDriverRequestDone,
  useMarkNotificationsRead,
  useNotificationFeed,
  useUnreadCount,
} from '@/hooks/useNotifications';
import { cn, formatCurrency, formatDateTime, getErrorMessage, segmentClass } from '@/lib/utils';
import type { AdminNotification, DriverRequest } from '@/types';

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  return (
    <DashboardShell title={t('pageTitle')}>
      <div className="space-y-6">
        <DriverRequestsSection />
        <FeedSection />
      </div>
    </DashboardShell>
  );
}

// ─── Driver requests (e-toll top-up) ─────────────────────────────────────────

function DriverRequestsSection() {
  const t = useTranslations('notifications');
  const timeAgo = useTimeAgo();
  const [showDone, setShowDone] = useState(false);
  const [target, setTarget] = useState<DriverRequest | null>(null);
  const [note, setNote] = useState('');
  const [cardId, setCardId] = useState('');
  const [amount, setAmount] = useState('');
  const [balanceAfter, setBalanceAfter] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const open = useDriverRequests('OPEN');
  const done = useDriverRequests('DONE', showDone);
  const cards = useEtollCards('ACTIVE');
  const markDone = useMarkDriverRequestDone();
  const openItems = open.data ?? [];
  const activeCards = cards.data ?? [];
  // Until the office cards are entered, a request can still be closed with a note only.
  const needsCard = activeCards.length > 0;

  function startDone(r: DriverRequest) {
    setNote('');
    setAmount('');
    setBalanceAfter('');
    setFormError(null);
    setCardId(r.card_id ?? '');
    setTarget(r);
  }

  async function confirmDone() {
    if (!target) return;
    const a = rupiahValue(amount);
    if (needsCard && !cardId) return setFormError(t('selectCard'));
    if (needsCard && !a) return setFormError(t('amountRequired'));
    setFormError(null);
    try {
      await markDone.mutateAsync({
        id: target.id,
        note: note.trim() || undefined,
        ...(needsCard ? { card_id: cardId, amount: a, balance_after: rupiahValue(balanceAfter) } : {}),
      });
      toast.success(t('reqDoneToast', { name: target.driver.name }));
      setTarget(null);
      setNote('');
    } catch (err) {
      // 409 = someone else already handled it; the list refreshes either way.
      toast.error(getErrorMessage(err));
      setTarget(null);
      open.refetch();
    }
  }

  return (
    <Card className="gap-4 border border-gray-200 py-4 shadow-none sm:py-6">
      <CardHeader className="px-4 pb-0 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-violet-600" />
            {t('requestsTitle')}
            {openItems.length > 0 && (
              <Badge className="border-transparent bg-violet-600 px-2 text-[11px] text-white">
                {openItems.length}
              </Badge>
            )}
          </CardTitle>
        </div>
        <p className="text-xs text-gray-500">{t('requestsDesc')}</p>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-6">
        {open.isLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ) : open.isError ? (
          <QueryError compact onRetry={() => open.refetch()} />
        ) : openItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            {t('requestsEmpty')}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-violet-200 bg-violet-50/40">
            {openItems.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <RequestDetails r={r} timeAgo={timeAgo} t={t} />
                <Button
                  size="sm"
                  className="shrink-0 bg-violet-600 hover:bg-violet-700"
                  onClick={() => startDone(r)}
                >
                  <CheckCircle2 className="h-4 w-4" /> {t('markTopUpDone')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          aria-expanded={showDone}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDone && 'rotate-180')} />
          {showDone ? t('hideDone') : t('showDone')}
        </button>

        {showDone &&
          (done.isLoading ? (
            <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ) : done.isError ? (
            <QueryError compact onRetry={() => done.refetch()} />
          ) : (done.data ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">{t('doneEmpty')}</p>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
              {(done.data ?? []).map((r) => (
                <li key={r.id} className="p-4">
                  <RequestDetails r={r} timeAgo={timeAgo} t={t} />
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-11 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {r.handled_at ? t('handledAt', { at: formatDateTime(r.handled_at) }) : t('handled')}
                    {r.handled_note && (
                      <span className="italic text-gray-500">“{r.handled_note}”</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ))}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('markTopUpDone')}</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{t('confirmIntroCard', { name: target.driver.name })}</p>
              {needsCard ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="req_card">{t('topupCard')}</Label>
                    <Select value={cardId} onValueChange={setCardId}>
                      <SelectTrigger id="req_card" className="w-full">
                        <SelectValue placeholder={t('selectCard')} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCards.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!target.card_id && target.card_label && (
                      <p className="text-xs text-gray-500">{t('driverWrote', { card: target.card_label })}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="req_amount">{t('amountLabel')}</Label>
                    <RupiahInput id="req_amount" value={amount} onChange={setAmount} autoFocus={!!cardId} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="req_after">{t('balanceAfterLabel')}</Label>
                    <RupiahInput id="req_after" value={balanceAfter} onChange={setBalanceAfter} />
                    <p className="text-xs text-gray-400">{t('balanceAfterHint')}</p>
                  </div>
                </>
              ) : (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t('noCardsYet')}{' '}
                  <Link href="/dashboard/etoll-cards" className="font-medium underline">
                    {t('openCards')}
                  </Link>
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="req_note">{t('noteLabel')}</Label>
                <Textarea
                  id="req_note"
                  value={note}
                  maxLength={300}
                  rows={2}
                  placeholder={t('notePlaceholder')}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setTarget(null)} disabled={markDone.isPending}>
                  {t('cancel')}
                </Button>
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={confirmDone}
                  disabled={markDone.isPending}
                >
                  {markDone.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('confirmDone')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RequestDetails({
  r,
  timeAgo,
  t,
}: {
  r: DriverRequest;
  timeAgo: (iso: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const hasBalance = r.balance != null && r.balance !== '';
  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
        <CreditCard className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="break-words text-sm">
          <Link
            href={`/dashboard/drivers/${r.driver.id}`}
            className="font-semibold text-gray-900 hover:underline"
          >
            {r.driver.name}
          </Link>
          {r.driver.phone && <span className="ml-2 text-xs text-gray-400">{r.driver.phone}</span>}
        </p>
        <p className="text-sm text-gray-700">
          {t('reqCard')}:{' '}
          {r.card ? (
            <Link href={`/dashboard/etoll-cards/${r.card.id}`} className="font-medium hover:underline">
              {r.card.label}
            </Link>
          ) : (
            <span className="font-medium">{r.card_label || '—'}</span>
          )}
          <span className="mx-1.5 text-gray-300">·</span>
          {t('reqBalance')}:{' '}
          <span className="font-medium tabular-nums">{hasBalance ? formatCurrency(r.balance) : '—'}</span>
        </p>
        {r.card && (
          <p className="font-mono text-xs tabular-nums text-gray-500">
            {r.card.card_number.replace(/(\d{4})(?=\d)/g, '$1 ')}
            {r.card.balance != null && (
              <span className="ml-2 font-sans">{t('cardEstimate', { amount: formatCurrency(r.card.balance) })}</span>
            )}
          </p>
        )}
        {r.note && <p className="break-words text-xs italic text-gray-500">“{r.note}”</p>}
        <p className="text-[11px] text-gray-400">
          {formatDateTime(r.created_at)} · {timeAgo(r.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── All notifications ───────────────────────────────────────────────────────

function FeedSection() {
  const t = useTranslations('notifications');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: counter } = useUnreadCount();
  const unread = counter?.unread_count ?? 0;
  const feed = useNotificationFeed(unreadOnly);
  const markRead = useMarkNotificationsRead();
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  function handleOpen(n: AdminNotification) {
    if (!n.read) markRead.mutate({ ids: [n.id] });
  }

  return (
    <Card className="gap-4 overflow-hidden border border-gray-200 pt-4 pb-0 shadow-none sm:pt-6">
      <CardHeader className="px-4 pb-0 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-gray-500" />
            {t('feedTitle')}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
              <button type="button" aria-pressed={!unreadOnly} className={segmentClass(!unreadOnly)} onClick={() => setUnreadOnly(false)}>
                {t('filterAll')}
              </button>
              <button type="button" aria-pressed={unreadOnly} className={segmentClass(unreadOnly)} onClick={() => setUnreadOnly(true)}>
                {t('filterUnread')}
                {unread > 0 ? ` (${unread})` : ''}
              </button>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={unread === 0 || markRead.isPending}
              onClick={() => markRead.mutate({ all: true })}
            >
              <CheckCheck className="h-4 w-4" /> {t('markAllRead')}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">{t('retention')}</p>
      </CardHeader>
      <CardContent className="p-0">
        {feed.isLoading ? (
          <div className="space-y-px">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-gray-100/70" />
            ))}
          </div>
        ) : feed.isError ? (
          <div className="p-4">
            <QueryError onRetry={() => feed.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-gray-400">
            <Bell className="h-7 w-7" aria-hidden="true" />
            <p className="text-sm">{unreadOnly ? t('emptyUnread') : t('empty')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationItem n={n} onOpen={handleOpen} className="px-4 sm:px-6" />
              </li>
            ))}
          </ul>
        )}
        {feed.hasNextPage && (
          <div className="flex justify-center border-t border-gray-100 p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
            >
              {feed.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('loadMore')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
