'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSendConfirmation } from '@/hooks/useSchedule';
import { ScheduleLine, ConfirmationState } from '@/types';

const BADGE: Record<
  ConfirmationState,
  { key: 'notSent' | 'sent' | 'changed'; cls: string; icon?: React.ReactNode }
> = {
  NOT_SENT: {
    key: 'notSent',
    cls: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  SENT: {
    key: 'sent',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Check className="h-3 w-3" />,
  },
  CHANGED: {
    key: 'changed',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export default function ConfirmationCell({ line }: { line: ScheduleLine }) {
  const t = useTranslations('confirmation');
  const [error, setError] = useState<string | null>(null);
  const send = useSendConfirmation();

  // Only internal lines with a driver + car assigned can be confirmed.
  const assignable =
    !line.is_external && Boolean(line.driver?.id) && Boolean(line.car?.id);
  if (!assignable) {
    return <span className="text-[11px] text-gray-300 italic">—</span>;
  }

  const state: ConfirmationState = line.confirmation_state ?? 'NOT_SENT';
  const badge = BADGE[state];
  const isBusy = send.isPending;

  const handle = async () => {
    setError(null);
    try {
      // Re-send (force) when already SENT or CHANGED; first send otherwise.
      await send.mutateAsync({ id: line.id, force: state !== 'NOT_SENT' });
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || t('sendFailed'),
      );
    }
  };

  const btnLabel =
    state === 'CHANGED'
      ? t('sendChanges')
      : state === 'SENT'
        ? t('resend')
        : t('sendToCustomer');

  return (
    <div className="space-y-1">
      <Badge
        variant="outline"
        className={`text-[10px] inline-flex items-center gap-1 ${badge.cls}`}
      >
        {badge.icon}
        {t(badge.key)}
      </Badge>
      <div>
        <Button
          size="sm"
          variant={state === 'CHANGED' ? 'default' : 'outline'}
          className="h-7 text-[11px] px-2"
          disabled={isBusy}
          onClick={handle}
        >
          {isBusy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          <span className="ml-1">{btnLabel}</span>
        </Button>
      </div>
      {error && <div className="text-[10px] text-red-600 max-w-[160px]">{error}</div>}
    </div>
  );
}
