'use client';

import {
  FileText,
  Download,
  Plus,
  PencilLine,
  Eye,
  RefreshCw,
  Send,
  CheckCircle2,
  ReceiptText,
  FileSpreadsheet,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ordersApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Invoice, InvoiceType, PaymentMethod } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const TYPE_LABELS: Record<InvoiceType, string> = {
  DP: 'DP',
  SETTLEMENT: 'Settlement',
  FULL: 'Full',
  ADDITIONAL: 'Additional',
  COMBINED: 'Gabungan',
};

const TYPE_STYLES: Record<InvoiceType, string> = {
  DP: 'border-blue-200 text-blue-700 bg-blue-50',
  SETTLEMENT: 'border-amber-200 text-amber-700 bg-amber-50',
  FULL: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  ADDITIONAL: 'border-purple-200 text-purple-700 bg-purple-50',
  COMBINED: 'border-indigo-200 text-indigo-700 bg-indigo-50',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-gray-200 text-gray-600 bg-gray-50',
  ISSUED: 'border-blue-200 text-blue-700 bg-blue-50',
  REVISED: 'border-slate-200 text-slate-500 bg-slate-50',
  PAID: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  CANCELLED: 'border-red-200 text-red-700 bg-red-50',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  QRIS: 'QRIS',
  OTHER: 'Other',
};

interface Props {
  invoices: Invoice[];
  finalPrice: number;
  orderId: string;
  onOpenGenerate: () => void;
  onOpenAdditional?: () => void;
  onOpenCombined?: () => void;
  onOpenRevise: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onMarkPaid?: (invoice: Invoice) => void;
  sendingInvoiceId?: string | null;
  payingInvoiceId?: string | null;
}

function isActiveInvoice(invoice: Invoice) {
  return !['REVISED', 'CANCELLED'].includes(invoice.status);
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
  finalPrice,
  orderId,
  onOpenGenerate,
  onOpenAdditional,
  onOpenCombined,
  onOpenRevise,
  onSend,
  onMarkPaid,
  sendingInvoiceId,
  payingInvoiceId,
}: Props) {
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [proofLoadingId, setProofLoadingId] = useState<string | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Sprint 3: fetch a short-lived signed URL for the payment proof and open it.
  async function handleViewProof(inv: Invoice) {
    setProofLoadingId(inv.id);
    try {
      const res = await ordersApi.getPaymentProof(orderId, inv.id);
      const url = res.data?.data?.url as string | undefined;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else toast.error('Bukti pembayaran tidak ditemukan.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProofLoadingId(null);
    }
  }
  const [statementOpen, setStatementOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      toast.error('Pilih minimal satu invoice');
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
        window.open(url, '_blank', 'noopener,noreferrer');
        setStatementOpen(false);
      } else {
        toast.error('Statement URL not returned');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatementLoading(false);
    }
  }
  const activeInvoices = invoices.filter(isActiveInvoice);
  const currentInvoice = latestActiveInvoice(invoices);
  const totalPaid = activeInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const remaining = finalPrice - totalPaid;
  const isFullyPaid = remaining <= 0;
  const isOverInvoiced = totalPaid > finalPrice;
  const hasInvoice = invoices.length > 0;

  return (
    <div className="space-y-4">
      {/* Payment summary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Order Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(finalPrice)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Active Invoice</span>
          <span className="font-medium text-gray-700">{formatCurrency(totalPaid)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Remaining</span>
          <span className={`font-semibold ${isOverInvoiced ? 'text-red-600' : isFullyPaid ? 'text-emerald-600' : 'text-gray-900'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {isOverInvoiced && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-2 text-xs text-red-700">
          Active invoice total exceeds order final price. Revise invoices or edit order price.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={onOpenGenerate}>
          <Plus className="h-4 w-4" />
          Invoice Rental
        </Button>
        {onOpenAdditional && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-purple-700 border-purple-200 hover:bg-purple-50"
            onClick={onOpenAdditional}
          >
            <Plus className="h-4 w-4" />
            Invoice Additional
          </Button>
        )}
      </div>

      {onOpenCombined && !hasInvoice && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          onClick={onOpenCombined}
        >
          <Plus className="h-4 w-4" />
          Invoice Gabungan (Rental + Additional)
        </Button>
      )}

      {hasInvoice && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-slate-700 border-slate-300 hover:bg-slate-50"
          onClick={openStatementPicker}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Statement Gabungan (Pilih Invoice)
        </Button>
      )}

      {hasInvoice && remaining > 0 && !isOverInvoiced && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs text-amber-700">
          Order total is higher than invoice. Click <span className="font-medium">Sync Current Invoice</span> to create a revised full invoice.
        </div>
      )}

      {isFullyPaid && invoices.length > 0 && !isOverInvoiced && (
        <p className="text-xs text-emerald-600 text-center font-medium">
          Fully invoiced. Add charges by editing final price, then sync the invoice.
        </p>
      )}

      {/* Invoice list */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Invoices</p>
            <span className="text-xs text-gray-400">{invoices.length} total</span>
          </div>

          {invoices.map((inv) => {
            const active = isActiveInvoice(inv);
            const current = currentInvoice?.id === inv.id;
            return (
              <div
                key={inv.id}
                className={`rounded-xl border p-3 space-y-3 ${
                  current ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${current ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-mono truncate" title={inv.invoice_number}>
                        {shortInvoiceNumber(inv.invoice_number)}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(inv.issue_date)}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {current && (
                        <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700">
                          Current
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[inv.invoice_type]}`}>
                        {TYPE_LABELS[inv.invoice_type]}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.ISSUED}`}>
                        {inv.status}
                      </Badge>
                      {inv.status === 'PAID' && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-100 text-emerald-800 gap-0.5">
                          <ReceiptText className="h-2.5 w-2.5" />
                          Kwitansi
                        </Badge>
                      )}
                      {inv.due_date && inv.status !== 'PAID' && (
                        <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700">
                          Due {formatDate(inv.due_date)}
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
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400">Amount</p>
                      <p className="text-lg font-bold text-gray-900 leading-tight">{formatCurrency(inv.amount)}</p>
                    </div>
                    <p className="text-xs text-gray-500 text-right">via {METHOD_LABELS[inv.payment_method]}</p>
                  </div>
                </div>

                {!active && (
                  <p className="rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500">
                    Historical invoice — not counted in active total.
                  </p>
                )}

                {inv.note && <p className="text-xs text-gray-400 italic">{inv.note}</p>}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {inv.file_url && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setPreviewInvoice(inv)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                  )}
                  {inv.file_url && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={inv.file_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Invoice
                      </a>
                    </Button>
                  )}
                  {inv.receipt_url && (
                    <Button variant="outline" size="sm" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50" asChild>
                      <a href={inv.receipt_url} target="_blank" rel="noopener noreferrer">
                        <ReceiptText className="h-3.5 w-3.5 mr-1" />
                        Kwitansi
                      </a>
                    </Button>
                  )}
                  {inv.status === 'PAID' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={proofLoadingId === inv.id}
                      onClick={() => handleViewProof(inv)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {proofLoadingId === inv.id ? 'Membuka…' : 'Bukti Bayar'}
                    </Button>
                  )}
                  {active && onSend && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-blue-700 border-blue-200 hover:bg-blue-50"
                      disabled={sendingInvoiceId === inv.id}
                      onClick={() => onSend(inv)}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {sendingInvoiceId === inv.id ? 'Sending…' : 'Send'}
                    </Button>
                  )}
                  {active && inv.status !== 'PAID' && onMarkPaid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      disabled={payingInvoiceId === inv.id}
                      onClick={() => onMarkPaid(inv)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      {payingInvoiceId === inv.id ? 'Saving…' : 'Mark Paid'}
                    </Button>
                  )}
                  {active && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenRevise(inv)}>
                      <PencilLine className="h-3.5 w-3.5 mr-1" />
                      Revise
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
          <p className="text-xs text-gray-400">No invoices generated yet</p>
        </div>
      )}

      {/* Statement invoice picker */}
      <Dialog open={statementOpen} onOpenChange={(open) => !statementLoading && setStatementOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4 text-slate-600" />
              Statement Gabungan
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">
            Pilih invoice yang ingin digabungkan ke dalam statement. Semua
            terpilih secara default.
          </p>

          <div className="flex items-center justify-between border-y border-gray-100 py-2">
            <span className="text-xs font-medium text-gray-500">
              {selectedIds.length} / {invoices.length} dipilih
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setSelectedIds(invoices.map((i) => i.id))}
              >
                Pilih semua
              </button>
              <button
                type="button"
                className="text-xs text-gray-500 hover:underline"
                onClick={() => setSelectedIds([])}
              >
                Kosongkan
              </button>
            </div>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto py-1">
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
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-mono text-xs font-medium text-gray-900" title={inv.invoice_number}>
                        {shortInvoiceNumber(inv.invoice_number)}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[inv.invoice_type]}`}>
                        {TYPE_LABELS[inv.invoice_type]}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.ISSUED}`}>
                        {inv.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-400">{formatDate(inv.issue_date)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-900">
                    {formatCurrency(inv.amount)}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setStatementOpen(false)} disabled={statementLoading}>
              Batal
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleGenerateStatement}
              disabled={statementLoading || selectedIds.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {statementLoading ? 'Membuat…' : 'Buat Statement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="w-[98vw] max-w-[1500px] h-[96vh] p-0 overflow-hidden flex flex-col gap-0">
          <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-white shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8 gap-3">
              <span className="truncate text-sm sm:text-base">Invoice Preview {previewInvoice ? `— ${previewInvoice.invoice_number}` : ''}</span>
              {previewInvoice?.file_url && (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a href={previewInvoice.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Open / Download
                  </a>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewInvoice?.file_url && (
            <div className="flex-1 min-h-0 bg-gray-100 p-2 sm:p-4">
              <iframe
                src={`${previewInvoice.file_url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`}
                title={`Invoice ${previewInvoice.invoice_number}`}
                className="w-full h-full rounded-lg border border-gray-200 bg-white shadow-sm"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
