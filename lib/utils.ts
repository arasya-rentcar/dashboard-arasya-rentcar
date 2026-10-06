import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** One button of a segmented control (grey track, white active pill): filters and tabs. */
export const segmentClass = (active: boolean, className?: string) =>
  cn(
    'rounded-md px-3 py-2 text-xs font-medium transition-colors sm:py-1.5',
    active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800',
    className,
  );

export function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? NaN);
  // Guard against undefined/null/NaN so we never render "RpNaN" in the UI.
  if (!Number.isFinite(num)) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(0);
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num as number);
}

// All dates are stored UTC; display them in WIB (Asia/Jakarta) so times are
// consistent regardless of the viewer's browser timezone.
const WIB_TZ = 'Asia/Jakarta';

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: WIB_TZ,
  }).format(new Date(date));
}

// #14: 24-hour time, pinned to WIB.
export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZone: WIB_TZ,
  }).format(new Date(date));
}

// #14: time-only, 24-hour, WIB (e.g. "08:00").
export function formatTimeWib(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZone: WIB_TZ,
  }).format(new Date(date));
}

// Form values are entered as WIB wall-clock time. Convert with a FIXED +07:00
// offset so the stored instant never depends on the browser's timezone.
const WIB_MS = 7 * 3600 * 1000;

/** "YYYY-MM-DDTHH:mm" (datetime-local, WIB) -> ISO string. */
export function wibDateTimeToIso(v?: string | null): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v.length === 16 ? `${v}:00` : v}+07:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** "YYYY-MM-DD" (WIB calendar day) -> ISO string at 00:00 WIB. */
export function wibDateToIso(v?: string | null): string | undefined {
  return v ? wibDateTimeToIso(`${v}T00:00`) : undefined;
}

/** ISO string -> "YYYY-MM-DDTHH:mm" in WIB (for datetime-local inputs). */
export function isoToWibDateTimeLocal(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + WIB_MS).toISOString().slice(0, 16);
}

/** ISO string -> "YYYY-MM-DD" in WIB (for date inputs). */
export function isoToWibDate(v?: string | null): string {
  return isoToWibDateTimeLocal(v).slice(0, 10);
}

export function exportToCsv(
  filename: string,
  rows: Record<string, unknown>[],
  headers?: { key: string; label: string }[],
): void {
  if (!rows.length) return;
  const cols =
    headers ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    cols.map((c) => escape(c.label)).join(','),
    ...rows.map((r) => cols.map((c) => escape(r[c.key])).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    return axiosError.response?.data?.message ?? 'An error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An error occurred';
}

// Service days of a DONE or CANCELLED order are read-only (the API answers 409).
// Returns the `common` i18n key with the reason, or null when days can be edited.
export function dayLockReason(
  orderStatus?: string | null,
): 'dayLockedDone' | 'dayLockedCancelled' | null {
  if (orderStatus === 'DONE') return 'dayLockedDone';
  if (orderStatus === 'CANCELLED') return 'dayLockedCancelled';
  return null;
}
