import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
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
      return res.data.data;
    },
  });
}

export function useOrdersSearch(params: OrdersSearchParams) {
  return useQuery<OrdersSearchResult>({
    queryKey: ["orders-search", params],
    queryFn: async () => {
      const res = await ordersApi.search(
        params as Record<string, string | number | undefined>,
      );
      return {
        data: res.data.data,
        pagination: res.data.pagination,
        summary: res.data.summary,
      };
    },
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: async () => {
      const res = await ordersApi.getById(id);
      return res.data.data;
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
    },
  });
}
