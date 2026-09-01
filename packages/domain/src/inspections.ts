/**
 * Going to see a place, and saying what happened.
 *
 * The inspection is where this market's money actually changes hands before
 * anything is agreed. An "inspection fee" of five to twenty thousand naira is
 * routine, is usually cash, and is the single cheapest scam available: collect
 * it from thirty people for a flat you do not control and never speak to any
 * of them again.
 *
 * Two things here answer that. The fee is declared before the visit, so that
 * asking for more at the door is a broken claim rather than a disagreement
 * about what was said. And the tenant says what happened afterwards, which is
 * the only moment anybody can tell the difference between a listing that is
 * real and a listing that merely has good photographs.
 */

/**
 * What happened when somebody went.
 *
 * Ordered by how much they matter, not alphabetically. The first is the one
 * this product exists to catch.
 */
export const OUTCOMES = [
  /**
   * There was no such property.
   *
   * Not "I didn't like it" and not "the agent didn't show up" — those are the
   * next two. This is the claim that the address had nothing at it, or nothing
   * matching, and it is the only one that touches the badge.
   */
  'did_not_exist',
  /** Nobody came, or the agent cancelled at the door. */
  'agent_did_not_show',
  /** More money was asked for than the listing said. */
  'asked_for_more_money',
  /** It was there and it was as described. The common case. */
  'as_described',
  /** It was there, it was not for them. Also common, and not a complaint. */
  'not_for_me',
] as const;
export type Outcome = (typeof OUTCOMES)[number];

/**
 * Which outcomes suspend the badge on their own.
 *
 * Only one. `agent_did_not_show` is rude and `asked_for_more_money` is worse,
 * but neither is a claim that the listing is fiction, and suspending a real
 * property for a missed appointment would make this mechanism something
 * agents route around rather than answer.
 */
export function suspendsVerified(outcome: Outcome): boolean {
  return outcome === 'did_not_exist';
}

/*
  There is deliberately no expiry constant here.

  A suspension does not time out. One that did would make the cheapest response
  to a true report *waiting*, which is exactly backwards — it is lifted by
  evidence or by a reviewer and by nothing else. An earlier version of this file
  stated that as `SUSPENSION_LIFTS_ONLY_ON_EVIDENCE = true`, which is a comment
  wearing a constant's clothes: nothing read it, nothing could have, and a
  `false` would have changed no behaviour at all.
*/

export interface Suspension {
  readonly listingId: string;
  readonly reportedBy: string;
  readonly at: Date;
  /** Set when the agent has produced fresh evidence, or a reviewer cleared it. */
  readonly liftedAt: Date | null;
}

/**
 * Whether a fresh capture answers a suspension.
 *
 * **This is the load-bearing idea of the whole mechanism.** An automatic
 * suspension that only a reviewer can lift is a griefing tool: one stranger
 * with an account takes a competitor off the market for as long as the queue
 * is. So the remedy is not an appeal — it is the same evidence the badge
 * already rests on, produced again, *after* the complaint.
 *
 * An honest agent walks back to the flat and takes a photograph. Ten minutes,
 * no queue, no argument, no reviewer. An agent who never had the flat cannot
 * do it at all, because the capture is signed by a device key, carries
 * coordinates, and has to be within the radius of the property they published.
 *
 * The capture must be *after* the report. A photograph from last week proves
 * the flat existed last week, which is not in dispute — the claim is that
 * somebody went there this week and found nothing.
 */
export function liftsSuspension(
  suspension: Suspension,
  capture: { readonly provesPresence: boolean; readonly capturedAt: Date },
): boolean {
  if (suspension.liftedAt !== null) return true;
  if (!capture.provesPresence) return false;
  /*
    `>=`, not `>`.

    An agent who re-captures the instant a report lands can produce a claim
    stamped the same millisecond, and the two timestamps come from different
    clocks anyway — the phone's and the server's — so millisecond-exact
    ordering between them was never real. What this still refuses is a
    photograph from genuinely *before* the complaint, which is the whole point:
    it proves the flat was there then, and nobody said otherwise.

    A phone cannot use this to pre-empt a complaint it has not received:
    `capturedAtIsPlausible` refuses a capture dated in the future at upload.
  */
  return capture.capturedAt.getTime() >= suspension.at.getTime();
}

/**
 * Who is allowed to record an outcome.
 *
 * Only somebody with an inspection that was actually arranged through Keys,
 * and only once. Anyone-can-report would make the suspension a button on the
 * open internet; arranging an inspection costs a real account, a real
 * conversation and an agent who agreed to a time, which is not much but is
 * enormously more than nothing.
 */
export const INSPECTION_STATES = ['requested', 'agreed', 'declined', 'done'] as const;
export type InspectionState = (typeof INSPECTION_STATES)[number];

export interface Inspection {
  readonly id: string;
  readonly listingId: string;
  readonly tenantId: string;
  readonly state: InspectionState;
  /**
   * What the agent said they would charge to show it, in kobo.
   *
   * Declared before the visit and zero is an answer — the same rule as the
   * listing's costs, for the same reason. "No inspection fee" is a claim
   * somebody can be reported for breaking; silence is not.
   */
  readonly feeKobo: number;
  readonly outcome: Outcome | null;
}

export function mayRecordOutcome(inspection: Inspection): boolean {
  // Not before it happened, and not twice.
  return inspection.state === 'agreed' && inspection.outcome === null;
}

/**
 * Whether the fee asked for at the door matches the fee that was declared.
 *
 * Exact, not approximate. A tolerance here would be a negotiation about how
 * much extra is acceptable, and the answer is none — the number was stated in
 * advance precisely so that there is nothing to argue about.
 */
export function feeWasHonoured(declaredKobo: number, paidKobo: number): boolean {
  return paidKobo <= declaredKobo;
}
