'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileText, ReceiptText, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFilePreview } from '@/components/preview/FilePreview';
import { OrderListItem, InvoiceType, InvoiceStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const KNOWN_STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'REVISED', 'PAID', 'CANCELLED'];

const TYPE_STYLES: Record<InvoiceType, string> = {
  DP: 'border-blue-200 text-blue-700 bg-blue-50',
  SETTLEMENT: 'border-amber-200 text-amber-700 bg-amber-50',
  FULL: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  ADDITIONAL: 'border-purple-200 text-purple-700 bg-purple-50',
  COMBINED: 'border-indigo-200 text-indigo-700 bg-indigo-50',
  CANCELLATION_FEE: 'border-red-200 text-red-700 bg-red-50',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-gray-200 text-gray-600 bg-gray-50',
  ISSUED: 'border-blue-200 text-blue-700 bg-blue-50',
  REVISED: 'border-slate-200 text-slate-500 bg-slate-50',
  PAID: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  CANCELLED: 'border-red-200 text-red-700 bg-red-50',
};

function isActive(status: InvoiceStatus) {
  return !['REVISED', 'CANCELLED'].includes(status);
}

export default function OrderInvoiceHistory({ order }: { order: OrderListItem }) {
  const t = useTranslations('invoiceHistoryTable');
  const { openPreview } = useFilePreview();
  const invoices = [...(order.invoices ?? [])].sort((a, b) => {
    const ta = new Date(a.issue_date ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.issue_date ?? b.created_at ?? 0).getTime();
    return ta - tb;
  });

  const finalPrice = Number(order.final_price);
  const activeInvoices = invoices.filter((i) => isActive(i.status));
  const totalInvoiced = activeInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.amount), 0);
  const remaining = finalPrice - totalPaid;

  return (
    <div className="bg-gray-50/60 px-4 py-4 sm:px-8">
      {/* Payment summary strip */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCell label={t('orderTotal')} value={formatCurrency(finalPrice)} />
        <SummaryCell label={t('invoiced')} value={formatCurrency(totalInvoiced)} />
        <SummaryCell label={t('paid')} value={formatCurrency(totalPaid)} tone="emerald" />
        <SummaryCell
          label={t('remaining')}
          value={formatCurrency(Math.max(remaining, 0))}
          tone={remaining <= 0 ? 'emerald' : 'amber'}
        />
      </div>

      {invoices.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-400">
          <FileText className="h-4 w-4" />
          {t('noInvoices')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500">
                <th className="px-3 py-2 text-left font-medium">{t('colInvoice')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('colType')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('colStatus')}</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">{t('colDate')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('colAmount')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('colDocs')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const active = isActive(inv.status);
                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-gray-50 last:border-0 ${active ? '' : 'opacity-60'}`}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {inv.invoice_number}
                      {(inv.revision ?? 0) > 0 && (
                        <span className="ml-1 text-amber-600">R{inv.revision}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[inv.invoice_type]}`}>
                        {t(`type.${inv.invoice_type as InvoiceType}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.ISSUED}`}>
                        {KNOWN_STATUSES.includes(inv.status) ? t(`status.${inv.status}`) : inv.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap hidden sm:table-cell">
                      {inv.status === 'PAID' && inv.paid_at
                        ? `${t('paidPrefix')} ${formatDate(inv.paid_at)}`
                        : inv.issue_date
                          ? formatDate(inv.issue_date)
                          : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {inv.file_url && (
                          <button
                            type="button"
                            onClick={() =>
                              openPreview({
                                url: inv.file_url!,
                                title: `${t('docInvoice')} ${inv.invoice_number}`,
                                kind: 'pdf',
                              })
                            }
                            className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-xs text-blue-600 hover:bg-blue-50 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {t('docInvoice')}
                          </button>
                        )}
                        {inv.receipt_url && (
                          <button
                            type="button"
                            onClick={() =>
                              openPreview({
                                url: inv.receipt_url!,
                                title: `${t('docReceipt')} ${inv.invoice_number}`,
                                kind: 'pdf',
                              })
                            }
                            className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-xs text-emerald-700 hover:bg-emerald-50 hover:underline"
                          >
                            <ReceiptText className="h-3.5 w-3.5" />
                            {t('docReceipt')}
                          </button>
                        )}
                        {!inv.file_url && !inv.receipt_url && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
        >
          {t('openFullOrder')} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'emerald' | 'amber';
}) {
  const toneCls =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-gray-900';
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className={`text-sm font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}
