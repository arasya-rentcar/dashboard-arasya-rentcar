import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { etollCardsApi } from '@/lib/api';
import { parseResponse } from '@/lib/safeParse';
import { etollCardHistorySchema, etollCardListSchema } from '@/lib/schemas';
import type { EtollCard, EtollCardHistory, EtollTransactionType } from '@/types';

/** Office e-toll cards. Every change refreshes the list, the card and the requests. */
export function useEtollCards(status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ALL') {
  return useQuery<EtollCard[]>({
    queryKey: ['etoll-cards', 'list', status],
    queryFn: async () => {
      const res = await etollCardsApi.list({ status });
      return parseResponse<{ items: EtollCard[] }>(etollCardListSchema, res.data.data, 'etoll-cards').items;
    },
    // Drivers take and return cards from the app: keep "who has it" fresh.
    refetchInterval: 30_000,
  });
}

export function useEtollCard(id: string) {
  return useQuery<EtollCardHistory>({
    queryKey: ['etoll-cards', 'detail', id],
    queryFn: async () => {
      const res = await etollCardsApi.get(id);
      return parseResponse<EtollCardHistory>(etollCardHistorySchema, res.data.data, 'etoll-card');
    },
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

function useEtollMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etoll-cards'] });
      qc.invalidateQueries({ queryKey: ['driver-requests'] });
    },
  });
}

export type EtollCardInput = {
  issuer: string;
  name: string;
  card_number: string;
  balance?: number;
  note?: string | null;
};

export function useCreateEtollCard() {
  return useEtollMutation(async (data: EtollCardInput) => (await etollCardsApi.create(data)).data.data as EtollCard);
}

export function useUpdateEtollCard() {
  return useEtollMutation(
    async ({ id, data }: { id: string; data: Partial<EtollCardInput> & { status?: string; inactive_reason?: string } }) =>
      (await etollCardsApi.update(id, data)).data.data as EtollCard,
  );
}

export function useDeleteEtollCard() {
  return useEtollMutation(async (id: string) => (await etollCardsApi.remove(id)).data.data);
}

export function useAddEtollTransaction() {
  return useEtollMutation(
    async ({
      id,
      ...data
    }: {
      id: string;
      type: EtollTransactionType;
      amount?: number;
      balance_after?: number;
      occurred_at?: string;
      note?: string;
      client_ref: string;
    }) => (await etollCardsApi.addTransaction(id, data)).data.data,
  );
}

export function useVoidEtollTransaction() {
  return useEtollMutation(
    async ({ txId, reason }: { txId: string; reason?: string }) =>
      (await etollCardsApi.voidTransaction(txId, reason ? { reason } : {})).data.data,
  );
}

export function useGiveEtollCard() {
  return useEtollMutation(
    async ({ id, driver_id, balance }: { id: string; driver_id: string; balance?: number }) =>
      (await etollCardsApi.give(id, { driver_id, ...(balance != null ? { balance } : {}) })).data.data,
  );
}

export function useReturnEtollCard() {
  return useEtollMutation(
    async ({ id, balance }: { id: string; balance?: number }) =>
      (await etollCardsApi.returnCard(id, balance != null ? { balance } : {})).data.data,
  );
}
