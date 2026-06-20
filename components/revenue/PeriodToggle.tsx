"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown, Link2, Link2Off } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

// Compact period selector shared by all revenue panels. Shows presets + a
// custom range, plus a link/unlink control: "linked" surfaces follow the global
// shared period; "unlinked" hold their own. A subtle "lokal" badge signals the
// override so the period is never misread.
export default function PeriodToggle({ surface }: { surface: RevenueSurface }) {
  const tp = useTranslations("period");
  const tc = useTranslations("common");
  const { period, linked, setPeriod, unlink, relink } =
    useRevenuePeriod(surface);
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
    <div className="flex items-center gap-1.5">
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

      {/* Link / unlink: shared vs per-surface period. */}
      {linked ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
          title={tp("linkedTitle")}
          onClick={unlink}
        >
          <Link2 className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className="h-6 border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-700"
          >
            {tp("localBadge")}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800"
            title={tp("unlinkedTitle")}
            onClick={relink}
          >
            <Link2Off className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
