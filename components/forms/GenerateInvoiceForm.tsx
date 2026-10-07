'use client';

import { useEffect, useState } from 'react';
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
import { RupiahInput } from '@/components/forms/RupiahInput';
import CreditApplyField from '@/components/invoices/CreditApplyField';
import { useClientRef } from '@/hooks/useClientRef';
import { GenerateInvoiceInput, OrderMoney, PaymentMethod } from '@/types';
import { formatCurrency, wibDateTimeToIso } from '@/lib/utils';

const schema = z.object({
  invoice_type: z.enum(['DP', 'SETTLEMENT', 'FULL', 'ADJUSTMENT']),
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
type FormType = FormValues['invoice_type'];

/** "Tagih kekurangan": an Invoice Penyesuaian for one underpaid invoice. */
export interface AdjustmentTarget {
  invoiceId: string;
  invoiceNumber: string;
  /** Its shortfall not billed yet. */
  room: number;
}

interface Props {
  money: OrderMoney;
  // Set → the form only makes an ADJUSTMENT for that invoice.
  adjustment?: AdjustmentTarget | null;
  // Resolves true when the invoice was made (the next one gets a new client_ref).
  onSubmit: (data: GenerateInvoiceInput) => Promise<boolean>;
  isLoading: boolean;
}

type TypeOption = { value: FormType; key: 'typeDP' | 'typeSettlement' | 'typeFull' | 'typeAdjustment' };

// Rental-payment invoices only. Additional charges have their own dialog;
// ADJUSTMENT only through "Tagih kekurangan".
const TYPE_OPTIONS: TypeOption[] = [
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

export default function GenerateInvoiceForm({ money, adjustment, onSubmit, isLoading }: Props) {
  const t = useTranslations('generateInvoice');
  // The form is mounted only while its dialog is open: one client_ref per
  // opening, reused on a retry, renewed after a success.
  const [clientRef, renewClientRef] = useClientRef(true);
  const [applyCredit, setApplyCredit] = useState(true);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Every figure comes from the API's money model (rule set v3).
  const billable = Math.max(0, money.billable_remaining);
  // Paid toward the total, or billed and not paid yet.
  const alreadyBilled = money.covered + money.open_billed;
  const isFullyBilled = billable <= 0;

  const availableTypes: TypeOption[] = adjustment
    ? [{ value: 'ADJUSTMENT', key: 'typeAdjustment' }]
    : TYPE_OPTIONS.filter((opt) => {
        if (isFullyBilled) return false;
        if (opt.value === 'FULL' && alreadyBilled > 0) return false;
        if (opt.value === 'SETTLEMENT' && alreadyBilled <= 0) return false;
        return true;
      });

  // The most this invoice may cover (gross). An adjustment is also capped by
  // the shortfall it bills, a DP by the rental price.
  const maxFor = (type: FormType | undefined) => {
    if (type === 'ADJUSTMENT') return Math.min(adjustment?.room ?? 0, billable);
    if (type === 'DP') return Math.min(billable, money.base);
    return billable;
  };

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
  const gross = Number(watch('amount') || 0);
  const max = maxFor(invoiceType);
  // DP: suggest the 20% minimum (the customer may pay more); the rest: all
  // that can still be billed.
  const suggested = invoiceType === 'DP' ? Math.min(money.min_dp, max) : max;

  useEffect(() => {
    if (!invoiceType) return;
    setValue('amount', suggested > 0 ? String(suggested) : '');
    setAmountError(null);
  }, [invoiceType, suggested, setValue]);

  async function handleFormSubmit(values: FormValues) {
    const amount = Number(values.amount);
    const cap = maxFor(values.invoice_type);
    if (amount > cap) {
      setAmountError(t('errExceedsBillable', { amount: formatCurrency(cap) }));
      return;
    }
    if (values.invoice_type === 'DP' && amount < money.min_dp) {
      setAmountError(t('errDpMin', { amount: formatCurrency(money.min_dp) }));
      return;
    }
    setAmountError(null);
    const ok = await onSubmit({
      invoice_type: values.invoice_type,
      payment_method: values.payment_method as PaymentMethod,
      amount,
      note: values.note || undefined,
      // The picker is WIB wall-clock time (whatever the browser timezone is);
      // omit when left blank (API defaults to now).
      issue_date: wibDateTimeToIso(values.issue_date),
      client_ref: clientRef,
      apply_credit: applyCredit,
      adjusts_invoice_id: adjustment?.invoiceId,
    });
    if (ok) renewClientRef();
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {adjustment ? (
        <div className="space-y-1 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-teal-800">{t('adjustsInvoice')}</span>
            <span className="min-w-0 break-all font-mono font-semibold text-teal-900">{adjustment.invoiceNumber}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-teal-800">{t('shortfallLeft')}</span>
            <span className="font-semibold tabular-nums text-teal-900">{formatCurrency(adjustment.room)}</span>
          </div>
          <p className="pt-1 text-xs text-teal-800">{t('adjustmentHint')}</p>
        </div>
      ) : (
        <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-gray-500">{t('orderTotal')}</span>
            <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(money.total)}</span>
          </div>
          {money.covered > 0 && (
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="text-gray-500">{t('alreadyPaid')}</span>
              <span className="font-medium tabular-nums text-gray-700">{formatCurrency(money.covered)}</span>
            </div>
          )}
          {money.open_billed > 0 && (
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="text-gray-500">{t('openBilled')}</span>
              <span className="font-medium tabular-nums text-gray-700">{formatCurrency(money.open_billed)}</span>
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-x-3">
            <span className="text-gray-500">{t('remaining')}</span>
            <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(billable)}</span>
          </div>
        </div>
      )}

      {/* Invoice Type */}
      {!adjustment && (
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
      )}

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

      {/* Amount = gross: the part of the order total this invoice covers. */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_amount">{t('amountIDR')}</Label>
        {invoiceType === 'FULL' ? (
          <Input id="invoice_amount" value={formatCurrency(gross)} readOnly className="tabular-nums" />
        ) : (
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <RupiahInput
                id="invoice_amount"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setAmountError(null);
                }}
              />
            )}
          />
        )}
        {errors.amount && (
          <p className="text-xs text-red-500">{t(errors.amount.message ?? 'errAmountPositive')}</p>
        )}
        {amountError && <p className="text-xs text-red-500">{amountError}</p>}
        {invoiceType === 'DP' && (
          <p className="text-xs text-gray-500">
            {t('dpHint', { amount: formatCurrency(money.min_dp), base: formatCurrency(money.base) })}
          </p>
        )}
        {invoiceType === 'SETTLEMENT' && (
          <p className="text-xs text-gray-400">{t('settlementHint')}</p>
        )}
        {invoiceType !== 'DP' && max > 0 && (
          <p className="text-[11px] text-gray-400">{t('maxHint', { amount: formatCurrency(max) })}</p>
        )}
      </div>

      <CreditApplyField
        id="invoice_apply_credit"
        credit={money.credit_balance}
        gross={gross}
        checked={applyCredit}
        onCheckedChange={setApplyCredit}
      />

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

      {!adjustment && isFullyBilled && (
        <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md p-2">
          {t('fullyInvoiced')}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading || availableTypes.length === 0 || max <= 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {adjustment ? t('generateAdjustmentBtn') : t('generateBtn')}
        </Button>
      </div>
    </form>
  );
}
