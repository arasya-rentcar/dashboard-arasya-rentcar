import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { Customer, CustomerDetail, PaginationMeta } from '@/types';

export interface CustomersListParams {
  search?: string;
  tag?: string;
  sort?: string;
  order?: string;
  page?: number;
  page_size?: number;
}

export interface CustomersListResult {
  data: Customer[];
  pagination: PaginationMeta;
}

export function useCustomers(params: CustomersListParams) {
  return useQuery<CustomersListResult>({
    queryKey: ['customers', params],
    queryFn: async () => {
      const res = await customersApi.list(
        params as Record<string, string | number | undefined>,
      );
      return { data: res.data.data, pagination: res.data.pagination };
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: string, ordersPage = 1) {
  return useQuery<CustomerDetail>({
    queryKey: ['customers', id, ordersPage],
    queryFn: async () => {
      const res = await customersApi.getById(id, ordersPage);
      return res.data.data;
    },
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => customersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      customersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
