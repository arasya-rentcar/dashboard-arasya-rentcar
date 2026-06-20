import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi } from '@/lib/api';
import {
  ScheduleLine,
  ScheduleTotals,
  DriverAvailabilityEntry,
  PaginationMeta,
} from '@/types';

export interface ScheduleListParams {
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  external_vendor_id?: string;
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ScheduleListResult {
  items: ScheduleLine[];
  pagination: PaginationMeta;
  totals: ScheduleTotals;
}

export function useSchedule(params: ScheduleListParams) {
  return useQuery<ScheduleListResult>({
    queryKey: ['schedule', params],
    queryFn: async () => {
      const res = await scheduleApi.list(
        params as Record<string, string | number | undefined>,
      );
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

export function useDriverAvailability(date?: string, type?: string) {
  return useQuery<{ date: string; drivers: DriverAvailabilityEntry[] }>({
    queryKey: ['driver-availability', date, type],
    queryFn: async () => {
      const res = await scheduleApi.driverAvailability({ date, type });
      return res.data.data;
    },
  });
}

export interface StockUnitBooking {
  line_id: string;
  order_id?: string;
  order_code?: string | null;
  customer_name?: string;
  route: string;
  status: string;
}
export interface ScheduleStockResult {
  date: string;
  date_wib: string;
  drivers: {
    total: number;
    down: number;
    used: number;
    free: number;
    down_list: { id: string; name: string }[];
    used_list: { id: string; name: string; phone: string; bookings: StockUnitBooking[] }[];
    free_list: { id: string; name: string; phone: string }[];
  };
  cars: {
    total: number;
    down: number;
    used: number;
    free: number;
    down_list: { id: string; model: string; plate_number: string; unit_code: string | null }[];
    used_list: {
      id: string;
      model: string;
      plate_number: string;
      unit_code: string | null;
      bookings: StockUnitBooking[];
    }[];
    free_list: { id: string; model: string; plate_number: string; unit_code: string | null }[];
  };
}

export function useScheduleStock(date?: string) {
  return useQuery<ScheduleStockResult>({
    queryKey: ['schedule-stock', date],
    queryFn: async () => {
      const res = await scheduleApi.stock({ date });
      return res.data.data;
    },
  });
}

export function useAssignScheduleLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const res = await scheduleApi.assignLine(id, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['driver-availability'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSendConfirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      force,
    }: {
      id: string;
      force?: boolean;
    }) => {
      const res = await scheduleApi.sendConfirmation(id, { force });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}
