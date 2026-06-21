import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { carsApi } from '@/lib/api';
import { Car, CreateCarInput } from '@/types';
import { parseResponse } from '@/lib/safeParse';
import { carListSchema } from '@/lib/schemas';

export function useCars() {
  return useQuery<Car[]>({
    queryKey: ['cars'],
    queryFn: async () => {
      const res = await carsApi.list();
      return parseResponse<Car[]>(carListSchema, res.data.data, 'useCars');
    },
  });
}

export function useAvailableCars() {
  return useQuery<Car[]>({
    queryKey: ['cars', 'available'],
    queryFn: async () => {
      const res = await carsApi.list();
      const cars = parseResponse<Car[]>(carListSchema, res.data.data, 'useAvailableCars');
      return cars.filter((c) => c.status === 'AVAILABLE');
    },
  });
}

export function useCar(id: string) {
  return useQuery<Car>({
    queryKey: ['cars', id],
    queryFn: async () => {
      const res = await carsApi.getById(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCarInput) => {
      const res = await carsApi.create(data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
}

export function useUpdateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const res = await carsApi.update(id, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
}

// Sprint 3: upload a car photo.
export function useUploadCarPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, photo }: { id: string; photo: File }) => {
      const res = await carsApi.uploadPhoto(id, photo);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
}
