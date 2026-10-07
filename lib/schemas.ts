import { z } from 'zod';

/**
 * LENIENT response schemas for the top API DTOs the dashboard renders.
 *
 * Goal: catch GROSS FE/BE drift (a top-level field renamed/removed, a list that
 * stopped being a list) and surface it as a loud dev warning via parseResponse —
 * NOT strict shape policing. Hence `.passthrough()` everywhere and generous
 * optional/nullable. Tightening individual fields later is cheap; the point now
 * is to convert silent typed lies into locatable warnings.
 */

const nullableStr = z.string().nullable().optional();

export const orderListItemSchema = z
  .object({
    id: z.string(),
    customer_name: z.string().nullable().optional(),
    final_price: z.union([z.string(), z.number()]).nullable().optional(),
    order_status: z.string().nullable().optional(),
    payment_status: z.string().nullable().optional(),
  })
  .passthrough();

export const orderListSchema = z.array(orderListItemSchema);

const decimal = z.union([z.string(), z.number()]);

export const invoiceSchema = z
  .object({
    id: z.string(),
    invoice_number: nullableStr,
    amount: decimal.nullable().optional(),
    status: z.string().nullable().optional(),
    // Finance A1/A2: saldo lebih used, money actually received, the derived
    // gross / shortfall, and the invoice an ADJUSTMENT bills.
    credit_applied: decimal.nullable().optional(),
    amount_received: decimal.nullable().optional(),
    gross: z.number().optional(),
    shortfall: z.number().optional(),
    adjusts_invoice_id: nullableStr,
  })
  .passthrough();

/** `money` on GET /orders/:id and `order_money` on the money endpoints (rule set v3). */
export const orderMoneySchema = z
  .object({
    total: z.number(),
    base: z.number(),
    min_dp: z.number(),
    charges: z.number(),
    received: z.number(),
    refunded: z.number(),
    net_paid: z.number(),
    credit_balance: z.number(),
    covered: z.number(),
    open_billed: z.number(),
    billable_remaining: z.number(),
    outstanding: z.number(),
    payment_status: z.string(),
    start_ready: z.boolean(),
    rule: z.string(),
  })
  .passthrough();

export const orderRefundSchema = z
  .object({
    id: z.string(),
    amount: decimal,
    refunded_at: z.string(),
    note: nullableStr,
    has_proof: z.boolean(),
  })
  .passthrough();

export const orderCreditEntrySchema = z
  .object({
    kind: z.string(),
    amount: decimal,
    created_at: z.string(),
    note: nullableStr,
    invoice_number: nullableStr,
  })
  .passthrough();

export const orderDetailSchema = z
  .object({
    id: z.string(),
    customer_name: z.string().nullable().optional(),
    final_price: z.union([z.string(), z.number()]).nullable().optional(),
    order_status: z.string().nullable().optional(),
    payment_status: z.string().nullable().optional(),
    // Every money figure on the order page comes from here.
    money: orderMoneySchema,
    invoices: z.array(invoiceSchema).optional(),
    refunds: z.array(orderRefundSchema).optional(),
    credit_entries: z.array(orderCreditEntrySchema).optional(),
  })
  .passthrough();

export const createRefundResultSchema = z
  .object({
    refund: orderRefundSchema,
    order_money: orderMoneySchema.nullable(),
    outstanding_after: z.number(),
  })
  .passthrough();

export const markPaidResultSchema = invoiceSchema.extend({
  payment: z
    .object({
      received: z.number(),
      shortfall: z.number(),
      overpayment: z.number(),
      credit_added: z.number(),
    })
    .passthrough()
    .optional(),
  order_money: orderMoneySchema.nullable().optional(),
});

export const ordersSearchResultSchema = z
  .object({
    data: z.array(orderListItemSchema),
    pagination: z.object({}).passthrough().nullable().optional(),
    summary: z.object({}).passthrough().nullable().optional(),
  })
  .passthrough();

export const invoicesSearchResultSchema = z
  .object({
    data: z.array(invoiceSchema),
    pagination: z.object({}).passthrough().nullable().optional(),
  })
  .passthrough();

export const dashboardV2Schema = z
  .object({
    // Rule set v3: refunds leave the cash, saldo lebih is shown on its own.
    cash: z
      .object({
        collected: z.number(),
        refunded: z.number(),
        paid_out: z.number(),
        net_cash: z.number(),
      })
      .passthrough(),
    outstanding: z
      .object({
        ar_outstanding: z.number(),
        customer_credit: z.number(),
        ap_outstanding: z.number(),
      })
      .passthrough(),
  })
  .passthrough();

export const revenueReportSchema = z
  .object({
    internal_cars: z.unknown().optional(),
    vendor_margin: z.unknown().optional(),
  })
  .passthrough();

export const payablesResultSchema = z
  .object({
    items: z.array(z.object({}).passthrough()).optional(),
    pagination: z.object({}).passthrough().nullable().optional(),
  })
  .passthrough();

export const driverSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    phone: nullableStr,
  })
  .passthrough();

export const driverListSchema = z.array(driverSchema);

export const carSchema = z
  .object({
    id: z.string(),
    model: z.string().nullable().optional(),
    plate_number: nullableStr,
  })
  .passthrough();

export const carListSchema = z.array(carSchema);

export const notificationItemSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    body: z.string().nullable().optional(),
    link: z.string().nullable().optional(),
    created_at: z.string(),
    read: z.boolean().optional(),
  })
  .passthrough();

export const notificationListSchema = z
  .object({
    items: z.array(notificationItemSchema),
    unread_count: z.number().optional(),
  })
  .passthrough();

export const unreadCountSchema = z
  .object({
    unread_count: z.number(),
    latest_id: nullableStr,
    latest_at: nullableStr,
  })
  .passthrough();

export const driverRequestListSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string(),
          status: z.string(),
          created_at: z.string(),
          driver: z.object({ id: z.string(), name: z.string() }).passthrough().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const etollCardSchema = z
  .object({
    id: z.string(),
    issuer: z.string(),
    name: z.string(),
    card_number: z.string(),
    label: z.string(),
    balance: z.number().nullable(),
    balance_at: nullableStr,
    status: z.string(),
    holder: z.object({ driver: z.object({ id: z.string(), name: z.string() }).passthrough() }).passthrough().nullable(),
  })
  .passthrough();

export const etollCardListSchema = z.object({ items: z.array(etollCardSchema) }).passthrough();

export const etollCardHistorySchema = z
  .object({
    card: etollCardSchema,
    transactions: z.array(
      z.object({ id: z.string(), type: z.string(), occurred_at: z.string() }).passthrough(),
    ),
    handovers: z.array(z.object({ id: z.string(), taken_at: z.string() }).passthrough()),
    users: z.record(z.string(), z.string()),
  })
  .passthrough();

// ─── Price list ──────────────────────────────────────────────────────────────

const priceUsers = z.record(z.string(), z.string());

const pricePublicationSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
    published_by: nullableStr,
    note: nullableStr,
    deploy_status: z.string(),
  })
  .passthrough();

export const priceListSchema = z
  .object({
    cars: z.array(
      z
        .object({ id: z.string(), slug: z.string(), name: z.string(), sort_order: z.number(), updated_at: z.string() })
        .passthrough(),
    ),
    zones: z.array(
      z
        .object({
          id: z.string(),
          code: z.string(),
          name: z.string(),
          service_package: z.string(),
          included: z.string(),
          excluded: z.string(),
          updated_at: z.string(),
          rates: z.array(
            z
              .object({
                id: z.string(),
                car_id: z.string(),
                duration: z.string(),
                amount: z.number().nullable(),
                is_proposal: z.boolean(),
                updated_at: z.string(),
              })
              .passthrough(),
          ),
          surcharges: z.array(
            z
              .object({ id: z.string(), zone_id: z.string(), area: z.string(), amount: z.number(), updated_at: z.string() })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
    cities: z
      .array(
        z
          .object({
            id: z.string(),
            slug: z.string(),
            name: z.string(),
            driver_zone_id: nullableStr,
            all_in_zone_id: nullableStr,
            quote: z.boolean(),
            updated_at: z.string(),
          })
          .passthrough(),
      ),
    extras: z.array(
      z
        .object({
          id: z.string(),
          code: z.string(),
          label: z.string(),
          amount: z.number().nullable(),
          percent: z.number().nullable(),
          unit: z.string(),
          updated_at: z.string(),
        })
        .passthrough(),
    ),
    last_publication: pricePublicationSchema.nullable(),
    unpublished_changes: z.number(),
    proposal_count: z.number().optional(),
    users: priceUsers,
  })
  .passthrough();

export const priceHistorySchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string(),
          entity: z.string(),
          field: z.string(),
          created_at: z.string(),
          label: nullableStr,
        })
        .passthrough(),
    ),
    users: priceUsers,
  })
  .passthrough();

export const pricePublicationsSchema = z
  .object({ items: z.array(pricePublicationSchema), users: priceUsers })
  .passthrough();

export const pricePublishResultSchema = z.object({ publication: pricePublicationSchema }).passthrough();
