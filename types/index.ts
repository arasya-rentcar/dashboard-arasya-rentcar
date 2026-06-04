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

export type InvoiceType = "DP" | "SETTLEMENT" | "FULL" | "ADDITIONAL";

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
  amount: string;
  note?: string;
  file_url?: string;
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
  pickup_location: string;
  dropoff_location: string;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  notes?: string | null;
  sort_order?: number;
  created_at?: string;
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
}

// ─── List-view minimal order (from listOrders) ──────────────────────────────

export interface OrderListItem {
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
    created_at?: string;
    delivery_logs?: InvoiceDeliveryLog[];
  }[];
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
