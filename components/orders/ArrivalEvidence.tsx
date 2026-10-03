'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import type { TripReportEntry } from '@/types';

/**
 * Proof the driver was at the pickup point: the arrival photo from the app's
 * GPS camera (time, driver, GPS stamped on it) and the phone's GPS fix, with
 * map links so the office can compare the point with the pickup address.
 * Flags a mock (fake) location and an arrival recorded without GPS.
 */
export default function ArrivalEvidence({
  reports,
  pickupLocation,
  arrivedAt,
}: {
  reports?: TripReportEntry[] | null;
  pickupLocation: string;
  arrivedAt?: string | null;
}) {
  const t = useTranslations('arrival');
  const list = reports ?? [];
  const latest = (type: string) =>
    list
      .filter((r) => r.report_type === type)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const photo = latest('ARRIVAL_PHOTO');
  const step = latest('ARRIVE_CUSTOMER');
  const withFix = [photo, step].find((r) => r?.latitude != null && r?.longitude != null);
  const mocked = [photo, step].some((r) => r?.location_mocked);

  // Only arrivals recorded in the driver app carry (or should carry) GPS; a
  // bot report or an arrival set by the admin shows nothing here.
  if (!photo && step?.source !== 'API') return null;
  if (!arrivedAt && !photo) return null;

  // Place name looked up on the phone; shown above the coordinates (fallback).
  const locationName =
    withFix?.location_name?.trim() ||
    [photo, step].find((r) => r?.location_name?.trim())?.location_name?.trim() ||
    null;
  const lat = withFix?.latitude ?? null;
  const lng = withFix?.longitude ?? null;
  const point = lat != null && lng != null ? `${lat.toFixed(6)},${lng.toFixed(6)}` : null;

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
          <MapPin className="h-3 w-3" /> {t('title')}
        </span>
        {mocked && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] gap-1">
            <AlertTriangle className="h-3 w-3" /> {t('mocked')}
          </Badge>
        )}
        {!point && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
            {t('noGps')}
          </Badge>
        )}
      </div>
      <div className="mt-1.5 flex gap-2">
        {photo?.file_url && (
          <a href={photo.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0" title={t('openPhoto')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.file_url}
              alt={t('photoAlt')}
              className="h-20 w-16 rounded border border-gray-200 object-cover bg-white"
            />
          </a>
        )}
        <div className="min-w-0 space-y-0.5 text-gray-600">
          {locationName && (
            <p className="font-medium text-gray-800 break-words">{locationName}</p>
          )}
          {point ? (
            <>
              <p className="tabular-nums">
                {point}
                {withFix?.location_accuracy_m != null &&
                  ` · ${t('accuracy', { m: withFix.location_accuracy_m })}`}
              </p>
              {withFix?.location_at && <p>{t('fixAt', { at: formatDateTime(withFix.location_at) })}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${point}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  {t('openMap')} <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${point}&destination=${encodeURIComponent(pickupLocation)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  title={t('routeHint')}
                >
                  <Navigation className="h-3 w-3" /> {t('route')}
                </a>
              </div>
            </>
          ) : (
            <p>{t('noGpsHint')}</p>
          )}
          {photo?.file_url && (
            <a
              href={photo.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              {t('openPhoto')} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
