'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { InvoiceType, PaymentMethod } from '@/types';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  invoice_type: z.enum(['DP', 'SETTLEMENT', 'FULL', 'ADDITIONAL']),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'OTHER']),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  finalPrice: number;
  alreadyPaid: number;
  onSubmit: (data: {
    invoice_type: InvoiceType;
    payment_method: PaymentMethod;
    amount: number;
    note?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: 'DP', label: 'Down Payment (DP)' },
  { value: 'SETTLEMENT', label: 'Settlement (Remaining Balance)' },
  { value: 'FULL', label: 'Full Payment' },
  { value: 'ADDITIONAL', label: 'Additional Charge' },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'OTHER', label: 'Other' },
];

export default function GenerateInvoiceForm({
  finalPrice,
  alreadyPaid,
  onSubmit,
  isLoading,
}: Props) {
  const remaining = finalPrice - alreadyPaid;
  const isFullyPaid = remaining <= 0;

  // Guard: invoices must not exceed order.final_price. Extra charges should update final_price first.
  const availableTypes = TYPE_OPTIONS.filter((t) => {
    if (isFullyPaid) return false;
    if (t.value === 'FULL' && alreadyPaid > 0) return false;
    if (t.value === 'SETTLEMENT' && alreadyPaid === 0) return false;
    if (t.value === 'ADDITIONAL') return false;
    return true;
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_type: availableTypes[0]?.value,
      payment_method: 'BANK_TRANSFER',
      amount: '',
      note: '',
    },
  });

  const invoiceType = watch('invoice_type');

  // Auto-fill amount based on type
  useEffect(() => {
    if (invoiceType === 'FULL') {
      setValue('amount', String(finalPrice));
    } else if (invoiceType === 'SETTLEMENT') {
      setValue('amount', String(remaining));
    } else {
      // DP / ADDITIONAL — leave empty for admin to enter
      setValue('amount', '');
    }
  }, [invoiceType, finalPrice, remaining, setValue]);

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      invoice_type: values.invoice_type as InvoiceType,
      payment_method: values.payment_method as PaymentMethod,
      amount: Number(values.amount),
      note: values.note || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Order Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(finalPrice)}</span>
        </div>
        {alreadyPaid > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Already Paid</span>
            <span className="font-medium text-gray-700">{formatCurrency(alreadyPaid)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Remaining</span>
          <span className="font-semibold text-gray-900">{formatCurrency(Math.max(remaining, 0))}</span>
        </div>
      </div>

      {/* Invoice Type */}
      <div className="space-y-1.5">
        <Label>Invoice Type</Label>
        <Controller
          control={control}
          name="invoice_type"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.invoice_type && (
          <p className="text-xs text-red-500">{errors.invoice_type.message}</p>
        )}
      </div>

      {/* Payment Method */}
      <div className="space-y-1.5">
        <Label>Payment Method</Label>
        <Controller
          control={control}
          name="payment_method"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
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
          )}
        />
        {errors.payment_method && (
          <p className="text-xs text-red-500">{errors.payment_method.message}</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_amount">Amount (IDR)</Label>
        <Input
          id="invoice_amount"
          type="number"
          min="0"
          max={invoiceType === 'ADDITIONAL' ? undefined : Math.max(remaining, 0)}
          {...register('amount')}
          readOnly={invoiceType === 'FULL' || invoiceType === 'SETTLEMENT'}
        />
        {errors.amount && (
          <p className="text-xs text-red-500">{errors.amount.message}</p>
        )}
        {invoiceType === 'DP' && (
          <p className="text-xs text-gray-400">Enter the down payment amount received</p>
        )}
        {invoiceType === 'ADDITIONAL' && (
          <p className="text-xs text-gray-400">Extra charges must increase the order final price before invoicing</p>
        )}
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_note">Note (optional)</Label>
        <Input
          id="invoice_note"
          placeholder="e.g. Transfer via BCA"
          {...register('note')}
        />
      </div>

      {isFullyPaid && (
        <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md p-2">
          This order is fully invoiced. Edit the order final price first if you need to bill additional charges.
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading || availableTypes.length === 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Invoice
        </Button>
      </div>
    </form>
  );
}
