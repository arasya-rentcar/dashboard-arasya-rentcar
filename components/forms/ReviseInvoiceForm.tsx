'use client';

import { useState } from 'react';
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
import { RupiahInput } from '@/components/forms/RupiahInput';
import CreditApplyField from '@/components/invoices/CreditApplyField';
import { useClientRef } from '@/hooks/useClientRef';
import { invoiceCredit, invoiceGross } from '@/lib/invoiceMoney';
import { Invoice, OrderMoney, PaymentMethod, ReviseInvoiceInput } from '@/types';
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
  money: OrderMoney;
  // Resolves true when the revision was made (the next one gets a new client_ref).
  onSubmit: (data: ReviseInvoiceInput) => Promise<boolean>;
  isLoading: boolean;
}

const METHOD_OPTIONS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'CASH', labelKey: 'methodCash' },
  { value: 'BANK_TRANSFER', labelKey: 'methodBankTransfer' },
  { value: 'QRIS', labelKey: 'methodQris' },
  { value: 'OTHER', labelKey: 'methodOther' },
];

export default function ReviseInvoiceForm({ invoice, money, onSubmit, isLoading }: Props) {
  const t = useTranslations('reviseInvoice');
  // Mounted only while the dialog is open: one client_ref per opening.
  const [clientRef, renewClientRef] = useClientRef(true);
  const [applyCredit, setApplyCredit] = useState(true);
  const [amountError, setAmountError] = useState<string | null>(null);

  // The revision replaces this invoice: its cash leaves the open bills and
  // its saldo lebih comes back (API reviseInvoice), so both are available again.
  const oldGross = invoiceGross(invoice);
  const oldCredit = invoiceCredit(invoice);
  const maxGross = Math.max(0, money.billable_remaining) + oldGross;
  const creditAvailable = money.credit_balance + oldCredit;
  const isDp = invoice.invoice_type === 'DP';

  const {
    handleSubmit,
    control,
    register,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      // The API takes the gross (before saldo lebih), as on generate.
      amount: String(oldGross),
      payment_method: invoice.payment_method,
      note: invoice.note
        ? t('defaultNoteWith', { number: invoice.invoice_number, note: invoice.note })
        : t('defaultNote', { number: invoice.invoice_number }),
    },
  });
  const gross = Number(watch('amount') || 0);

  async function handleFormSubmit(values: FormValues) {
    const amount = Number(values.amount);
    if (amount > maxGross) {
      setAmountError(t('errExceedsBillable', { amount: formatCurrency(maxGross) }));
      return;
    }
    if (isDp && amount < money.min_dp) {
      setAmountError(t('errDpMin', { amount: formatCurrency(money.min_dp) }));
      return;
    }
    setAmountError(null);
    const ok = await onSubmit({
      amount,
      payment_method: values.payment_method,
      note: values.note || undefined,
      client_ref: clientRef,
      apply_credit: applyCredit,
    });
    if (ok) renewClientRef();
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
          <span className="font-semibold tabular-nums text-amber-900">{formatCurrency(oldGross)}</span>
        </div>
        {oldCredit > 0 && (
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-amber-700">{t('currentCredit')}</span>
            <span className="tabular-nums text-amber-900">−{formatCurrency(oldCredit)}</span>
          </div>
        )}
        <p className="text-xs text-amber-700 pt-1">
          {t('reviseHint')}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="revision_amount">{t('newAmount')}</Label>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <RupiahInput
              id="revision_amount"
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                setAmountError(null);
              }}
            />
          )}
        />
        {errors.amount && (
          <p className="text-xs text-red-500">{t(errors.amount.message ?? 'errAmountPositive')}</p>
        )}
        {amountError && <p className="text-xs text-red-500">{amountError}</p>}
        {isDp ? (
          <p className="text-xs text-gray-500">
            {t('dpHint', { amount: formatCurrency(money.min_dp), base: formatCurrency(money.base) })}
          </p>
        ) : (
          <p className="text-[11px] text-gray-400">{t('maxHint', { amount: formatCurrency(maxGross) })}</p>
        )}
      </div>

      <CreditApplyField
        id="revision_apply_credit"
        credit={creditAvailable}
        gross={gross}
        checked={applyCredit}
        onCheckedChange={setApplyCredit}
        alwaysPreview
      />

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
