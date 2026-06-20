'use client';

import { Languages } from 'lucide-react';
import { useLocaleControl } from '@/lib/i18n/LocaleProvider';
import { LOCALES, type Locale } from '@/lib/i18n/config';

// Compact EN / ID segmented toggle. Persists via LocaleProvider (localStorage).
export default function LanguageToggle() {
  const { locale, setLocale } = useLocaleControl();

  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-0.5">
      <Languages className="ml-1 h-3.5 w-3.5 text-gray-400" />
      {LOCALES.map((code: Locale) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={
            'rounded px-2 py-0.5 text-xs font-medium uppercase transition-colors ' +
            (locale === code
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-600')
          }
          aria-pressed={locale === code}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
