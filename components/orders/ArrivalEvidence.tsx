'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { AlertTriangle, ExternalLink, Eye, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFilePreview } from '@/components/preview/FilePreview';
import { formatDateTime } from '@/lib/utils';
import {
  ARRIVAL_TOLERANCE_M,
  distanceMeters,
  mapsDirectionsUrl,
  mapsSearchUrl,
  type GeoPoint,
} from '@/lib/maps';
import type { TripReportEntry } from '@/types';

/**
 * Proof the driver was at the pickup point: the arrival photo from the app's
 * GPS camera (time, driver, GPS stamped on it) and the phone's GPS fix, with
 * map links so the office can compare the point with the pickup address.
 * When the customer picked a pickup point on the website, also shows the
 * straight-line distance to it and flags one beyond ARRIVAL_TOLERANCE_M.
 * Flags a mock (fake) location and an arrival recorded without GPS.
 */
export default function ArrivalEvidence({
  reports,
  pickupLocation,
  pickupPoint,
  arrivedAt,
}: {
  reports?: TripReportEntry[] | null;
  pickupLocation: string;
  /** Pickup point from the website map; null/absent = address text only. */
  pickupPoint?: GeoPoint | null;
  arrivedAt?: string | null;
}) {
  const t = useTranslations('arrival');
  const format = useFormatter();
  const { openPreview } = useFilePreview();
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
  const fix: GeoPoint | null = lat != null && lng != null ? { lat, lng } : null;
  const point = fix ? `${fix.lat.toFixed(6)},${fix.lng.toFixed(6)}` : null;
  // Straight-line distance from the driver's fix to the customer's point.
  const distance = fix && pickupPoint ? distanceMeters(fix, pickupPoint) : null;
  const far = distance != null && distance > ARRIVAL_TOLERANCE_M;
  const accuracy = withFix?.location_accuracy_m ?? null;
  const distanceText =
    distance == null
      ? null
      : distance >= 1000
        ? t('distanceKm', {
            km: format.number(distance / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          })
        : t('distanceM', { m: format.number(Math.round(distance)) });
  const tolerance = format.number(ARRIVAL_TOLERANCE_M);

  function showPhoto() {
    if (!photo?.file_url) return;
    openPreview({
      url: photo.file_url,
      title: [t('title'), photo.created_at ? formatDateTime(photo.created_at) : null]
        .filter(Boolean)
        .join(' · '),
      kind: 'image',
    });
  }

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
        {far && (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] gap-1"
            title={t('farHint', { m: tolerance })}
          >
            <AlertTriangle className="h-3 w-3" /> {t('farFromPickup', { m: tolerance })}
          </Badge>
        )}
      </div>
      <div className="mt-1.5 flex gap-2">
        {photo?.file_url && (
          <button
            type="button"
            onClick={showPhoto}
            className="shrink-0 cursor-zoom-in rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title={t('openPhoto')}
            aria-label={t('openPhoto')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.file_url}
              alt={t('photoAlt')}
              loading="lazy"
              className="h-20 w-16 rounded border border-gray-200 object-cover bg-white"
            />
          </button>
        )}
        <div className="min-w-0 space-y-0.5 text-gray-600">
          {locationName && (
            <p className="font-medium text-gray-800 break-words">{locationName}</p>
          )}
          {fix ? (
            <>
              <p className="tabular-nums break-all">
                {point}
                {withFix?.location_accuracy_m != null &&
                  ` · ${t('accuracy', { m: withFix.location_accuracy_m })}`}
              </p>
              {withFix?.location_at && <p>{t('fixAt', { at: formatDateTime(withFix.location_at) })}</p>}
              {distanceText && (
                <p className={far ? 'font-medium text-amber-800' : 'text-gray-700'}>
                  {t('distance', { d: distanceText })}
                  {/* A fix as loose as the tolerance itself can't settle it. */}
                  {accuracy != null && accuracy >= ARRIVAL_TOLERANCE_M && ` · ${t('lowAccuracy')}`}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
                <a
                  href={mapsSearchUrl(fix)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  {t('openMap')} <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={mapsDirectionsUrl(fix, pickupPoint ?? pickupLocation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  title={pickupPoint ? t('routeToPointHint') : t('routeHint')}
                >
                  <Navigation className="h-3 w-3" /> {pickupPoint ? t('routeToPoint') : t('route')}
                </a>
              </div>
            </>
          ) : (
            <p>{t('noGpsHint')}</p>
          )}
          {photo?.file_url && (
            <button
              type="button"
              onClick={showPhoto}
              className="inline-flex min-h-6 items-center gap-1 text-blue-600 hover:underline"
            >
              <Eye className="h-3 w-3" /> {t('openPhoto')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
