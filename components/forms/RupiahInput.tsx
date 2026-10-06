'use client';

import { Input } from '@/components/ui/input';

const digits = (v: string) => v.replace(/\D/g, '');

/** Rupiah amount typed with thousands dots; value is the plain number text. */
export function RupiahInput({
  id,
  value,
  onChange,
  placeholder = '0',
  autoFocus,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
      <Input
        id={id}
        inputMode="numeric"
        autoFocus={autoFocus}
        className="pl-9 tabular-nums"
        placeholder={placeholder}
        value={value ? Number(value).toLocaleString('id-ID') : ''}
        // 9 digits: the API refuses more than Rp 100.000.000.
        onChange={(e) => onChange(digits(e.target.value).slice(0, 9))}
      />
    </div>
  );
}

export const rupiahValue = (v: string): number | undefined => (v === '' ? undefined : Number(v));
