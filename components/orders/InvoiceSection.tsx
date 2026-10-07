'use client';

import {
  FileText,
  Plus,
  PencilLine,
  Eye,
  Send,
  CheckCircle2,
  ReceiptText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFilePreview } from '@/components/preview/FilePreview';
import { ordersApi } from '@/lib/api';
import { cn, getErrorMessage } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Invoice, InvoiceType, OrderMoney, PaymentMethod, InvoiceStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  adjustmentRoom,
  invoiceCredit,
  invoiceGross,
  invoiceOverpayment,
  invoiceReceived,
  invoiceShortfall,
  isActiveInvoice,
  paidFromCredit,
} from '@/lib/invoiceMoney';

const TYPE_KEYS: Record<InvoiceType, 'typeDP' | 'typeSettlement' | 'typeFull' | 'typeAdditional' | 'typeCombined' | 'typeCancellationFee' | 'typeAdjustment'> = {
  DP: 'typeDP',
  SETTLEMENT: 'typeSettlement',
  FULL: 'typeFull',
  ADDITIONAL: 'typeAdditional',
  COMBINED: 'typeCombined',
  CANCELLATION_FEE: 'typeCancellationFee',
  ADJUSTMENT: 'typeAdjustment',
};

const TYPE_STYLES: Record<InvoiceType, string> = {
  DP: 'border-blue-200 text-blue-700 bg-blue-50',
  SETTLEMENT: 'border-amber-200 text-amber-700 bg-amber-50',
  FULL: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  ADDITIONAL: 'border-purple-200 text-purple-700 bg-purple-50',
  COMBINED: 'border-indigo-200 text-indigo-700 bg-indigo-50',
  CANCELLATION_FEE: 'border-red-200 text-red-700 bg-red-50',
  ADJUSTMENT: 'border-teal-200 text-teal-700 bg-teal-50',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-gray-200 text-gray-600 bg-gray-50',
  ISSUED: 'border-blue-200 text-blue-700 bg-blue-50',
  REVISED: 'border-slate-200 text-slate-500 bg-slate-50',
  PAID: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  CANCELLED: 'border-red-200 text-red-700 bg-red-50',
};

const KNOWN_STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'REVISED', 'PAID', 'CANCELLED'];
const KNOWN_METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'QRIS', 'OTHER'];

// Buttons in this column may be narrower than their label (the invoice column
// is ~300px on desktop): let the label wrap inside the button instead of
// spilling out of it.
const WRAP_BTN = 'h-auto min-h-9 whitespace-normal py-1.5 text-center leading-tight';

interface Props {
  invoices: Invoice[];
  // The order's money (API rule set v3): every total / paid / owed figure.
  money: OrderMoney;
  orderId: string;
  onOpenGenerate: () => void;
  // "Tagih kekurangan": an Invoice Penyesuaian for an underpaid invoice.
  onBillShortfall?: (invoice: Invoice, room: number) => void;
  onOpenAdditional?: () => void;
  onOpenCombined?: () => void;
  onOpenRevise: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onSendReceipt?: (invoice: Invoice) => void;
  onMarkPaid?: (invoice: Invoice) => void;
  sendingInvoiceId?: string | null;
  sendingReceiptId?: string | null;
  payingInvoiceId?: string | null;
}

function latestActiveInvoice(invoices: Invoice[]) {
  return invoices
    .filter(isActiveInvoice)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function shortInvoiceNumber(invoiceNumber: string) {
  return invoiceNumber.length > 20 ? `${invoiceNumber.slice(0, 18)}…` : invoiceNumber;
}

export default function InvoiceSection({
  invoices,
  money,
  orderId,
  onOpenGenerate,
  onBillShortfall,
  onOpenAdditional,
  onOpenCombined,
  onOpenRevise,
  onSend,
  onSendReceipt,
  onMarkPaid,
  sendingInvoiceId,
  sendingReceiptId,
  payingInvoiceId,
}: Props) {
  const t = useTranslations('invoiceSection');
  const tc = useTranslations('common');
  const { openPreview } = useFilePreview();
  const [proofLoadingId, setProofLoadingId] = useState<string | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const statusLabel = (status: string) =>
    KNOWN_STATUSES.includes(status as InvoiceStatus) ? t(`status.${status as InvoiceStatus}`) : status;
  const methodLabel = (method: PaymentMethod) =>
    KNOWN_METHODS.includes(method) ? t(`method.${method}`) : method;

  function previewInvoice(inv: Invoice) {
    if (!inv.file_url) return;
    openPreview({ url: inv.file_url, title: t('invoiceTitle', { number: inv.invoice_number }), kind: 'pdf' });
  }

  // Every kwitansi of the invoice in one gallery, starting at the clicked one.
  function previewReceipts(inv: Invoice, startIndex = 0) {
    const items = (inv.receipts ?? [])
      .map((r) => ({
        url: r.file_url || inv.receipt_url || '',
        title: t('receiptTitle', { number: r.receipt_number }),
        kind: 'pdf' as const,
      }))
      .filter((i) => i.url);
    if (items.length) {
      openPreview(items, startIndex);
    } else if (inv.receipt_url) {
      openPreview({
        url: inv.receipt_url,
        title: t('receiptTitle', { number: inv.invoice_number }),
        kind: 'pdf',
      });
    }
  }

  // Fetch a short-lived signed URL for the payment proof, then show it in the
  // in-page viewer (no new tab, so no popup blocker after the await).
  async function handleViewProof(inv: Invoice) {
    setProofLoadingId(inv.id);
    try {
      const res = await ordersApi.getPaymentProof(orderId, inv.id);
      const url = res.data?.data?.url as string | undefined;
      if (url) openPreview({ url, title: t('proofTitle', { number: inv.invoice_number }) });
      else toast.error(t('proofNotFound'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProofLoadingId(null);
    }
  }

  // Open the picker with every invoice pre-selected (most common case = all).
  function openStatementPicker() {
    setSelectedIds(invoices.map((inv) => inv.id));
    setStatementOpen(true);
  }

  function toggleInvoice(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleGenerateStatement() {
    if (selectedIds.length === 0) {
      toast.error(t('selectAtLeastOne'));
      return;
    }
    setStatementLoading(true);
    try {
      // If every invoice is selected, send no ids (legacy = all) to keep it simple.
      const idsArg =
        selectedIds.length === invoices.length ? undefined : selectedIds;
      const res = await ordersApi.getStatement(orderId, idsArg);
      const url = res.data?.data?.statement_url;
      if (url) {
        setStatementOpen(false);
        openPreview({ url, title: t('statementCombined'), kind: 'pdf' });
      } else {
        toast.error(t('statementUrlMissing'));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatementLoading(false);
    }
  }

  const currentInvoice = latestActiveInvoice(invoices);
  // Every figure from the API's money model, never from invoice amounts.
  const billable = Math.max(0, money.billable_remaining);
  const isFullyPaid = billable <= 0;
  // INV-6 (paid + billed ≤ total) broken: the API refuses this, so it only
  // shows up on data from before the money model.
  const isOverInvoiced = money.covered + money.open_billed > money.total;
  const hasInvoice = invoices.length > 0;
  const numberOf = (id?: string | null) => invoices.find((i) => i.id === id)?.invoice_number ?? '';

  const summaryRow = (label: string, value: number, cls = 'font-medium text-gray-700') => (
    <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={cn('tabular-nums', cls)}>{formatCurrency(value)}</span>
    </div>
  );

  // Per-invoice money: saldo lebih used, money received, short / over paid.
  function moneyLines(inv: Invoice, compact: boolean) {
    const credit = invoiceCredit(inv);
    const received = invoiceReceived(inv);
    const short = invoiceShortfall(inv);
    const over = invoiceOverpayment(inv);
    const room = short > 0 ? adjustmentRoom(inv, invoices) : 0;
    const lines: React.ReactNode[] = [];
    if (credit > 0) {
      lines.push(
        <p key="credit" className="text-[11px] text-sky-700">
          {paidFromCredit(inv)
            ? t('paidFromCredit', { amount: formatCurrency(credit) })
            : t('creditDeducted', { gross: formatCurrency(invoiceGross(inv)), amount: formatCurrency(credit) })}
        </p>,
      );
    }
    if (received != null && !paidFromCredit(inv) && (short > 0 || over > 0 || !compact)) {
      lines.push(
        <p key="received" className="text-[11px] text-gray-500">
          {t('received', { amount: formatCurrency(received) })}
        </p>,
      );
    }
    if (over > 0) {
      lines.push(
        <p key="over" className="text-[11px] font-medium text-sky-700">
          {t('overpaid', { amount: formatCurrency(over) })}
        </p>,
      );
    }
    if (inv.invoice_type === 'ADJUSTMENT' && inv.adjusts_invoice_id) {
      lines.push(
        <p key="adj" className="break-all text-[11px] text-teal-700">
          {t('adjusts', { number: numberOf(inv.adjusts_invoice_id) })}
        </p>,
      );
    }
    if (short > 0) {
      lines.push(
        <div key="short" className="space-y-1.5">
          <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800">
            {t('shortBadge', { amount: formatCurrency(short) })}
          </Badge>
          {room > 0 && onBillShortfall ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('w-full border-teal-200 text-teal-700 hover:bg-teal-50', WRAP_BTN)}
              onClick={() => onBillShortfall(inv, room)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('billShortfall')}
            </Button>
          ) : room <= 0 ? (
            <p className="text-[11px] text-gray-500">{t('shortfallBilled')}</p>
          ) : null}
        </div>,
      );
    }
    return lines.length ? <div className="space-y-1">{lines}</div> : null;
  }

  return (
    <div className="@container space-y-4">
      {/* Payment summary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 space-y-2">
        {summaryRow(t('orderTotal'), money.total, 'font-semibold text-gray-900')}
        {summaryRow(t('receivedLabel'), money.received)}
        {summaryRow(t('refundedLabel'), money.refunded)}
        {summaryRow(t('creditLabel'), money.credit_balance, money.credit_balance > 0 ? 'font-medium text-sky-700' : 'font-medium text-gray-700')}
        <Separator />
        {summaryRow(
          t('outstandingLabel'),
          money.outstanding,
          money.outstanding > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-600',
        )}
        {summaryRow(t('billableLabel'), billable, 'font-semibold text-gray-900')}
        {money.open_billed > 0 && (
          <p className="text-[11px] text-gray-500">
            {t('openBilledHint', { amount: formatCurrency(money.open_billed) })}
          </p>
        )}
      </div>

      {isOverInvoiced && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-2 text-xs text-red-700">
          {t('overInvoiced')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 @xs:grid-cols-2">
        <Button type="button" variant="outline" size="sm" className={cn('w-full', WRAP_BTN)} onClick={onOpenGenerate}>
          <Plus className="h-4 w-4" />
          {t('invoiceRental')}
        </Button>
        {onOpenAdditional && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('w-full text-purple-700 border-purple-200 hover:bg-purple-50', WRAP_BTN)}
            onClick={onOpenAdditional}
          >
            <Plus className="h-4 w-4" />
            {t('invoiceAdditional')}
          </Button>
        )}
      </div>

      {onOpenCombined && !hasInvoice && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50', WRAP_BTN)}
          onClick={onOpenCombined}
        >
          <Plus className="h-4 w-4" />
          {t('invoiceCombined')}
        </Button>
      )}

      {hasInvoice && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('w-full text-slate-700 border-slate-300 hover:bg-slate-50', WRAP_BTN)}
          onClick={openStatementPicker}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {t('statementCombinedPick')}
        </Button>
      )}

      {hasInvoice && billable > 0 && !isOverInvoiced && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs text-amber-700">
          {t.rich('syncHint', { b: (chunks) => <span className="font-medium">{chunks}</span> })}
        </div>
      )}

      {isFullyPaid && invoices.length > 0 && !isOverInvoiced && (
        <p className="text-xs text-emerald-600 text-center font-medium">
          {t('fullyInvoicedHint')}
        </p>
      )}

      {/* Invoice list */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t('invoicesLabel')}</p>
            <span className="text-xs text-gray-400">{t('totalCount', { count: invoices.length })}</span>
          </div>

          {invoices.map((inv) => {
            const active = isActiveInvoice(inv);
            const current = currentInvoice?.id === inv.id;
            const receiptUrl = inv.receipts?.[0]?.file_url || inv.receipt_url;

            // Only the current/latest invoice shows as a full card. Every other
            // invoice (already paid, revised, historical) collapses into a
            // compact list row — number/type/status/amount + quick view buttons.
            if (!current) {
              return (
                <div
                  key={inv.id}
                  className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
                >
                  <div className="mt-0.5 h-7 w-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium text-gray-700" title={inv.invoice_number}>
                      {inv.invoice_number}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[inv.invoice_type]}`}>
                        {t(TYPE_KEYS[inv.invoice_type])}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.ISSUED}`}>
                        {statusLabel(inv.status)}
                      </Badge>
                      {(inv.revision ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                          R{inv.revision}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(inv.issue_date)}</p>
                    {active && <div className="mt-1">{moneyLines(inv, true)}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(inv.amount)}
                    </span>
                    <div className="flex items-center gap-1">
                      {inv.file_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title={t('viewInvoice')}
                          aria-label={t('viewInvoiceAria', { number: inv.invoice_number })}
                          onClick={() => previewInvoice(inv)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {receiptUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-emerald-700"
                          title={t('receipt')}
                          aria-label={t('viewReceiptAria', { number: inv.invoice_number })}
                          onClick={() => previewReceipts(inv)}
                        >
                          <ReceiptText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const proofLoading = proofLoadingId === inv.id;
            const sending = sendingInvoiceId === inv.id;
            const paying = payingInvoiceId === inv.id;

            return (
              <div
                key={inv.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-mono truncate" title={inv.invoice_number}>
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(inv.issue_date)}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700">
                        {t('current')}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[inv.invoice_type]}`}>
                        {t(TYPE_KEYS[inv.invoice_type])}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.ISSUED}`}>
                        {statusLabel(inv.status)}
                      </Badge>
                      {inv.status === 'PAID' && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-100 text-emerald-800 gap-0.5">
                          <ReceiptText className="h-2.5 w-2.5" />
                          {t('receipt')}
                        </Badge>
                      )}
                      {inv.due_date && inv.status !== 'PAID' && (
                        <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700">
                          {t('due', { date: formatDate(inv.due_date) })}
                        </Badge>
                      )}
                      {(inv.revision ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                          R{inv.revision}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-white/75 border border-gray-100 px-3 py-2">
                  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                    <div>
                      <p className="text-xs text-gray-400">{t('amount')}</p>
                      <p className="text-lg font-bold text-gray-900 leading-tight tabular-nums">{formatCurrency(inv.amount)}</p>
                    </div>
                    <p className="text-xs text-gray-500 text-right">{t('via', { method: methodLabel(inv.payment_method) })}</p>
                  </div>
                  {active && <div className="mt-1.5">{moneyLines(inv, false)}</div>}
                </div>

                {/* Kwitansi / receipt(s) tied to THIS invoice. Makes the
                    receipt -> invoice link explicit. */}
                {(inv.receipts && inv.receipts.length > 0) || inv.receipt_url ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 space-y-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ReceiptText className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                      <p
                        className="truncate text-[11px] font-semibold uppercase tracking-wide text-emerald-800"
                        title={t('receiptForInvoice', { number: inv.invoice_number })}
                      >
                        {t('receiptForInvoice', { number: shortInvoiceNumber(inv.invoice_number) })}
                      </p>
                    </div>
                    {inv.receipts && inv.receipts.length > 0 ? (
                      inv.receipts.map((rcpt, i) => (
                        <div key={rcpt.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-semibold text-emerald-900 truncate" title={rcpt.receipt_number}>
                              {rcpt.receipt_number}
                            </p>
                            <p className="text-[11px] text-emerald-700/80">
                              {formatCurrency(rcpt.amount)} · {formatDate(rcpt.payment_date)}
                            </p>
                          </div>
                          {(rcpt.file_url || inv.receipt_url) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              aria-label={t('viewReceiptAria', { number: rcpt.receipt_number })}
                              onClick={() => previewReceipts(inv, i)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t('view')}
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-emerald-700/80">{t('receiptAvailable')}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          aria-label={t('viewReceiptAria', { number: inv.invoice_number })}
                          onClick={() => previewReceipts(inv)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t('view')}
                        </Button>
                      </div>
                    )}
                    {onSendReceipt && inv.status === 'PAID' && receiptUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn('w-full text-emerald-700 border-emerald-300 hover:bg-emerald-100', WRAP_BTN)}
                        disabled={sendingReceiptId === inv.id}
                        onClick={() => onSendReceipt(inv)}
                      >
                        {sendingReceiptId === inv.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        {sendingReceiptId === inv.id ? t('sendingReceipt') : t('sendReceipt')}
                      </Button>
                    )}
                  </div>
                ) : null}

                {!active && (
                  <p className="rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500">
                    {t('historical')}
                  </p>
                )}

                {inv.note && <p className="text-xs text-gray-400 italic break-words">{inv.note}</p>}

                {/* Two columns in the narrow desktop column and on phones,
                    four once the section is wide (tablet, single column). */}
                <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
                  {inv.file_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('w-full', WRAP_BTN)}
                      onClick={() => previewInvoice(inv)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('viewInvoice')}
                    </Button>
                  )}
                  {/* Paid from saldo lebih: no transfer, so no proof on file. */}
                  {inv.status === 'PAID' && !paidFromCredit(inv) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('w-full', WRAP_BTN)}
                      disabled={proofLoading}
                      onClick={() => handleViewProof(inv)}
                    >
                      {proofLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {proofLoading ? t('opening') : t('paymentProof')}
                    </Button>
                  )}
                  {active && onSend && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('w-full text-blue-700 border-blue-200 hover:bg-blue-50', WRAP_BTN)}
                      disabled={sending}
                      onClick={() => onSend(inv)}
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {sending ? t('sending') : t('send')}
                    </Button>
                  )}
                  {active && inv.status !== 'PAID' && onMarkPaid && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50', WRAP_BTN)}
                      disabled={paying}
                      onClick={() => onMarkPaid(inv)}
                    >
                      {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {paying ? t('saving') : t('markPaid')}
                    </Button>
                  )}
                  {active && inv.status !== 'PAID' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('w-full', WRAP_BTN)}
                      onClick={() => onOpenRevise(inv)}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      {t('revise')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {invoices.length === 0 && (
        <div className="text-center py-4">
          <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">{t('noInvoices')}</p>
        </div>
      )}

      {/* Statement invoice picker */}
      <Dialog open={statementOpen} onOpenChange={(open) => !statementLoading && setStatementOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4 text-slate-600" />
              {t('statementCombined')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('statementPickHint')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-2 border-y border-gray-100 py-2">
            <span className="text-xs font-medium text-gray-500">
              {t('selectedCount', { selected: selectedIds.length, total: invoices.length })}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-blue-600"
                onClick={() => setSelectedIds(invoices.map((i) => i.id))}
              >
                {t('selectAll')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-gray-500"
                onClick={() => setSelectedIds([])}
              >
                {t('clearAll')}
              </Button>
            </div>
          </div>

          <div className="max-h-[45dvh] space-y-2 overflow-y-auto py-1">
            {invoices.map((inv) => {
              const checked = selectedIds.includes(inv.id);
              return (
                <label
                  key={inv.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition ${
                    checked ? 'border-slate-300 bg-slate-50' : 'border-gray-100 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleInvoice(inv.id)}
                    className="h-4 w-4 shrink-0 accent-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium text-gray-900" title={inv.invoice_number}>
                      {inv.invoice_number}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[inv.invoice_type]}`}>
                        {t(TYPE_KEYS[inv.invoice_type])}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.ISSUED}`}>
                        {statusLabel(inv.status)}
                      </Badge>
                      <span className="text-[11px] text-gray-400">{formatDate(inv.issue_date)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(inv.amount)}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setStatementOpen(false)} disabled={statementLoading}>
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={handleGenerateStatement}
              disabled={statementLoading || selectedIds.length === 0}
            >
              {statementLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {statementLoading ? t('creating') : t('createStatement')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
