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

export type TripStatus =
  | "DRIVER_ASSIGNED"
  | "DEPART_GARAGE"
  | "ARRIVE_AT_CUSTOMER"
  | "ON_TRIP"
  | "DROP_CUSTOMER"
  | "RETURN_GARAGE"
  | "ARRIVE_GARAGE"
  | "COMPLETED";

export type Actor = "ADMIN" | "DRIVER";

export type ExpenseType = "FUEL" | "TOLL" | "PARKING" | "OTHER";

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
  | "COMBINED";

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

export interface TripLog {
  id: string;
  trip_id: string;
  status: TripStatus;
  actor: Actor;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  type: ExpenseType;
  amount: string;
  note?: string;
  created_at: string;
}

export interface Trip {
  id: string;
  order_id: string;
  driver_id: string;
  driver: Driver;
  car_id: string;
  car: Car;
  current_status: TripStatus;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  logs: TripLog[];
  expenses: Expense[];
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
  ops_cost?: string | number | null;
  rtr_amount?: string | number | null;
  margin_amount?: string | number | null;
  driver_name_raw?: string | null;
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
  created_at: string;
  updated_at: string;
  trip?: Trip | null;
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
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED";

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
  plate_raw?: string | null;
  notes?: string | null;
  // #A1/#A2 trip-team confirmation badge state.
  confirmation_state?: ConfirmationState;
  confirmation_sent_at?: string | null;
  order?: {
    id: string;
    order_code?: string | null;
    customer_name: string;
    order_status: OrderStatus;
    payment_status: PaymentStatus;
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
  trip?: {
    id: string;
    current_status: TripStatus;
    driver: { name: string };
    car: { plate_number: string; model: string };
  } | null;
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
  created_at: string;
  updated_at: string;
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
  orders: CustomerOrderRow[];
  orders_pagination: PaginationMeta;
}

// ─── External vendors ──────────────────────────────────────────────────────────

export interface ExternalVendorListItem {
  id: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
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
