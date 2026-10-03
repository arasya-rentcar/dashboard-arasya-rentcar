import type { ServiceItemFormValue } from "@/components/forms/OrderServiceItemsEditor";

// Shift a "YYYY-MM-DD" date string by n calendar days (no timezone math).
function shiftDateStr(d: string, n: number): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return d;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  dt.setUTCDate(dt.getUTCDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

// Shift a "YYYY-MM-DDTHH:mm" datetime-local string by n days, preserving the
// wall-clock time (just rolls the calendar date forward).
function shiftDateTimeStr(dt: string, n: number): string {
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return dt;
  const d = new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
    ),
  );
  d.setUTCDate(d.getUTCDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
    d.getUTCDate(),
  )}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * Expand each service line by its quantity ("days"):
 *   qty = 3  ->  3 separate lines on dates D, D+1, D+2 (each quantity "1").
 * The wall-clock pickup/dropoff time is preserved on every day; only the
 * calendar date rolls forward. Lines with qty <= 1 pass through unchanged
 * (normalized to quantity "1"). Operates on the raw form-string values so it
 * must run BEFORE iso()/dateIso() conversion. Order is preserved, so the
 * first emitted line is always day D (callers that read service_items[0] for
 * top-level fields keep the same behavior).
 */
export function expandServiceItemsByDays<
  T extends ServiceItemFormValue & { id?: string },
>(items: T[]): T[] {
  const out: T[] = [];
  for (const item of items) {
    const qty = Math.max(1, Math.floor(Number(item.quantity || 1)) || 1);
    if (qty <= 1) {
      out.push({ ...item, quantity: "1" });
      continue;
    }
    for (let k = 0; k < qty; k++) {
      out.push({
        ...item,
        // Edit Order: an existing day keeps its id on its own date only; the
        // extra days are new.
        ...(k > 0 ? { id: undefined, line_status: undefined } : {}),
        service_date: item.service_date
          ? shiftDateStr(item.service_date, k)
          : item.service_date,
        start_at: item.start_at ? shiftDateTimeStr(item.start_at, k) : item.start_at,
        end_at: item.end_at ? shiftDateTimeStr(item.end_at, k) : item.end_at,
        quantity: "1",
      });
    }
  }
  return out;
}
