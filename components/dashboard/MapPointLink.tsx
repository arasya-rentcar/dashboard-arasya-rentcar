'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mapsSearchUrl, type GeoPoint } from '@/lib/maps';

/**
 * Link that opens a map point in Google Maps in a new tab. `label` names the
 * point (e.g. "Titik jemput") for the tooltip and screen readers; `children`
 * replaces the default "Lihat di peta" text (then it should name the point).
 */
export default function MapPointLink({
  point,
  label,
  children,
  className,
}: {
  point: GeoPoint;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations('maps');
  const title = t('openInMaps', { label });
  return (
    <a
      href={mapsSearchUrl(point)}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={cn('inline-flex items-center gap-1 text-blue-600 hover:underline', className)}
    >
      {children ?? (
        <>
          <span className="sr-only">{label}: </span>
          {t('openMap')}
        </>
      )}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
    </a>
  );
}
