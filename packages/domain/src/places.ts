/**
 * Where a property is, and how far from it somebody stood.
 *
 * The distance is the reason this exists. `provesPresence` in `listings.ts`
 * asks whether a capture was taken within `CAPTURE_RADIUS_M` of the property —
 * and until now nothing knew where the property was, so every listing failed
 * `capture_on_site` no matter what its agent did. That condition has been
 * unsatisfiable since it was written.
 */

export interface Point {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Metres between two points on the earth.
 *
 * Haversine, on a sphere. The error against a proper ellipsoid is about three
 * parts in a thousand — under a metre at the two-hundred-metre radius this is
 * compared against, and far below the tens of metres a phone's civilian GPS is
 * out by in a dense street. Reaching for a geodesic library here would be
 * precision spent where the input has none.
 */
export function metresBetween(a: Point, b: Point): number {
  const R = 6_371_008.8;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = φ2 - φ1;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;

  const h =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Whether a coordinate is one at all.
 *
 * `0, 0` is in the Gulf of Guinea, about 700 km off Lagos — which makes it the
 * one wrong answer that looks plausible for a Nigerian product and is what an
 * uninitialised location arrives as. It is refused here rather than stored and
 * puzzled over later.
 */
export function isPlausiblePoint(point: Point): boolean {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return false;
  if (Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) return false;
  return !(point.latitude === 0 && point.longitude === 0);
}
