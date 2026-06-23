"use client";

import type { DashV2TrendPoint } from "@/types";

// Compact Rupiah for axis/tooltip: 61.000.000 -> "61jt", 1.250.000.000 -> "1,3M".
// Full numbers are far too wide for a sparkline axis (they used to clip off the
// left edge), so we abbreviate with Indonesian magnitude suffixes.
function compactIdr(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000_000)
    return `${(v / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  if (a >= 1_000_000)
    return `${Math.round(v / 1_000_000).toLocaleString("id-ID")}jt`;
  if (a >= 1_000)
    return `${Math.round(v / 1_000).toLocaleString("id-ID")}rb`;
  return `${Math.round(v)}`;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
function monthLabel(ym: string): string {
  // ym = "YYYY-MM"
  const mm = Number(ym.slice(5, 7));
  return MONTHS_SHORT[mm - 1] ?? ym.slice(5);
}

// 6-month trend: Revenue as gray bars (left money axis) + Margin % as an
// emerald line (right 0–100% axis). Pure SVG, scales sharply, no chart lib.
export default function Sparkbars({ points }: { points: DashV2TrendPoint[] }) {
  const maxRev = Math.max(1, ...points.map((p) => p.revenue));
  // Right axis for margin %: cap at 100, but allow a little headroom and never
  // below ~40 so a low-margin business still shows a readable line.
  const pctVals = points.map((p) => p.margin_pct ?? 0);
  const maxPct = Math.min(100, Math.max(40, ...pctVals.map((v) => Math.ceil(v / 10) * 10)));

  const W = 520;
  const H = 190;
  const PAD_L = 50; // room for the left money axis label
  const PAD_R = 40; // room for the right % axis label
  const PAD_T = 14;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const bw = plotW / points.length;

  const yRev = (v: number) => PAD_T + (1 - v / maxRev) * plotH;
  const yPct = (v: number) => PAD_T + (1 - Math.min(v, maxPct) / maxPct) * plotH;
  const baseline = PAD_T + plotH;

  // Margin % line path (skip null points by treating them as 0).
  const linePts = points.map((p, i) => {
    const cx = PAD_L + bw * i + bw / 2;
    return { cx, cy: yPct(p.margin_pct ?? 0), val: p.margin_pct };
  });
  const linePath = linePts
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.cx.toFixed(1)},${pt.cy.toFixed(1)}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[440px]">
        {/* top gridline + left max-revenue label (compact, no clip) */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={PAD_T}
          y2={PAD_T}
          stroke="#e5e7eb"
          strokeDasharray="3 3"
        />
        <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
          {compactIdr(maxRev)}
        </text>
        {/* right % axis top label */}
        <text x={W - PAD_R + 6} y={PAD_T + 4} textAnchor="start" className="fill-emerald-500 text-[10px]">
          {maxPct}%
        </text>
        {/* baseline */}
        <line x1={PAD_L} x2={W - PAD_R} y1={baseline} y2={baseline} stroke="#e5e7eb" />

        {/* revenue bars */}
        {points.map((p, i) => {
          const x = PAD_L + bw * i + bw * 0.22;
          const innerW = bw * 0.56;
          const y = yRev(p.revenue);
          return (
            <g key={p.month}>
              <rect
                x={x}
                y={y}
                width={innerW}
                height={Math.max(0, baseline - y)}
                rx={2}
                fill="#d1d5db"
              />
              <text
                x={PAD_L + bw * i + bw / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-gray-500 text-[10px]"
              >
                {monthLabel(p.month)}
              </text>
            </g>
          );
        })}

        {/* margin % line + dots */}
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" />
        {linePts.map((pt, i) => (
          <circle key={i} cx={pt.cx} cy={pt.cy} r={2.6} fill="#10b981" />
        ))}
      </svg>

      <div className="mt-1 flex items-center gap-3 px-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-gray-300" /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" /> Margin&nbsp;%
        </span>
      </div>
    </div>
  );
}
