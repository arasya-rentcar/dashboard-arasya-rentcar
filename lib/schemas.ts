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

export const orderDetailSchema = z
  .object({
    id: z.string(),
    customer_name: z.string().nullable().optional(),
    final_price: z.union([z.string(), z.number()]).nullable().optional(),
    order_status: z.string().nullable().optional(),
    payment_status: z.string().nullable().optional(),
  })
  .passthrough();

export const ordersSearchResultSchema = z
  .object({
    data: z.array(orderListItemSchema),
    pagination: z.object({}).passthrough().nullable().optional(),
    summary: z.object({}).passthrough().nullable().optional(),
  })
  .passthrough();

export const invoiceSchema = z
  .object({
    id: z.string(),
    invoice_number: nullableStr,
    amount: z.union([z.string(), z.number()]).nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough();

export const invoicesSearchResultSchema = z
  .object({
    data: z.array(invoiceSchema),
    pagination: z.object({}).passthrough().nullable().optional(),
  })
  .passthrough();

export const dashboardV2Schema = z.object({}).passthrough();

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
