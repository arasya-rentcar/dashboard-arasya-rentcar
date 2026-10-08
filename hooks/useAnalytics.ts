import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { RevenueReport, DashboardV2 } from "@/types";
import { parseResponse } from "@/lib/safeParse";
import { dashboardV2Schema, revenueReportSchema } from "@/lib/schemas";

// Dashboard v2 — single-page owner/finance overview (margin-leading,
// accrual + cash separation, current outstanding + overdue, 6-month trend).
export function useDashboardV2(
  params: { date_from?: string; date_to?: string } = {},
) {
  return useQuery<DashboardV2>({
    queryKey: ["dashboard-v2", params],
    queryFn: async () => {
      const res = await analyticsApi.dashboardV2(params);
      return parseResponse<DashboardV2>(dashboardV2Schema, res.data.data, "useDashboardV2");
    },
    placeholderData: (prev) => prev,
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
      return parseResponse<RevenueReport>(revenueReportSchema, res.data.data, "useRevenueReport");
    },
    placeholderData: (prev) => prev,
  });
}
