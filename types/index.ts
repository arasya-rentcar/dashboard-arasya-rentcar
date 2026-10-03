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
  | "CANCELLATION_FEE";

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
  amount: string;
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

export interface OrderServiceItem {
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
  // Sprint 5: refund settlement.
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
}

// One finished (DONE) service line for the Trip History tab. finance_status:
// FINALIZED = parent order is DONE (money fields trustworthy); AWAITING = line
// done but order not finalized yet (render money as "Pending").
export interface TripHistoryRow {
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

export interface FinalOrderListItem extends OrderListItem {
  final_finance: OrderFinalFinance | null;
  sheet_import_rows?: SheetImportRow[];
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
  service_items?: {
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
  }[];
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
  service_items?: {
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
  }[];
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
}

export interface ReviseInvoiceInput {
  amount: number;
  payment_method?: PaymentMethod;
  note?: string;
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

export interface DashboardAnalytics {
  receivables: {
    dp_pending: number;
    settlement_due: number;
    unbilled: number;
    total: number;
  };
  aging: { receivables: AgingBuckets; payables: AgingBuckets };
  margin: { top: MarginRow[]; bottom: MarginRow[] };
  cashflow: { inflow_7d: number; outflow_7d: number; net_7d: number };
  leaderboard: { drivers: DriverLeader[]; vendors: VendorLeader[] };
  mix: {
    internal: { trips: number; revenue: number };
    external: { trips: number; revenue: number };
  };
  car_utilization: CarUtil[];
  monthly_trend: MonthlyTrendRow[];
  frequency?: FrequencyBreakdown;
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
}

// ── Dashboard v2 — single-page owner/finance view ────────────────────────────
export interface DashV2Accrual {
  revenue: number;
  ops_cost: number;
  driver_cost: number;
  vendor_cost: number;
  margin: number;
  margin_pct: number | null;
  trips: number;
}
export interface DashV2Cash {
  collected: number;
  paid_out: number;
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
