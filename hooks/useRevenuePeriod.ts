"use client";

import { useCallback, useEffect, useState } from "react";
import type { RevenuePeriod } from "@/lib/revenuePeriod";

// Surfaces that can carry their own (overridden) revenue period.
export type RevenueSurface = "dashboard" | "cars" | "external";

const SHARED_KEY = "arasya.revenuePeriod.shared";
const OVERRIDES_KEY = "arasya.revenuePeriod.overrides";
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

type Overrides = Partial<Record<RevenueSurface, RevenuePeriod>>;

/**
 * Shared-by-default revenue period with per-surface override.
 *
 *  - `linked` (default): the surface follows the shared period; changing it
 *    here changes it for every linked surface.
 *  - unlinked: the surface keeps its own period until re-linked.
 *
 * Returns the effective period plus controls. `linked` tells the UI which mode
 * the surface is in so it can show a "lokal" badge.
 */
export function useRevenuePeriod(surface: RevenueSurface) {
  const [shared, setShared] = useState<RevenuePeriod>(DEFAULT_PERIOD);
  const [overrides, setOverrides] = useState<Overrides>({});

  const sync = useCallback(() => {
    setShared(read<RevenuePeriod>(SHARED_KEY, DEFAULT_PERIOD));
    setOverrides(read<Overrides>(OVERRIDES_KEY, {}));
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

  const override = overrides[surface];
  const linked = !override;
  const period = override ?? shared;

  // Update this surface's period. If linked, update the shared period (affects
  // all linked surfaces); if unlinked, update only this surface's override.
  const setPeriod = useCallback(
    (next: RevenuePeriod) => {
      if (linked) {
        write(SHARED_KEY, next);
      } else {
        const current = read<Overrides>(OVERRIDES_KEY, {});
        write(OVERRIDES_KEY, { ...current, [surface]: next });
      }
    },
    [linked, surface],
  );

  // Unlink: snapshot the current effective period as this surface's override.
  const unlink = useCallback(() => {
    const current = read<Overrides>(OVERRIDES_KEY, {});
    write(OVERRIDES_KEY, { ...current, [surface]: period });
  }, [surface, period]);

  // Re-link: drop this surface's override so it follows the shared period.
  const relink = useCallback(() => {
    const current = read<Overrides>(OVERRIDES_KEY, {});
    delete current[surface];
    write(OVERRIDES_KEY, current);
  }, [surface]);

  return { period, linked, setPeriod, unlink, relink, sharedPeriod: shared };
}
