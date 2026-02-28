// ─── Enums ──────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'DRIVER';

export type DriverStatus = 'AVAILABLE' | 'ON_DUTY' | 'OFF';

export type CarStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';

export type OrderStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'DP_PAID' | 'PAID';

export type TripStatus =
  | 'DRIVER_ASSIGNED'
  | 'DEPART_GARAGE'
  | 'ARRIVE_AT_CUSTOMER'
  | 'ON_TRIP'
  | 'DROP_CUSTOMER'
  | 'RETURN_GARAGE'
  | 'ARRIVE_GARAGE'
  | 'COMPLETED';

export type Actor = 'ADMIN' | 'DRIVER';

export type ExpenseType = 'FUEL' | 'TOLL' | 'PARKING' | 'OTHER';

export type InvoiceStatus = 'ISSUED' | 'PAID';

export type InvoiceType = 'DP' | 'SETTLEMENT' | 'FULL';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'QRIS' | 'OTHER';

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
  status: DriverStatus;
  user?: {
    email: string;
  };
}

export interface Car {
  id: string;
  plate_number: string;
  model: string;
  status: CarStatus;
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
  created_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  dropoff_location: string;
  order_date: string;
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
  pickup_location: string;
  dropoff_location: string;
  order_date: string;
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
  }[];
}

// ─── API Inputs ──────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  dropoff_location: string;
  order_date: string;
  final_price: number;
}

export interface UpdateOrderInput {
  customer_name?: string;
  customer_phone?: string;
  pickup_location?: string;
  dropoff_location?: string;
  order_date?: string;
  final_price?: number;
  payment_status?: PaymentStatus;
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
  model: string;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
}

export interface AuthResponse {
  status: 'success';
  data: {
    token: string;
    user: User;
  };
}
