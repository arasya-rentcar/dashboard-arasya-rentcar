'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useIsMutating } from '@tanstack/react-query';
import { AlertTriangle, Globe, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePublishPrices, useReloadPriceList } from '@/hooks/usePriceList';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import type { PriceListData } from '@/types';
import { DialogActions, DialogShell, isConflict } from './common';

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

/** Rates still marked "usulan" (from the API, or counted here when it does not say). */
export const proposalCount = (data: PriceListData) =>
  data.proposal_count ?? data.zones.reduce((n, z) => n + z.rates.filter((r) => r.is_proposal).length, 0);

/** Last publication, unpublished changes and "Terbitkan ke website". */
export default function PublishCard({ data, unsaved }: { data: PriceListData; unsaved: boolean }) {
  const t = useTranslations('priceList');
  const [open, setOpen] = useState(false);
  // One id per publication, kept across close/reopen: a retry after a lost answer
  // (timeout) publishes once. A new one only after a publish went through.
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());
  // Disabled while a change is being saved: the snapshot must hold it completely.
  const saving = useIsMutating() > 0;
  const last = data.last_publication;
  // A new last publication (this admin's, even when its answer was lost, or
  // another admin's) means the next publish is a new one.
  const [refAfter, setRefAfter] = useState(last?.id ?? null);
  if ((last?.id ?? null) !== refAfter) {
    setRefAfter(last?.id ?? null);
    setClientRef(crypto.randomUUID());
  }
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
        <div className="flex flex-col gap-1.5 sm:max-w-72 sm:items-end">
          <Button onClick={() => setOpen(true)} disabled={saving || unsaved} className="w-full sm:w-auto">
            <Send className="h-4 w-4" /> {t('publish')}
          </Button>
          {unsaved && <p className="text-xs text-amber-700 sm:text-right">{t('publishBlockedUnsaved')}</p>}
        </div>
      </CardContent>
      {open && (
        <PublishDialog
          pending={pending}
          first={!last}
          proposals={proposalCount(data)}
          clientRef={clientRef}
          onPublished={() => setClientRef(crypto.randomUUID())}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}

function PublishDialog({
  pending,
  first,
  proposals,
  clientRef,
  onPublished,
  onClose,
}: {
  pending: number;
  first: boolean;
  proposals: number;
  clientRef: string;
  onPublished: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('priceList');
  const publish = usePublishPrices();
  const reload = useReloadPriceList();
  const [note, setNote] = useState('');
  const [confirmProposals, setConfirmProposals] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      const { publication } = await publish.mutateAsync({
        note: note.trim() || undefined,
        client_ref: clientRef,
        confirm_proposals: proposals > 0 && confirmProposals ? true : undefined,
      });
      onPublished();
      if (publication.deploy_status === 'FAILED') toast.error(t('okPublishedFailed'), { duration: 15000 });
      else if (publication.deploy_status === 'SKIPPED') toast.success(t('okPublishedSkipped'));
      else toast.success(t('okPublished'));
      onClose();
    } catch (err) {
      // 409: proposal prices the admin has not confirmed (e.g. marked meanwhile by
      // another admin). The fresh count then shows here with its checkbox.
      if (isConflict(err)) {
        setConfirmProposals(false);
        void reload();
      }
      setError(getErrorMessage(err));
    }
  }

  return (
    <DialogShell title={t('publishTitle')} onClose={onClose}>
      <p className="text-sm text-gray-600">{t('publishIntro')}</p>
      <p className={first || pending > 0 ? 'text-sm font-medium text-amber-700' : 'text-sm text-gray-500'}>
        {first ? t('firstPublish') : pending > 0 ? t('unpublished', { count: pending }) : t('publishNoChanges')}
      </p>
      {proposals > 0 && (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <p className="flex items-start gap-2 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('publishProposals', { count: proposals })}
          </p>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-400"
              checked={confirmProposals}
              onChange={(e) => setConfirmProposals(e.target.checked)}
            />
            {t('publishProposalsConfirm', { count: proposals })}
          </label>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="pub_note">{t('publishNote')}</Label>
        <Textarea id="pub_note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <DialogActions
        busy={publish.isPending}
        onClose={onClose}
        onConfirm={confirm}
        label={t('publish')}
        disabled={proposals > 0 && !confirmProposals}
      />
    </DialogShell>
  );
}
