'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Copy,
  CreditCard,
  Gauge,
  Loader2,
  Pencil,
  Power,
  Trash2,
  Undo2,
  UserCheck,
  UserRoundX,
  Wallet,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import QueryError from '@/components/dashboard/QueryError';
import {
  BalanceText,
  CardFormDialog,
  ISSUER_TINT,
  TransactionDialog,
  formatCardNumber,
} from '@/components/etoll/etoll';
import { RupiahInput, rupiahValue } from '@/components/forms/RupiahInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDrivers } from '@/hooks/useDrivers';
import {
  useDeleteEtollCard,
  useEtollCard,
  useGiveEtollCard,
  useReturnEtollCard,
  useUpdateEtollCard,
  useVoidEtollTransaction,
} from '@/hooks/useEtollCards';
import { cn, formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils';
import type { EtollCard, EtollCardHistory, EtollHandover, EtollTransaction, EtollTransactionType } from '@/types';

export default function EtollCardDetailPage() {
  const id = useParams().id as string;
  const t = useTranslations('etoll');
  const q = useEtollCard(id);
  const [txType, setTxType] = useState<EtollTransactionType | null>(null);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<'give' | 'return' | 'deactivate' | 'delete' | null>(null);

  if (q.isLoading) {
    return (
      <DashboardShell title={t('title')}>
        <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
      </DashboardShell>
    );
  }
  if (q.isError || !q.data) {
    return (
      <DashboardShell title={t('title')}>
        <QueryError onRetry={() => q.refetch()} />
      </DashboardShell>
    );
  }
  const { card } = q.data;
  const active = card.status === 'ACTIVE';
  const hasHistory = q.data.transactions.length > 0 || q.data.handovers.length > 0;

  return (
    <DashboardShell title={card.name}>
      <div className="space-y-5">
        <Link href="/dashboard/etoll-cards" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>

        <Card className="border border-gray-200 shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900">
                    {card.name}
                    <Badge variant="outline" className={cn('text-[11px]', ISSUER_TINT[card.issuer])}>
                      {card.issuer_label || t('issuerOther')}
                    </Badge>
                    {!active && (
                      <Badge variant="outline" className="border-gray-300 text-[11px] text-gray-500">
                        {t('inactive')}
                        {card.inactive_reason ? ` · ${card.inactive_reason}` : ''}
                      </Badge>
                    )}
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-gray-600 hover:text-gray-900"
                    title={t('copy')}
                    onClick={() => {
                      navigator.clipboard?.writeText(card.card_number).then(
                        () => toast.success(t('copied')),
                        () => undefined,
                      );
                    }}
                  >
                    {formatCardNumber(card.card_number)} <Copy className="h-3.5 w-3.5" />
                  </button>
                  {card.note && <p className="text-xs italic text-gray-500">“{card.note}”</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" /> {t('edit')}
                </Button>
                {active ? (
                  <Button size="sm" variant="outline" onClick={() => setDialog('deactivate')}>
                    <Power className="h-4 w-4" /> {t('deactivate')}
                  </Button>
                ) : (
                  <ActivateButton card={card} />
                )}
                {!hasHistory && (
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDialog('delete')}>
                    <Trash2 className="h-4 w-4" /> {t('delete')}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t('estimate')}</p>
                <BalanceText card={card} className="mt-1 text-xl" />
                <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{t('estimateNote')}</p>
                {active && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => setTxType('TOPUP')}>
                      <ArrowDownLeft className="h-4 w-4" /> {t('recordTopup')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTxType('BALANCE_CHECK')}>
                      <Gauge className="h-4 w-4" /> {t('recordBalance')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTxType('TOLL')}>
                      <ArrowUpRight className="h-4 w-4" /> {t('recordToll')}
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t('where')}</p>
                {!active ? (
                  <p className="mt-1 text-sm text-gray-400">—</p>
                ) : card.holder ? (
                  <div className="mt-1">
                    <Link href={`/dashboard/drivers/${card.holder.driver.id}`} className="text-xl font-semibold text-gray-900 hover:underline">
                      {card.holder.driver.name}
                    </Link>
                    <p className="text-[11px] text-gray-400">
                      {card.holder.driver.phone} · {t('since', { at: formatDateTime(card.holder.taken_at) })}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xl font-semibold text-emerald-700">{t('atOffice')}</p>
                )}
                {card.open_request && (
                  <Link
                    href="/dashboard/notifications"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    {t('openRequest', { at: formatDateTime(card.open_request.created_at) })}
                  </Link>
                )}
                {active && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {card.holder ? (
                      <Button size="sm" variant="outline" onClick={() => setDialog('return')}>
                        <Undo2 className="h-4 w-4" /> {t('markReturned')}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => setDialog('give')}>
                      <UserCheck className="h-4 w-4" /> {card.holder ? t('giveOther') : t('give')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <HistoryCard data={q.data} />
      </div>

      <TransactionDialog card={card} type={txType} onClose={() => setTxType(null)} />
      {editing && <CardFormDialog open={editing} onOpenChange={setEditing} card={card} />}
      {dialog === 'give' && <GiveDialog card={card} onClose={() => setDialog(null)} />}
      {dialog === 'return' && <ReturnDialog card={card} onClose={() => setDialog(null)} />}
      {dialog === 'deactivate' && <DeactivateDialog card={card} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && <DeleteDialog card={card} onClose={() => setDialog(null)} />}
    </DashboardShell>
  );
}

function ActivateButton({ card }: { card: EtollCard }) {
  const t = useTranslations('etoll');
  const update = useUpdateEtollCard();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={update.isPending}
      onClick={async () => {
        try {
          await update.mutateAsync({ id: card.id, data: { status: 'ACTIVE' } });
          toast.success(t('okActivated'));
        } catch (err) {
          toast.error(getErrorMessage(err));
        }
      }}
    >
      {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />} {t('activate')}
    </Button>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────

type Row =
  | { kind: 'tx'; at: string; tx: EtollTransaction }
  | { kind: 'taken'; at: string; h: EtollHandover }
  | { kind: 'returned'; at: string; h: EtollHandover };

function HistoryCard({ data }: { data: EtollCardHistory }) {
  const t = useTranslations('etoll');
  const [voiding, setVoiding] = useState<EtollTransaction | null>(null);
  const rows: Row[] = [
    ...data.transactions.map((tx) => ({ kind: 'tx' as const, at: tx.occurred_at, tx })),
    ...data.handovers.map((h) => ({ kind: 'taken' as const, at: h.taken_at, h })),
    ...data.handovers.filter((h) => h.returned_at).map((h) => ({ kind: 'returned' as const, at: h.returned_at!, h })),
  ].sort((a, b) => {
    const d = new Date(b.at).getTime() - new Date(a.at).getTime();
    // Same moment: the handover before the balance read with it (newest first).
    return d !== 0 ? d : a.kind === 'tx' ? -1 : b.kind === 'tx' ? 1 : 0;
  });
  const who = (adminId: string | null, driverName?: string | null) =>
    adminId ? t('byAdmin', { email: data.users[adminId] ?? t('admin') }) : driverName ? t('byDriverApp') : '';

  return (
    <Card className="border border-gray-200 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('history')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-400">{t('historyEmpty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {rows.map((r) =>
              r.kind === 'tx' ? (
                <TxRow key={`tx-${r.tx.id}`} tx={r.tx} who={who(r.tx.created_by, r.tx.driver?.name)} onVoid={() => setVoiding(r.tx)} />
              ) : (
                <HandoverRow key={`${r.kind}-${r.h.id}`} kind={r.kind} h={r.h} who={who(r.kind === 'taken' ? r.h.taken_by : r.h.returned_by)} />
              ),
            )}
          </ul>
        )}
      </CardContent>
      {voiding && <VoidDialog tx={voiding} onClose={() => setVoiding(null)} />}
    </Card>
  );
}

const TX_META: Record<EtollTransactionType, { icon: typeof Wallet; tint: string }> = {
  TOPUP: { icon: ArrowDownLeft, tint: 'bg-emerald-100 text-emerald-700' },
  TOLL: { icon: ArrowUpRight, tint: 'bg-amber-100 text-amber-700' },
  BALANCE_CHECK: { icon: Gauge, tint: 'bg-sky-100 text-sky-700' },
};

function TxRow({ tx, who, onVoid }: { tx: EtollTransaction; who: string; onVoid: () => void }) {
  const t = useTranslations('etoll');
  const meta = TX_META[tx.type];
  const Icon = meta.icon;
  const voided = !!tx.voided_at;
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-6">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', voided ? 'bg-gray-100 text-gray-400' : meta.tint)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={cn('flex flex-wrap items-center gap-x-2 text-sm', voided && 'text-gray-400 line-through')}>
          <span className="font-semibold">{t(`tx${tx.type}`)}</span>
          {tx.amount != null && (
            <span className="tabular-nums">
              {tx.type === 'TOLL' ? '−' : '+'}
              {formatCurrency(tx.amount)}
            </span>
          )}
          {tx.balance_after != null && (
            <span className="text-gray-500">{t('balanceAfter', { amount: formatCurrency(tx.balance_after) })}</span>
          )}
          {tx.source === 'NFC' && (
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-[10px] text-sky-700 no-underline">
              NFC
            </Badge>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {[tx.driver?.name, tx.note, who].filter(Boolean).join(' · ')}
        </p>
        {voided && (
          <p className="text-xs text-red-600">
            {t('voidedAt', { at: formatDateTime(tx.voided_at!) })}
            {tx.void_reason ? ` · ${tx.void_reason}` : ''}
          </p>
        )}
        <p className="text-[11px] text-gray-400">{formatDateTime(tx.occurred_at)}</p>
      </div>
      {!voided && (
        <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs text-gray-500" onClick={onVoid}>
          <Ban className="h-3.5 w-3.5" /> {t('void')}
        </Button>
      )}
    </li>
  );
}

function HandoverRow({ kind, h, who }: { kind: 'taken' | 'returned'; h: EtollHandover; who: string }) {
  const t = useTranslations('etoll');
  const name = h.driver?.name ?? '—';
  const title =
    kind === 'taken'
      ? h.taken_by
        ? t('evGiven', { name })
        : t('evTaken', { name })
      : h.return_kind === 'TAKEN_OVER'
        ? t('evTakenOver', { name })
        : h.return_kind === 'DEACTIVATED'
          ? t('evDeactivated', { name })
          : t('evReturned', { name });
  const Icon = kind === 'taken' ? UserCheck : UserRoundX;
  return (
    <li className="flex gap-3 bg-gray-50/60 px-4 py-2.5 sm:px-6">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        {who && <p className="text-xs text-gray-500">{who}</p>}
        <p className="text-[11px] text-gray-400">{formatDateTime(kind === 'taken' ? h.taken_at : h.returned_at!)}</p>
      </div>
    </li>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function Actions({ busy, onClose, onConfirm, label, danger }: { busy: boolean; onClose: () => void; onConfirm: () => void; label: string; danger?: boolean }) {
  const t = useTranslations('etoll');
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="outline" onClick={onClose} disabled={busy}>
        {t('cancel')}
      </Button>
      <Button variant={danger ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

function GiveDialog({ card, onClose }: { card: EtollCard; onClose: () => void }) {
  const t = useTranslations('etoll');
  const drivers = useDrivers();
  const give = useGiveEtollCard();
  const [driverId, setDriverId] = useState('');
  const [balance, setBalance] = useState('');
  const list = (drivers.data ?? [])
    .filter((d) => d.type === 'INTERNAL' && d.id !== card.holder?.driver.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  async function confirm() {
    if (!driverId) return toast.error(t('selectDriver'));
    try {
      await give.mutateAsync({ id: card.id, driver_id: driverId, balance: rupiahValue(balance) });
      toast.success(t('okGiven', { name: list.find((d) => d.id === driverId)?.name ?? '' }));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }
  return (
    <DialogShell title={t('giveTitle')} onClose={onClose}>
      <p className="text-sm text-gray-600">{card.label}</p>
      {card.holder && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('giveOtherHint', { name: card.holder.driver.name })}</p>}
      <div className="space-y-1.5">
        <Label>{t('driver')}</Label>
        <Select value={driverId} onValueChange={setDriverId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectDriver')} />
          </SelectTrigger>
          <SelectContent>
            {list.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="give_balance">{t('giveBalance')}</Label>
        <RupiahInput id="give_balance" value={balance} onChange={setBalance} />
      </div>
      <Actions busy={give.isPending} onClose={onClose} onConfirm={confirm} label={t('give')} />
    </DialogShell>
  );
}

function ReturnDialog({ card, onClose }: { card: EtollCard; onClose: () => void }) {
  const t = useTranslations('etoll');
  const ret = useReturnEtollCard();
  const [balance, setBalance] = useState('');
  async function confirm() {
    try {
      await ret.mutateAsync({ id: card.id, balance: rupiahValue(balance) });
      toast.success(t('okReturned'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }
  return (
    <DialogShell title={t('returnTitle')} onClose={onClose}>
      <p className="text-sm text-gray-600">{t('returnIntro', { name: card.holder?.driver.name ?? '—' })}</p>
      <div className="space-y-1.5">
        <Label htmlFor="ret_balance">{t('returnBalance')}</Label>
        <RupiahInput id="ret_balance" value={balance} onChange={setBalance} />
      </div>
      <Actions busy={ret.isPending} onClose={onClose} onConfirm={confirm} label={t('markReturned')} />
    </DialogShell>
  );
}

function DeactivateDialog({ card, onClose }: { card: EtollCard; onClose: () => void }) {
  const t = useTranslations('etoll');
  const update = useUpdateEtollCard();
  const [reason, setReason] = useState('');
  async function confirm() {
    try {
      await update.mutateAsync({ id: card.id, data: { status: 'INACTIVE', ...(reason.trim() ? { inactive_reason: reason.trim() } : {}) } });
      toast.success(t('okDeactivated'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }
  return (
    <DialogShell title={t('deactivateTitle')} onClose={onClose}>
      <p className="text-sm text-gray-600">{t('deactivateIntro')}</p>
      <div className="space-y-1.5">
        <Label htmlFor="deact_reason">{t('reasonLabel')}</Label>
        <Input id="deact_reason" maxLength={100} value={reason} placeholder={t('reasonPlaceholder')} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Actions busy={update.isPending} onClose={onClose} onConfirm={confirm} label={t('deactivate')} danger />
    </DialogShell>
  );
}

function DeleteDialog({ card, onClose }: { card: EtollCard; onClose: () => void }) {
  const t = useTranslations('etoll');
  const router = useRouter();
  const del = useDeleteEtollCard();
  async function confirm() {
    try {
      await del.mutateAsync(card.id);
      toast.success(t('okDeleted'));
      router.push('/dashboard/etoll-cards');
    } catch (err) {
      toast.error(getErrorMessage(err));
      onClose();
    }
  }
  return (
    <DialogShell title={t('delete')} onClose={onClose}>
      <p className="text-sm text-gray-600">{t('deleteConfirm', { name: card.name })}</p>
      <Actions busy={del.isPending} onClose={onClose} onConfirm={confirm} label={t('delete')} danger />
    </DialogShell>
  );
}

function VoidDialog({ tx, onClose }: { tx: EtollTransaction; onClose: () => void }) {
  const t = useTranslations('etoll');
  const voidTx = useVoidEtollTransaction();
  const [reason, setReason] = useState('');
  async function confirm() {
    try {
      await voidTx.mutateAsync({ txId: tx.id, reason: reason.trim() || undefined });
      toast.success(t('okVoided'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
      onClose();
    }
  }
  return (
    <DialogShell title={t('voidTitle')} onClose={onClose}>
      <p className="text-sm text-gray-600">
        {t(`tx${tx.type}`)}
        {tx.amount != null ? ` ${formatCurrency(tx.amount)}` : ''}
        {tx.balance_after != null ? ` · ${t('balanceAfter', { amount: formatCurrency(tx.balance_after) })}` : ''} ·{' '}
        {formatDateTime(tx.occurred_at)}
      </p>
      <p className="text-xs text-gray-500">{t('voidIntro')}</p>
      <div className="space-y-1.5">
        <Label htmlFor="void_reason">{t('voidReason')}</Label>
        <Input id="void_reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Actions busy={voidTx.isPending} onClose={onClose} onConfirm={confirm} label={t('void')} danger />
    </DialogShell>
  );
}
