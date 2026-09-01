import {
  costsAreStated,
  liftsSuspension,
  mayList,
  provesPresence,
  metresBetween,
  tierOf,
  tierSentence,
  unmetConditions,
  type Capture,
  type ListingEvidence,
  type Tier,
  type VerifiedCondition,
} from '@keys/domain';

import type { CapturesStore } from '../captures/captures.store';
import type { MarketStore } from '../market/market.store';
import type { ReportsStore } from '../reports/reports.store';
import type { AgentsStore, Listing } from './agents.store';

/**
 * Whether a listing is Verified, and which conditions are not met.
 *
 * **One implementation, because there were two and they disagreed.** The
 * agent's own screen computed the capture distance with `metresBetween`; the
 * search controller copied `distanceM` straight off the stored capture, where
 * it is always null. So an agent saw "photographed at the property, ticked"
 * and a tenant searching found nothing — the same listing, two answers, and
 * the wrong one was the one a tenant saw.
 *
 * Nothing else in this codebase may compute this. It is the sentence the whole
 * product is selling, and a second opinion about it is a bug with a badge on.
 */
export interface Assessment {
  readonly verified: boolean;
  readonly unmet: ReadonlySet<VerifiedCondition>;
  readonly agentName: string;
  readonly agentTier: Tier;
  readonly agentMeaning: string;
  readonly upheldReports: number;
}

export async function assessListing(
  listing: Listing,
  stores: {
    agents: AgentsStore;
    reports: ReportsStore;
    captures: CapturesStore;
    market: MarketStore;
  },
  now: Date,
): Promise<Assessment> {
  const agent = await stores.agents.agentById(listing.agentId);
  const evidence = agent ? await stores.agents.evidenceFor(agent.id) : [];
  const upheld = agent ? await stores.reports.publishedForHash(agent.phoneHash, now) : [];
  const captured = await stores.captures.capturesFor(listing.id);
  const blocked = await stores.captures.isBlocked(listing.id);
  const suspensions = await stores.market.suspensionsFor(listing.id);

  const agentTier: Tier = agent
    ? tierOf(evidence, { joinedAt: agent.joinedAt, upheldReports: upheld.length }, now)
    : 'unverified';

  /*
    Mapped once and read twice — by `unmetConditions` for the photo and video
    conditions, and by the suspension check below. Building the list a second
    time for the suspension would be a second implementation of "does this
    capture prove presence", which is precisely the duplication this file
    exists to have deleted.
  */
  const captures: readonly (Capture & { capturedAt: Date })[] = captured.map(
      (capture): Capture & { capturedAt: Date } => ({
        kind: capture.kind,
        // Anything the store holds passed signature verification to get there
        // — that is the only door — so these are true by construction.
        capturedInApp: true,
        signatureValid: true,
        /*
          Measured now, from the listing's own coordinates, rather than stored
          on the capture. A listing whose location is corrected re-answers
          this instead of carrying a distance computed against the wrong place
          for ever — and a listing with no coordinates measures nothing, which
          is why this is null rather than zero.
        */
        distanceM:
          listing.latitude !== null && listing.longitude !== null
            ? metresBetween(
                { latitude: listing.latitude, longitude: listing.longitude },
                { latitude: capture.latitude, longitude: capture.longitude },
              )
            : null,
        durationSeconds: capture.durationSeconds,
        capturedAt: capture.capturedAt,
      }),
  );

  const inputs: ListingEvidence = {
    agentTier,
    authorityLive: mayList(evidence, listing.propertyId, now),
    captures,
    blockedDuplicate: blocked,
    lastConfirmedAt: listing.lastConfirmedAt,
    upheldReports: upheld.length,
    /*
      Null costs are not stated costs. An all-zero breakdown *is* stated —
      "there is nothing else to pay" is a claim an agent can be reported for
      breaking, and silence is not.
    */
    costsStated: listing.costs !== null && costsAreStated(listing.costs),
    /*
      A suspension counts only while it is unanswered.

      The remedy is deliberately not an appeal: the agent goes back to the
      property and takes a photograph, and `liftsSuspension` compares that
      capture against the suspension's own timestamp. A photograph from before
      the complaint proves the flat existed before the complaint, which nobody
      disputed — so only a capture taken *after* it counts, and it has to prove
      presence, which means signed, in-app, and inside the radius.

      Computed here rather than written back to a `lifted_at` column, for the
      same reason nothing else in this file is stored: an agent who re-captures
      is Verified again on the very next read, with nothing to run and nothing
      to be behind.
    */
    unansweredSuspension: suspensions.some(
      (suspension) =>
        !captures.some((capture) =>
          liftsSuspension(suspension, {
            provesPresence: provesPresence(capture),
            capturedAt: capture.capturedAt,
          }),
        ),
    ),
  };

  const unmet = new Set(unmetConditions(inputs, now));
  return {
    verified: unmet.size === 0,
    unmet,
    agentName: agent?.displayName ?? '',
    agentTier,
    agentMeaning: tierSentence(agentTier),
    upheldReports: upheld.length,
  };
}
