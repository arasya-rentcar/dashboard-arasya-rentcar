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
import CreditApplyField from '@/components/invoices/CreditApplyField';
import { useClientRef } from '@/hooks/useClientRef';
import { GenerateInvoiceInput, PaymentMethod, OrderAdjustment, OrderMoney } from '@/types';
import { formatCurrency } from '@/lib/utils';

const METHOD_OPTIONS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'CASH', labelKey: 'methodCash' },
  { value: 'BANK_TRANSFER', labelKey: 'methodBankTransfer' },
  { value: 'QRIS', labelKey: 'methodQris' },
  { value: 'OTHER', labelKey: 'methodOther' },
];

interface Props {
  money: OrderMoney;
  adjustments: OrderAdjustment[];
  // Resolves true when the invoice was made (the next one gets a new client_ref).
  onSubmit: (data: GenerateInvoiceInput) => Promise<boolean>;
  isLoading: boolean;
}

export default function AdditionalInvoiceForm({
  money,
  adjustments,
  onSubmit,
  isLoading,
}: Props) {
  const t = useTranslations('additionalInvoice');
  // Mounted only while the dialog is open: one client_ref per opening.
  const [clientRef, renewClientRef] = useClientRef(true);
  const [applyCredit, setApplyCredit] = useState(true);
  // The most a new invoice may cover, from the API's money model.
  const remaining = Math.max(money.billable_remaining, 0);
  const alreadyBilled = money.covered + money.open_billed;
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
    const ok = await onSubmit({
      invoice_type: 'ADDITIONAL',
      payment_method: method,
      amount: amt,
      note: note.trim() || t('defaultNote'),
      client_ref: clientRef,
      apply_credit: applyCredit,
    });
    if (ok) renewClientRef();
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('orderTotal')}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(money.total)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('alreadyInvoiced')}</span>
          <span className="font-medium text-gray-700">{formatCurrency(alreadyBilled)}</span>
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

      <CreditApplyField
        id="additional_apply_credit"
        credit={money.credit_balance}
        gross={Number(amount || 0)}
        checked={applyCredit}
        onCheckedChange={setApplyCredit}
      />

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
