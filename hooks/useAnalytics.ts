import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { DashboardAnalytics } from "@/types";

export function useDashboardAnalytics(
  params: { date_from?: string; date_to?: string } = {},
) {
  return useQuery<DashboardAnalytics>({
    queryKey: ["dashboard-analytics", params],
    queryFn: async () => {
      const res = await analyticsApi.dashboard(params);
      return res.data.data;
    },
  });
}
