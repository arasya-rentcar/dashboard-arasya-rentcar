// Centralized status style + i18n-key maps.
// Previously duplicated (and drifted) across orders/page, orders/[id]/page,
// and invoices/page — DP_PAID was amber in two places and blue in invoices.
// Single source of truth: DP_PAID = amber everywhere.
import { OrderStatus, PaymentStatus, InvoiceStatus, InvoiceType } from '@/types';

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  CREATED: 'bg-gray-100 text-gray-700 border-gray-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export const ORDER_STATUS_KEYS: Record<OrderStatus, string> = {
  CREATED: 'statusCreated',
  ASSIGNED: 'statusAssigned',
  IN_PROGRESS: 'statusInProgress',
  DONE: 'statusDone',
  CANCELLED: 'statusCancelled',
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-50 text-red-700 border-red-200',
  DP_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const PAYMENT_STATUS_KEYS: Record<string, string> = {
  UNPAID: 'payUnpaid',
  DP_PAID: 'payDpPaid',
  PAID: 'payPaid',
};

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  ISSUED: 'bg-amber-50 text-amber-700 border-amber-200',
  REVISED: 'bg-slate-50 text-slate-500 border-slate-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export const INVOICE_TYPE_STYLES: Record<InvoiceType, string> = {
  DP: 'border-blue-200 text-blue-700 bg-blue-50',
  SETTLEMENT: 'border-amber-200 text-amber-700 bg-amber-50',
  FULL: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  ADDITIONAL: 'border-purple-200 text-purple-700 bg-purple-50',
  COMBINED: 'border-indigo-200 text-indigo-700 bg-indigo-50',
};

export const INVOICE_TYPE_KEYS: Record<InvoiceType, string> = {
  DP: 'typeDP',
  SETTLEMENT: 'typeSettlement',
  FULL: 'typeFull',
  ADDITIONAL: 'typeAdditional',
  COMBINED: 'typeCombined',
};
