'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RupiahInput, rupiahValue } from '@/components/forms/RupiahInput';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddEtollTransaction,
  useCreateEtollCard,
  useUpdateEtollCard,
} from '@/hooks/useEtollCards';
import { cn, formatCurrency, formatDateTime, getErrorMessage, wibDateTimeToIso } from '@/lib/utils';
import type { EtollCard, EtollIssuer, EtollTransactionType } from '@/types';

/** Bank product names (the same in both languages); OTHER is translated. */
export const ISSUERS: { value: EtollIssuer; label: string }[] = [
  { value: 'MANDIRI', label: 'Mandiri e-Money' },
  { value: 'BCA', label: 'BCA Flazz' },
  { value: 'BRI', label: 'BRI Brizzi' },
  { value: 'BNI', label: 'BNI TapCash' },
  { value: 'DKI', label: 'JakCard' },
  { value: 'OTHER', label: '' },
];

export const ISSUER_TINT: Record<string, string> = {
  MANDIRI: 'bg-amber-50 text-amber-800 border-amber-200',
  BCA: 'bg-blue-50 text-blue-800 border-blue-200',
  BRI: 'bg-sky-50 text-sky-800 border-sky-200',
  BNI: 'bg-orange-50 text-orange-800 border-orange-200',
  DKI: 'bg-red-50 text-red-800 border-red-200',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
};

/** "6032980012345678" → "6032 9800 1234 5678". */
export function formatCardNumber(n: string): string {
  return n.replace(/(\d{4})(?=\d)/g, '$1 ');
}

const digits = (v: string) => v.replace(/\D/g, '');

/** "Rp 85.000 · dicek 2 Okt 2026 10.12", or "Belum diketahui". */
export function BalanceText({ card, className }: { card: Pick<EtollCard, 'balance' | 'balance_at'>; className?: string }) {
  const t = useTranslations('etoll');
  if (card.balance == null) return <span className={cn('text-sm text-gray-400', className)}>{t('balanceUnknown')}</span>;
  return (
    <span className={cn('flex flex-col', className)}>
      <span className={cn('font-semibold tabular-nums', card.balance < 0 ? 'text-red-600' : 'text-gray-900')}>
        {formatCurrency(card.balance)}
      </span>
      {card.balance_at && (
        <span className="text-[11px] text-gray-400">{t('checkedAt', { at: formatDateTime(card.balance_at) })}</span>
      )}
    </span>
  );
}

/** Add or edit a card. */
export function CardFormDialog({
  open,
  onOpenChange,
  card,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card?: EtollCard | null;
}) {
  const t = useTranslations('etoll');
  const create = useCreateEtollCard();
  const update = useUpdateEtollCard();
  const [issuer, setIssuer] = useState<string>(card?.issuer ?? '');
  const [name, setName] = useState(card?.name ?? '');
  const [number, setNumber] = useState(card ? formatCardNumber(card.card_number) : '');
  const [balance, setBalance] = useState('');
  const [note, setNote] = useState(card?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  async function save() {
    const n = digits(number);
    if (!issuer) return setError(t('errIssuer'));
    if (!name.trim()) return setError(t('errName'));
    if (!/^\d{8,20}$/.test(n)) return setError(t('errNumber'));
    setError(null);
    try {
      if (card) {
        await update.mutateAsync({
          id: card.id,
          data: { issuer, name: name.trim(), card_number: n, note: note.trim() || null },
        });
        toast.success(t('okUpdated'));
      } else {
        await create.mutateAsync({
          issuer,
          name: name.trim(),
          card_number: n,
          balance: rupiahValue(balance),
          note: note.trim() || undefined,
        });
        toast.success(t('okAdded'));
      }
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{card ? t('editTitle') : t('addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ec_issuer">{t('issuer')}</Label>
            <Select value={issuer} onValueChange={setIssuer}>
              <SelectTrigger id="ec_issuer" className="w-full">
                <SelectValue placeholder={t('selectIssuer')} />
              </SelectTrigger>
              <SelectContent>
                {ISSUERS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label || t('issuerOther')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec_name">{t('name')}</Label>
            <Input id="ec_name" value={name} maxLength={40} placeholder={t('namePlaceholder')} onChange={(e) => setName(e.target.value)} />
            <p className="text-xs text-gray-400">{t('nameHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec_number">{t('cardNumber')}</Label>
            <Input
              id="ec_number"
              inputMode="numeric"
              className="font-mono tabular-nums"
              value={number}
              placeholder="6032 9800 1234 5678"
              onChange={(e) => setNumber(formatCardNumber(digits(e.target.value).slice(0, 20)))}
            />
            <p className="text-xs text-gray-400">{t('cardNumberHint')}</p>
          </div>
          {!card && (
            <div className="space-y-1.5">
              <Label htmlFor="ec_balance">{t('initialBalance')}</Label>
              <RupiahInput id="ec_balance" value={balance} onChange={setBalance} />
              <p className="text-xs text-gray-400">{t('initialBalanceHint')}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ec_note">{t('note')}</Label>
            <Textarea id="ec_note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** "Catat top-up / tol / saldo" on a card. */
export function TransactionDialog({
  card,
  type,
  onClose,
}: {
  card: EtollCard;
  type: EtollTransactionType | null;
  onClose: () => void;
}) {
  const t = useTranslations('etoll');
  const add = useAddEtollTransaction();
  const [amount, setAmount] = useState('');
  const [balanceAfter, setBalanceAfter] = useState('');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  // One id per dialog: a double click or a retry after a lost answer is stored once.
  const [ref, setRef] = useState(() => crypto.randomUUID());

  function close() {
    setAmount('');
    setBalanceAfter('');
    setWhen('');
    setNote('');
    setError(null);
    setRef(crypto.randomUUID());
    onClose();
  }

  async function save() {
    if (!type) return;
    const a = rupiahValue(amount);
    const b = rupiahValue(balanceAfter);
    if (type !== 'BALANCE_CHECK' && !a) return setError(t('errAmount'));
    if (type === 'BALANCE_CHECK' && b == null) return setError(t('errBalance'));
    setError(null);
    try {
      await add.mutateAsync({
        id: card.id,
        type,
        ...(type !== 'BALANCE_CHECK' ? { amount: a } : {}),
        ...(b != null ? { balance_after: b } : {}),
        ...(when ? { occurred_at: wibDateTimeToIso(when) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        client_ref: ref,
      });
      toast.success(t('okRecorded'));
      close();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const title = type === 'TOPUP' ? t('recordTopup') : type === 'TOLL' ? t('recordToll') : t('recordBalance');
  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{card.label}</p>
          {type !== 'BALANCE_CHECK' && (
            <div className="space-y-1.5">
              <Label htmlFor="tx_amount">{type === 'TOPUP' ? t('amountTopup') : t('amountToll')}</Label>
              <RupiahInput id="tx_amount" value={amount} onChange={setAmount} autoFocus />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="tx_balance">{type === 'BALANCE_CHECK' ? t('balanceNow') : t('balanceAfterLabel')}</Label>
            <RupiahInput id="tx_balance" value={balanceAfter} onChange={setBalanceAfter} autoFocus={type === 'BALANCE_CHECK'} />
            {type === 'TOPUP' && <p className="text-xs text-gray-400">{t('balanceAfterHint')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx_when">{t('when')}</Label>
            <Input id="tx_when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            <p className="text-xs text-gray-400">{t('whenHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx_note">{t('note')}</Label>
            <Textarea id="tx_note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={close} disabled={add.isPending}>
              {t('cancel')}
            </Button>
            <Button onClick={save} disabled={add.isPending}>
              {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
