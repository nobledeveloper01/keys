/**
 * Paid placement, kept where it cannot touch the ranking.
 *
 * This product's search says, out loud and in its own doc comments, that
 * nothing about a listing's position can be bought. Phase 5's roadmap adds
 * featured placement, and the naïve reading of that — a boost, a weight, a
 * multiplier — would make the earlier sentence false. A ranking that can be
 * bought stops being a ranking and becomes a rate card, and "Verified first"
 * stops meaning what it says the moment "and paid before that" is true.
 *
 * So a featured listing does not rank. It appears in a **separate band, above
 * the results, labelled as paid**, and `rank()` never learns that featuring
 * exists — there is no parameter to pass it and no field on a scored listing
 * for one. The band is a slot somebody bought; the list underneath is the
 * answer to the question they asked. Those are different things and the page
 * says so.
 *
 * ## The four rules
 *
 * 1. **Verified only.** A slot cannot be used to put an unchecked listing in
 *    front of somebody. If the badge goes, the slot empties on the very next
 *    request — the same recomputation everything else here rests on.
 * 2. **It must match the query.** A paid slot showing a flat in Ikeja to
 *    somebody searching Surulere is an advert, not a result, and a search
 *    results page is not a billboard.
 * 3. **Capped.** Three. A page that can be filled with paid slots is a page
 *    where the free answer is below the fold.
 * 4. **Never twice.** A featured listing is taken out of the ranked list
 *    below, so paying buys a different position rather than two of them.
 */

/** How many paid slots a single search may carry. */
export const FEATURED_CAP = 3;

export interface Featurable {
  readonly id: string;
  readonly verified: boolean;
  /** When the paid placement runs out. Null means it was never bought. */
  readonly featuredUntil: Date | null;
}

/**
 * Whether this listing's paid placement is live.
 *
 * Verified *and* in date. The order of those two conditions does not matter to
 * the machine and does to the reader: the badge is the one that cannot be
 * bought, so it is checked first.
 */
export function isFeatured(listing: Featurable, now: Date): boolean {
  if (!listing.verified) return false;
  if (listing.featuredUntil === null) return false;
  return listing.featuredUntil.getTime() > now.getTime();
}

/**
 * Which of these results occupy the paid band.
 *
 * Takes the *already filtered and ranked* results, so a featured listing can
 * only be one that would have been shown anyway — rule 2, enforced by the
 * shape of the function rather than by remembering it. There is no way to pass
 * this a listing the search did not return.
 *
 * Ties are broken by id rather than by who paid more. A second auction inside
 * the slot would be a ranking again, and this file exists to not have one.
 */
export function featuredAmong<T extends Featurable>(
  results: readonly T[],
  now: Date,
  cap: number = FEATURED_CAP,
): readonly T[] {
  return results
    .filter((listing) => isFeatured(listing, now))
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, Math.max(0, cap));
}

/**
 * The ranked list with the paid band taken out of it.
 *
 * Rule 4. An agent who pays gets a *different* position, not two — and a
 * reader scrolling past the band does not meet the same flat again wearing no
 * label, which would make the label look optional.
 */
export function withoutFeatured<T extends Featurable>(
  results: readonly T[],
  featured: readonly T[],
): readonly T[] {
  const paid = new Set(featured.map((listing) => listing.id));
  return results.filter((listing) => !paid.has(listing.id));
}
