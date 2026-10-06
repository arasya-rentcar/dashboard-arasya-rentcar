'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Invoice, PaymentMethod } from '@/types';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  amount: z
    .string()
    // Messages are i18n keys of `reviseInvoice`, translated where shown.
    .min(1, 'errAmountRequired')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'errAmountPositive'),
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

const METHOD_OPTIONS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'CASH', labelKey: 'methodCash' },
  { value: 'BANK_TRANSFER', labelKey: 'methodBankTransfer' },
  { value: 'QRIS', labelKey: 'methodQris' },
  { value: 'OTHER', labelKey: 'methodOther' },
];

export default function ReviseInvoiceForm({ invoice, onSubmit, isLoading }: Props) {
  const t = useTranslations('reviseInvoice');
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
      note: invoice.note
        ? t('defaultNoteWith', { number: invoice.invoice_number, note: invoice.note })
        : t('defaultNote', { number: invoice.invoice_number }),
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
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-amber-700">{t('currentInvoice')}</span>
          <span className="min-w-0 break-all font-mono font-semibold text-amber-900">{invoice.invoice_number}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-amber-700">{t('currentAmount')}</span>
          <span className="font-semibold text-amber-900">{formatCurrency(invoice.amount)}</span>
        </div>
        <p className="text-xs text-amber-700 pt-1">
          {t('reviseHint')}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="revision_amount">{t('newAmount')}</Label>
        <Input
          id="revision_amount"
          type="number"
          inputMode="numeric"
          min="0"
          {...register('amount')}
        />
        {errors.amount && (
          <p className="text-xs text-red-500">{t(errors.amount.message ?? 'errAmountPositive')}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="revision_method">{t('paymentMethod')}</Label>
        <Controller
          control={control}
          name="payment_method"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="revision_method" className="w-full">
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
          )}
        />
        {errors.payment_method && (
          <p className="text-xs text-red-500">{errors.payment_method.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="revision_note">{t('revisionNote')}</Label>
        <Input
          id="revision_note"
          placeholder={t('revisionReason')}
          {...register('note')}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('createRevision')}
        </Button>
      </div>
    </form>
  );
}
