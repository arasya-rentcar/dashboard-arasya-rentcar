import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { DashboardAnalytics, RevenueReport } from "@/types";

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

// #5 Revenue report (internal-car revenue + vendor margin, Final/Estimated).
export function useRevenueReport(
  params: { date_from?: string; date_to?: string } = {},
) {
  return useQuery<RevenueReport>({
    queryKey: ["revenue-report", params],
    queryFn: async () => {
      const res = await analyticsApi.revenue(params);
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}
