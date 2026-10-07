import type { Invoice, OrderMoney, PaymentStatus } from '@/types';

// Per-invoice money as the API defines it (finance design §2). Order-level
// figures come from `order.money` and are never recomputed here.

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const isActiveInvoice = (inv: Pick<Invoice, 'status'>) =>
  !['REVISED', 'CANCELLED'].includes(inv.status);

/** Saldo lebih used to pay part of the invoice. */
export const invoiceCredit = (inv: Invoice) => num(inv.credit_applied);

/** Cash asked from the customer. */
export const invoiceCash = (inv: Invoice) => num(inv.amount);

/** The part of the order total the invoice covers (cash asked + saldo lebih used). */
export const invoiceGross = (inv: Invoice) =>
  inv.gross ?? invoiceCash(inv) + invoiceCredit(inv);

/** Money taken on mark-paid; null while unpaid (or on old rows without it). */
export const invoiceReceived = (inv: Invoice): number | null =>
  inv.status === 'PAID' && inv.amount_received != null ? num(inv.amount_received) : null;

/** Paid but short: cash asked − received. */
export function invoiceShortfall(inv: Invoice): number {
  if (inv.shortfall != null) return inv.shortfall;
  const got = invoiceReceived(inv);
  return got == null ? 0 : Math.max(0, invoiceCash(inv) - got);
}

/** Paid more than asked: the excess went to saldo lebih. */
export function invoiceOverpayment(inv: Invoice): number {
  const got = invoiceReceived(inv);
  return got == null ? 0 : Math.max(0, got - invoiceCash(inv));
}

/** A PAID invoice that saldo lebih paid in full (no transfer). */
export const paidFromCredit = (inv: Invoice) =>
  inv.status === 'PAID' && invoiceCash(inv) === 0 && invoiceCredit(inv) > 0;

/**
 * What an "Invoice Penyesuaian" for `inv` may still bill: its shortfall less
 * what active adjustments of it already bill (the API's adjustmentRoom).
 */
export function adjustmentRoom(inv: Invoice, invoices: Invoice[]): number {
  const short = invoiceShortfall(inv);
  if (short <= 0) return 0;
  const billed = invoices
    .filter((x) => x.invoice_type === 'ADJUSTMENT' && x.adjusts_invoice_id === inv.id && isActiveInvoice(x))
    .reduce((s, x) => s + invoiceGross(x), 0);
  return Math.max(0, short - billed);
}

/**
 * Preview only (the API decides): the order's payment status once `received`
 * more money is recorded. Same rule as the API's paymentStatusFor on Net.
 */
export function paymentStatusAfter(money: OrderMoney, received: number): PaymentStatus {
  const net = money.net_paid + received;
  if (money.total > 0 && net >= money.total) return 'PAID';
  if (net > 0 && net >= money.min_dp) return 'DP_PAID';
  return 'UNPAID';
}
