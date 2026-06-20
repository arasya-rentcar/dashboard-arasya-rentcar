'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

// Live wall-clock for Asia/Jakarta (WIB). Always rendered in Indonesian
// long-date style regardless of UI language, e.g. "Minggu, 21 Juni 2026 14:20 WIB".
// This is the single place "WIB" appears in the app.
const DATE_FMT = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});
const TIME_FMT = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
});

function formatNow(d: Date): string {
  return `${DATE_FMT.format(d)} ${TIME_FMT.format(d)} WIB`;
}

export default function WibClock() {
  // Start null to avoid SSR/CSR hydration mismatch; fill in on mount.
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLabel(formatNow(new Date()));
    tick();
    // Align to the next minute, then update every minute.
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60 * 1000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500 tabular-nums"
      suppressHydrationWarning
    >
      <Clock className="h-3.5 w-3.5 text-gray-400" />
      <span>{label ?? '—'}</span>
    </div>
  );
}
