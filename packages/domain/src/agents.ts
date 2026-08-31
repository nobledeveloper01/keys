/**
 * Agent verification, and the rule that makes a tier mean something.
 *
 * Phase 1 answered "has this person been reported". That is a warning. This
 * module answers the other half — "is this person who they say they are, and
 * do they actually have the right to let this flat" — which is the part a
 * tenant is really asking when they hand over an inspection fee.
 *
 * The whole module exists to make one sentence true, in the same way phase 1's
 * registry module makes its own sentence true:
 *
 *   **A tier is computed from evidence the claimant cannot author.**
 *
 * Not "the API rejects a tier field". There is no tier field. `tierOf` is a
 * pure function of evidence rows, every evidence row names an attestor who is
 * not the agent, and nothing in this product stores a tier for anything to
 * write to. An attacker with a modified client, a stolen session, and full
 * knowledge of the schema can send whatever they like; the highest thing they
 * can reach is the tier their evidence already supports.
 */

/**
 * The ladder, in order.
 *
 * Nothing compares two tiers today — `tierOf` returns one by working down the
 * evidence, and `mayList` asks about a property rather than about a rank. The
 * order is here because a reader needs it and because `TIERS.indexOf` is what
 * a comparison should be built on when one is finally needed. A `rank` helper
 * lived here with no callers; this repo deletes those rather than keeping them
 * warm.
 */
export const TIERS = [
  /** Signed up. Has typed a name. This is not a claim about anybody. */
  'unverified',
  /** A liveness check and a government ID that matched each other. */
  'identity',
  /** Identity, plus a landlord who confirmed they may let a specific property. */
  'authority',
  /** Authority on several properties, six months on the platform, nothing upheld. */
  'established',
] as const;

export type Tier = (typeof TIERS)[number];

/**
 * Who said so.
 *
 * Every kind here is a party other than the agent, and that is not a comment —
 * it is the invariant the rest of the file depends on. `identity` comes from a
 * KYC vendor's response, `authority` from somebody holding a one-time code
 * texted to a landlord's phone, `standing` from Keys' own registry. There is
 * deliberately no `self` kind. An agent cannot attest to themself because
 * there is no shape in this union that would let them.
 */
export type Attestor =
  | { readonly kind: 'vendor'; readonly vendor: string; readonly reference: string }
  | { readonly kind: 'landlord'; readonly phoneHash: string }
  | { readonly kind: 'registry' };

export const EVIDENCE_KINDS = ['identity', 'authority', 'standing'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export interface Evidence {
  readonly kind: EvidenceKind;
  readonly agentId: string;
  readonly attestor: Attestor;
  readonly at: Date;
  /** Set when withdrawn — by the landlord, by the vendor, or by Keys. */
  readonly revokedAt: Date | null;
  /**
   * Which property this authority covers. Null for identity and standing,
   * which are about the person rather than about a flat.
   */
  readonly propertyId: string | null;
}

/** Evidence still standing at `now`. Revoked evidence proves nothing. */
export function isLive(evidence: Evidence, now: Date): boolean {
  return evidence.revokedAt === null || evidence.revokedAt > now;
}

/**
 * A landlord's phone may not also be the agent's.
 *
 * This is the fraud the OTP flow invites, and it is obvious the moment you
 * imagine committing it: the agent enters their own second SIM as the
 * landlord, receives the code themself, and self-attests through a mechanism
 * built specifically to prevent self-attestation. The phone hash is the only
 * handle either side has, so comparing hashes is the whole check — and it has
 * to live here, in the rules, rather than in whichever controller happens to
 * be handling the callback.
 */
export function landlordIsNotTheAgent(
  attestor: Attestor,
  agentPhoneHashes: readonly string[],
): boolean {
  return attestor.kind !== 'landlord' || !agentPhoneHashes.includes(attestor.phoneHash);
}

/**
 * How many agents one landlord number may vouch for.
 *
 * A real landlord with a portfolio might use two or three agents; a farm uses
 * one number to lift twenty accounts. Six is set where it is because it is
 * comfortably above the honest case and far below the useful case, and because
 * a number that trips it is worth a human looking at rather than a number that
 * has definitely done something wrong.
 */
export const MAX_AGENTS_PER_LANDLORD = 6;

/** Properties under live authority before `established` is reachable. */
export const ESTABLISHED_PROPERTIES = 3;

/** Days on the platform before `established` is reachable. */
export const ESTABLISHED_DAYS = 180;

/**
 * The agent's own history, as opposed to `Standing`, which is what the public
 * lookup says about a *number*. Two different questions that both wanted the
 * word "standing"; this one is named for whose history it is.
 */
export interface AgentHistory {
  readonly joinedAt: Date;
  /** Upheld reports against this agent. Written by review, never by the agent. */
  readonly upheldReports: number;
}

/**
 * The tier, computed. Nothing stores this.
 *
 * Read the parameter list: evidence rows, standing, and a clock. There is no
 * claimed tier to override and no request to be trusted, which is why the
 * phase gate can be stated as a property of the type rather than as a list of
 * routes somebody remembered to guard.
 */
export function tierOf(
  evidence: readonly Evidence[],
  history: AgentHistory,
  now: Date,
): Tier {
  const live = evidence.filter((e) => isLive(e, now));
  const identified = live.some((e) => e.kind === 'identity');
  if (!identified) return 'unverified';

  const properties = new Set(
    live.filter((e) => e.kind === 'authority' && e.propertyId).map((e) => e.propertyId),
  );
  if (properties.size === 0) return 'identity';

  /*
    An upheld report costs the top tier and nothing below it.

    Dropping a reported agent to `unverified` would be the satisfying rule and
    the wrong one: their ID is still their ID, and a tier that moves on
    accusation rather than on evidence is a tier that can be lowered by
    whoever is willing to file. What an upheld report should cost is the badge
    that means *trusted*, and that is exactly `established`.
  */
  const days = (now.getTime() - history.joinedAt.getTime()) / 86_400_000;
  const established =
    properties.size >= ESTABLISHED_PROPERTIES &&
    days >= ESTABLISHED_DAYS &&
    history.upheldReports === 0;

  return established ? 'established' : 'authority';
}

/**
 * What a listing needs before it may be published.
 *
 * Not a tier floor — deliberately. There was a `LISTING_FLOOR = 'authority'`
 * constant here, and it was wrong in a way that reads as right: a tier is a
 * fact about a *person*, and the right to publish is a fact about a person and
 * a flat together. An agent verified to the hilt on three properties has no
 * more right to list a fourth they were never given than a stranger does, and
 * a floor comparison would have handed it to them.
 */
export function mayList(
  evidence: readonly Evidence[],
  propertyId: string,
  now: Date,
): boolean {
  /*
    Identity is required here as well as authority, and the reason is a hole
    that was open until somebody asked what happens after a fraud finding.

    Revoking a forged ID drops the agent to `unverified` — `tierOf` says so.
    But `mayList` used to ask only about authority, so their listings stayed
    published under a landlord's month-old confirmation, and the badge said
    nothing while the flat stayed on the market. The ladder is climbed in
    order, so it has to be *descended* in order too.
  */
  const identified = evidence.some((e) => e.kind === 'identity' && isLive(e, now));
  if (!identified) return false;

  return evidence.some(
    (e) => e.kind === 'authority' && e.propertyId === propertyId && isLive(e, now),
  );
}

/**
 * What a revocation takes down with it.
 *
 * A landlord who withdraws authority is usually a landlord who has just
 * discovered something, and the listing has to stop being public in the same
 * instant — not on the next cron sweep. The server runs this inside one
 * transaction with the revocation itself; this function decides *what*, the
 * store decides *atomically*.
 */
export interface CascadableListing {
  readonly id: string;
  readonly agentId: string;
  readonly propertyId: string;
  readonly publishedAt: Date | null;
}

export function cascade(
  revoked: Evidence,
  listings: readonly CascadableListing[],
): readonly string[] {
  const published = listings.filter((l) => l.publishedAt !== null);

  /*
    Losing an identity takes down everything.

    Not only the properties — all of them, on every property, because what has
    been withdrawn is the claim that this person is who they said they were.
    Every landlord confirmation downstream of that was a confirmation about
    somebody else.
  */
  if (revoked.kind === 'identity') {
    return published.filter((l) => l.agentId === revoked.agentId).map((l) => l.id);
  }

  if (revoked.kind !== 'authority' || revoked.propertyId === null) return [];
  return published
    .filter((l) => l.agentId === revoked.agentId && l.propertyId === revoked.propertyId)
    .map((l) => l.id);
}

/**
 * What a tenant is told, in words rather than in a badge.
 *
 * The badge is the part that gets faked in screenshots, so the app never shows
 * one alone — it shows the sentence, and the sentence names what was actually
 * checked. "Verified" is a claim nobody can audit; "a landlord confirmed this
 * agent may let this flat" is one somebody could go and check.
 */
export function tierSentence(tier: Tier): string {
  switch (tier) {
    case 'unverified':
      return 'Nothing about this person has been checked.';
    case 'identity':
      return 'Their ID was checked against a live photo of their face.';
    case 'authority':
      // Not "this property". These sentences are read on a number lookup,
      // where no property is on the screen at all, and a sentence that points
      // at something the reader cannot see is a sentence they will supply
      // their own answer to.
      return 'A landlord has confirmed a property they may let.';
    case 'established':
      return 'Landlords have confirmed them on several properties over months, with nothing upheld against them.';
  }
}
