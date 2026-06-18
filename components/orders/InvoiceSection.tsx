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
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
};

const TYPE_STYLES: Record<InvoiceType, string> = {
  DP: 'border-blue-200 text-blue-700 bg-blue-50',
  SETTLEMENT: 'border-amber-200 text-amber-700 bg-amber-50',
  FULL: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  ADDITIONAL: 'border-purple-200 text-purple-700 bg-purple-50',
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
  onOpenGenerate: () => void;
  onOpenAdditional?: () => void;
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
  onOpenGenerate,
  onOpenAdditional,
  onOpenRevise,
  onSend,
  onMarkPaid,
  sendingInvoiceId,
  payingInvoiceId,
}: Props) {
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
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
