// Shared revenue-period model used by the embedded revenue panels (Dashboard,
// Cars, External). All presets resolve to Asia/Jakarta (WIB, UTC+7) calendar
// day bounds as YYYY-MM-DD strings; the backend converts those to the correct
// UTC instants and filters lines by service_date.

export type PeriodPreset =
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_30D"
  | "THIS_YEAR"
  | "CUSTOM";

export interface RevenuePeriod {
  preset: PeriodPreset;
  // Only meaningful when preset === "CUSTOM".
  date_from?: string;
  date_to?: string;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  THIS_MONTH: "Bulan ini",
  LAST_MONTH: "Bulan lalu",
  LAST_30D: "30 hari terakhir",
  THIS_YEAR: "Tahun ini",
  CUSTOM: "Custom",
};

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Jakarta, no DST.

// "Now" expressed as a WIB wall-clock Date (its UTC getters read WIB Y/M/D).
function nowWib(): Date {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

function ymd(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Resolve a period into { date_from, date_to } as WIB calendar-day strings.
export function resolvePeriod(p: RevenuePeriod): {
  date_from: string;
  date_to: string;
} {
  const w = nowWib();
  const y = w.getUTCFullYear();
  const m = w.getUTCMonth();
  const d = w.getUTCDate();
  const today = ymd(y, m, d);

  switch (p.preset) {
    case "THIS_MONTH":
      return { date_from: ymd(y, m, 1), date_to: today };
    case "LAST_MONTH": {
      const lm = new Date(Date.UTC(y, m - 1, 1));
      const lmY = lm.getUTCFullYear();
      const lmM = lm.getUTCMonth();
      const lastDay = new Date(Date.UTC(lmY, lmM + 1, 0)).getUTCDate();
      return { date_from: ymd(lmY, lmM, 1), date_to: ymd(lmY, lmM, lastDay) };
    }
    case "LAST_30D": {
      const from = new Date(Date.UTC(y, m, d) - 29 * 86400000);
      return {
        date_from: ymd(
          from.getUTCFullYear(),
          from.getUTCMonth(),
          from.getUTCDate(),
        ),
        date_to: today,
      };
    }
    case "THIS_YEAR":
      return { date_from: ymd(y, 0, 1), date_to: today };
    case "CUSTOM":
      return {
        date_from: p.date_from || ymd(y, m, 1),
        date_to: p.date_to || today,
      };
  }
}

// Human-readable range, e.g. "1 Jun – 20 Jun 2026".
export function describePeriod(p: RevenuePeriod): string {
  const { date_from, date_to } = resolvePeriod(p);
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(date_from)} – ${fmt(date_to)}`;
}
