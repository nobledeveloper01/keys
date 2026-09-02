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


/**
 * A box that certainly contains every point within `metres` of here.
 *
 * For narrowing a query before `metresBetween` decides — see ADR-0008. It is
 * deliberately a little too big: a degree of longitude shrinks towards the
 * poles, and using the latitude at the centre would make the box too narrow at
 * its own top and bottom edges. Lagos is six degrees from the equator so the
 * error is small either way, and the direction to be wrong in is *outwards*.
 * A box a few metres too wide costs a handful of rows; a box a few metres too
 * narrow silently loses a result nobody can tell is missing.
 */
export function boundingBox(
  centre: Point,
  metres: number,
): { north: number; south: number; east: number; west: number } {
  const latDegrees = metres / 111_320;
  /*
    The narrowest line of longitude the box can touch, not the one at its
    centre. `cos` shrinks as you move away from the equator, so the widest
    degree-span is needed at whichever edge is furthest from it.
  */
  const furthest = Math.min(89, Math.abs(centre.latitude) + latDegrees);
  const lngDegrees = metres / (111_320 * Math.max(0.01, Math.cos((furthest * Math.PI) / 180)));

  return {
    north: centre.latitude + latDegrees,
    south: centre.latitude - latDegrees,
    east: centre.longitude + lngDegrees,
    west: centre.longitude - lngDegrees,
  };
}
