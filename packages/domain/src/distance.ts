/**
 * A commute is a distance and never a time (ADR-0013). The tenant names a
 * place; every listing is so many kilometres from it, in a straight line,
 * with the one `metresBetween` this codebase has. Minutes would be Keys
 * pretending to know the traffic.
 */
import { metresBetween, type Point } from './places.ts';

/** Kilometres to one decimal, or null when either side has no point. */
export function kmFrom(place: Point | null, listing: Point | { latitude: number | null; longitude: number | null } | null): number | null {
  if (!place || !listing || listing.latitude === null || listing.longitude === null) return null;
  return Math.round(metresBetween(place, { latitude: listing.latitude, longitude: listing.longitude }) / 100) / 10;
}

/** The distances a screen offers as a filter. Not minutes. */
export const WITHIN_KM_OPTIONS = [2, 5, 10, 20] as const;

/** Within the distance, or unknowable — a listing with no point is never quietly inside. */
export function withinKm(place: Point, listing: { latitude: number | null; longitude: number | null }, km: number): boolean {
  const d = kmFrom(place, listing);
  return d !== null && d <= km;
}
