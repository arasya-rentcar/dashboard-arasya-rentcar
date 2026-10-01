'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSendConfirmation } from '@/hooks/useSchedule';
import { openWaWindow, extractWaUrl, extractRecipientWaUrl } from '@/lib/waWindow';
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
  const tc = useTranslations('common');
  const [error, setError] = useState<string | null>(null);
  // Secondary links (driver / previous driver) from the last successful send.
  const [extra, setExtra] = useState<{ driver: string | null; old: string | null }>({
    driver: null,
    old: null,
  });
  const send = useSendConfirmation();

  // Internal lines need a driver + car; partner lines need the vendor's driver
  // name and a plate (typed on the line, or the vendor car's plate).
  if (line.is_external) {
    const partnerReady =
      Boolean(line.driver_name_raw?.trim()) &&
      Boolean(line.plate_raw?.trim() || line.external_car?.plate_number?.trim());
    if (!partnerReady) {
      return (
        <span className="text-[11px] text-amber-600 italic">
          {t('completePartner')}
        </span>
      );
    }
  } else if (!(Boolean(line.driver?.id) && Boolean(line.car?.id))) {
    return <span className="text-[11px] text-gray-300 italic">—</span>;
  }

  const state: ConfirmationState = line.confirmation_state ?? 'NOT_SENT';
  const badge = BADGE[state];
  const isBusy = send.isPending;

  const handle = async () => {
    setError(null);
    setExtra({ driver: null, old: null });
    const wa = openWaWindow();
    try {
      // Re-send (force) when already SENT or CHANGED; first send otherwise.
      const result = await send.mutateAsync({
        id: line.id,
        force: state !== 'NOT_SENT',
      });
      if (wa.finish(extractWaUrl(result))) toast.success(tc('waOpened'));
      setExtra({
        driver: extractRecipientWaUrl(result, 'driver'),
        old: extractRecipientWaUrl(result, 'old_driver_standdown'),
      });
    } catch (e: any) {
      wa.cancel();
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
      {extra.driver && (
        <a
          href={extra.driver}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          {t('alsoDriver')}
        </a>
      )}
      {extra.old && (
        <a
          href={extra.old}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-amber-700 underline underline-offset-2 hover:text-amber-800"
        >
          {t('notifyOldDriver')}
        </a>
      )}
      {error && <div className="text-[10px] text-red-600 max-w-[160px]">{error}</div>}
    </div>
  );
}
