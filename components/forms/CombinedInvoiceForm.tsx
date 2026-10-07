'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientRef } from '@/hooks/useClientRef';
import { GenerateInvoiceInput, PaymentMethod, OrderAdjustment } from '@/types';
import { formatCurrency } from '@/lib/utils';

const METHOD_OPTIONS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'CASH', labelKey: 'methodCash' },
  { value: 'BANK_TRANSFER', labelKey: 'methodBankTransfer' },
  { value: 'QRIS', labelKey: 'methodQris' },
  { value: 'OTHER', labelKey: 'methodOther' },
];

interface Props {
  // Rental base = order final price minus billable additionals already folded in.
  rentalBase: number;
  adjustments: OrderAdjustment[];
  // Resolves true when the invoice was made (the next one gets a new client_ref).
  onSubmit: (data: GenerateInvoiceInput) => Promise<boolean>;
  isLoading: boolean;
}

export default function CombinedInvoiceForm({
  rentalBase,
  adjustments,
  onSubmit,
  isLoading,
}: Props) {
  const t = useTranslations('combinedInvoice');
  // Mounted only while the dialog is open: one client_ref per opening.
  const [clientRef, renewClientRef] = useClientRef(true);
  const billable = adjustments.filter((a) => a.is_billable);
  const additionalsTotal = billable.reduce(
    (sum, a) => sum + Number(a.amount) * (a.quantity || 1),
    0,
  );
  const grandTotal = rentalBase + additionalsTotal;

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState<string>('');

  async function handleSubmit() {
    if (isLoading) return;
    const ok = await onSubmit({
      invoice_type: 'COMBINED',
      payment_method: method,
      amount: grandTotal,
      note: note.trim() || undefined,
      client_ref: clientRef,
    });
    if (ok) renewClientRef();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {t('intro')}
      </p>

      {/* Breakdown */}
      <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 space-y-1.5 text-sm">
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('rental')}</span>
          <span className="font-medium text-gray-800">{formatCurrency(rentalBase)}</span>
        </div>

        {billable.length > 0 ? (
          <div className="space-y-1 border-t border-gray-200 pt-1.5">
            {billable.map((a) => (
              <div key={a.id} className="flex justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-gray-500" title={a.description || a.type}>
                  + {a.description || a.type}
                  {(a.quantity || 1) > 1 ? ` ×${a.quantity}` : ''}
                </span>
                <span className="shrink-0 text-gray-600 tabular-nums">
                  {formatCurrency(Number(a.amount) * (a.quantity || 1))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-gray-200 pt-1.5 text-xs text-gray-400">
            {t('noBillable')}
          </p>
        )}

        <div className="flex flex-wrap justify-between gap-x-3 border-t border-gray-200 pt-1.5">
          <span className="font-medium text-gray-600">{t('additionalCharges')}</span>
          <span className="font-medium text-gray-800">{formatCurrency(additionalsTotal)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3 border-t border-gray-300 pt-1.5">
          <span className="font-semibold text-gray-900">{t('grandTotal')}</span>
          <span className="text-base font-bold text-indigo-700">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <Label htmlFor="combined_method">{t('paymentMethod')}</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
          <SelectTrigger id="combined_method" className="w-full">
            <SelectValue placeholder={t('selectMethod')} />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {t(m.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Optional note */}
      <div className="space-y-1.5">
        <Label htmlFor="combined_note">{t('noteOptional')}</Label>
        <Input
          id="combined_note"
          placeholder={t('notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || grandTotal <= 0}
          className="h-auto min-h-9 w-full whitespace-normal bg-indigo-600 py-2 text-center leading-tight hover:bg-indigo-700 sm:w-auto"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('generateBtn')} — {formatCurrency(grandTotal)}
        </Button>
      </div>
    </div>
  );
}
