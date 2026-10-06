import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/** A write answers with the whole list: show it at once, then refresh history and publications. */
function usePriceMutation<V>(fn: (v: V) => Promise<PriceListData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, 'history'] });
      qc.invalidateQueries({ queryKey: [...KEY, 'publications'] });
    },
  });
}

const listOf = (res: { data: { data: unknown } }) =>
  parseResponse<PriceListData>(priceListSchema, res.data.data, 'price-list');

export type RateUpdateInput = { id: string; amount: number | null; is_proposal?: boolean; note?: string | null };

export function useUpdatePriceRates() {
  return usePriceMutation(async (items: RateUpdateInput[]) => listOf(await pricesApi.updateRates({ items })));
}

export function useCreatePriceSurcharge() {
  return usePriceMutation(async (data: { zone_id: string; area: string; amount: number }) =>
    listOf(await pricesApi.createSurcharge(data)),
  );
}

export function useUpdatePriceSurcharge() {
  return usePriceMutation(async ({ id, data }: { id: string; data: { area?: string; amount?: number } }) =>
    listOf(await pricesApi.updateSurcharge(id, data)),
  );
}

export function useDeletePriceSurcharge() {
  return usePriceMutation(async (id: string) => listOf(await pricesApi.removeSurcharge(id)));
}

export function useUpdatePriceZone() {
  return usePriceMutation(
    async ({ id, data }: { id: string; data: { name?: string; included?: string; excluded?: string; note?: string | null } }) =>
      listOf(await pricesApi.updateZone(id, data)),
  );
}

export function useUpdatePriceExtra() {
  return usePriceMutation(
    async ({ id, data }: { id: string; data: { amount?: number | null; percent?: number | null; note?: string | null } }) =>
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
      data: { driver_zone_id?: string | null; all_in_zone_id?: string | null; quote?: boolean };
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
      data: { name?: string; price_class?: string | null; note?: string | null; sort_order?: number };
    }) => listOf(await pricesApi.updateCar(id, data)),
  );
}

/** "Terbitkan ke website". Not a list answer: publishing changes "last publication" and the count. */
export function usePublishPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { note?: string; client_ref: string }) => {
      const res = await pricesApi.publish(data);
      return parseResponse<PricePublishResult>(pricePublishResultSchema, res.data.data, 'price-publish');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, 'history'] });
      qc.invalidateQueries({ queryKey: [...KEY, 'publications'] });
    },
  });
}
