"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import {
  describePeriod,
  type PeriodPreset,
} from "@/lib/revenuePeriod";
import { useRevenuePeriod, type RevenueSurface } from "@/hooks/useRevenuePeriod";

const PRESETS: PeriodPreset[] = [
  "THIS_MONTH",
  "LAST_MONTH",
  "LAST_30D",
  "THIS_YEAR",
];

// Compact period selector for a revenue panel. Each surface keeps its own,
// independent date range. Shows presets + a custom range.
export default function PeriodToggle({ surface }: { surface: RevenueSurface }) {
  const tp = useTranslations("period");
  const tc = useTranslations("common");
  const { period, setPeriod } = useRevenuePeriod(surface);
  const [customOpen, setCustomOpen] = useState(period.preset === "CUSTOM");
  const [from, setFrom] = useState(period.date_from ?? "");
  const [to, setTo] = useState(period.date_to ?? "");

  function pick(preset: PeriodPreset) {
    setCustomOpen(false);
    setPeriod({ preset });
  }

  function applyCustom() {
    if (!from || !to) return;
    setPeriod({ preset: "CUSTOM", date_from: from, date_to: to });
  }

  const label =
    period.preset === "CUSTOM"
      ? describePeriod(period)
      : tp(period.preset);

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
            <span className="max-w-[160px] truncate">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-xs text-gray-500">
            {tp("label")}
          </DropdownMenuLabel>
          {PRESETS.map((p) => (
            <DropdownMenuItem
              key={p}
              onSelect={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className="flex items-center justify-between"
            >
              {tp(p)}
              {period.preset === p && (
                <Check className="h-4 w-4 text-emerald-600" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setCustomOpen((v) => !v);
            }}
            className="flex items-center justify-between"
          >
            {tp("customRange")}
            {period.preset === "CUSTOM" && (
              <Check className="h-4 w-4 text-emerald-600" />
            )}
          </DropdownMenuItem>
          {customOpen && (
            <div className="space-y-2 px-2 py-2">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">{tp("from")}</label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">{tp("to")}</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-8"
                />
              </div>
              <Button
                size="sm"
                className="h-8 w-full"
                disabled={!from || !to}
                onClick={applyCustom}
              >
                {tc("apply")}
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
