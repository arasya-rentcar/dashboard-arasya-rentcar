'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface OrderFilters {
  search: string;
  bucket: string;
  order_status: string;
  payment_status: string;
  source: string;
  has_finance: string;
  date_field: string;
  date_from: string;
  date_to: string;
}

export const DEFAULT_FILTERS: OrderFilters = {
  search: '',
  bucket: 'ALL',
  order_status: 'ALL',
  payment_status: 'ALL',
  source: 'ALL',
  has_finance: 'ALL',
  date_field: 'order_date',
  date_from: '',
  date_to: '',
};

const PRESETS_KEY = 'arasya.orderFilterPresets.v1';

export interface FilterPreset {
  name: string;
  filters: OrderFilters;
}

function fromParams(sp: URLSearchParams): OrderFilters {
  const get = (k: keyof OrderFilters) =>
    sp.get(k) ?? DEFAULT_FILTERS[k];
  return {
    search: get('search'),
    bucket: get('bucket'),
    order_status: get('order_status'),
    payment_status: get('payment_status'),
    source: get('source'),
    has_finance: get('has_finance'),
    date_field: get('date_field'),
    date_from: get('date_from'),
    date_to: get('date_to'),
  };
}

/** Filters synced to the URL query string (shareable/bookmarkable). */
export function useOrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFiltersState] = useState<OrderFilters>(() =>
    fromParams(new URLSearchParams(searchParams.toString())),
  );

  // Push filter changes into the URL (replace, no history spam).
  useEffect(() => {
    const sp = new URLSearchParams();
    (Object.keys(filters) as (keyof OrderFilters)[]).forEach((k) => {
      if (filters[k] && filters[k] !== DEFAULT_FILTERS[k]) {
        sp.set(k, filters[k]);
      }
    });
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilter = useCallback(
    (key: keyof OrderFilters, value: string) =>
      setFiltersState((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const setFilters = useCallback(
    (next: OrderFilters) => setFiltersState(next),
    [],
  );

  const clear = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);

  const hasActive = (Object.keys(filters) as (keyof OrderFilters)[]).some(
    (k) => filters[k] !== DEFAULT_FILTERS[k],
  );

  return { filters, setFilter, setFilters, clear, hasActive };
}

/** Saved filter presets, persisted to localStorage. */
export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) setPresets(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: FilterPreset[]) => {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const savePreset = useCallback(
    (name: string, filters: OrderFilters) => {
      const next = [
        ...presets.filter((p) => p.name !== name),
        { name, filters },
      ];
      persist(next);
    },
    [presets, persist],
  );

  const deletePreset = useCallback(
    (name: string) => persist(presets.filter((p) => p.name !== name)),
    [presets, persist],
  );

  return { presets, savePreset, deletePreset };
}
