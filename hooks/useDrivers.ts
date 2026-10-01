import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/lib/api';
import { Driver, CreateDriverInput, DriverDetail } from '@/types';
import { parseResponse } from '@/lib/safeParse';
import { driverListSchema } from '@/lib/schemas';

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await driversApi.list();
      return parseResponse<Driver[]>(driverListSchema, res.data.data, 'useDrivers');
    },
  });
}

export function useAvailableDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['drivers', 'available'],
    queryFn: async () => {
      const res = await driversApi.list();
      const drivers = parseResponse<Driver[]>(driverListSchema, res.data.data, 'useAvailableDrivers');
      return drivers.filter((d) => d.status === 'AVAILABLE');
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

export function useDriverDetail(id?: string) {
  return useQuery<DriverDetail>({
    queryKey: ['driver-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await driversApi.detail(id as string);
      return res.data.data;
    },
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

// Sets the password the driver uses (with their phone number) to log in to the
// driver app. Write-only: existing passwords are never returned.
export function useSetDriverAppPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await driversApi.setAppPassword(id, password);
      return res.data;
    },
  });
}
