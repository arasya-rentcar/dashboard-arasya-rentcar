import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { externalVendorsApi } from '@/lib/api';
import {
  ExternalVendorListItem,
  ExternalVendorDetail,
  VendorDetail2,
  PaginationMeta,
} from '@/types';

export function useVendorDetail2(id?: string) {
  return useQuery<VendorDetail2>({
    queryKey: ['vendor-detail2', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await externalVendorsApi.detail(id as string);
      return res.data.data;
    },
  });
}

export interface VendorsListParams {
  search?: string;
  sort?: string;
  order?: string;
  page?: number;
  page_size?: number;
}

export interface VendorsListResult {
  data: ExternalVendorListItem[];
  pagination: PaginationMeta;
}

export function useExternalVendors(params: VendorsListParams) {
  return useQuery<VendorsListResult>({
    queryKey: ['external-vendors', params],
    queryFn: async () => {
      const res = await externalVendorsApi.list(
        params as Record<string, string | number | undefined>,
      );
      return { data: res.data.data, pagination: res.data.pagination };
    },
    placeholderData: (prev) => prev,
  });
}

export function useExternalVendor(
  id: string,
  pages: { cars_page?: number; orders_page?: number },
) {
  return useQuery<ExternalVendorDetail>({
    queryKey: ['external-vendors', id, pages],
    queryFn: async () => {
      const res = await externalVendorsApi.getById(id, pages);
      return res.data.data;
    },
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => externalVendorsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      externalVendorsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-vendors'] }),
  });
}

export function useAddVendorCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      externalVendorsApi.addCar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-vendors'] }),
  });
}

export function useDeleteVendorCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (carId: string) => externalVendorsApi.removeCar(carId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-vendors'] }),
  });
}
