'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, ExternalLink, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { mapsSearchUrl } from '@/lib/maps';
import type { TripReportEntry } from '@/types';

/**
 * Where a driver report was made: the place name looked up on the phone (if
 * any) above the coordinates, with a Google Maps link. Renders nothing when the
 * report carries no location (older reports, reports sent without GPS).
 */
export default function ReportLocation({ report }: { report: TripReportEntry }) {
  const t = useTranslations('arrival');
  const name = report.location_name?.trim() || null;
  const hasFix = report.latitude != null && report.longitude != null;
  if (!name && !hasFix) return null;
  const point = hasFix ? `${report.latitude!.toFixed(6)},${report.longitude!.toFixed(6)}` : null;

  return (
    <div className="mt-1 space-y-0.5 text-[11px] text-gray-600">
      {name && (
        <p className="flex items-start gap-1 font-medium text-gray-800">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="break-words">{name}</span>
        </p>
      )}
      {point && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="tabular-nums">
            {point}
            {report.location_accuracy_m != null && ` · ${t('accuracy', { m: report.location_accuracy_m })}`}
          </span>
          <a
            href={mapsSearchUrl({ lat: report.latitude!, lng: report.longitude! })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            {t('openMap')} <ExternalLink className="h-3 w-3" />
          </a>
          {report.location_mocked && (
            <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-[10px] text-red-700">
              <AlertTriangle className="h-3 w-3" /> {t('mocked')}
            </Badge>
          )}
        </p>
      )}
    </div>
  );
}
