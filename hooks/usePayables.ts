import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payablesApi } from "@/lib/api";
import { invalidateMoney } from "@/hooks/useTripCosts";
import { parseResponse } from "@/lib/safeParse";
import { payablesResultSchema } from "@/lib/schemas";
import {
  Payable,
  PayableTotals,
  PaginationMeta,
  DriverPayableHistory,
  VendorPayableHistory,
  PayablesSummary,
} from "@/types";

export function usePayablesSummary(params: { date_from?: string; date_to?: string } = {}) {
  return useQuery<PayablesSummary>({
    queryKey: ["payables-summary", params],
    queryFn: async () => {
      const res = await payablesApi.summary(params);
      return res.data.data;
    },
  });
}

export interface PayablesListParams {
  kind?: string;
  status?: string;
  driver_id?: string;
  vendor_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PayablesListResult {
  items: Payable[];
  pagination: PaginationMeta;
  totals: PayableTotals;
}

export function usePayables(params: PayablesListParams) {
  return useQuery<PayablesListResult>({
    queryKey: ["payables", params],
    queryFn: async () => {
      const res = await payablesApi.list(
        params as Record<string, string | number | undefined>,
      );
      parseResponse(payablesResultSchema, res.data, "usePayables");
      const p = res.data.pagination;
      return {
        items: res.data.items,
        pagination: {
          page: p.page,
          page_size: p.page_size,
          total: p.total,
          page_count: p.total_pages ?? p.page_count,
        },
        totals: res.data.totals,
      };
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  // Extras and paid status show on the order page, vendor detail and reports too.
  invalidateMoney(qc);
  qc.invalidateQueries({ queryKey: ["vendor-detail2"] });
}

export function useUpdatePayable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const res = await payablesApi.update(id, data);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkPayablePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: object }) => {
      const res = await payablesApi.markPaid(id, data ?? {});
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkPayableUnpaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await payablesApi.markUnpaid(id);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useBulkMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { ids: string[]; paid_at?: string }) => {
      const res = await payablesApi.bulkMarkPaid(data);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDriverPayableHistory(driverId?: string) {
  return useQuery<DriverPayableHistory>({
    queryKey: ["driver-payables", driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const res = await payablesApi.driverHistory(driverId as string);
      return res.data.data;
    },
  });
}

export function useVendorPayableHistory(vendorId?: string) {
  return useQuery<VendorPayableHistory>({
    queryKey: ["vendor-payables", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const res = await payablesApi.vendorHistory(vendorId as string);
      return res.data.data;
    },
  });
}
