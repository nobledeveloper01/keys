/**
 * A listing kept on the phone, and what may honestly be said about it.
 *
 * Networks here drop in lifts, in traffic, and for whole afternoons. A tenant
 * who found a flat on Tuesday should be able to look at the address again on
 * Wednesday without signal — that much is ordinary.
 *
 * What is not ordinary is the badge. **Verified is computed on every read**,
 * from evidence that can change between one read and the next: a landlord
 * withdraws, a reviewer blocks an image, somebody goes to the address and finds
 * nothing. That is the entire point of phase 4's gate — nothing is cached,
 * nothing can be behind.
 *
 * A saved copy is, by definition, behind. So it does not get to say "Verified".
 * It says what was true when it was saved, and when that was, in those words.
 *
 * ## Why this is a domain rule and not a screen decision
 *
 * Because the tempting version is a one-line change on a screen — render the
 * saved `verified` boolean, it was true when we stored it — and that is how a
 * badge nobody re-checked ends up in front of somebody standing outside a flat
 * that was delisted yesterday. The words a saved copy is allowed to use belong
 * next to the rule about why.
 */

/** A snapshot, and when it was taken. */
export interface SavedAt {
  readonly savedAt: Date;
}

/**
 * How much trust a saved copy has left.
 *
 * The boundary is `CONFIRMATION_DAYS`, and not by coincidence: a Verified
 * listing is one somebody confirmed within the fortnight, so a copy older than
 * that is older than the freshest claim the live product would have made about
 * it. Past that point the saved answer is not merely stale, it is stale by the
 * product's own definition.
 */
export const SAVED_AGES = ['today', 'recent', 'old'] as const;
export type SavedAge = (typeof SAVED_AGES)[number];

export function savedAge(saved: SavedAt, now: Date, confirmationDays: number): SavedAge {
  const days = (now.getTime() - saved.savedAt.getTime()) / 86_400_000;
  if (days < 1) return 'today';
  return days < confirmationDays ? 'recent' : 'old';
}

/**
 * Whether a saved copy may show the badge it was saved with.
 *
 * **Never.** Not "not when it is old" — never, at any age, including a copy
 * saved thirty seconds ago.
 *
 * A badge means *Keys checked this and stands behind it*, and a phone with no
 * signal cannot check anything. The difference between thirty seconds and
 * thirty days is not a difference in what this app knows; it is a difference in
 * how likely it is to be wrong, and a claim that is probably right is exactly
 * the kind this product refuses everywhere else.
 *
 * The function exists rather than the rule being written in a comment, so that
 * a screen asking the question gets an answer instead of a judgement call.
 */
export function mayShowBadgeOffline(): boolean {
  return false;
}

/**
 * How many listings a phone keeps.
 *
 * Fifty. Enough that somebody comparing a shortlist has all of it, small enough
 * that the store is a few hundred kilobytes on a phone with none to spare — and
 * bounded at all, because an unbounded cache on a 16 GB Android handset is a
 * feature that ends with somebody deleting the app.
 */
export const MAX_SAVED = 50;

/**
 * Which saved listings to keep when there are too many.
 *
 * The most recently saved, and ties broken by id so two phones with the same
 * saves keep the same ones. Oldest-out rather than least-opened: opening is not
 * recorded, and inventing a counter to decide what to delete would mean
 * watching what somebody reads in order to manage storage.
 */
export function keepNewest<T extends SavedAt & { readonly id: string }>(
  saved: readonly T[],
  limit: number = MAX_SAVED,
): readonly T[] {
  return saved
    .slice()
    .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime() || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}
