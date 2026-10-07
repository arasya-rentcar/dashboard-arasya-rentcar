'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvoiceType, PaymentMethod, OrderAdjustment } from '@/types';
import { formatCurrency } from '@/lib/utils';

const METHOD_OPTIONS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'CASH', labelKey: 'methodCash' },
  { value: 'BANK_TRANSFER', labelKey: 'methodBankTransfer' },
  { value: 'QRIS', labelKey: 'methodQris' },
  { value: 'OTHER', labelKey: 'methodOther' },
];

interface Props {
  finalPrice: number;
  alreadyPaid: number;
  adjustments: OrderAdjustment[];
  onSubmit: (data: {
    invoice_type: InvoiceType;
    payment_method: PaymentMethod;
    amount: number;
    note?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export default function AdditionalInvoiceForm({
  finalPrice,
  alreadyPaid,
  adjustments,
  onSubmit,
  isLoading,
}: Props) {
  const t = useTranslations('additionalInvoice');
  const remaining = Math.max(finalPrice - alreadyPaid, 0);
  const billableAdjustments = adjustments.filter((a) => a.is_billable);

  const [selectedId, setSelectedId] = useState<string>('custom');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState<string>(String(remaining || ''));
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  function handleSelectCharge(id: string) {
    setSelectedId(id);
    if (id === 'custom') {
      setAmount(String(remaining || ''));
      setNote('');
      return;
    }
    const adj = billableAdjustments.find((a) => a.id === id);
    if (adj) {
      setAmount(String(Number(adj.amount) * (adj.quantity || 1)));
      setNote(adj.description || adj.type);
    }
  }

  async function handleSubmit() {
    if (isLoading) return;
    const amt = Number(amount || 0);
    setError('');
    if (!amt || amt <= 0) {
      setError(t('errAmountPositive'));
      return;
    }
    if (amt > remaining) {
      setError(t('errExceedsBalance', { amount: formatCurrency(remaining) }));
      return;
    }
    await onSubmit({
      invoice_type: 'ADDITIONAL',
      payment_method: method,
      amount: amt,
      note: note.trim() || t('defaultNote'),
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('orderTotal')}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(finalPrice)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('alreadyInvoiced')}</span>
          <span className="font-medium text-gray-700">{formatCurrency(alreadyPaid)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('availableToBill')}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(remaining)}</span>
        </div>
      </div>

      {remaining <= 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2">
          {t('nothingToBill')}
        </p>
      )}

      {/* Pick a logged charge */}
      <div className="space-y-1.5">
        <Label htmlFor="additional_charge">{t('charge')}</Label>
        <Select value={selectedId} onValueChange={handleSelectCharge}>
          <SelectTrigger id="additional_charge" className="w-full min-w-0">
            <SelectValue placeholder={t('selectCharge')} />
          </SelectTrigger>
          <SelectContent>
            {billableAdjustments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.description || a.type} — {formatCurrency(Number(a.amount) * (a.quantity || 1))}
              </SelectItem>
            ))}
            <SelectItem value="custom">{t('customAmount')}</SelectItem>
          </SelectContent>
        </Select>
        {billableAdjustments.length === 0 && (
          <p className="text-xs text-gray-400">
            {t('noLoggedCharges')}
          </p>
        )}
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <Label htmlFor="additional_method">{t('paymentMethod')}</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
          <SelectTrigger id="additional_method" className="w-full">
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

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="additional_amount">{t('amountIDR')}</Label>
        <Input
          id="additional_amount"
          type="number"
          inputMode="numeric"
          min="0"
          max={remaining}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Note / label */}
      <div className="space-y-1.5">
        <Label htmlFor="additional_note">{t('labelNote')}</Label>
        <Input
          id="additional_note"
          placeholder={t('notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSubmit} disabled={isLoading || remaining <= 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('generateBtn')}
        </Button>
      </div>
    </div>
  );
}
