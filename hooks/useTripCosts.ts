import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, tripCostsApi } from '@/lib/api';
import { DriverFeePresets } from '@/types';

/** Everything a fee / trip-cost change can move: order page, payables, schedule, reports. */
export function invalidateMoney(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['orders'] });
  qc.invalidateQueries({ queryKey: ['orders-search'] });
  qc.invalidateQueries({ queryKey: ['payables'] });
  qc.invalidateQueries({ queryKey: ['payables-summary'] });
  qc.invalidateQueries({ queryKey: ['driver-payables'] });
  qc.invalidateQueries({ queryKey: ['vendor-payables'] });
  qc.invalidateQueries({ queryKey: ['schedule'] });
  qc.invalidateQueries({ queryKey: ['trip-history'] });
  qc.invalidateQueries({ queryKey: ['dashboard-analytics'] });
  qc.invalidateQueries({ queryKey: ['dashboard-v2'] });
  qc.invalidateQueries({ queryKey: ['revenue-report'] });
}

export function useDriverFeePresets() {
  return useQuery<DriverFeePresets>({
    queryKey: ['driver-fee-presets'],
    queryFn: async () => (await scheduleApi.feePresets()).data.data,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCreateTripCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, data }: { lineId: string; data: object }) =>
      (await tripCostsApi.create(lineId, data)).data.data,
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useUpdateTripCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) =>
      (await tripCostsApi.update(id, data)).data.data,
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteTripCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await tripCostsApi.remove(id)).data.data,
    onSuccess: () => invalidateMoney(qc),
  });
}
