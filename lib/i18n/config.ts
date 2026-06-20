// Central i18n configuration. Client-only locale (stored in localStorage),
// no URL-based routing. Default language: English.
export const LOCALES = ['en', 'id'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'arasya.locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'id';
}
