'use client';

import { Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocaleControl } from '@/lib/i18n/LocaleProvider';
import { LOCALES, type Locale } from '@/lib/i18n/config';

// Compact EN / ID segmented toggle. Persists via LocaleProvider (localStorage).
export default function LanguageToggle() {
  const { locale, setLocale } = useLocaleControl();
  const t = useTranslations('language');

  return (
    <div
      role="group"
      aria-label={t('label')}
      className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-0.5"
    >
      <Languages className="ml-1 hidden h-3.5 w-3.5 text-gray-400 sm:block" aria-hidden="true" />
      {LOCALES.map((code: Locale) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          title={t(code)}
          className={
            'h-7 rounded px-2 text-xs font-medium uppercase transition-colors ' +
            (locale === code
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700')
          }
          aria-pressed={locale === code}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
