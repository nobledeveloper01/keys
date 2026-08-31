import { CONFIRMATION_DAYS } from './listings.ts';
import { metresBetween, type Point } from './places.ts';

/**
 * What a tenant sees first, and why.
 *
 * The ranking is in the domain rather than in a SQL `ORDER BY` because it is a
 * product decision that has to be arguable. "Why is this listing above that
 * one" is a question an agent will ask, and the answer has to be a rule
 * somebody wrote down rather than whatever the query planner did.
 *
 * ## What is deliberately not here
 *
 * **Money.** No paid placement, no boost, no sponsored slot. Phase 5 adds
 * featured placement and the roadmap constrains it to Verified listings and
 * caps it — but it is a *slot*, marked as such, not a thumb on this scale. The
 * moment a rank can be bought, "Verified first" stops meaning what it says and
 * the badge stops being worth having.
 *
 * **Recency of posting.** It rewards churn: an agent who deletes and re-posts
 * a stale listing beats one who kept theirs honest. What is rewarded here is
 * *confirming* a listing is still available, which costs the same effort and
 * means something.
 */

export interface Rankable {
  readonly id: string;
  readonly verified: boolean;
  readonly lastConfirmedAt: Date | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface Ranked<T> {
  readonly listing: T;
  readonly score: number;
  /** Why it sits where it does, in the order the reasons were applied. */
  readonly because: readonly string[];
}

/**
 * How far away stops mattering.
 *
 * Five kilometres. Beyond that in Lagos you are talking about a different
 * commute rather than a different street, and a linear distance term would
 * keep sorting listings by metres long after the difference has stopped being
 * one a tenant cares about.
 */
export const DISTANCE_HORIZON_M = 5_000;

/**
 * Rank published listings for a tenant.
 *
 * Verified is not a tiebreak — it is the first thing, by a margin nothing else
 * can close. A listing whose seven conditions hold has had an ID checked, a
 * landlord confirm the authority, a photograph taken on site, and somebody say
 * within the fortnight that it is still there. That is the product.
 */
export function rank<T extends Rankable>(
  listings: readonly T[],
  near: Point | null,
  now: Date,
): readonly Ranked<T>[] {
  return listings
    .map((listing) => {
      const because: string[] = [];
      let score = 0;

      if (listing.verified) {
        score += 1_000;
        because.push('verified');
      }

      /*
        Freshness, and only as a fraction of one Verified.

        A confirmation two days old beats one twelve days old, and no amount of
        freshness lifts an unverified listing above a verified one. The most
        confidently-asserted unchecked listing in Lagos still sits below the
        least recently confirmed checked one.
      */
      if (listing.lastConfirmedAt !== null) {
        const days = (now.getTime() - listing.lastConfirmedAt.getTime()) / 86_400_000;
        const freshness = Math.max(0, 1 - days / CONFIRMATION_DAYS);
        score += freshness * 100;
        if (freshness > 0.5) because.push('confirmed recently');
      }

      if (near !== null && listing.latitude !== null && listing.longitude !== null) {
        const metres = metresBetween(near, {
          latitude: listing.latitude,
          longitude: listing.longitude,
        });
        const closeness = Math.max(0, 1 - metres / DISTANCE_HORIZON_M);
        score += closeness * 300;
        if (metres < 1_500) because.push('nearby');
      }

      return { listing, score, because };
    })
    /*
      Sorted by score, then by id.

      The id is not decoration: two listings with identical evidence and no
      location tie exactly, and an unstable sort would reorder them between two
      identical searches. A results page that shuffles on refresh looks broken
      and makes "it was here a minute ago" true.
    */
    .sort((a, b) => b.score - a.score || a.listing.id.localeCompare(b.listing.id));
}

/**
 * Whether a listing matches what somebody typed.
 *
 * Deliberately dumb: lower-case substring over the title and the address.
 * Postgres full-text search lands with the real query in phase 4's second
 * half, and this is what the rule *is* — a match is a match on the words a
 * tenant can see, not on a stemmed lexeme they cannot. Written here so the
 * mobile app and the server agree about what "matches" means.
 */
export function matches(haystack: readonly string[], typed: string): boolean {
  const needle = typed.trim().toLowerCase();
  if (needle === '') return true;
  return needle
    .split(/\s+/)
    // Every word, not any: typing two words should narrow rather than widen.
    // "yaba flat" returning every flat in Lagos plus everything in Yaba is a
    // search that punishes you for being specific.
    .every((word) => haystack.some((field) => field.toLowerCase().includes(word)));
}
