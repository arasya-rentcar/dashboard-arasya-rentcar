'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useIsMutating } from '@tanstack/react-query';
import { Globe, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePublishPrices } from '@/hooks/usePriceList';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import type { PriceListData } from '@/types';
import { DialogActions, DialogShell } from './common';

const STATUS_TINT: Record<string, string> = {
  SENT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  SKIPPED: 'border-gray-200 bg-gray-50 text-gray-600',
  FAILED: 'border-red-200 bg-red-50 text-red-700',
};

/** Deploy status in plain words. */
export function DeployStatus({ status }: { status: string }) {
  const t = useTranslations('priceList');
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${STATUS_TINT[status] ?? STATUS_TINT.SKIPPED}`}>
      {t(`deploy.${status}`)}
    </Badge>
  );
}

/** Last publication, unpublished changes and "Terbitkan ke website". */
export default function PublishCard({ data }: { data: PriceListData }) {
  const t = useTranslations('priceList');
  const [open, setOpen] = useState(false);
  // Disabled while a change is being saved: the snapshot must hold it completely.
  const saving = useIsMutating() > 0;
  const last = data.last_publication;
  const pending = data.unpublished_changes;

  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <Globe className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1 text-sm">
            {last ? (
              <>
                <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
                  {t('lastPublished', { at: formatDateTime(last.created_at) })}
                  <DeployStatus status={last.deploy_status} />
                </p>
                <p className="text-xs text-gray-500">
                  {t('publishedBy', { who: (last.published_by && data.users[last.published_by]) || '—' })}
                </p>
              </>
            ) : (
              <p className="font-semibold text-gray-900">{t('neverPublished')}</p>
            )}
            <p className={!last || pending > 0 ? 'text-xs font-medium text-amber-700' : 'text-xs text-gray-500'}>
              {!last ? t('neverPublishedHint') : pending > 0 ? t('unpublished', { count: pending }) : t('upToDate')}
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} disabled={saving} className="w-full sm:w-auto">
          <Send className="h-4 w-4" /> {t('publish')}
        </Button>
      </CardContent>
      {open && <PublishDialog pending={pending} first={!last} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function PublishDialog({ pending, first, onClose }: { pending: number; first: boolean; onClose: () => void }) {
  const t = useTranslations('priceList');
  const publish = usePublishPrices();
  const [note, setNote] = useState('');
  // One id per dialog: a double click or a retry after a lost answer publishes once.
  const [ref] = useState(() => crypto.randomUUID());

  async function confirm() {
    try {
      const { publication } = await publish.mutateAsync({ note: note.trim() || undefined, client_ref: ref });
      if (publication.deploy_status === 'FAILED') toast.error(t('okPublishedFailed'), { duration: 15000 });
      else if (publication.deploy_status === 'SKIPPED') toast.success(t('okPublishedSkipped'));
      else toast.success(t('okPublished'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <DialogShell title={t('publishTitle')} onClose={onClose}>
      <p className="text-sm text-gray-600">{t('publishIntro')}</p>
      <p className={first || pending > 0 ? 'text-sm font-medium text-amber-700' : 'text-sm text-gray-500'}>
        {first ? t('firstPublish') : pending > 0 ? t('unpublished', { count: pending }) : t('publishNoChanges')}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="pub_note">{t('publishNote')}</Label>
        <Textarea id="pub_note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <DialogActions busy={publish.isPending} onClose={onClose} onConfirm={confirm} label={t('publish')} />
    </DialogShell>
  );
}
