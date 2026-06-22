import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: () => api.get("/orders"),
  search: (params: Record<string, string | number | undefined>) =>
    api.get("/orders/search", { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: object) => api.post("/orders", data),
  update: (id: string, data: object) => api.put(`/orders/${id}`, data),
  updateFinance: (id: string, data: object) =>
    api.put(`/orders/${id}/finance`, data),
  assign: (id: string, data: { driver_id: string; car_id: string }) =>
    api.post(`/orders/${id}/assign`, data),
  generateInvoice: (id: string, data: object) =>
    api.post(`/orders/${id}/generate-invoice`, data),
  reviseInvoice: (id: string, invoiceId: string, data: object) =>
    api.post(`/orders/${id}/invoice/${invoiceId}/revise`, data),
  sendInvoiceWhatsapp: (id: string, invoiceId: string, data: object) =>
    api.post(`/orders/${id}/invoice/${invoiceId}/send-whatsapp`, data),
  // Send the kwitansi (receipt) PDF to the customer over WhatsApp. Only valid
  // once the invoice is PAID and a receipt PDF exists.
  sendReceiptWhatsapp: (id: string, invoiceId: string, data: object) =>
    api.post(`/orders/${id}/invoice/${invoiceId}/send-receipt-whatsapp`, data),
  // Sprint 3: mark-paid is multipart — a payment proof file is REQUIRED.
  markInvoicePaid: (
    id: string,
    invoiceId: string,
    data: {
      proof: File;
      payment_method?: string;
      paid_at?: string;
      amount_received?: number;
    },
  ) => {
    const fd = new FormData();
    fd.append("proof", data.proof);
    if (data.payment_method) fd.append("payment_method", data.payment_method);
    if (data.paid_at) fd.append("paid_at", data.paid_at);
    if (data.amount_received != null)
      fd.append("amount_received", String(data.amount_received));
    return api.post(`/orders/${id}/invoice/${invoiceId}/mark-paid`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getPaymentProof: (id: string, invoiceId: string) =>
    api.get(`/orders/${id}/invoice/${invoiceId}/payment-proof`),
  // Sprint 5: mark refund settled — multipart, refund proof REQUIRED.
  markRefunded: (
    id: string,
    data: { proof: File; amount?: number; note?: string },
  ) => {
    const fd = new FormData();
    fd.append("proof", data.proof);
    if (data.amount != null) fd.append("amount", String(data.amount));
    if (data.note) fd.append("note", data.note);
    return api.post(`/orders/${id}/mark-refunded`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getRefundProof: (id: string) => api.get(`/orders/${id}/refund-proof`),
  getInvoices: (id: string) => api.get(`/orders/${id}/invoice`),
  getStatement: (id: string, invoiceIds?: string[]) =>
    invoiceIds && invoiceIds.length > 0
      ? api.post(`/orders/${id}/statement`, { invoice_ids: invoiceIds })
      : api.get(`/orders/${id}/statement`),
  addAdjustment: (id: string, data: object) =>
    api.post(`/orders/${id}/adjustments`, data),
};

export const finalOrdersApi = {
  list: () => api.get("/final-orders"),
  getById: (id: string) => api.get(`/final-orders/${id}`),
};

export const sheetImportsApi = {
  preview: (data: object = {}) => api.post("/sheet-imports/preview", data),
  import: (data: object = {}) => api.post("/sheet-imports/import", data),
  latest: () => api.get("/sheet-imports/latest"),
};

// ─── Customers ─────────────────────────────────────────────────

export const customersApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/customers", { params }),
  getById: (id: string, ordersPage = 1) =>
    api.get(`/customers/${id}`, { params: { orders_page: ordersPage } }),
  create: (data: object) => api.post("/customers", data),
  update: (id: string, data: object) => api.put(`/customers/${id}`, data),
};

// ─── External vendors ───────────────────────────────────────

export const externalVendorsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/external-vendors", { params }),
  getById: (
    id: string,
    params: { cars_page?: number; orders_page?: number } = {},
  ) => api.get(`/external-vendors/${id}`, { params }),
  detail: (id: string) => api.get(`/external-vendors/${id}/detail`),
  create: (data: object) => api.post("/external-vendors", data),
  update: (id: string, data: object) =>
    api.put(`/external-vendors/${id}`, data),
  remove: (id: string) => api.delete(`/external-vendors/${id}`),
  addCar: (id: string, data: object) =>
    api.post(`/external-vendors/${id}/cars`, data),
  updateCar: (carId: string, data: object) =>
    api.put(`/external-vendors/cars/${carId}`, data),
  removeCar: (carId: string) =>
    api.delete(`/external-vendors/cars/${carId}`),
};

// ─── Schedule ────────────────────────────────────────────────────────────────

export const scheduleApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/schedule", { params }),
  driverAvailability: (params: { date?: string; type?: string } = {}) =>
    api.get("/schedule/driver-availability", { params }),
  stock: (params: { date?: string } = {}) =>
    api.get("/schedule/stock", { params }),
  assignLine: (id: string, data: object) =>
    api.put(`/schedule/lines/${id}`, data),
  // #A1/#A2 trip-team confirmation (customer + driver). force=re-send.
  sendConfirmation: (id: string, data: { include_driver?: boolean; force?: boolean } = {}) =>
    api.post(`/schedule/lines/${id}/send-confirmation`, data),
};

// ─── Payables (Tagihan Driver / Vendor) ──────────────────────────────────────

export const analyticsApi = {
  dashboard: (params: Record<string, string | undefined> = {}) =>
    api.get("/analytics/dashboard", { params }),
  dashboardV2: (params: Record<string, string | undefined> = {}) =>
    api.get("/analytics/dashboard-v2", { params }),
  revenue: (params: Record<string, string | undefined> = {}) =>
    api.get("/analytics/revenue", { params }),
};

export const payablesApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/payables", { params }),
  summary: (params: Record<string, string | undefined> = {}) =>
    api.get("/payables/summary", { params }),
  getById: (id: string) => api.get(`/payables/${id}`),
  update: (id: string, data: object) => api.put(`/payables/${id}`, data),
  markPaid: (id: string, data: object = {}) =>
    api.post(`/payables/${id}/mark-paid`, data),
  markUnpaid: (id: string) => api.post(`/payables/${id}/mark-unpaid`),
  bulkMarkPaid: (data: { ids: string[]; paid_at?: string }) =>
    api.post(`/payables/bulk-mark-paid`, data),
  driverHistory: (id: string) => api.get(`/payables/driver/${id}/history`),
  vendorHistory: (id: string) => api.get(`/payables/vendor/${id}/history`),
};

// ─── Drivers ─────────────────────────────────────────────────────────────────

export const driversApi = {
  list: () => api.get("/drivers"),
  getById: (id: string) => api.get(`/drivers/${id}`),
  detail: (id: string) => api.get(`/drivers/${id}/detail`),
  create: (data: object) => api.post("/drivers", data),
  update: (id: string, data: object) => api.put(`/drivers/${id}`, data),
};

// ─── Cars ─────────────────────────────────────────────────────────────────────

export const carsApi = {
  list: () => api.get("/cars"),
  getById: (id: string) => api.get(`/cars/${id}`),
  create: (data: object) => api.post("/cars", data),
  update: (id: string, data: object) => api.put(`/cars/${id}`, data),
  // Sprint 3: upload a car photo (multipart, field "photo").
  uploadPhoto: (id: string, photo: File) => {
    const fd = new FormData();
    fd.append("photo", photo);
    return api.post(`/cars/${id}/photo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => api.get("/users"),
};

export default api;
