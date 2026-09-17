/**
 * A saved search, and what moved since it was last read (ADR-0020).
 *
 * A search is a moment; a saved search is the box and the answer it last
 * saw. The comparison here is the whole feature: listings that are new,
 * prices that changed and by how much, and — the one worth acting on — a
 * property that was seen before and is back under a different agent. There
 * is no push and no score; the tenant reads it when they choose.
 */

export interface SearchParams {
  readonly q: string;
  readonly cityId: string | null;
  readonly place: { readonly latitude: number; readonly longitude: number } | null;
  readonly withinKm: number | null;
  readonly verifiedOnly: boolean;
}

/** What one result looked like when the search last saw it. */
export interface Seen {
  readonly id: string;
  readonly agentId: string;
  readonly annualRentKobo: number | null;
  /** Listings whose photographs this one's resemble, as the capture index found them. */
  readonly resembles: readonly string[];
}

export type MarketMove =
  | { readonly kind: 'new'; readonly id: string }
  | { readonly kind: 'price'; readonly id: string; readonly fromKobo: number; readonly toKobo: number }
  | { readonly kind: 'gone'; readonly id: string }
  /** A listing not seen before whose photographs match one that was, under a different agent. */
  | { readonly kind: 'reappeared'; readonly id: string; readonly previousId: string };

export const MAX_SAVED_SEARCHES = 10;

/**
 * Everything that changed between two answers to the same question.
 *
 * Order: the reappearances first, because that is the signal the feature
 * exists for; then new, then price, then gone. A listing that reappeared is
 * not also reported as new.
 */
export function marketMoves(previous: readonly Seen[], current: readonly Seen[]): readonly MarketMove[] {
  const before = new Map(previous.map((s) => [s.id, s]));
  const after = new Map(current.map((s) => [s.id, s]));
  const moves: MarketMove[] = [];

  for (const s of current) {
    if (before.has(s.id)) continue;
    const previousId = s.resembles.find((id) => {
      const seen = before.get(id);
      return seen !== undefined && seen.agentId !== s.agentId;
    });
    if (previousId !== undefined) moves.push({ kind: 'reappeared', id: s.id, previousId });
  }
  const reappeared = new Set(moves.map((m) => m.id));
  for (const s of current) {
    if (!before.has(s.id) && !reappeared.has(s.id)) moves.push({ kind: 'new', id: s.id });
  }
  for (const s of current) {
    const was = before.get(s.id);
    if (was && was.annualRentKobo !== null && s.annualRentKobo !== null && was.annualRentKobo !== s.annualRentKobo) {
      moves.push({ kind: 'price', id: s.id, fromKobo: was.annualRentKobo, toKobo: s.annualRentKobo });
    }
  }
  for (const s of previous) {
    if (!after.has(s.id)) moves.push({ kind: 'gone', id: s.id });
  }
  return moves;
}

/** The same question, spelt the same way, is the same saved search. */
export function sameSearch(a: SearchParams, b: SearchParams): boolean {
  return (
    a.q.trim().toLowerCase() === b.q.trim().toLowerCase() &&
    a.cityId === b.cityId &&
    a.withinKm === b.withinKm &&
    a.verifiedOnly === b.verifiedOnly &&
    (a.place === null) === (b.place === null) &&
    (a.place === null || b.place === null || (Math.abs(a.place.latitude - b.place.latitude) < 1e-4 && Math.abs(a.place.longitude - b.place.longitude) < 1e-4))
  );
}
