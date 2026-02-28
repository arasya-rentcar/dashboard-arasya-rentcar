import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api';
import { TripStatus } from '@/types';

export function useAdvanceTripStatus(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, nextStatus }: { tripId: string; nextStatus: TripStatus }) => {
      const res = await tripsApi.nextStatus(tripId, nextStatus);
      return res.data.data;
    },
    onSuccess: () => {
      // Refresh the order detail so timeline + status update immediately
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
