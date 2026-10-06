import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pricesApi } from '@/lib/api';
import { parseResponse } from '@/lib/safeParse';
import {
  priceHistorySchema,
  priceListSchema,
  pricePublicationsSchema,
  pricePublishResultSchema,
} from '@/lib/schemas';
import type { PriceHistory, PriceListData, PricePublications, PricePublishResult } from '@/types';

const KEY = ['price-list'] as const;

/** The working copy of the price list (cars, tables, rates, cities, extras). */
export function usePriceList() {
  return useQuery<PriceListData>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await pricesApi.get();
      return parseResponse<PriceListData>(priceListSchema, res.data.data, 'price-list');
    },
  });
}

/** Change log, newest first. */
export function usePriceHistory(limit = 100, enabled = true) {
  return useQuery<PriceHistory>({
    queryKey: [...KEY, 'history', limit],
    queryFn: async () => {
      const res = await pricesApi.history({ limit });
      return parseResponse<PriceHistory>(priceHistorySchema, res.data.data, 'price-history');
    },
    enabled,
    // "Muat lebih banyak" keeps the current list on screen while the longer one loads.
    placeholderData: keepPreviousData,
  });
}

export function usePricePublications(limit = 20, enabled = true) {
  return useQuery<PricePublications>({
    queryKey: [...KEY, 'publications', limit],
    queryFn: async () => {
      const res = await pricesApi.publications({ limit });
      return parseResponse<PricePublications>(pricePublicationsSchema, res.data.data, 'price-publications');
    },
    enabled,
  });
}

/** After a 409 (changed by another admin): load the list again and return it. */
export function useReloadPriceList() {
  const qc = useQueryClient();
  return async () => {
    await qc.refetchQueries({ queryKey: KEY, exact: true });
    return qc.getQueryData<PriceListData>(KEY);
  };
}

/**
 * A write answers with the whole list: show it as is (no second fetch of the
 * list), then refresh history and publications.
 */
function usePriceMutation<V>(fn: (v: V) => Promise<PriceListData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data) => {
      // A list GET still running (focus refetch, reload) was sent before this
      // write: cancel it, or its older answer would replace the saved list.
      await qc.cancelQueries({ queryKey: KEY, exact: true });
      qc.setQueryData(KEY, data);
      qc.invalidateQueries({ queryKey: [...KEY, 'history'] });
      qc.invalidateQueries({ queryKey: [...KEY, 'publications'] });
    },
  });
}

const listOf = (res: { data: { data: unknown } }) =>
  parseResponse<PriceListData>(priceListSchema, res.data.data, 'price-list');

// expected_updated_at: the version the admin edited; the API answers 409 when the row changed since.
export type RateUpdateInput = {
  id: string;
  amount: number | null;
  is_proposal?: boolean;
  note?: string | null;
  expected_updated_at?: string;
};

export function useUpdatePriceRates() {
  return usePriceMutation(async (items: RateUpdateInput[]) => listOf(await pricesApi.updateRates({ items })));
}

export function useCreatePriceSurcharge() {
  return usePriceMutation(async (data: { zone_id: string; area: string; amount: number }) =>
    listOf(await pricesApi.createSurcharge(data)),
  );
}

export function useUpdatePriceSurcharge() {
  return usePriceMutation(
    async ({ id, data }: { id: string; data: { area?: string; amount?: number; expected_updated_at?: string } }) =>
      listOf(await pricesApi.updateSurcharge(id, data)),
  );
}

export function useDeletePriceSurcharge() {
  return usePriceMutation(async ({ id, expected_updated_at }: { id: string; expected_updated_at?: string }) =>
    listOf(await pricesApi.removeSurcharge(id, { expected_updated_at })),
  );
}

export function useUpdatePriceZone() {
  return usePriceMutation(
    async ({ id, data }: { id: string; data: { name?: string; included?: string; excluded?: string; note?: string | null; expected_updated_at?: string } }) =>
      listOf(await pricesApi.updateZone(id, data)),
  );
}

export function useUpdatePriceExtra() {
  return usePriceMutation(
    async ({ id, data }: { id: string; data: { amount?: number | null; percent?: number | null; note?: string | null; expected_updated_at?: string } }) =>
      listOf(await pricesApi.updateExtra(id, data)),
  );
}

export function useUpdatePriceCity() {
  return usePriceMutation(
    async ({
      id,
      data,
    }: {
      id: string;
      data: { driver_zone_id?: string | null; all_in_zone_id?: string | null; quote?: boolean; expected_updated_at?: string };
    }) => listOf(await pricesApi.updateCity(id, data)),
  );
}

export function useCreatePriceCar() {
  return usePriceMutation(async (data: { slug: string; name: string; price_class?: string | null }) =>
    listOf(await pricesApi.createCar(data)),
  );
}

export function useUpdatePriceCar() {
  return usePriceMutation(
    async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        price_class?: string | null;
        note?: string | null;
        sort_order?: number;
        expected_updated_at?: string;
      };
    }) => listOf(await pricesApi.updateCar(id, data)),
  );
}

/**
 * "Terbitkan ke website". Not a list answer: publishing changes "last publication" and the count.
 * resent: the API answered 200 instead of 201, i.e. this client_ref was already
 * published (an earlier attempt whose answer was lost); nothing new was published.
 */
export function usePublishPrices() {
  const qc = useQueryClient();
  return useMutation({
    // confirm_proposals: the admin ticked "harga usulan ikut tampil"; without it the API answers 409.
    mutationFn: async (data: { note?: string; client_ref: string; confirm_proposals?: boolean }) => {
      const res = await pricesApi.publish(data);
      const result = parseResponse<PricePublishResult>(pricePublishResultSchema, res.data.data, 'price-publish');
      return { ...result, resent: res.status === 200 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, 'history'] });
      qc.invalidateQueries({ queryKey: [...KEY, 'publications'] });
    },
  });
}
