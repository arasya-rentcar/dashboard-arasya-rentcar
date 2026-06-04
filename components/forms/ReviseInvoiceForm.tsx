'use client';

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
import { Invoice, PaymentMethod } from '@/types';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'OTHER']),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  invoice: Invoice;
  onSubmit: (data: {
    amount: number;
    payment_method?: PaymentMethod;
    note?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'OTHER', label: 'Other' },
];

export default function ReviseInvoiceForm({ invoice, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: String(Number(invoice.amount)),
      payment_method: invoice.payment_method,
      note: invoice.note ? `Revision of ${invoice.invoice_number}: ${invoice.note}` : `Revision of ${invoice.invoice_number}`,
    },
  });

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      amount: Number(values.amount),
      payment_method: values.payment_method,
      note: values.note || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-amber-700">Current invoice</span>
          <span className="font-mono font-semibold text-amber-900">{invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amber-700">Current amount</span>
          <span className="font-semibold text-amber-900">{formatCurrency(invoice.amount)}</span>
        </div>
        <p className="text-xs text-amber-700 pt-1">
          This will mark the current invoice as REVISED and create a new current invoice. Use the full latest order amount when syncing a price change.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="revision_amount">New Amount (IDR)</Label>
        <Input
          id="revision_amount"
          type="number"
          min="0"
          {...register('amount')}
        />
        {errors.amount && (
          <p className="text-xs text-red-500">{errors.amount.message}</p>
        )}
      </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="revision_note">Revision Note</Label>
        <Input
          id="revision_note"
          placeholder="Reason for revision"
          {...register('note')}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Revision
        </Button>
      </div>
    </form>
  );
}
