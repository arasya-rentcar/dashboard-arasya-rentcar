'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Shared error state for failed TanStack Query fetches.
 * Previously the dashboard had ZERO `isError` handling — a failed fetch
 * rendered an infinite skeleton or a misleading "No data". Branch on
 * `isError` and render this with `onRetry={() => refetch()}`.
 */
export default function QueryError({
  onRetry,
  message,
  compact = false,
}: {
  onRetry?: () => void;
  message?: string;
  compact?: boolean;
}) {
  const t = useTranslations('common');
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/60 text-center ${
        compact ? 'p-4' : 'p-8'
      }`}
    >
      <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-red-700">{t('loadFailed')}</p>
        {!compact && (
          <p className="mt-1 text-xs text-red-600/80">
            {message ?? t('loadFailedHint')}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50 sm:h-8"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> {t('retry')}
        </button>
      )}
    </div>
  );
}
