import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Driver, CreateDriverInput } from '@/types';

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await driversApi.list();
      return res.data.data;
    },
  });
}

export function useAvailableDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['drivers', 'available'],
    queryFn: async () => {
      const res = await driversApi.list();
      return (res.data.data as Driver[]).filter((d) => d.status === 'AVAILABLE');
    },
  });
}

export function useDriver(id: string) {
  return useQuery<Driver>({
    queryKey: ['drivers', id],
    queryFn: async () => {
      const res = await driversApi.getById(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDriverInput) => {
      const res = await driversApi.create(data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const res = await driversApi.update(id, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}
