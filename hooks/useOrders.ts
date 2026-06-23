import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import { parseResponse } from "@/lib/safeParse";
import {
  orderListSchema,
  orderDetailSchema,
  ordersSearchResultSchema,
} from "@/lib/schemas";

// Invalidate EVERY order-related view in one place. The list page uses
// ["orders-search", params], the dashboard uses ["orders"], and detail uses
// ["orders", id]. Missing any of these = stale UI until manual refresh.
function invalidateOrderViews(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["orders-search"] });
  if (id) queryClient.invalidateQueries({ queryKey: ["orders", id] });
}
import {
  OrderListItem,
  Order,
  CreateOrderInput,
  UpdateOrderInput,
  AssignOrderInput,
  GenerateInvoiceInput,
  ReviseInvoiceInput,
  SendInvoiceWhatsappInput,
  OrdersSearchResult,
  OrdersSearchParams,
} from "@/types";

export function useOrders() {
  return useQuery<OrderListItem[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await ordersApi.list();
      return parseResponse<OrderListItem[]>(orderListSchema, res.data.data, "useOrders");
    },
    placeholderData: keepPreviousData,
  });
}

export function useOrdersSearch(params: OrdersSearchParams) {
  return useQuery<OrdersSearchResult>({
    queryKey: ["orders-search", params],
    queryFn: async () => {
      const res = await ordersApi.search(
        params as Record<string, string | number | undefined>,
      );
      const result = {
        data: res.data.data,
        pagination: res.data.pagination,
        summary: res.data.summary,
      };
      return parseResponse<OrdersSearchResult>(ordersSearchResultSchema, result, "useOrdersSearch");
    },
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: async () => {
      const res = await ordersApi.getById(id);
      return parseResponse<Order>(orderDetailSchema, res.data.data, "useOrder");
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const res = await ordersApi.create(data);
      return res.data.data;
    },
    onSuccess: () => {
      invalidateOrderViews(queryClient);
    },
  });
}

export function useAddAdjustment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      type: string;
      description: string;
      amount: number;
      quantity?: number;
      is_billable?: boolean;
    }) => {
      const res = await ordersApi.addAdjustment(id, data);
      return res.data.data;
    },
    onSuccess: () => {
      invalidateOrderViews(queryClient, id);
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateOrderInput;
    }) => {
      const res = await ordersApi.update(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useUpdateOrderFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const res = await ordersApi.updateFinance(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useAssignOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: AssignOrderInput;
    }) => {
      const res = await ordersApi.assign(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useReassignOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: AssignOrderInput;
    }) => {
      const res = await ordersApi.reassign(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export interface CancelOrderResult {
  tier: 1 | 2 | 3;
  penalty: number;
  originalFinalPrice: number;
  paidToDate: number;
  refundDue: number;
  stillOwed: number;
  cancellationInvoiceNumber: string | null;
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string;
      reason: string;
    }): Promise<CancelOrderResult> => {
      const res = await ordersApi.cancel(id, { reason });
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

// Admin-only finalize: order_status -> DONE. Only valid once every active
// day-line is DONE (server enforces a 409 otherwise).
export function useFinalizeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await ordersApi.finalize(id);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: GenerateInvoiceInput;
    }) => {
      const res = await ordersApi.generateInvoice(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useReviseInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      invoiceId,
      data,
    }: {
      id: string;
      invoiceId: string;
      data: ReviseInvoiceInput;
    }) => {
      const res = await ordersApi.reviseInvoice(id, invoiceId, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useSendInvoiceWhatsapp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      invoiceId,
      data,
    }: {
      id: string;
      invoiceId: string;
      data: SendInvoiceWhatsappInput;
    }) => {
      const res = await ordersApi.sendInvoiceWhatsapp(id, invoiceId, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useSendReceiptWhatsapp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      invoiceId,
      data,
    }: {
      id: string;
      invoiceId: string;
      data: SendInvoiceWhatsappInput;
    }) => {
      const res = await ordersApi.sendReceiptWhatsapp(id, invoiceId, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      invoiceId,
      data,
    }: {
      id: string;
      invoiceId: string;
      // Sprint 3: proof file is required.
      data: {
        proof: File;
        payment_method?: string;
        paid_at?: string;
        amount_received?: number;
      };
    }) => {
      const res = await ordersApi.markInvoicePaid(id, invoiceId, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}

// Sprint 5: mark refund settled (refund proof file REQUIRED).
export function useMarkRefunded() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { proof: File; amount?: number; note?: string };
    }) => {
      const res = await ordersApi.markRefunded(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      invalidateOrderViews(queryClient, variables.id);
    },
  });
}
