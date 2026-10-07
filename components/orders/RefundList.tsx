'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useFilePreview } from '@/components/preview/FilePreview';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils';
import type { OrderRefund } from '@/types';

/**
 * Refunds of one order, oldest first. The proof is a private file: each click
 * fetches a fresh 5-minute signed URL and shows it in the in-page viewer.
 */
export default function RefundList({ orderId, refunds }: { orderId: string; refunds: OrderRefund[] }) {
  const t = useTranslations('refund');
  const { openPreview } = useFilePreview();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function viewProof(r: OrderRefund, n: number) {
    setLoadingId(r.id);
    try {
      const res = await ordersApi.getRefundProof(orderId, r.id);
      const url = res.data?.data?.url as string | undefined;
      if (url) openPreview({ url, title: t('proofTitle', { n }) });
      else toast.error(t('proofNotFound'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <ul className="space-y-2">
      {refunds.map((r, i) => (
        <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(r.amount)}</p>
            <p className="text-[11px] text-gray-500">{formatDateTime(r.refunded_at)}</p>
            {r.note && <p className="mt-0.5 break-words text-xs text-gray-500">{r.note}</p>}
          </div>
          {r.has_proof && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 px-2.5"
              disabled={loadingId === r.id}
              aria-label={t('viewProofAria', { n: i + 1 })}
              onClick={() => viewProof(r, i + 1)}
            >
              {loadingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              {t('proof')}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
