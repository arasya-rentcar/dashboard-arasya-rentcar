'use client';

import { useState } from 'react';
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

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'OTHER', label: 'Other' },
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
    const amt = Number(amount || 0);
    setError('');
    if (!amt || amt <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    if (amt > remaining) {
      setError(
        `Amount exceeds remaining balance (${formatCurrency(remaining)}). Add the charge to the order first.`,
      );
      return;
    }
    await onSubmit({
      invoice_type: 'ADDITIONAL',
      payment_method: method,
      amount: amt,
      note: note.trim() || 'Additional charge',
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Order Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(finalPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Already Invoiced</span>
          <span className="font-medium text-gray-700">{formatCurrency(alreadyPaid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Available to bill</span>
          <span className="font-semibold text-gray-900">{formatCurrency(remaining)}</span>
        </div>
      </div>

      {remaining <= 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2">
          Nothing left to bill. Add an Additional Charge to the order first (it raises the order total), then come back here to invoice it.
        </p>
      )}

      {/* Pick a logged charge */}
      <div className="space-y-1.5">
        <Label>Charge</Label>
        <Select value={selectedId} onValueChange={handleSelectCharge}>
          <SelectTrigger>
            <SelectValue placeholder="Select a charge" />
          </SelectTrigger>
          <SelectContent>
            {billableAdjustments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.description || a.type} — {formatCurrency(Number(a.amount) * (a.quantity || 1))}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom amount…</SelectItem>
          </SelectContent>
        </Select>
        {billableAdjustments.length === 0 && (
          <p className="text-xs text-gray-400">
            No logged charges. Use “Add Additional” on the order first, or enter a custom amount.
          </p>
        )}
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <Label>Payment Method</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
          <SelectTrigger>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="additional_amount">Amount (IDR)</Label>
        <Input
          id="additional_amount"
          type="number"
          min="0"
          max={remaining}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Note / label */}
      <div className="space-y-1.5">
        <Label htmlFor="additional_note">Label / Note</Label>
        <Input
          id="additional_note"
          placeholder="e.g. Overtime 2 jam"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSubmit} disabled={isLoading || remaining <= 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Additional Invoice
        </Button>
      </div>
    </div>
  );
}
