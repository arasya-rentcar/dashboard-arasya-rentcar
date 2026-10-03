import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, tripCostsApi } from '@/lib/api';
import type { DriverFeePresets } from '@/types';

/** Driver fee table for the quick buttons in Edit Hari (changes rarely). */
export function useDriverFeePresets() {
  return useQuery<DriverFeePresets>({
    queryKey: ['driver-fee-presets'],
    queryFn: async () => (await scheduleApi.driverFeePresets()).data.data,
    staleTime: 60 * 60 * 1000,
  });
}

// A reviewed cost changes the day's margin, the order totals (billed costs
// become extra charges), the driver payable and the schedule rows.
function invalidateCostViews(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['orders'] });
  qc.invalidateQueries({ queryKey: ['orders-search'] });
  qc.invalidateQueries({ queryKey: ['schedule'] });
  qc.invalidateQueries({ queryKey: ['payables'] });
  qc.invalidateQueries({ queryKey: ['driver-payables'] });
  qc.invalidateQueries({ queryKey: ['vendor-payables'] });
}

export function useUpdateTripCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) =>
      (await tripCostsApi.update(id, data)).data.data,
    onSuccess: () => invalidateCostViews(qc),
  });
}

export function useCreateTripCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, data }: { lineId: string; data: object }) =>
      (await tripCostsApi.create(lineId, data)).data.data,
    onSuccess: () => invalidateCostViews(qc),
  });
}

export function useDeleteTripCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await tripCostsApi.remove(id)).data.data,
    onSuccess: () => invalidateCostViews(qc),
  });
}
