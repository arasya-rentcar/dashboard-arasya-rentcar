'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';

/** The API refuses amounts above Rp 100.000.000. */
export const RUPIAH_MAX = 100_000_000;

/**
 * Typed or pasted text → plain number text. A trailing ",00" / ",5" is the
 * decimal part ("750.000,00" = 750000), not more digits. Dots are always
 * thousands separators: the field itself shows "1.500", so a backspace there
 * gives "1.50" and must mean 150.
 */
export function parseRupiahText(text: string): string {
  const whole = text.trim().replace(/,\d{1,2}$/, '');
  // 12 digits keeps the number exact; anything above RUPIAH_MAX shows an error anyway.
  return whole.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
}

export const rupiahTooLarge = (v: string) => v !== '' && Number(v) > RUPIAH_MAX;

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
  const t = useTranslations('common');
  const tooLarge = rupiahTooLarge(value);
  return (
    <div className="space-y-1">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
        <Input
          id={id}
          inputMode="numeric"
          autoFocus={autoFocus}
          aria-invalid={tooLarge || undefined}
          className={`pl-9 tabular-nums ${tooLarge ? 'border-red-400' : ''}`}
          placeholder={placeholder}
          value={value ? Number(value).toLocaleString('id-ID') : ''}
          onChange={(e) => onChange(parseRupiahText(e.target.value))}
        />
      </div>
      {tooLarge && <p className="text-[11px] leading-snug text-red-600">{t('rupiahTooLarge')}</p>}
    </div>
  );
}

export const rupiahValue = (v: string): number | undefined => (v === '' ? undefined : Number(v));
