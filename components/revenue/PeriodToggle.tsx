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
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
  const tc = useTranslations("common");
  const { period, setPeriod } = useRevenuePeriod(surface);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(period.preset === "CUSTOM");
  const [from, setFrom] = useState(period.date_from ?? "");
  const [to, setTo] = useState(period.date_to ?? "");
  // YYYY-MM-DD strings compare in date order.
  const rangeInvalid = !from || !to || from > to;

  // The stored period loads after the first render: show it whenever the menu
  // opens, instead of the empty inputs captured at mount.
  function onMenuOpenChange(open: boolean) {
    if (open) {
      setCustomOpen(period.preset === "CUSTOM");
      setFrom(period.date_from ?? "");
      setTo(period.date_to ?? "");
    }
    setMenuOpen(open);
  }

  function pick(preset: PeriodPreset) {
    setCustomOpen(false);
    setPeriod({ preset });
  }

  function applyCustom() {
    if (rangeInvalid) return;
    setPeriod({ preset: "CUSTOM", date_from: from, date_to: to });
    setMenuOpen(false);
  }

  const label =
    period.preset === "CUSTOM"
      ? describePeriod(period, locale)
      : tp(period.preset);

  return (
    <div className="flex min-w-0 items-center">
      <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 max-w-full gap-1.5" title={label}>
            <CalendarDays className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
            <span className="max-w-[180px] truncate">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
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
            // Keys typed into the date inputs must not reach the menu's
            // typeahead / arrow-key handling (it steals focus from the input);
            // Escape still closes the menu.
            <div
              className="space-y-2 px-2 py-2"
              onKeyDown={(e) => {
                if (e.key !== "Escape") e.stopPropagation();
              }}
            >
              <div className="space-y-1">
                <label htmlFor={`period-from-${surface}`} className="text-[11px] text-gray-500">
                  {tp("from")}
                </label>
                <Input
                  id={`period-from-${surface}`}
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={`period-to-${surface}`} className="text-[11px] text-gray-500">
                  {tp("to")}
                </label>
                <Input
                  id={`period-to-${surface}`}
                  type="date"
                  min={from || undefined}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-8"
                />
              </div>
              <Button
                size="sm"
                className="h-8 w-full"
                disabled={rangeInvalid}
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
