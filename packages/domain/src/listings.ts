import { TIERS, type Tier } from './agents.ts';

/**
 * What "Verified" is allowed to mean.
 *
 * This is the claim the whole product is selling. A tenant who sees the badge
 * and travels across Lagos to a flat that does not exist has been lied to by
 * Keys, not by the agent — so the rule that produces it is written here, once,
 * as a pure function of evidence, and computed on the server on every read of
 * the inputs.
 *
 * Two properties matter more than the conditions themselves:
 *
 *   1. **There is no input called `is_verified`.** Not on any route, not in any
 *      DTO, not as a column anybody writes. It is derived, the way a tier is.
 *   2. **The badge and the explanation are the same computation.** `isVerified`
 *      is defined as "nothing is unmet", so a listing cannot be Verified while
 *      the reasons list says why it is not — which is exactly the drift that
 *      makes a status page nobody trusts.
 */

/**
 * The seven, named. Ordered by what an agent can do about them soonest, because
 * this list is shown to them as a to-do rather than as a verdict.
 */
export const VERIFIED_CONDITIONS = [
  /** The agent's own ID has been checked and not withdrawn. */
  'agent_identity',
  /** A landlord has confirmed this agent may let this property, and has not withdrawn it. */
  'landlord_authority',
  /** At least one photo captured in the app, signed, within 200 m of the property. */
  'capture_on_site',
  /** A walkthrough video of at least thirty seconds. */
  'walkthrough_video',
  /** No image here matched an image Keys has blocked. */
  'not_a_known_duplicate',
  /** Somebody confirmed in the last fortnight that it is still available. */
  'recently_confirmed',
  /** No upheld report against this listing or the agent behind it. */
  'nothing_upheld',
  /**
   * The agent has said what the place actually costs — rent, agency fee,
   * agreement fee, deposit, service charge — including where a figure is zero.
   *
   * The odd one out, and deliberately so. The other seven are evidence that a
   * property and an agent are real; this one an agent could satisfy with
   * numbers they have invented. Stating a fee does not make it true.
   *
   * It earns its place because a *stated* fee is a claim on the record. An
   * agent who wrote ₦80,000 and asks for ₦200,000 at the door can be reported
   * for it, and `undisclosed_fees` is already a report category here. Silence
   * cannot be reported against, which is exactly why silence is the norm and
   * why "₦800,000" turns into ₦1,100,000 on the day.
   *
   * It is also the cheapest of the eight for an honest agent — four numbers —
   * and the only one a dishonest one gains anything by skipping.
   */
  'costs_stated',
  /**
   * Nobody has gone to this address and found nothing there.
   *
   * The only condition a stranger can set, which is why it is the only one
   * with a remedy that does not involve a queue. An outcome of *it was not
   * there*, from somebody whose inspection this agent agreed to, suspends the
   * badge at once — a tenant who made that journey should not watch the
   * listing stay Verified while a reviewer gets to it.
   *
   * What stops it being a button for taking a competitor off the market is
   * that the agent lifts it themselves, by going back and photographing the
   * property. Ten minutes for somebody who has the flat; impossible for
   * somebody who never did, because the capture is signed by a device key and
   * has to be within the radius of the coordinates they published.
   */
  'nobody_found_it_missing',
] as const;

export type VerifiedCondition = (typeof VERIFIED_CONDITIONS)[number];

/**
 * How far from the property a capture may be taken.
 *
 * Two hundred metres, not fifty. A phone's civilian GPS is routinely out by
 * tens of metres in a dense Lagos street, and indoors it is worse — a tighter
 * radius would fail honest agents standing in the flat they are photographing,
 * and a rule that punishes the honest case is a rule agents route around.
 */
export const CAPTURE_RADIUS_M = 200;

/** A walkthrough shorter than this is a photo with motion, not a walkthrough. */
export const MIN_VIDEO_SECONDS = 30;

/**
 * How long a confirmation lasts.
 *
 * A fortnight, because the single most common complaint in this market is
 * being shown a flat that was let weeks ago. The cost is real and falls on the
 * agent: a listing goes unverified if nobody touches it for two weeks. That is
 * the point — a Verified badge that survives neglect is a badge that means the
 * listing existed once.
 */
export const CONFIRMATION_DAYS = 14;

export interface Capture {
  readonly kind: 'photo' | 'video';
  /** False for anything that arrived by any path other than in-app capture. */
  readonly capturedInApp: boolean;
  /** Whether the device signature over the bytes and the metadata verified. */
  readonly signatureValid: boolean;
  /** Metres between where it was captured and the property. Null when unknown. */
  readonly distanceM: number | null;
  readonly durationSeconds: number | null;
}

export interface ListingEvidence {
  readonly agentTier: Tier;
  readonly authorityLive: boolean;
  readonly captures: readonly Capture[];
  /** A match a reviewer blocked — this image is already somewhere it should not be. */
  readonly blockedDuplicate: boolean;
  readonly lastConfirmedAt: Date | null;
  readonly upheldReports: number;
  /**
   * Whether the costs are stated in full — see `costsAreStated`. An explicit
   * zero is stated; a missing field is not.
   */
  readonly costsStated: boolean;
  /**
   * An unanswered report that somebody went and found nothing.
   *
   * "Unanswered" is doing the work: a suspension a fresh on-site capture has
   * already answered is not one, and that judgement is `liftsSuspension`'s,
   * made against the capture's own timestamp.
   */
  readonly unansweredSuspension: boolean;
}

/** A capture that actually proves somebody stood in the property. */
export function provesPresence(capture: Capture): boolean {
  return (
    capture.capturedInApp &&
    capture.signatureValid &&
    capture.distanceM !== null &&
    capture.distanceM <= CAPTURE_RADIUS_M
  );
}

/**
 * Which of the seven are unmet, in order.
 *
 * This is the primary function; `isVerified` is a question about its result.
 * Written that way round on purpose — an agent whose listing is not Verified
 * needs to be told which condition and what to do, and a boolean with a
 * separately-computed reason list is two implementations of one rule.
 */
export function unmetConditions(
  evidence: ListingEvidence,
  now: Date,
): readonly VerifiedCondition[] {
  const unmet: VerifiedCondition[] = [];

  if (TIERS.indexOf(evidence.agentTier) < TIERS.indexOf('identity')) {
    unmet.push('agent_identity');
  }
  if (!evidence.authorityLive) unmet.push('landlord_authority');

  if (!evidence.captures.some((c) => c.kind === 'photo' && provesPresence(c))) {
    unmet.push('capture_on_site');
  }

  /*
    The video must prove presence too.

    An earlier reading of this condition asked only for thirty seconds of
    video, which would accept a thirty-second clip pulled off Instagram beside
    one genuine on-site photo. The photo condition and the video condition are
    not "one of each" — they are two things that each have to have been
    captured, in the app, at the property.
  */
  if (
    !evidence.captures.some(
      (c) =>
        c.kind === 'video' &&
        provesPresence(c) &&
        (c.durationSeconds ?? 0) >= MIN_VIDEO_SECONDS,
    )
  ) {
    unmet.push('walkthrough_video');
  }

  if (evidence.blockedDuplicate) unmet.push('not_a_known_duplicate');

  const confirmed =
    evidence.lastConfirmedAt !== null &&
    now.getTime() - evidence.lastConfirmedAt.getTime() <= CONFIRMATION_DAYS * 86_400_000;
  if (!confirmed) unmet.push('recently_confirmed');

  if (evidence.upheldReports > 0) unmet.push('nothing_upheld');

  if (!evidence.costsStated) unmet.push('costs_stated');

  if (evidence.unansweredSuspension) unmet.push('nobody_found_it_missing');

  return unmet;
}

/**
 * The badge.
 *
 * Defined in terms of `unmetConditions` and never computed separately, so the
 * badge and the reasons cannot disagree. If this were its own chain of `&&`,
 * the two would drift the first time somebody added a condition to one of them.
 */
export function isVerified(evidence: ListingEvidence, now: Date): boolean {
  return unmetConditions(evidence, now).length === 0;
}

/**
 * What to tell the agent about one unmet condition.
 *
 * A sentence with a next action in it. "Verification failed" tells somebody
 * they have a problem; this tells them what to go and do, which is the whole
 * difference between a mechanism that is legible and one that is a wall.
 */
export function whatToDo(condition: VerifiedCondition): string {
  switch (condition) {
    case 'agent_identity':
      return 'Complete your ID check. Everything else rests on it.';
    case 'landlord_authority':
      return 'Ask the landlord to confirm you may let this property. They get a code by text.';
    case 'capture_on_site':
      return `Take at least one photo in the Keys app, standing at the property. Photos from your gallery do not count, and neither does one taken more than ${CAPTURE_RADIUS_M} m away.`;
    case 'walkthrough_video':
      return `Record a walkthrough of at least ${MIN_VIDEO_SECONDS} seconds in the app, at the property.`;
    case 'not_a_known_duplicate':
      return 'One of these images is already in use on a listing we blocked. Replace it with your own.';
    case 'recently_confirmed':
      return `Confirm the property is still available. Verified listings are confirmed every ${CONFIRMATION_DAYS} days.`;
    case 'nothing_upheld':
      return 'A report against this listing or against you was upheld. It has to be resolved before this can be Verified again.';
    case 'costs_stated':
      return 'State the full cost of moving in: rent, your fee, the agreement fee, the deposit and any service charge. Put zero where there is nothing to pay — a zero is an answer, a blank is not.';
    case 'nobody_found_it_missing':
      return 'Somebody went to this address and said there was nothing there. Go back and take a photo in the app, standing at the property. That lifts this straight away — you do not need to wait for anybody.';
  }
}
