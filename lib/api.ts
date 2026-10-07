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
  // Overwrite the driver/car on all not-yet-started internal lines of an
  // already-assigned order (e.g. swap driver on a multi-day order).
  reassign: (id: string, data: { driver_id: string; car_id: string }) =>
    api.post(`/orders/${id}/reassign`, data),
  // Full-order cancellation. Server computes the cancellation-fee tier/penalty.
  cancel: (id: string, data: { reason: string }) =>
    api.post(`/orders/${id}/cancel`, data),
  // Admin-only order finalization. Valid once every active day-line is DONE
  // (driver finished all service days). Sets order_status = DONE.
  finalize: (id: string) => api.post(`/orders/${id}/finalize`, {}),
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

export const invoicesApi = {
  search: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/invoices", { params }),
};

export const sheetImportsApi = {
  preview: (data: object = {}) => api.post("/sheet-imports/preview", data),
  import: (data: object = {}) => api.post("/sheet-imports/import", data),
  latest: () => api.get("/sheet-imports/latest"),
};

// ─── Website leads (booking form on the public website) ─────────────────────

export const leadsApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/leads", { params }),
  getById: (id: string) => api.get(`/leads/${id}`),
  ignore: (id: string, data: { reason?: string } = {}) =>
    api.post(`/leads/${id}/ignore`, data),
  reopen: (id: string) => api.post(`/leads/${id}/reopen`, {}),
  link: (id: string, data: { order_id: string }) =>
    api.post(`/leads/${id}/link`, data),
};

// ─── Customers ─────────────────────────────────────────────────

export const customersApi = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/customers", { params }),
  getById: (id: string, ordersPage = 1) =>
    api.get(`/customers/${id}`, { params: { orders_page: ordersPage } }),
  create: (data: object) => api.post("/customers", data),
  update: (id: string, data: object) => api.put(`/customers/${id}`, data),
  // Returning-customer lookup by phone (data is null when unknown).
  lookup: (phone: string) =>
    api.get("/customers/lookup", { params: { phone } }),
  uploadDocument: (
    id: string,
    data: { file: File; kind: string; note?: string },
  ) => {
    const fd = new FormData();
    fd.append("file", data.file);
    fd.append("kind", data.kind);
    if (data.note) fd.append("note", data.note);
    return api.post(`/customers/${id}/documents`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Short-lived signed URL; fetch on every click, never store it.
  documentUrl: (id: string, docId: string) =>
    api.get(`/customers/${id}/documents/${docId}/url`),
  deleteDocument: (id: string, docId: string) =>
    api.delete(`/customers/${id}/documents/${docId}`),
  verify: (id: string, verified: boolean) =>
    api.post(`/customers/${id}/verify`, { verified }),
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
  history: (params: Record<string, string | number | undefined> = {}) =>
    api.get("/schedule/history", { params }),
  week: (params: { from?: string; resource?: string } = {}) =>
    api.get("/schedule/week", { params }),
  assignLine: (id: string, data: object) =>
    api.put(`/schedule/lines/${id}`, data),
  // #A1/#A2 trip-team confirmation (customer + driver). force=re-send.
  sendConfirmation: (id: string, data: { include_driver?: boolean; force?: boolean } = {}) =>
    api.post(`/schedule/lines/${id}/send-confirmation`, data),
  // Driver fee table (quick buttons in Edit Hari).
  driverFeePresets: () => api.get("/schedule/driver-fee-presets"),
};

// ─── Trip costs (expenses on a day; driver-app costs wait for review) ───────

export const tripCostsApi = {
  create: (lineId: string, data: object) => api.post(`/lines/${lineId}/expenses`, data),
  update: (id: string, data: object) => api.patch(`/lines/expenses/${id}`, data),
  remove: (id: string) => api.delete(`/lines/expenses/${id}`),
};

// ─── Admin notifications (bell) & driver requests (e-toll top-up) ──────────

export const notificationsApi = {
  list: (params: { limit?: number; before?: string; unread?: 1 } = {}) =>
    api.get("/notifications", { params }),
  // Cheap poll (every 15 s): count + id/time of the newest item.
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (data: { ids?: string[]; all?: boolean }) =>
    api.post("/notifications/read", data),
};

export const driverRequestsApi = {
  list: (params: { status?: "OPEN" | "DONE" | "ALL" } = {}) =>
    api.get("/driver-requests", { params }),
  // amount records the top-up on the card (the request's, or card_id).
  markDone: (
    id: string,
    data: { note?: string; card_id?: string; amount?: number; balance_after?: number } = {},
  ) => api.post(`/driver-requests/${id}/done`, data),
};

// ─── Office e-toll cards ─────────────────────────────────────────────────────

export const etollCardsApi = {
  list: (params: { status?: "ACTIVE" | "INACTIVE" | "ALL" } = {}) =>
    api.get("/etoll-cards", { params }),
  // The card with its history (transactions + handovers).
  get: (id: string) => api.get(`/etoll-cards/${id}`),
  create: (data: object) => api.post("/etoll-cards", data),
  update: (id: string, data: object) => api.patch(`/etoll-cards/${id}`, data),
  remove: (id: string) => api.delete(`/etoll-cards/${id}`),
  addTransaction: (id: string, data: object) =>
    api.post(`/etoll-cards/${id}/transactions`, data),
  voidTransaction: (txId: string, data: { reason?: string } = {}) =>
    api.post(`/etoll-cards/transactions/${txId}/void`, data),
  give: (id: string, data: { driver_id: string; balance?: number }) =>
    api.post(`/etoll-cards/${id}/give`, data),
  returnCard: (id: string, data: { balance?: number } = {}) =>
    api.post(`/etoll-cards/${id}/return`, data),
};

// ─── Price list (Daftar Harga) ───────────────────────────────────────────────

// Every write answers with the whole list, same as get().
export const pricesApi = {
  get: () => api.get("/prices"),
  updateRates: (data: {
    items: {
      id: string;
      amount: number | null;
      is_proposal?: boolean;
      note?: string | null;
      expected_updated_at?: string;
    }[];
  }) => api.patch("/prices/rates", data),
  createSurcharge: (data: { zone_id: string; area: string; amount: number }) =>
    api.post("/prices/surcharges", data),
  // expected_updated_at on every PATCH/DELETE: 409 when another admin changed the row since.
  updateSurcharge: (id: string, data: { area?: string; amount?: number; expected_updated_at?: string }) =>
    api.patch(`/prices/surcharges/${id}`, data),
  // In the query string: some proxies drop DELETE bodies.
  removeSurcharge: (id: string, params: { expected_updated_at?: string } = {}) =>
    api.delete(`/prices/surcharges/${id}`, { params }),
  updateZone: (id: string, data: object) => api.patch(`/prices/zones/${id}`, data),
  updateExtra: (id: string, data: object) => api.patch(`/prices/extras/${id}`, data),
  updateCity: (id: string, data: object) => api.patch(`/prices/cities/${id}`, data),
  createCar: (data: { slug: string; name: string; price_class?: string | null }) =>
    api.post("/prices/cars", data),
  updateCar: (id: string, data: object) => api.patch(`/prices/cars/${id}`, data),
  history: (params: { limit?: number } = {}) => api.get("/prices/history", { params }),
  publications: (params: { limit?: number } = {}) => api.get("/prices/publications", { params }),
  // 201 published, 200 resend of the same client_ref.
  // 409 while proposal prices exist and confirm_proposals is not true.
  publish: (data: { note?: string; client_ref: string; confirm_proposals?: boolean }) =>
    api.post("/prices/publish", data),
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
  // Driver app login: the driver signs in with their phone number + this password.
  setAppPassword: (id: string, password: string) =>
    api.put(`/drivers/${id}/app-password`, { password }),
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
