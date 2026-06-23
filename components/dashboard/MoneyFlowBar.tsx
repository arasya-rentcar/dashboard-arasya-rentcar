"use client";

import { formatCurrency } from "@/lib/utils";

// "Where the money goes" — a single horizontal stacked bar that decomposes
// period revenue into its cost buckets (ops, driver fee, vendor cost) plus the
// margin that's left over. One-glance P&L for the owner. Pure CSS, no chart lib.
type Seg = { key: string; label: string; value: number; color: string };

export default function MoneyFlowBar({
  revenue,
  opsCost,
  driverCost,
  vendorCost,
  margin,
  marginPct,
}: {
  revenue: number;
  opsCost: number;
  driverCost: number;
  vendorCost: number;
  margin: number;
  marginPct: number | null;
}) {
  // Costs + margin should sum to ~revenue. Guard against a zero/negative base
  // so widths stay sane; clamp negative margin to 0 width (still shown in list).
  const segs: Seg[] = [
    { key: "ops", label: "Ops cost", value: Math.max(0, opsCost), color: "#94a3b8" },
    { key: "driver", label: "Driver fee", value: Math.max(0, driverCost), color: "#60a5fa" },
    { key: "vendor", label: "Vendor cost", value: Math.max(0, vendorCost), color: "#fbbf24" },
    { key: "margin", label: "Margin", value: Math.max(0, margin), color: "#10b981" },
  ];
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const pct = (v: number) => (v / total) * 100;

  return (
    <div className="space-y-3">
      {/* headline */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-gray-500">Revenue</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatCurrency(revenue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500">Margin</p>
          <p className="text-lg font-semibold tabular-nums text-emerald-700">
            {formatCurrency(margin)}
            {marginPct != null && (
              <span className="ml-1.5 text-xs font-normal text-gray-500">
                ({(marginPct * 100).toFixed(1)}%)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* stacked bar */}
      <div className="flex h-5 w-full overflow-hidden rounded-md bg-gray-100">
        {segs.map((s) =>
          s.value > 0 ? (
            <div
              key={s.key}
              className="h-full"
              style={{ width: `${pct(s.value)}%`, backgroundColor: s.color }}
              title={`${s.label}: ${formatCurrency(s.value)} (${pct(s.value).toFixed(0)}%)`}
            />
          ) : null,
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-gray-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span>{s.label}</span>
            <span className="font-medium tabular-nums text-gray-800">
              {formatCurrency(s.value)}
            </span>
            <span className="text-gray-400">{pct(s.value).toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
