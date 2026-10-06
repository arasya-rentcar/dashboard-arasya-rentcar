'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
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
import { formatCurrency, wibDateTimeToIso } from '@/lib/utils';

const schema = z.object({
  invoice_type: z.enum(['DP', 'SETTLEMENT', 'FULL', 'ADDITIONAL', 'COMBINED']),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'OTHER']),
  amount: z
    .string()
    // Messages are i18n keys of `generateInvoice`, translated where shown.
    .min(1, 'errAmountRequired')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'errAmountPositive'),
  note: z.string().optional(),
  // Sprint 5: optional back-dated issue date (datetime-local string).
  issue_date: z.string().optional(),
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
    issue_date?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

// Rental-payment invoices only. Additional charges have their own dialog.
const TYPE_OPTIONS: { value: 'DP' | 'SETTLEMENT' | 'FULL'; key: 'typeDP' | 'typeSettlement' | 'typeFull' }[] = [
  { value: 'DP', key: 'typeDP' },
  { value: 'SETTLEMENT', key: 'typeSettlement' },
  { value: 'FULL', key: 'typeFull' },
];

const METHOD_OPTIONS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'CASH', labelKey: 'methodCash' },
  { value: 'BANK_TRANSFER', labelKey: 'methodBankTransfer' },
  { value: 'QRIS', labelKey: 'methodQris' },
  { value: 'OTHER', labelKey: 'methodOther' },
];

export default function GenerateInvoiceForm({
  finalPrice,
  alreadyPaid,
  onSubmit,
  isLoading,
}: Props) {
  const t = useTranslations('generateInvoice');
  const remaining = finalPrice - alreadyPaid;
  const isFullyPaid = remaining <= 0;

  // Guard: invoices must not exceed order.final_price. Extra charges (overtime,
  // parkir, etc.) should be added to the order final price first (Additional
  // Charges), which opens up remaining balance to bill as an ADDITIONAL invoice.
  const availableTypes = TYPE_OPTIONS.filter((t) => {
    if (isFullyPaid) return false;
    if (t.value === 'FULL' && alreadyPaid > 0) return false;
    if (t.value === 'SETTLEMENT' && alreadyPaid === 0) return false;
    return true;
  });

  // DP minimum = 20% of the rental (order total here is rental-only at booking).
  const minDp = Math.round(finalPrice * 0.2);

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
      issue_date: '',
    },
  });

  const invoiceType = watch('invoice_type');

  // Auto-fill amount based on type
  useEffect(() => {
    if (invoiceType === 'FULL') {
      setValue('amount', String(finalPrice));
    } else if (invoiceType === 'SETTLEMENT' || invoiceType === 'ADDITIONAL') {
      // Settlement and additional both bill the remaining balance.
      setValue('amount', String(Math.max(remaining, 0)));
    } else if (invoiceType === 'DP') {
      // Suggest the 20% minimum; admin can raise it (customer may pay more).
      setValue('amount', String(minDp));
    } else {
      setValue('amount', '');
    }
  }, [invoiceType, finalPrice, remaining, minDp, setValue]);

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      invoice_type: values.invoice_type as InvoiceType,
      payment_method: values.payment_method as PaymentMethod,
      amount: Number(values.amount),
      note: values.note || undefined,
      // The picker is WIB wall-clock time (whatever the browser timezone is);
      // omit when left blank (API defaults to now).
      issue_date: wibDateTimeToIso(values.issue_date),
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('orderTotal')}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(finalPrice)}</span>
        </div>
        {alreadyPaid > 0 && (
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-gray-500">{t('alreadyPaid')}</span>
            <span className="font-medium text-gray-700">{formatCurrency(alreadyPaid)}</span>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="text-gray-500">{t('remaining')}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(Math.max(remaining, 0))}</span>
        </div>
      </div>

      {/* Invoice Type */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_type">{t('invoiceType')}</Label>
        <Controller
          control={control}
          name="invoice_type"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="invoice_type" className="w-full">
                <SelectValue placeholder={t('selectType')} />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.key)}
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
        <Label htmlFor="invoice_method">{t('paymentMethod')}</Label>
        <Controller
          control={control}
          name="payment_method"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="invoice_method" className="w-full">
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

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_amount">{t('amountIDR')}</Label>
        <Input
          id="invoice_amount"
          type="number"
          inputMode="numeric"
          min={invoiceType === 'DP' ? minDp : 0}
          max={Math.max(remaining, 0)}
          {...register('amount')}
          readOnly={invoiceType === 'FULL'}
        />
        {errors.amount && (
          <p className="text-xs text-red-500">{t(errors.amount.message ?? 'errAmountPositive')}</p>
        )}
        {invoiceType === 'DP' && (
          <p className="text-xs text-gray-400">
            {t('dpHint', { amount: formatCurrency(minDp) })}
          </p>
        )}
        {invoiceType === 'SETTLEMENT' && (
          <p className="text-xs text-gray-400">{t('settlementHint')}</p>
        )}
        {invoiceType === 'ADDITIONAL' && (
          <p className="text-xs text-gray-400">
            {t('additionalHint')}
          </p>
        )}
      </div>

      {/* Issue date (optional back-date) */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_issue_date">{t('issueDate')}</Label>
        <Input
          id="invoice_issue_date"
          type="datetime-local"
          step={60}
          {...register('issue_date')}
        />
        <p className="text-[11px] text-gray-400">
          {t('issueDateHint')}
        </p>
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_note">{t('noteLabel')}</Label>
        <Input
          id="invoice_note"
          placeholder={t('notePlaceholder')}
          {...register('note')}
        />
      </div>

      {isFullyPaid && (
        <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md p-2">
          {t('fullyInvoiced')}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading || availableTypes.length === 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('generateBtn')}
        </Button>
      </div>
    </form>
  );
}
