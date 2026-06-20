"use client";

import { useMemo } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { resolvePeriod } from "@/lib/revenuePeriod";
import { useRevenuePeriod } from "@/hooks/useRevenuePeriod";
import { useRevenueReport } from "@/hooks/useAnalytics";
import PeriodToggle from "./PeriodToggle";

// Per-vendor margin, embedded on an External vendor's detail. Arasya margin
// (billed − vendor cost) leads; the full cash breakdown + per-unit drilldown
// stays visible for accounting traceability.
export default function VendorRevenuePanel({ vendorId }: { vendorId: string }) {
  const { period } = useRevenuePeriod("external");
  const range = useMemo(() => resolvePeriod(period), [period]);
  const { data, isLoading, isFetching } = useRevenueReport({
    date_from: range.date_from,
    date_to: range.date_to,
  });

  const row = data?.vendor_margin.rows.find((r) => r.vendor_id === vendorId);
  const f = row?.final;
  const e = row?.estimated;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <TrendingUp className="h-4 w-4" /> Vendor Margin
          {isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
          )}
        </div>
        <PeriodToggle surface="external" />
      </div>
      <div className="p-4">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">Memuat…</p>
        ) : !row ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Belum ada order di periode ini.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <Stat label="Billed (Final)" value={formatCurrency(f!.customer_billed)} />
              <Stat
                label="Vendor Cost"
                value={formatCurrency(f!.vendor_cost)}
                muted
              />
              <Stat
                label="Margin (Final)"
                value={formatCurrency(f!.arasya_margin)}
                emerald
              />
              <Stat label="Trips" value={String(f!.trips)} muted />
            </div>
            {(e!.customer_billed > 0 || e!.trips > 0) && (
              <p className="text-xs text-amber-600">
                Estimasi (order berjalan): margin{" "}
                <b>{formatCurrency(e!.arasya_margin)}</b> · {e!.trips} trip
              </p>
            )}

            {row!.units.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="py-1.5 pr-3">Unit</th>
                      <th className="py-1.5 px-3 text-right">Billed</th>
                      <th className="py-1.5 px-3 text-right">Cost</th>
                      <th className="py-1.5 px-3 text-right">Margin</th>
                      <th className="py-1.5 pl-3 text-right">Trips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row!.units.map((u) => (
                      <tr
                        key={u.external_car_id ?? "nounit"}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-3 text-gray-700">
                          {u.car_label}
                          {u.plate ? ` · ${u.plate}` : ""}
                        </td>
                        <td className="px-3 text-right tabular-nums">
                          {formatCurrency(u.final.customer_billed)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-gray-500">
                          {formatCurrency(u.final.vendor_cost)}
                        </td>
                        <td className="px-3 text-right tabular-nums text-emerald-700">
                          {formatCurrency(u.final.arasya_margin)}
                        </td>
                        <td className="pl-3 text-right tabular-nums text-gray-500">
                          {u.final.trips}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  muted,
  emerald,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emerald?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-0.5 font-semibold tabular-nums ${
          emerald ? "text-emerald-700" : muted ? "text-gray-500" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
