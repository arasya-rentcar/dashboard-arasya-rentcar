/**
 * Map points (pick-up / destination picked on the website map) and the Google
 * Maps links built from them. One place for the URL format so every page
 * links the same way (official Maps URLs, no API key needed).
 */
import type { ServiceItemPointFields } from '@/types';

/**
 * Arrival proof: a driver GPS fix farther than this from the pickup point gets
 * a warning badge.
 * PLACEHOLDER pending the owner's decision (docs/PLAN-WEB-MAPS-PICKER.md
 * §10.5). Change it only here.
 */
export const ARRIVAL_TOLERANCE_M = 300;

export interface GeoPoint {
  lat: number;
  lng: number;
  placeId?: string | null;
}

function toCoord(v: unknown, limit: number): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

/**
 * A point from raw API values, or null when either coordinate is missing or
 * invalid (older API responses do not carry the fields at all).
 */
export function toGeoPoint(lat: unknown, lng: unknown, placeId?: unknown): GeoPoint | null {
  const la = toCoord(lat, 90);
  const ln = toCoord(lng, 180);
  if (la == null || ln == null) return null;
  const id = typeof placeId === 'string' && placeId.trim() ? placeId.trim() : null;
  return { lat: la, lng: ln, placeId: id };
}

type MaybeItemPoints = {
  pickup_lat?: unknown;
  pickup_lng?: unknown;
  pickup_place_id?: unknown;
  dropoff_lat?: unknown;
  dropoff_lng?: unknown;
  dropoff_place_id?: unknown;
};

export const itemPickupPoint = (item?: MaybeItemPoints | null) =>
  item ? toGeoPoint(item.pickup_lat, item.pickup_lng, item.pickup_place_id) : null;

export const itemDropoffPoint = (item?: MaybeItemPoints | null) =>
  item ? toGeoPoint(item.dropoff_lat, item.dropoff_lng, item.dropoff_place_id) : null;

/**
 * The six point fields for a service item create/update payload. Always all
 * six (value or null), and lat/lng only as a pair, as the API requires.
 */
export function itemPointPayload(item: MaybeItemPoints): ServiceItemPointFields {
  const pickup = itemPickupPoint(item);
  const dropoff = itemDropoffPoint(item);
  return {
    pickup_lat: pickup?.lat ?? null,
    pickup_lng: pickup?.lng ?? null,
    pickup_place_id: pickup?.placeId ?? null,
    dropoff_lat: dropoff?.lat ?? null,
    dropoff_lng: dropoff?.lng ?? null,
    dropoff_place_id: dropoff?.placeId ?? null,
  };
}

const coords = (p: GeoPoint) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/** Google Maps search link that drops a pin on the point (and the place, if known). */
export function mapsSearchUrl(p: GeoPoint): string {
  let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords(p))}`;
  if (p.placeId) url += `&query_place_id=${encodeURIComponent(p.placeId)}`;
  return url;
}

/** Google Maps directions from a point to a point (or to an address text). */
export function mapsDirectionsUrl(origin: GeoPoint, destination: GeoPoint | string): string {
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(coords(origin))}`;
  if (typeof destination === 'string') {
    url += `&destination=${encodeURIComponent(destination)}`;
  } else {
    url += `&destination=${encodeURIComponent(coords(destination))}`;
    if (destination.placeId) {
      url += `&destination_place_id=${encodeURIComponent(destination.placeId)}`;
    }
  }
  return url;
}

/** Straight-line (great-circle) distance in metres, haversine formula. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
