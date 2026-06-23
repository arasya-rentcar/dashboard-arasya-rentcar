"use client";

import { useCallback, useEffect, useState } from "react";
import type { RevenuePeriod } from "@/lib/revenuePeriod";

// Surfaces that each carry their OWN, independent revenue period.
export type RevenueSurface = "dashboard" | "cars" | "external";

const PERIODS_KEY = "arasya…ods";
const EVENT = "arasya:revenue-period";

const DEFAULT_PERIOD: RevenuePeriod = { preset: "THIS_MONTH" };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private-mode errors */
  }
  // Notify same-tab listeners (storage event only fires cross-tab).
  window.dispatchEvent(new Event(EVENT));
}

type Periods = Partial<Record<RevenueSurface, RevenuePeriod>>;

/**
 * Per-surface revenue period. Each surface (dashboard / cars / external) keeps
 * its OWN date range, independent of the others, persisted in localStorage.
 * Changing one page's period never affects another page.
 */
export function useRevenuePeriod(surface: RevenueSurface) {
  const [periods, setPeriods] = useState<Periods>({});

  const sync = useCallback(() => {
    setPeriods(read<Periods>(PERIODS_KEY, {}));
  }, []);

  useEffect(() => {
    sync();
    const onChange = () => sync();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [sync]);

  const period = periods[surface] ?? DEFAULT_PERIOD;

  // Update only this surface's period; other surfaces are untouched.
  const setPeriod = useCallback(
    (next: RevenuePeriod) => {
      const current = read<Periods>(PERIODS_KEY, {});
      write(PERIODS_KEY, { ...current, [surface]: next });
    },
    [surface],
  );

  return { period, setPeriod };
}
