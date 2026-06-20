"use client";

import { formatCurrency } from "@/lib/utils";
import type { DashV2TrendPoint } from "@/types";

// Compact 6-month bar+line chart. Revenue as bars (gray), margin as bars on top
// (emerald). Pure SVG so it scales sharply and prints cleanly. No tooltips lib.
export default function Sparkbars({ points }: { points: DashV2TrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.revenue, p.margin)));
  const W = 520;
  const H = 180;
  const PAD_X = 32;
  const PAD_T = 12;
  const PAD_B = 26;
  const bw = (W - PAD_X * 2) / points.length;
  const yScale = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]">
        {/* gridline at top of max */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_T}
          y2={PAD_T}
          stroke="#e5e7eb"
          strokeDasharray="3 3"
        />
        <text x={PAD_X - 4} y={PAD_T + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
          {formatCurrency(max).replace("Rp", "").trim()}
        </text>
        {points.map((p, i) => {
          const x = PAD_X + bw * i + bw * 0.18;
          const innerW = bw * 0.64;
          const yRev = yScale(p.revenue);
          const yMar = yScale(Math.max(0, p.margin));
          const hRev = H - PAD_B - yRev;
          const hMar = H - PAD_B - yMar;
          const label = p.month.slice(5); // MM
          return (
            <g key={p.month}>
              <rect
                x={x}
                y={yRev}
                width={innerW}
                height={Math.max(0, hRev)}
                rx={2}
                fill="#e5e7eb"
              />
              <rect
                x={x}
                y={yMar}
                width={innerW}
                height={Math.max(0, hMar)}
                rx={2}
                fill="#10b981"
                opacity={p.margin < 0 ? 0.35 : 0.9}
              />
              <text
                x={x + innerW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-gray-500 text-[10px]"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-3 px-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-gray-300" /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Margin
        </span>
      </div>
    </div>
  );
}
