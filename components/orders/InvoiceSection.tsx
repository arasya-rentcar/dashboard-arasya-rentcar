'use client';

import { FileText, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Invoice, InvoiceType, PaymentMethod } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const TYPE_LABELS: Record<InvoiceType, string> = {
  DP: 'Down Payment',
  SETTLEMENT: 'Settlement',
  FULL: 'Full Payment',
};

const TYPE_STYLES: Record<InvoiceType, string> = {
  DP: 'border-blue-200 text-blue-700 bg-blue-50',
  SETTLEMENT: 'border-amber-200 text-amber-700 bg-amber-50',
  FULL: 'border-emerald-200 text-emerald-700 bg-emerald-50',
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
}

export default function InvoiceSection({
  invoices,
  finalPrice,
  onOpenGenerate,
}: Props) {
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const remaining = finalPrice - totalPaid;
  const isFullyPaid = remaining <= 0;

  return (
    <div className="space-y-4">
      {/* Payment summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Order Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(finalPrice)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Paid</span>
          <span className="font-medium text-gray-700">{formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Remaining</span>
          <span className={`font-semibold ${isFullyPaid ? 'text-emerald-600' : 'text-gray-900'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      <Separator />

      {/* Generate button */}
      {!isFullyPaid && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onOpenGenerate}
        >
          <Plus className="h-4 w-4" />
          Generate Invoice
        </Button>
      )}

      {isFullyPaid && invoices.length > 0 && (
        <p className="text-xs text-emerald-600 text-center font-medium">
          Fully paid — all invoices generated
        </p>
      )}

      {/* Invoice list */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Invoices ({invoices.length})
          </p>
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="border border-gray-100 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-mono truncate">
                    {inv.invoice_number}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(inv.issue_date)}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${TYPE_STYLES[inv.invoice_type]}`}
                >
                  {TYPE_LABELS[inv.invoice_type]}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(inv.amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    via {METHOD_LABELS[inv.payment_method]}
                  </p>
                </div>
                {inv.file_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={inv.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      PDF
                    </a>
                  </Button>
                )}
              </div>

              {inv.note && (
                <p className="text-xs text-gray-400 italic">{inv.note}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {invoices.length === 0 && (
        <div className="text-center py-4">
          <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No invoices generated yet</p>
        </div>
      )}
    </div>
  );
}
