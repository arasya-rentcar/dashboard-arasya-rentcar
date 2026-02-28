import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { OrderListItem, Order, CreateOrderInput, UpdateOrderInput, AssignOrderInput, GenerateInvoiceInput } from '@/types';

export function useOrders() {
  return useQuery<OrderListItem[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await ordersApi.list();
      return res.data.data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ['orders', id],
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrderInput }) => {
      const res = await ordersApi.update(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
    },
  });
}

export function useAssignOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssignOrderInput }) => {
      const res = await ordersApi.assign(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GenerateInvoiceInput }) => {
      const res = await ordersApi.generateInvoice(id, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
    },
  });
}
