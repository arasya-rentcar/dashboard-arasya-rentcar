import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import type { WebLead, WebLeadsResult, WebLeadStatus } from "@/types";

export interface LeadsParams {
  status?: WebLeadStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export function useLeads(params: LeadsParams, options: { refetchInterval?: number } = {}) {
  return useQuery<WebLeadsResult>({
    queryKey: ["leads", params],
    queryFn: async () => {
      const res = await leadsApi.list(params as Record<string, string | number | undefined>);
      return { data: res.data.data, meta: res.data.meta };
    },
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
  });
}

export function useLead(id: string | null) {
  return useQuery<WebLead>({
    queryKey: ["leads", "detail", id],
    queryFn: async () => (await leadsApi.getById(id!)).data.data,
    enabled: !!id,
  });
}

function useLeadMutation<T>(fn: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export const useIgnoreLead = () =>
  useLeadMutation((v: { id: string; reason?: string }) => leadsApi.ignore(v.id, { reason: v.reason }));
export const useReopenLead = () =>
  useLeadMutation((id: string) => leadsApi.reopen(id));
export const useLinkLead = () =>
  useLeadMutation((v: { id: string; order_id: string }) => leadsApi.link(v.id, { order_id: v.order_id }));
