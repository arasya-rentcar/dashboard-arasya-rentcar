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
