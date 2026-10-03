import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi } from '@/lib/api';
import {
  ScheduleLine,
  ScheduleTotals,
  DriverAvailabilityEntry,
  PaginationMeta,
  TripHistoryRow,
  ScheduleWeekResult,
  SendConfirmationResult,
} from '@/types';

export interface ScheduleListParams {
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  external_vendor_id?: string;
  type?: string;
  status?: string;
  search?: string;
  /** 'true': open trips dated before yesterday (WIB), see "Belum ditutup". */
  overdue?: string;
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

export function useScheduleWeek(from?: string, resource: 'drivers' | 'cars' = 'drivers') {
  return useQuery<ScheduleWeekResult>({
    queryKey: ['schedule-week', from ?? 'current', resource],
    queryFn: async () => {
      const res = await scheduleApi.week({ from, resource });
      return res.data.data;
    },
  });
}

export interface TripHistoryParams {
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  car_id?: string;
  finance?: 'all' | 'finalized' | 'awaiting';
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TripHistoryResult {
  items: TripHistoryRow[];
  pagination: PaginationMeta;
}

export function useTripHistory(params: TripHistoryParams) {
  return useQuery<TripHistoryResult>({
    queryKey: ['trip-history', params],
    queryFn: async () => {
      const res = await scheduleApi.history(
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
      };
    },
  });
}

/**
 * Availability-aware busy sets for a given WIB date, derived from the schedule
 * stock monitor. Returns the set of driver_ids and car_ids that already have an
 * active (SCHEDULED/IN_PROGRESS) line on that date, so assignment selects can
 * render them DISABLED (show-but-disable) instead of removing them.
 *
 * `excludeLineId` keeps the CURRENT line's own driver/car selectable: a unit
 * busy only because of this very line must not be disabled (you can keep it).
 */
export function useBusyUnits(date?: string, excludeLineId?: string) {
  const { data } = useScheduleStock(date);
  const driverBusy = new Set<string>();
  const carBusy = new Set<string>();
  if (data) {
    for (const d of data.drivers.used_list) {
      const onlyThisLine =
        excludeLineId != null &&
        d.bookings.length > 0 &&
        d.bookings.every((b) => b.line_id === excludeLineId);
      if (!onlyThisLine) driverBusy.add(d.id);
    }
    for (const c of data.cars.used_list) {
      const onlyThisLine =
        excludeLineId != null &&
        c.bookings.length > 0 &&
        c.bookings.every((b) => b.line_id === excludeLineId);
      if (!onlyThisLine) carBusy.add(c.id);
    }
  }
  return { driverBusy, carBusy, hasData: !!data };
}

/**
 * Multi-date busy sets: a unit is busy if booked (active line) on ANY of the
 * given WIB dates. Used by the order-level "assign for all" form, whose lines
 * may span several days. Up to 7 distinct dates are queried (hook order is
 * stable because we always map the same fixed-length, padded slot array).
 */
export function useBusyUnitsMulti(dates: string[]) {
  const unique = Array.from(new Set(dates.filter(Boolean))).slice(0, 7);
  // Fixed 7 slots so the number of hooks never changes between renders.
  const slots: (string | undefined)[] = Array.from(
    { length: 7 },
    (_, i) => unique[i],
  );
  const q0 = useScheduleStock(slots[0]);
  const q1 = useScheduleStock(slots[1]);
  const q2 = useScheduleStock(slots[2]);
  const q3 = useScheduleStock(slots[3]);
  const q4 = useScheduleStock(slots[4]);
  const q5 = useScheduleStock(slots[5]);
  const q6 = useScheduleStock(slots[6]);
  const results = [q0, q1, q2, q3, q4, q5, q6];
  const driverBusy = new Set<string>();
  const carBusy = new Set<string>();
  results.forEach((r, i) => {
    if (!slots[i] || !r.data) return;
    for (const d of r.data.drivers.used_list) driverBusy.add(d.id);
    for (const c of r.data.cars.used_list) carBusy.add(c.id);
  });
  return { driverBusy, carBusy };
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
      queryClient.invalidateQueries({ queryKey: ['schedule-week'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stock'] });
      queryClient.invalidateQueries({ queryKey: ['driver-availability'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // The day's fee / uang jalan drive its driver payable.
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      queryClient.invalidateQueries({ queryKey: ['driver-payables'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payables'] });
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
      // data.customer.wa_url is set in manual WhatsApp mode.
      return res.data.data as SendConfirmationResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}
