// ─── Enums ──────────────────────────────────────────────────────────────────

export type Role = "ADMIN" | "DRIVER";

export type DriverStatus = "AVAILABLE" | "ON_DUTY" | "OFF";
export type FleetType = "INTERNAL" | "EXTERNAL";

export type CarStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE";

export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "DP_PAID" | "PAID";

export type OrderSource = "WEB" | "WHATSAPP" | "IMPORT";

// Merge: the order-level Trip model is gone. The line IS the trip -
// OrderServiceItem carries driver/car/line_status + trip timestamps.

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "REVISED"
  | "PAID"
  | "CANCELLED";
export type InvoiceDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export type InvoiceType =
  | "DP"
  | "SETTLEMENT"
  | "FULL"
  | "ADDITIONAL"
  | "COMBINED"
  | "CANCELLATION_FEE"
  // "Invoice Penyesuaian": bills the shortfall of an underpaid PAID invoice.
  | "ADJUSTMENT";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QRIS" | "OTHER";

// ─── Models ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  location?: string;
  // E-toll card the driver uses, e.g. "Mandiri 6032 ••••1234" (≤ 60 chars).
  etoll_card?: string | null;
  type: FleetType;
  status: DriverStatus;
  user?: {
    email: string;
  };
}

export interface Car {
  id: string;
  plate_number: string;
  unit_code?: string;
  model: string;
  status: CarStatus;
  type: FleetType;
  origin_location?: string;
  // Sprint 3 (UI placeholder; real photos uploaded manually later).
  photo_url?: string | null;
  photos?: string[];
}

export interface InvoiceDeliveryLog {
  id: string;
  invoice_id: string;
  order_id: string;
  channel: "WHATSAPP";
  target_name?: string | null;
  target_phone: string;
  message_text?: string | null;
  file_url: string;
  invoice_number_snapshot: string;
  amount_snapshot: string;
  status_snapshot: InvoiceStatus;
  status: InvoiceDeliveryStatus;
  provider_message_id?: string | null;
  error_message?: string | null;
  sent_by_user_id?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  invoice_id: string;
  customer_id: string;
  customer_seq: number;
  payment_date: string;
  amount: string;
  payment_method: PaymentMethod;
  payment_proof_url?: string | null;
  file_url?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  payment_method: PaymentMethod;
  issue_date: string;
  due_date?: string | null;
  paid_at?: string | null;
  // Cash asked from the customer (gross − credit_applied).
  amount: string;
  // Saldo lebih used to pay part of this invoice.
  credit_applied?: string | number | null;
  // Money actually taken on mark-paid (may differ from `amount`).
  amount_received?: string | number | null;
  // ADJUSTMENT: the underpaid invoice whose shortfall this one bills.
  adjusts_invoice_id?: string | null;
  // Part of the order total this invoice covers (amount + credit_applied).
  gross?: number;
  // PAID invoices: amount − amount_received when positive, else 0.
  shortfall?: number;
  note?: string;
  file_url?: string;
  receipt_url?: string | null;
  status: InvoiceStatus;
  revision?: number;
  parent_id?: string | null;
  created_at: string;
  delivery_logs?: InvoiceDeliveryLog[];
  receipts?: Receipt[];
}

/**
 * The money of one order, computed by the API (`money` on GET /orders/:id,
 * `order_money` on the money endpoints). The dashboard shows these numbers
 * and never recomputes them. Rupiah.
 */
export interface OrderMoney {
  /** Order total (final_price). */
  total: number;
  /** DP and "lunas" base: rental price of the days not cancelled (on a cancelled order: the fee). */
  base: number;
  min_dp: number;
  charges: number;
  /** Money received. */
  received: number;
  /** Money refunded. */
  refunded: number;
  net_paid: number;
  /** Saldo lebih. */
  credit_balance: number;
  /** Part of the total settled with money (net_paid − credit_balance). */
  covered: number;
  /** Cash asked on unpaid invoices. */
  open_billed: number;
  /** The most a new invoice may cover (gross). */
  billable_remaining: number;
  /** Piutang: max(0, total − net_paid). */
  outstanding: number;
  payment_status: PaymentStatus;
  start_ready: boolean;
  rule: string;
}

export interface OrderRefund {
  id: string;
  amount: string | number;
  refunded_at: string;
  note?: string | null;
  has_proof: boolean;
}

export type CreditEntryKind =
  | "OPENING"
  | "OVERPAYMENT"
  | "RELEASE"
  | "APPLIED"
  | "UNAPPLIED"
  | "REFUND";

export interface OrderCreditEntry {
  kind: CreditEntryKind;
  /** Positive adds saldo lebih, negative uses it. */
  amount: string | number;
  created_at: string;
  note?: string | null;
  invoice_number?: string | null;
}

/** POST /orders/:id/refunds (201 made, 200 resend of the same client_ref). */
export interface CreateRefundResult {
  refund: OrderRefund;
  order_money: OrderMoney | null;
  outstanding_after: number;
}

/** POST …/mark-paid: the invoice plus what the payment did. */
export type MarkPaidResult = Invoice & {
  payment?: { received: number; shortfall: number; overpayment: number; credit_added: number };
  order_money?: OrderMoney | null;
};

// Map points on an order service item (picked on the website map and carried
// over from the lead). Null or absent (older API) = no point. lat/lng always
// come as a pair; the place id is optional.
export interface ServiceItemPointFields {
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_place_id: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_place_id: string | null;
}

export interface OrderServiceItem extends Partial<ServiceItemPointFields> {
  id?: string;
  order_id?: string;
  service_date?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  description?: string | null;
  service_kind?: string | null;
  service_package?: string | null;
  pickup_location: string;
  dropoff_location: string;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  notes?: string | null;
  sort_order?: number;
  created_at?: string;
  is_external?: boolean;
  line_status?: string | null;
  // Actual trip clock (set when the driver hits START/FINISH via WhatsApp),
  // distinct from the planned start_at/end_at pickup/dropoff times.
  trip_started_at?: string | null;
  trip_finished_at?: string | null;
  // Operational timestamps: departed garage / arrived at pickup.
  actual_start_at?: string | null;
  actual_pickup_at?: string | null;
  // When the driver accepted this trip in the driver app (null = not yet).
  driver_accepted_at?: string | null;
  // Customer got in, trip with them began ("Mulai perjalanan" in the app).
  // Needs the order paid in full.
  customer_onboard_at?: string | null;
  // Driver app + bot reports for this day (order detail).
  reports?: TripReportEntry[];
  // Driver pay (per day): fee, how it was built, uang jalan handed out.
  driver_fee?: string | number | null;
  driver_fee_note?: string | null;
  travel_advance?: string | number | null;
  // Trip costs on this day (driver-app costs wait for review).
  expenses?: TripCost[];
  payable?: LinePayable | null;
  // Arasya's share of the approved trip costs (derived).
  ops_cost?: string | number | null;
  rtr_amount?: string | number | null;
  margin_amount?: string | number | null;
  driver_name_raw?: string | null;
  driver_phone_raw?: string | null;
  plate_raw?: string | null;
  // Per-day cancellation (A3): fee and tier (1 = 20%, 2 = 50%, 3 = 100%)
  // stored when the day is cancelled; null on days cancelled before A3.
  cancel_fee?: string | number | null;
  // The automatic fee of the policy; cancel_fee differing from it = set by hand.
  cancel_fee_auto?: string | number | null;
  cancel_tier?: number | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancel_requested_at?: string | null;
  driver?: { id: string; name: string } | null;
  car?: {
    id: string;
    model?: string | null;
    plate_number?: string | null;
    unit_code?: string | null;
  } | null;
  external_vendor?: { id: string; name: string } | null;
  external_car?: { id: string; model?: string | null; plate_number?: string | null } | null;
}

export interface OrderCustomer {
  id?: string;
  order_id?: string;
  name: string;
  phone?: string | null;
  is_primary?: boolean;
  created_at?: string;
}

export interface Order {
  id: string;
  order_code?: string | null;
  customer_name: string;
  customer_phone: string;
  customers?: OrderCustomer[];
  service_items?: OrderServiceItem[];
  pickup_location: string;
  dropoff_location: string;
  order_date: string;
  service_start_at?: string | null;
  service_end_at?: string | null;
  final_price: string;
  paid_to_date?: string | number;
  order_status: OrderStatus;
  // True once every active day-line is DONE but the admin has not finalized the
  // order yet (order_status stays IN_PROGRESS underneath). Drives the AWAITING
  // FINALIZATION badge + Finalize button + "Needs Finalization" list filter.
  awaiting_finalization?: boolean;
  payment_status: PaymentStatus;
  // One money model for every screen (rule set v3). Use this, not the
  // invoice amounts, for every total / paid / owed figure.
  money: OrderMoney;
  // Refunds (several per order) and the saldo lebih ledger, oldest first.
  refunds?: OrderRefund[];
  credit_entries?: OrderCreditEntry[];
  // Old single-refund columns (cumulative total / latest refund); kept by the
  // API for older clients. Read `money` and `refunds` instead.
  is_refunded?: boolean;
  refunded_at?: string | null;
  refund_amount?: string | number | null;
  refund_proof_url?: string | null;
  refund_note?: string | null;
  created_at: string;
  updated_at: string;
  invoices: Invoice[];
  is_external?: boolean;
  external_vendor?: { id: string; name: string; phone?: string | null } | null;
  external_car?: {
    id: string;
    model: string;
    plate_number?: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    total_orders: number;
  } | null;
  final_finance?: OrderFinanceDetail | null;
  adjustments?: OrderAdjustment[];
  notes?: string | null;
  // Website lead this order was created from (null for other orders).
  web_lead?: OrderWebLead | null;
  // Paid in full = the trip with the customer may begin (driver app "Mulai
  // perjalanan"). rental_total = price of the non-cancelled days.
  start_payment?: StartPayment;
  // Set by "Batalkan Pesanan". When days were already done the order is not
  // CANCELLED but closes through finalize; the fee is still the order total.
  cancelled_at?: string | null;
  cancellation_fee?: string | number | null;
  cancellation_reason?: string | null;
}

export interface LinePayable {
  id?: string;
  kind?: 'DRIVER' | 'VENDOR';
  status: 'PAID' | 'UNPAID';
  base_amount?: string | number;
  reimburse_amount?: string | number;
  advance_amount?: string | number;
  extras_amount?: string | number;
  total_amount?: string | number;
  paid_at?: string | null;
}

export type TripCostStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A trip cost on one day (Expense). created_by null = from the driver app. */
export interface TripCost {
  id: string;
  type: 'FUEL' | 'TOLL' | 'PARKING' | 'OTHER';
  amount: string | number;
  note?: string | null;
  status: TripCostStatus;
  paid_by: 'DRIVER' | 'COMPANY';
  bill_to_customer: boolean;
  created_by?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at: string;
  trip_report?: { id: string; file_url?: string | null; file_mime?: string | null } | null;
}

export interface DriverFeePreset {
  key: string;
  label: string;
  amount: number;
}

export interface DriverFeePresets {
  base: DriverFeePreset[];
  addons: {
    overnight: { label: string; unit: string; amount: number };
    overtime: { label: string; unit: string; amount: number };
  };
}

export interface StartPayment {
  rental_total: number;
  paid_to_date: number;
  ready: boolean;
}

export interface OrderWebLead {
  id: string;
  lead_code: string;
  campaign: string | null;
  gclid: string | null;
  page_path: string | null;
  language: string | null;
  unit: string | null;
  passenger_count: number | null;
  duration: string | null;
  duration_key: WebLeadDurationKey | null;
  notes: string | null;
  created_at: string;
}

export interface OrderAdjustment {
  id: string;
  order_id?: string;
  type: string;
  description: string;
  amount: string | number;
  quantity: number;
  is_billable: boolean;
  created_by?: string | null;
  created_at?: string;
}

export type ScheduleStatus =
  | "SCHEDULED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED";

// "Manual WhatsApp" mode: when the API runs without the WhatsApp bot, send-*
// endpoints return a wa.me link for the admin to open instead of sending.
export interface WaManualResult {
  wa_url?: string | null;
}

export interface SendConfirmationResult {
  customer?: WaManualResult | null;
  driver?: WaManualResult | null;
  // Set when the line was reassigned: tell the previous driver to stand down.
  old_driver_standdown?: WaManualResult | null;
  [key: string]: unknown;
}

export type ConfirmationState = 'NOT_SENT' | 'SENT' | 'CHANGED';

export interface ScheduleLine {
  id: string;
  service_date?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  description?: string | null;
  service_kind?: string | null;
  pickup_location: string;
  dropoff_location: string;
  total_price: string | number;
  ops_cost: string | number;
  rtr_amount?: string | number | null;
  margin_amount?: string | number | null;
  is_external: boolean;
  line_status: ScheduleStatus;
  driver_name_raw?: string | null;
  driver_phone_raw?: string | null;
  plate_raw?: string | null;
  notes?: string | null;
  // Per-day cancellation (A3): fee and tier (1 = 20%, 2 = 50%, 3 = 100%)
  // stored when the day is cancelled; null on days cancelled before A3.
  cancel_fee?: string | number | null;
  // The automatic fee of the policy; cancel_fee differing from it = set by hand.
  cancel_fee_auto?: string | number | null;
  cancel_tier?: number | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancel_requested_at?: string | null;
  // Driver pay (per day) and the day's payable (extras come off the margin).
  driver_fee?: string | number | null;
  driver_fee_note?: string | null;
  travel_advance?: string | number | null;
  payable?: { status: 'PAID' | 'UNPAID'; extras_amount?: string | number } | null;
  // #A1/#A2 trip-team confirmation badge state.
  confirmation_state?: ConfirmationState;
  confirmation_sent_at?: string | null;
  // When the driver accepted this trip in the driver app (null = not yet).
  driver_accepted_at?: string | null;
  order?: {
    id: string;
    order_code?: string | null;
    customer_name: string;
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    // Paid in full: the driver may begin the trip with the customer.
    start_ready?: boolean;
  } | null;
  driver?: { id: string; name: string; phone?: string | null } | null;
  car?: { id: string; model: string; plate_number?: string | null } | null;
  external_vendor?: { id: string; name: string; phone?: string | null } | null;
  external_car?: {
    id: string;
    model: string;
    plate_number?: string | null;
  } | null;
}

// ---- Per-day cancellation quotes (API A3) ----
export type LineCancelBlock =
  | 'LAST_OPEN_DAY'
  | 'OPEN_INVOICE_EXCEEDS'
  | 'DONE_DAY'
  | 'ALREADY_CANCELLED'
  | null;

/** GET /schedule/lines/:id/cancel-quote: cancelling one day in Edit Hari. Rupiah. */
export interface LineCancelQuote {
  decided_at: string;
  requested_at: string | null;
  tier: number;
  pct: number;
  price: number;
  fee: number;
  label: string;
  // The driver was at the pickup by the decision time (tier 3 before 10.00).
  arrived: boolean;
  blocked: LineCancelBlock;
  new_total: number;
  net_paid: number;
  covered: number;
  credit_release: number;
  open_billed: number;
  max_open_billed: number;
  owed_after: number;
}

export interface OrderCancelQuoteDay {
  id: string;
  date: string | null;
  price: number;
  arrived: boolean;
  tier: 1 | 2 | 3;
  pct: 20 | 50 | 100;
  /** Charged; equals fee_auto in a quote. */
  fee: number;
  fee_auto: number;
  manual: boolean;
  label: string;
}

/** GET /orders/:id/cancel-quote: "Batalkan Pesanan", per day. Rupiah. */
export interface OrderCancelQuote {
  decided_at: string;
  requested_at: string | null;
  tier: number;
  /** The days cancelled now. */
  days: OrderCancelQuoteDay[];
  /** Fees of days cancelled earlier (Edit Hari), kept as they are. */
  earlier_fee_total: number;
  /** Σ fees of every cancelled day afterwards (= cancellation_fee). */
  fee_total: number;
  done_total: number;
  charges: number;
  original_total: number;
  new_total: number;
  net_paid: number;
  credit_balance: number;
  covered: number;
  voided_invoices: { id: string; number: string; amount: number; credit_applied: number }[];
  fee_invoice: { gross: number; credit_applied: number; amount: number } | null;
  credit_applied: number;
  credit_release: number;
  credit_after: number;
  still_owed: number;
}

// ---- Week Timeline (Schedule > Timeline view) ----
export interface WeekBooking {
  line_id: string;
  order_id?: string;
  order_code?: string | null;
  customer_name?: string;
  route: string;
  status: ScheduleStatus;
}

export interface WeekCell {
  free: boolean;
  bookings: WeekBooking[];
}

export interface WeekRow {
  id: string;
  name: string;
  phone?: string | null;
  plate_number?: string | null;
  unit_code?: string | null;
  down: boolean;
  cells: WeekCell[];
}

export interface WeekDayCapacity {
  date: string;
  trips: number;
  drivers: { total: number; down: number; used: number; free: number };
  cars: { total: number; down: number; used: number; free: number };
}

export interface ScheduleWeekResult {
  week_start: string;
  week_end: string;
  today: string;
  resource: 'drivers' | 'cars';
  days: string[];
  capacity: WeekDayCapacity[];
  // Lane of scheduled-but-unassigned trips for the chosen resource (no driver in
  // drivers view / no car in cars view). Null when everything is assigned.
  unassigned?: WeekRow | null;
  rows: WeekRow[];
}

// A single driver report attached to a finished line (Trip History detail).
export interface TripReportEntry {
  id: string;
  report_type: string;
  input_type?: string | null;
  notes?: string | null;
  file_url?: string | null;
  file_mime?: string | null;
  driver_phone?: string | null;
  status?: string | null;
  // 'API' = submitted from the driver app; otherwise the WhatsApp bot.
  source?: string | null;
  // Cost/odometer value for FUEL/TOLL/PARKING/OTHER_COST etc. (decimal).
  amount?: string | number | null;
  created_at: string;
  // GPS fix from the phone (arrival photo / "sampai di lokasi jemput").
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_m?: number | null;
  location_at?: string | null;
  // Android reported a mock-location app.
  location_mocked?: boolean | null;
  // Place name looked up on the phone (e.g. "Jl. Pajajaran, Bogor"); the
  // coordinates stay as the fallback when it is missing.
  location_name?: string | null;
}

// One finished (DONE) service line for the Trip History tab. finance_status:
// FINALIZED = parent order is DONE (money fields trustworthy); AWAITING = line
// done but order not finalized yet (render money as "Pending").
export interface TripHistoryRow extends Partial<ServiceItemPointFields> {
  id: string;
  service_date?: string | null;
  description?: string | null;
  service_kind?: string | null;
  pickup_location: string;
  dropoff_location: string;
  is_external: boolean;
  line_status: ScheduleStatus;
  ops_cost: string | number;
  margin_amount?: string | number | null;
  total_price?: string | number | null;
  // Distinct actual operational timestamps stamped by the WA bot.
  actual_start_at?: string | null;
  actual_pickup_at?: string | null;
  trip_finished_at?: string | null;
  finish_reported_at?: string | null;
  trip_started_at?: string | null;
  driver_accepted_at?: string | null;
  customer_onboard_at?: string | null;
  // Partner (vendor) driver and plate typed on the line.
  driver_name_raw?: string | null;
  driver_phone_raw?: string | null;
  plate_raw?: string | null;
  finance_status: 'FINALIZED' | 'AWAITING';
  order?: {
    id: string;
    order_code?: string | null;
    customer_name: string;
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    awaiting_finalization?: boolean;
  } | null;
  driver?: { id: string; name: string; phone?: string | null } | null;
  car?: { id: string; model: string; plate_number?: string | null } | null;
  external_vendor?: { id: string; name: string; phone?: string | null } | null;
  external_car?: {
    id: string;
    model: string;
    plate_number?: string | null;
  } | null;
  payable?: Payable | null;
  reports?: TripReportEntry[];
}

export interface ScheduleTotals {
  revenue: string | number;
  ops_cost: string | number;
  margin: string | number;
}

export interface DriverAvailabilityEntry {
  id: string;
  name: string;
  phone?: string | null;
  type: "INTERNAL" | "EXTERNAL";
  status: string;
  availability: "FREE" | "BUSY";
  bookings: {
    line_id: string;
    order_id?: string;
    order_code?: string | null;
    customer_name?: string;
    route: string;
    status: ScheduleStatus;
  }[];
}

export interface OrderFinanceDetail {
  id: string;
  total_user_amount?: string | number | null;
  sell_price?: string | number | null;
  rtr_amount?: string | number | null;
  total_ops_cost?: string | number | null;
  fuel_amount?: string | number | null;
  toll_amount?: string | number | null;
  parking_cash_amount?: string | number | null;
  driver_fee_amount?: string | number | null;
  total_driver_amount?: string | number | null;
  finance_note?: string | null;
  margin_amount?: string | number | null;
  margin_formula_version?: string | null;
}

// ─── List-view minimal order (from listOrders) ──────────────────────────────

export interface OrderListItem {
  id: string;
  order_code?: string | null;
  source?: OrderSource;
  customer_name: string;
  customer_phone: string;
  customers?: OrderCustomer[];
  service_items?: OrderServiceItem[];
  pickup_location: string;
  dropoff_location: string;
  order_date: string;
  service_start_at?: string | null;
  service_end_at?: string | null;
  final_price: string;
  // Money received, refunded and held as saldo lebih (Decimal strings). The
  // list shows Diterima = paid_to_date − refunded_total from these, never
  // from invoice amounts.
  paid_to_date?: string | number | null;
  refunded_total?: string | number | null;
  credit_balance?: string | number | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  is_final?: boolean;
  invoice_missing?: boolean;
  is_refunded?: boolean;
  created_at: string;
  updated_at: string;
  // Merge: driver/car summary comes from service_items (declared above).
  invoices: {
    id: string;
    invoice_number: string;
    invoice_type: InvoiceType;
    status: InvoiceStatus;
    amount: string;
    revision?: number;
    parent_id?: string | null;
    file_url?: string | null;
    receipt_url?: string | null;
    issue_date?: string | null;
    paid_at?: string | null;
    created_at?: string;
    delivery_logs?: InvoiceDeliveryLog[];
  }[];
  final_finance?: {
    id: string;
    total_user_amount?: string | null;
    total_ops_cost?: string | null;
    total_driver_amount?: string | null;
    margin_amount?: string | null;
    invoice_no_raw?: string | null;
  } | null;
  sheet_import_rows?: {
    id: string;
    sheet_id: string;
    gid: string;
    row_number: number;
  }[];
}

export interface OrderFinalFinance {
  id: string;
  order_id: string;
  sheet_checked_raw?: string | null;
  refund_cashback_raw?: string | null;
  refund_cashback_amount?: string | null;
  invoice_no_raw?: string | null;
  service_date_raw?: string | null;
  service_date?: string | null;
  vehicle_raw?: string | null;
  route_raw?: string | null;
  duration_raw?: string | null;
  package_raw?: string | null;
  driver_vendor_raw?: string | null;
  plate_no_raw?: string | null;
  sell_price?: string | null;
  rtr_amount?: string | null;
  dp_amount?: string | null;
  additional_amount?: string | null;
  user_overtime_amount?: string | null;
  user_overtime_hours_raw?: string | null;
  parking_user_amount?: string | null;
  total_user_amount?: string | null;
  paid_off_date_raw?: string | null;
  paid_off_date?: string | null;
  fuel_amount?: string | null;
  toll_amount?: string | null;
  driver_fee_amount?: string | null;
  driver_overtime_amount?: string | null;
  parking_cash_amount?: string | null;
  other_amount?: string | null;
  finance_note?: string | null;
  total_driver_amount?: string | null;
  driver_paid_date_raw?: string | null;
  driver_paid_date?: string | null;
  total_ops_cost?: string | null;
  unit_rental_price?: string | null;
  margin_amount?: string | null;
}

export interface SheetImportRow {
  id: string;
  sheet_id: string;
  gid: string;
  row_number: number;
  row_hash: string;
  order_id?: string | null;
  status: string;
  warnings: string[];
}

export interface OrdersSearchSummary {
  count: number;
  final_price_total: string | number;
  total_user_amount: string | number;
  total_ops_cost: string | number;
  total_driver_amount: string | number;
  margin_amount: string | number;
}

export interface OrdersSearchResult {
  data: OrderListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    page_count: number;
  };
  summary: OrdersSearchSummary;
}

export interface OrdersSearchParams {
  search?: string;
  bucket?: string;
  order_status?: string;
  payment_status?: string;
  source?: string;
  has_finance?: string;
  date_field?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface SheetImportPreview {
  sheet_id: string;
  gid: string;
  headers: string[];
  total_rows: number;
  meaningful_rows: number;
  skipped_rows: number;
  warning_count: number;
  samples: unknown[];
}

export interface SheetImportResult {
  sheet_id: string;
  gid: string;
  total_rows: number;
  meaningful_rows: number;
  imported: number;
  updated: number;
  warning_count: number;
  results: { row_number: number; order_id?: string; status: string; warnings: string[] }[];
}

// ─── API Inputs ──────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  customers?: { name: string; phone?: string; is_primary?: boolean }[];
  service_items?: ({
    service_date?: string;
    start_at?: string;
    end_at?: string;
    description?: string;
    service_kind?: string;
    pickup_location: string;
    dropoff_location: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
    notes?: string;
    sort_order?: number;
  } & Partial<ServiceItemPointFields>)[];
  pickup_location: string;
  dropoff_location: string;
  order_date: string;
  service_start_at?: string;
  service_end_at?: string;
  final_price: number;
  service_type?: string;
  passenger_count?: number;
  area?: string;
  driver_origin?: string;
  notes?: string;
  web_lead_id?: string;
}

// ─── Website leads ───────────────────────────────────────────────────────────

export type WebLeadStatus = "NEW" | "CONVERTED" | "IGNORED";

export type WebLeadDurationKey = '12h' | 'allin' | 'oneway' | 'return' | 'multi';

export interface WebLead {
  id: string;
  lead_code: string;
  status: WebLeadStatus;
  name: string;
  trip_date: string | null;
  pickup_time: string | null;
  pickup_location: string;
  destination: string | null;
  // Points picked on the website map (absent on leads sent before that / by
  // an older API). lat/lng come as a pair.
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  pickup_place_id?: string | null;
  pickup_place_name?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  destination_place_id?: string | null;
  destination_place_name?: string | null;
  unit: string | null;
  passenger_count: number | null;
  duration: string | null;
  duration_key?: WebLeadDurationKey | null;
  // Whether the requested unit exists in Arasya's own fleet (null = unknown / no unit).
  unit_in_fleet?: boolean | null;
  matching_cars?: { id: string; model: string; plate_number: string | null }[];
  notes: string | null;
  page_path: string | null;
  language: string | null;
  campaign: string | null;
  gclid: string | null;
  ignore_reason: string | null;
  order_id: string | null;
  order?: {
    id: string;
    order_code: string | null;
    final_price?: string | number;
    payment_status?: string;
    order_status?: string;
  } | null;
  purchase_reported_at: string | null;
  created_at: string;
}

export interface WebLeadsResult {
  data: WebLead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    counts: Partial<Record<WebLeadStatus, number>>;
  };
}

export interface UpdateOrderInput {
  customer_name?: string;
  customer_phone?: string;
  customers?: { name: string; phone?: string; is_primary?: boolean }[];
  service_items?: ({
    service_date?: string;
    start_at?: string;
    end_at?: string;
    description?: string;
    service_kind?: string;
    pickup_location: string;
    dropoff_location: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
    notes?: string;
    sort_order?: number;
  } & Partial<ServiceItemPointFields>)[];
  pickup_location?: string;
  dropoff_location?: string;
  order_date?: string;
  service_start_at?: string;
  service_end_at?: string;
  final_price?: number;
  payment_status?: PaymentStatus;
  change_reason?: string;
}

export interface AssignOrderInput {
  driver_id: string;
  car_id: string;
}

export interface GenerateInvoiceInput {
  invoice_type: InvoiceType;
  payment_method: PaymentMethod;
  amount: number;
  note?: string;
  // Sprint 5: optional back-dated issue date (ISO). Defaults to now on the API.
  issue_date?: string;
  // Made when the form opens, reused on a retry: a resend returns the invoice
  // already made instead of a second one.
  client_ref?: string;
  // Saldo lebih reduces the cash asked (API default true). `amount` is the gross.
  apply_credit?: boolean;
  // ADJUSTMENT only: the underpaid invoice it bills.
  adjusts_invoice_id?: string;
}

export interface ReviseInvoiceInput {
  // Gross, as on generate.
  amount: number;
  payment_method?: PaymentMethod;
  note?: string;
  client_ref?: string;
  apply_credit?: boolean;
}

export interface SendInvoiceWhatsappInput {
  target_name?: string;
  target_phone: string;
  message_note?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateDriverInput {
  user_id: string;
  name: string;
  phone: string;
  etoll_card?: string | null;
}

export interface CreateCarInput {
  plate_number: string;
  unit_code?: string;
  model: string;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  tags: string[];
  total_orders: number;
  total_spent: string | number;
  first_order_at?: string | null;
  last_order_at?: string | null;
  notes?: string | null;
  // Identity (admin-only). The full NIK is only returned by GET /customers/:id;
  // list endpoints return id_number_masked.
  id_number?: string | null;
  id_number_masked?: string | null;
  address?: string | null;
  company_name?: string | null;
  id_verified_at?: string | null;
  id_verified_by?: string | null;
  has_ktp?: boolean;
  verified?: boolean;
  created_at: string;
  updated_at: string;
}

export type CustomerDocumentKind = "KTP" | "SIM" | "NPWP" | "PASPOR" | "LAINNYA";

export interface CustomerDocument {
  id: string;
  kind: CustomerDocumentKind;
  mime: string;
  size: number;
  note?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

/** GET /customers/lookup?phone=... → returning-customer hint for order creation. */
export interface CustomerLookupResult {
  id: string;
  code?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  company_name?: string | null;
  total_orders: number;
  last_order_at?: string | null;
  has_ktp?: boolean;
  verified?: boolean;
  id_number_masked?: string | null;
}

export interface CustomerOrderRow {
  id: string;
  order_code?: string | null;
  order_date: string;
  service_start_at?: string | null;
  pickup_location: string;
  dropoff_location: string;
  final_price: string | number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  is_external: boolean;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export interface CustomerDetail extends Customer {
  documents?: CustomerDocument[];
  orders: CustomerOrderRow[];
  orders_pagination: PaginationMeta;
}

// ─── External vendors ──────────────────────────────────────────────────────────

export interface ExternalVendorListItem {
  id: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
  // Partner (rekanan) contact + payout details.
  pic_name?: string | null;
  area?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  order_count: number;
  created_at: string;
  updated_at: string;
  _count?: { cars: number; orders: number };
}

export interface ExternalCar {
  id: string;
  vendor_id: string;
  model: string;
  plate_number?: string | null;
  notes?: string | null;
  created_at: string;
  _count?: { orders: number };
}

export interface VendorOrderRow {
  id: string;
  order_code?: string | null;
  order_date: string;
  service_start_at?: string | null;
  customer_name: string;
  pickup_location: string;
  dropoff_location: string;
  final_price: string | number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  external_car?: { id: string; model: string; plate_number?: string | null } | null;
}

export interface ExternalVendorDetail extends ExternalVendorListItem {
  cars: ExternalCar[];
  cars_pagination: PaginationMeta;
  orders: VendorOrderRow[];
  orders_pagination: PaginationMeta;
}

// ─── Payables (Tagihan) ──────────────────────────────────────────────

export type PayableKind = "DRIVER" | "VENDOR";
export type PayableStatus = "UNPAID" | "PAID";

export interface PayableExtra {
  id?: string;
  label: string;
  amount: number | string;
}

export interface Payable {
  id: string;
  kind: PayableKind;
  status: PayableStatus;
  service_item_id: string;
  order_id: string;
  driver_id?: string | null;
  vendor_id?: string | null;
  service_date?: string | null;
  base_amount: string | number;
  extras_amount: string | number;
  // DRIVER only: approved trip costs the driver paid (reimbursed) and the
  // uang jalan already handed out (deducted).
  reimburse_amount?: string | number;
  advance_amount?: string | number;
  // base + reimburse − advance + extras.
  total_amount: string | number;
  keterangan?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  created_at: string;
  order?: { id: string; order_code?: string | null; customer_name: string } | null;
  driver?: { id: string; name: string; phone?: string | null } | null;
  vendor?: { id: string; name: string; phone?: string | null } | null;
  service_item?: {
    id: string;
    service_date?: string | null;
    description?: string | null;
    service_kind?: string | null;
    service_package?: string | null;
    pickup_location?: string | null;
    dropoff_location?: string | null;
  } | null;
  extras?: PayableExtra[];
}

export interface PayableTotals {
  outstanding: number;
  paid: number;
}

export interface PayableHistorySummary {
  total_earned?: number;
  total_billed?: number;
  total_paid: number;
  outstanding: number;
  count: number;
}

export interface DriverPayableHistory {
  driver: { id: string; name: string; phone?: string | null; type?: string };
  summary: PayableHistorySummary;
  items: Payable[];
}

export interface VendorPayableHistory {
  vendor: { id: string; name: string; phone?: string | null };
  summary: PayableHistorySummary;
  items: Payable[];
}

export interface PayableKindSummary {
  outstanding: number;
  paid: number;
  total: number;
  unpaid_count: number;
  paid_count: number;
}

export interface AgingBuckets {
  current: number;
  d1_7: number;
  d8_14: number;
  d15_30: number;
  d30plus: number;
}

export interface MarginRow {
  order_id: string;
  order_code?: string | null;
  customer_name: string;
  revenue: number;
  margin: number;
  margin_pct: number;
}

export interface DriverLeader {
  id: string;
  name: string;
  trips: number;
  revenue: number;
  margin: number;
  ops: number;
}

export interface VendorLeader {
  id: string;
  name: string;
  trips: number;
  revenue: number;
  cost: number;
}

export interface CarUtil {
  id: string;
  model: string;
  plate_number?: string | null;
  status: string;
  days_booked: number;
}

export interface MonthlyTrendRow {
  label: string;
  turnover: number;
  collected: number;
  payout: number;
}

export interface FreqRow {
  id: string;
  label: string;
  count: number;
  revenue: number;
}

export interface FrequencyBreakdown {
  internal: { cars: FreqRow[]; drivers: FreqRow[] };
  external: { cars: FreqRow[]; vendors: FreqRow[] };
}

export interface PayablesSummary {
  driver: PayableKindSummary;
  vendor: PayableKindSummary;
  combined: { outstanding: number; paid: number; total: number };
}

// ─── Driver / Vendor detail ────────────────────────────────────────

export interface PartnerTripRow {
  id: string;
  service_date?: string | null;
  description?: string | null;
  service_kind?: string | null;
  service_package?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  line_status: string;
  total_price: string | number;
  ops_cost?: string | number | null;
  rtr_amount?: string | number | null;
  margin_amount?: string | number | null;
  is_external?: boolean;
  // Partner (vendor) driver and plate typed on the line.
  driver_name_raw?: string | null;
  driver_phone_raw?: string | null;
  plate_raw?: string | null;
  order?: { id: string; order_code?: string | null; customer_name?: string } | null;
  car?: { id: string; model: string; plate_number?: string | null } | null;
  external_car?: { id: string; model: string; plate_number?: string | null } | null;
}

export interface PartnerDetailSummary {
  total_trips: number;
  completed_trips: number;
  total_earned?: number;
  total_billed?: number;
  total_paid: number;
  outstanding: number;
  revenue_generated: number;
  margin_generated: number;
}

export interface DriverDetail {
  driver: Driver;
  summary: PartnerDetailSummary;
  trips: PartnerTripRow[];
  payments: Payable[];
}

export interface VendorDetail2 {
  vendor: { id: string; name: string; phone?: string | null; notes?: string | null };
  summary: PartnerDetailSummary;
  trips: PartnerTripRow[];
  payments: Payable[];
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
}

export interface AuthResponse {
  status: "success";
  data: {
    token: string;
    user: User;
  };
}

// ─── #5 Revenue Report ───────────────────────────────────────────────────────
export interface RevenueInternalSlot {
  gross: number;
  ops: number;
  net_margin: number | null;
  driver_fee: number;
  trips: number;
  orders: number;
}
export interface RevenueInternalRow {
  car_id: string | null;
  car_label: string;
  plate: string | null;
  unit_code: string | null;
  final: RevenueInternalSlot;
  estimated: RevenueInternalSlot;
}
export interface RevenueVendorSlot {
  customer_billed: number;
  vendor_cost: number;
  arasya_margin: number;
  trips: number;
  orders: number;
}
export interface RevenueVendorUnit {
  external_car_id: string | null;
  car_label: string;
  plate: string | null;
  final: RevenueVendorSlot;
  estimated: RevenueVendorSlot;
}
export interface RevenueVendorRow {
  vendor_id: string | null;
  vendor_name: string;
  final: RevenueVendorSlot;
  estimated: RevenueVendorSlot;
  units: RevenueVendorUnit[];
}
export interface RevenueDriverRow {
  driver_id: string | null;
  driver_name: string;
  driver_phone: string | null;
  fee_paid: number;
  fee_pending: number;
  fee_total: number;
  trips: number;
  orders: number;
}
export interface RevenueOrderCounts {
  internal: number;
  vendor: number;
  freelance: number;
  external_total: number;
  total: number;
}
export interface RevenueReport {
  range: { from: string; to: string };
  order_counts: RevenueOrderCounts;
  internal_cars: {
    rows: RevenueInternalRow[];
    totals: {
      final: { gross: number; ops: number; net_margin: number; driver_fee: number; trips: number; orders: number };
      estimated: { gross: number; ops: number; net_margin: number; driver_fee: number; trips: number; orders: number };
    };
  };
  vendor_margin: {
    rows: RevenueVendorRow[];
    totals: {
      final: RevenueVendorSlot;
      estimated: RevenueVendorSlot;
    };
  };
  driver_fees: {
    rows: RevenueDriverRow[];
    totals: {
      fee_paid: number;
      fee_pending: number;
      fee_total: number;
      trips: number;
      orders: number;
    };
  };
  // Income that belongs to an order, not to one unit: extra charges (by the
  // date they were added) and cancellation fees (by cancellation date).
  order_level?: DashV2OrderLevel;
}

export interface DashV2OrderLevel {
  extra_charges: number;
  cancellation_income: number;
  // Trip costs billed back to the customer at cost: not income, not margin.
  pass_through: number;
}

// ── Dashboard v2 — single-page owner/finance view ────────────────────────────
export interface DashV2Accrual extends Partial<DashV2OrderLevel> {
  revenue: number;
  // Day prices only; revenue = day_revenue + extra_charges + cancellation_income.
  day_revenue?: number;
  ops_cost: number;
  driver_cost: number;
  vendor_cost: number;
  margin: number;
  margin_pct: number | null;
  trips: number;
}
export interface DashV2Cash {
  collected: number;
  // Refunds to customers, by refunded_at (WIB).
  refunded: number;
  paid_out: number;
  // collected − refunded − paid_out
  net_cash: number;
}
export interface DashV2InternalChannel {
  revenue: number;
  ops_cost: number;
  driver_cost: number;
  margin: number;
  margin_pct: number | null;
  trips: number;
}
export interface DashV2VendorChannel {
  billed: number;
  vendor_cost: number;
  margin: number;
  margin_pct: number | null;
  trips: number;
}
export interface DashV2OverdueAR {
  id: string;
  order_code: string | null;
  customer: string;
  amount: number;
  service_date: string | null;
  days_overdue: number;
}
export interface DashV2OverdueAP {
  id: string;
  kind: 'DRIVER' | 'VENDOR';
  counterparty: string;
  amount: number;
  service_date: string | null;
  days_overdue: number;
  order_id: string | null;
  order_code: string | null;
}
export interface DashV2Outstanding {
  ar_outstanding: number;
  // Σ saldo lebih over all orders: customers' money held (not piutang, not revenue).
  customer_credit: number;
  ap_outstanding: number;
  ar_overdue_count: number;
  ap_overdue_count: number;
  ar_overdue_top: DashV2OverdueAR[];
  ap_overdue_top: DashV2OverdueAP[];
}
export interface DashV2TrendPoint {
  month: string;          // YYYY-MM (WIB calendar month)
  revenue: number;
  margin: number;
  margin_pct: number | null;
}
export interface DashboardV2 {
  range: {
    date_from: string;
    date_to: string;
    prior_from: string;
    prior_to: string;
  };
  accrual: DashV2Accrual & {
    delta: { revenue: number | null; margin: number | null; ops_cost: number | null };
    prior: DashV2Accrual;
  };
  cash: DashV2Cash & {
    delta: { net_cash: number | null };
    prior: DashV2Cash;
  };
  channel: { internal: DashV2InternalChannel; vendor: DashV2VendorChannel };
  outstanding: DashV2Outstanding;
  trend: DashV2TrendPoint[];
}

// ─── Admin notifications & driver requests ───────────────────────────────────

export type AdminNotificationType =
  | 'TRIP_ACCEPTED'
  | 'TRIP_STARTED'
  | 'TRIP_ARRIVED'
  | 'TRIP_BOARDED'
  | 'TRIP_FINISHED'
  | 'TRIP_REPORT'
  | 'TRIP_COST'
  | 'DRIVER_REQUEST'
  // A driver took or returned an office e-toll card.
  | 'ETOLL_CARD';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  order_id?: string | null;
  order_code?: string | null;
  service_item_id?: string | null;
  driver_id?: string | null;
  driver_request_id?: string | null;
  expense_id?: string | null;
  // Dashboard path to open, e.g. "/dashboard/orders/<id>".
  link: string;
  created_at: string;
  read: boolean;
}

export interface AdminNotificationList {
  items: AdminNotification[];
  unread_count: number;
}

export interface NotificationUnreadCount {
  unread_count: number;
  latest_id: string | null;
  latest_at: string | null;
}

export type DriverRequestStatus = 'OPEN' | 'DONE' | 'CANCELLED';

export interface DriverRequest {
  id: string;
  driver_id: string;
  type: 'ETOLL_TOPUP';
  // The office card it is about; null for requests from older app versions.
  card_id?: string | null;
  card?: DriverRequestCard | null;
  card_label?: string | null;
  // Card balance the driver typed (decimal).
  balance?: string | number | null;
  note?: string | null;
  status: DriverRequestStatus;
  created_at: string;
  handled_at?: string | null;
  handled_by?: string | null;
  handled_note?: string | null;
  driver: { id: string; name: string; phone?: string | null };
}

// ─── Office e-toll cards (shared pool) ──────────────────────────────────────

export type EtollIssuer = 'MANDIRI' | 'BCA' | 'BRI' | 'BNI' | 'DKI' | 'OTHER';
export type EtollCardStatus = 'ACTIVE' | 'INACTIVE';
export type EtollTransactionType = 'TOPUP' | 'TOLL' | 'BALANCE_CHECK';

export interface DriverRequestCard {
  id: string;
  issuer: EtollIssuer;
  name: string;
  card_number: string;
  label: string;
  // Estimate: last known balance ± entries since (null = never read).
  balance: number | null;
  balance_at: string | null;
  status: EtollCardStatus;
}

export interface EtollCard {
  id: string;
  issuer: EtollIssuer;
  issuer_label: string;
  name: string;
  // Digits only; the full number (top-up via m-banking).
  card_number: string;
  card_last4: string;
  // "BCA Flazz · Kartu 3 ••••5678"
  label: string;
  balance: number | null;
  // When the last known balance was read.
  balance_at: string | null;
  status: EtollCardStatus;
  inactive_reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  holder: {
    handover_id: string;
    driver: { id: string; name: string; phone: string };
    taken_at: string;
    service_item_id: string | null;
  } | null;
  open_request: { id: string; driver_id: string; created_at: string } | null;
}

export interface EtollTransaction {
  id: string;
  card_id: string;
  type: EtollTransactionType;
  amount: number | null;
  balance_after: number | null;
  source: 'MANUAL' | 'NFC';
  occurred_at: string;
  driver: { id: string; name: string } | null;
  request_id: string | null;
  handover_id: string | null;
  service_item_id: string | null;
  note: string | null;
  // Admin user id; null = the driver app.
  created_by: string | null;
  created_at: string;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
}

export interface EtollHandover {
  id: string;
  card_id: string;
  driver: { id: string; name: string; phone: string } | null;
  service_item_id: string | null;
  taken_at: string;
  // Admin user id; null = the driver in the app.
  taken_by: string | null;
  returned_at: string | null;
  returned_by: string | null;
  // RETURNED | TAKEN_OVER (another driver took it) | DEACTIVATED
  return_kind: string | null;
}

export interface EtollCardHistory {
  card: EtollCard;
  transactions: EtollTransaction[];
  handovers: EtollHandover[];
  // Admin user id → email, for "dicatat oleh".
  users: Record<string, string>;
}

// ─── Price list (Daftar Harga) ──────────────────────────────────────────────

/** "12H" | "FULLDAY" | "DROP" (the order form's service_kind vocabulary). */
export type PriceDuration = '12H' | 'FULLDAY' | 'DROP';

export interface PriceCar {
  id: string;
  // Website (Sanity) car slug, e.g. "toyota-avanza".
  slug: string;
  name: string;
  // "Avanza sekelas"
  price_class: string | null;
  note: string | null;
  sort_order: number;
  updated_at: string;
}

export interface PriceRate {
  id: string;
  car_id: string;
  duration: PriceDuration;
  // Rupiah; null = "tanya admin".
  amount: number | null;
  // Proposed by the team, the owner still has to confirm.
  is_proposal: boolean;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface PriceSurcharge {
  id: string;
  zone_id: string;
  area: string;
  amount: number;
  sort_order: number;
  updated_by: string | null;
  updated_at: string;
}

export interface PriceZone {
  id: string;
  // JABODETABEK, LUAR_KOTA, JAKARTA, BANDUNG, SURABAYA, DROP_JABODETABEK
  code: string;
  name: string;
  // "XOPS" (car + driver) or "ALL-IN X PARKIR".
  service_package: string;
  included: string;
  excluded: string;
  note: string | null;
  // The table for cities that have none of their own.
  default_for_unlisted: boolean;
  sort_order: number;
  updated_at: string;
  rates: PriceRate[];
  surcharges: PriceSurcharge[];
}

export interface PriceCity {
  id: string;
  slug: string;
  name: string;
  driver_zone_id: string | null;
  all_in_zone_id: string | null;
  // Priced per trip (abroad): no tables.
  quote: boolean;
  sort_order: number;
  updated_at: string;
}

export interface PriceExtra {
  id: string;
  // DRIVER_MEAL | DRIVER_LODGING | OVERTIME
  code: string;
  label: string;
  amount: number | null;
  // Overtime: percent of the Fullday price per hour.
  percent: number | null;
  // "hari" | "malam" | "jam"
  unit: string;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type PriceDeployStatus = 'SENT' | 'SKIPPED' | 'FAILED';

export interface PricePublication {
  id: string;
  created_at: string;
  // Admin user id.
  published_by: string | null;
  note: string | null;
  deploy_status: PriceDeployStatus;
}

export interface PriceListData {
  cars: PriceCar[];
  zones: PriceZone[];
  cities: PriceCity[];
  extras: PriceExtra[];
  last_publication: PricePublication | null;
  // Changes logged since the last publication.
  unpublished_changes: number;
  // Rates still marked "usulan"; publishing shows them on the website as official.
  // Optional until every API copy sends it (the dashboard counts them itself then).
  proposal_count?: number;
  // Admin user id → email.
  users: Record<string, string>;
}

export interface PriceChangeEntry {
  id: string;
  // rate | surcharge | extra | zone | city | car
  entity: string;
  entity_id: string;
  // The column, or "created" / "deleted" for a whole row.
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
  // "Avanza · All-in Jakarta · 12 jam"; null when the row is gone.
  label: string | null;
}

export interface PriceHistory {
  items: PriceChangeEntry[];
  users: Record<string, string>;
}

export interface PricePublications {
  items: PricePublication[];
  users: Record<string, string>;
}

export interface PricePublishResult {
  publication: PricePublication;
  snapshot: unknown;
}
