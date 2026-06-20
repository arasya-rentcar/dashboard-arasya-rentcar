"use client";

import { useMemo } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { resolvePeriod } from "@/lib/revenuePeriod";
import { useRevenuePeriod } from "@/hooks/useRevenuePeriod";
import { useRevenueReport } from "@/hooks/useAnalytics";
import PeriodToggle from "./PeriodToggle";

function moneyOrDash(v: number | null) {
  return v == null ? "—" : formatCurrency(v);
}

// Per-car revenue, embedded on the Cars surface. Net margin leads; the full
// cash breakdown (gross / ops) stays visible for accounting traceability.
export default function CarRevenuePanel({
  carId,
  showToggle = true,
}: {
  carId: string;
  showToggle?: boolean;
}) {
  const { period } = useRevenuePeriod("cars");
  const range = useMemo(() => resolvePeriod(period), [period]);
  const { data, isLoading, isFetching } = useRevenueReport({
    date_from: range.date_from,
    date_to: range.date_to,
  });

  const row = data?.internal_cars.rows.find((r) => r.car_id === carId);
  const f = row?.final;
  const e = row?.estimated;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <TrendingUp className="h-3.5 w-3.5" /> Revenue
          {isFetching && (
            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
          )}
        </div>
        {showToggle && <PeriodToggle surface="cars" />}
      </div>
      <div className="p-3">
        {isLoading ? (
          <p className="py-4 text-center text-xs text-gray-400">Memuat…</p>
        ) : !row ? (
          <p className="py-4 text-center text-xs text-gray-400">
            Belum ada order di periode ini.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-xs text-gray-500">Gross (Final)</span>
            <span className="text-right tabular-nums">
              {formatCurrency(f!.gross)}
            </span>
            <span className="text-xs text-gray-500">Ops</span>
            <span className="text-right tabular-nums text-gray-500">
              {formatCurrency(f!.ops)}
            </span>
            <span className="text-xs font-medium text-gray-700">
              Net Margin
            </span>
            <span className="text-right font-semibold tabular-nums text-emerald-700">
              {moneyOrDash(f!.net_margin)}
            </span>
            <span className="text-xs text-gray-500">Trips</span>
            <span className="text-right tabular-nums text-gray-500">
              {f!.trips}
            </span>
            {(e!.gross > 0 || e!.trips > 0) && (
              <>
                <span className="col-span-2 mt-1 border-t border-dashed border-gray-100 pt-2 text-[11px] uppercase tracking-wide text-amber-600">
                  Estimasi (order berjalan)
                </span>
                <span className="text-xs text-gray-500">Gross</span>
                <span className="text-right tabular-nums text-amber-600">
                  {formatCurrency(e!.gross)}
                </span>
                <span className="text-xs text-gray-500">Margin</span>
                <span className="text-right tabular-nums text-amber-600">
                  {moneyOrDash(e!.net_margin)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
