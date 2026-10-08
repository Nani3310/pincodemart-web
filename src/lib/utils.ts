import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Legacy uploads may still contain http URLs. Browsers block those as mixed
 * content when the web app is served over HTTPS, so upgrade them before
 * handing them to an image/video element. Invalid/relative values are left
 * untouched and are handled by the component's onError fallback.
 */
export function normalizeMediaUrl(value: string | null | undefined) {
  const url = value?.trim();
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) *
    Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(distanceKm: number | null | undefined) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

export function compareDistance(
  aDistance: number | null | undefined,
  bDistance: number | null | undefined,
) {
  const a = aDistance ?? Number.POSITIVE_INFINITY;
  const b = bDistance ?? Number.POSITIVE_INFINITY;
  return a - b;
}
