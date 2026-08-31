import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import {
  MAX_AGENTS_PER_LANDLORD,
  cascade,
  landlordIsNotTheAgent,
  mayList,
  type Evidence,
} from '@keys/domain';

import { hashPhone } from '../reports/reports.store';

export interface StoredAgent {
  readonly id: string;
  readonly displayName: string;
  /** Hashed, like every phone number in this product. */
  readonly phoneHash: string;
  readonly joinedAt: Date;
}

export interface Listing {
  readonly id: string;
  readonly agentId: string;
  readonly propertyId: string;
  readonly title: string;
  readonly publishedAt: Date | null;
  /**
   * When somebody last said this is still available.
   *
   * Null until they do, and *not* defaulted to the creation date. A listing
   * that has never been confirmed has never been confirmed; treating "I
   * published it" as "it is still available" would give every listing a free
   * fortnight and make the first confirmation the one nobody ever does.
   */
  readonly lastConfirmedAt: Date | null;
}

/**
 * What the landlord is being asked to confirm.
 *
 * One mechanism for both directions on purpose. Granting authority and taking
 * it back are the same question — *is this really the landlord?* — and two
 * mechanisms would mean two chances to get that question wrong. It also means
 * the withdrawal is exactly as easy as the grant was, which is the property
 * that matters when a landlord has just found out something about their agent.
 */
export const CHALLENGE_PURPOSES = ['grant', 'revoke'] as const;
export type ChallengePurpose = (typeof CHALLENGE_PURPOSES)[number];

/** A challenge waiting on a landlord to answer a text. */
export interface Challenge {
  readonly id: string;
  readonly purpose: ChallengePurpose;
  readonly agentId: string;
  readonly propertyId: string;
  readonly landlordPhoneHash: string;
  readonly expiresAt: Date;
}

export class LandlordIsTheAgent extends Error {}
export class LandlordVouchesForTooMany extends Error {}

/**
 * A value or a promise of one.
 *
 * The in-memory store is synchronous and the Postgres store is not, and every
 * caller awaits either way. The same shape `ReportsStore` uses, for the same
 * reason: marking the memory methods `async` to satisfy a signature is how you
 * end up with a store full of `async` methods that never await anything.
 */
type Await<T> = Promise<T> | T;

/** How long a landlord has to answer the text before the code stops working. */
export const AUTHORITY_CODE_MINUTES = 30;

/**
 * How many wrong codes a request tolerates before it is dead.
 *
 * Six digits is a million guesses, which sounds safe until you notice nobody
 * has to guess them one at a time. Five attempts and the request is finished —
 * the landlord asks for another text, which costs them nothing and costs an
 * attacker the whole search space again.
 */
export const MAX_CODE_ATTEMPTS = 5;

/**
 * Where agents, their evidence, and their listings live.
 *
 * The shape to read here is what is *missing*: there is no `setTier`, no
 * `tier` column, and no method that takes a tier at all. `tierOf` in the
 * domain computes it from what comes back out of `evidenceFor`, every time it
 * is asked. That is what makes the phase gate a property of the design rather
 * than a promise about the controllers.
 */
@Injectable()
export abstract class AgentsStore {
  abstract readonly durable: boolean;

  abstract createAgent(input: {
    displayName: string;
    phone: string;
    now: Date;
  }): Await<{ agent: StoredAgent; token: string }>;

  abstract agentByToken(token: string): Await<StoredAgent | null>;
  abstract agentById(id: string): Await<StoredAgent | null>;
  abstract agentByPhoneHash(hash: string): Await<StoredAgent | null>;

  /**
   * Every agent, for the review console and for nothing else.
   *
   * Deliberately not paginated yet and deliberately not filtered: at the scale
   * where either matters, this needs a query somebody has thought about rather
   * than a filter bolted onto a list read. What it must never grow is a public
   * caller — an enumerable list of agents and their phones is the directory
   * `byPhone` refuses to be.
   */
  abstract everyAgent(): Await<readonly StoredAgent[]>;
  abstract evidenceFor(agentId: string): Await<readonly Evidence[]>;

  abstract recordIdentity(input: {
    agentId: string;
    vendor: string;
    reference: string;
    now: Date;
  }): Await<void>;

  /**
   * Open a challenge and return its code **to the caller inside this process**.
   *
   * The code is returned here and goes straight to the outbox; no controller
   * puts it in a response body, and the phase gate walks every route asserting
   * that none ever does. It has to be, because the agent is the one asking for
   * the text — hand them the code and the landlord confirmation becomes a
   * self-confirmation, which is the one thing this whole flow exists to stop.
   */
  abstract openChallenge(input: {
    purpose: ChallengePurpose;
    agentId: string;
    propertyId: string;
    landlordPhone: string;
    now: Date;
  }): Await<{ challenge: Challenge; code: string }>;

  /**
   * Open a withdrawal challenge, to the number already on the record.
   *
   * Separate from `openChallenge` because it must not take a phone number from
   * a caller. The grant flow can: the agent is signed in, and they are naming
   * the landlord they claim to act for. The withdrawal flow cannot — it is
   * reachable by anybody with a link, and a route that accepts both "whose
   * authority to revoke" and "where to text the code" from the same stranger
   * is a route that revokes a stranger's authority. The code goes to the phone
   * that granted it, which is the only number that has any standing here.
   *
   * Returns null when no live authority exists for that pair, which is also
   * the answer for an agent id that does not exist — a caller must not be able
   * to tell those apart.
   */
  abstract openWithdrawal(input: {
    agentId: string;
    propertyId: string;
    now: Date;
  }): Await<{ challenge: Challenge; code: string } | null>;

  /**
   * Answer a challenge. Grants or withdraws depending on its purpose, and on
   * a withdrawal unpublishes everything that stood on it in one transaction.
   *
   * Returns what it did as well as what went dark, because the page the
   * landlord is looking at cannot tell the two apart otherwise — it was
   * telling somebody who had just withdrawn an authority that they could
   * withdraw it at any time. Null when the answer was wrong.
   */
  abstract answerChallenge(input: {
    challengeId: string;
    code: string;
    now: Date;
  }): Await<{ purpose: ChallengePurpose; unpublished: readonly string[] } | null>;

  /** Withdraw an identity — Keys' own finding, not a landlord's. Atomic. */
  abstract revokeIdentity(input: {
    agentId: string;
    now: Date;
  }): Await<readonly string[]>;

  abstract createListing(input: {
    agentId: string;
    propertyId: string;
    title: string;
    now: Date;
  }): Await<Listing>;

  abstract listingsOf(agentId: string): Await<readonly Listing[]>;
  abstract listing(id: string): Await<Listing | null>;
  abstract publishListing(id: string, now: Date): Await<void>;

  /**
   * Record that a listing is still available.
   *
   * The agent's own claim, not a reviewer's, and that is the point: it is
   * cheap to make and it expires. What it buys is that a flat let three weeks
   * ago stops being Verified without anybody having to notice — which is the
   * single most common complaint in this market.
   */
  abstract confirmStillAvailable(id: string, now: Date): Await<boolean>;
  abstract publishedListings(): Await<readonly Listing[]>;
}

/** Hashed the same way everywhere, so a token at rest is not a token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class InMemoryAgentsStore extends AgentsStore {
  readonly durable = false;

  private readonly agents = new Map<string, StoredAgent>();
  private readonly tokens = new Map<string, string>();
  private readonly evidence: Evidence[] = [];
  private readonly listings = new Map<string, Listing>();
  private readonly challenges = new Map<
    string,
    Challenge & { codeHash: string; attempts: number; used: boolean }
  >();

  createAgent(input: { displayName: string; phone: string; now: Date }) {
    const agent: StoredAgent = {
      id: randomUUID(),
      displayName: input.displayName,
      phoneHash: hashPhone(input.phone),
      joinedAt: input.now,
    };
    this.agents.set(agent.id, agent);
    const token = randomBytes(32).toString('hex');
    this.tokens.set(hashToken(token), agent.id);
    return { agent, token };
  }

  agentByToken(token: string) {
    const id = this.tokens.get(hashToken(token));
    return id ? (this.agents.get(id) ?? null) : null;
  }

  agentById(id: string) {
    return this.agents.get(id) ?? null;
  }

  agentByPhoneHash(hash: string) {
    return [...this.agents.values()].find((a) => a.phoneHash === hash) ?? null;
  }

  everyAgent() {
    return [...this.agents.values()].sort(
      (a, b) => b.joinedAt.getTime() - a.joinedAt.getTime(),
    );
  }

  evidenceFor(agentId: string) {
    return this.evidence.filter((e) => e.agentId === agentId);
  }

  recordIdentity(input: {
    agentId: string;
    vendor: string;
    reference: string;
    now: Date;
  }) {
    this.evidence.push({
      kind: 'identity',
      agentId: input.agentId,
      attestor: { kind: 'vendor', vendor: input.vendor, reference: input.reference },
      at: input.now,
      revokedAt: null,
      propertyId: null,
    });
  }

  openChallenge(input: {
    purpose: ChallengePurpose;
    agentId: string;
    propertyId: string;
    landlordPhone: string;
    now: Date;
  }) {
    const landlordPhoneHash = hashPhone(input.landlordPhone);
    const agent = this.agents.get(input.agentId);
    if (
      agent &&
      !landlordIsNotTheAgent({ kind: 'landlord', phoneHash: landlordPhoneHash }, [
        agent.phoneHash,
      ])
    ) {
      throw new LandlordIsTheAgent();
    }

    /*
      The ceiling applies to grants only.

      A landlord who has hit it must still be able to take authority back, and
      a rate limit that blocks withdrawal but not issuance is a rate limit that
      protects the wrong party.
    */
    if (input.purpose === 'grant') {
      const vouchedFor = new Set(
        this.evidence
          .filter(
            (e) =>
              e.kind === 'authority' &&
              e.revokedAt === null &&
              e.attestor.kind === 'landlord' &&
              e.attestor.phoneHash === landlordPhoneHash,
          )
          .map((e) => e.agentId),
      );
      vouchedFor.add(input.agentId);
      if (vouchedFor.size > MAX_AGENTS_PER_LANDLORD) throw new LandlordVouchesForTooMany();
    }

    return this.issue(input.purpose, input.agentId, input.propertyId, landlordPhoneHash, input.now);
  }

  private issue(
    purpose: ChallengePurpose,
    agentId: string,
    propertyId: string,
    landlordPhoneHash: string,
    now: Date,
  ) {
    const challenge: Challenge = {
      id: randomUUID(),
      purpose,
      agentId,
      propertyId,
      landlordPhoneHash,
      expiresAt: new Date(now.getTime() + AUTHORITY_CODE_MINUTES * 60_000),
    };
    const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
    this.challenges.set(challenge.id, {
      ...challenge,
      codeHash: hashToken(code),
      attempts: 0,
      used: false,
    });
    return { challenge, code };
  }

  openWithdrawal(input: { agentId: string; propertyId: string; now: Date }) {
    const granted = this.evidence.find(
      (e) =>
        e.kind === 'authority' &&
        e.agentId === input.agentId &&
        e.propertyId === input.propertyId &&
        e.revokedAt === null &&
        e.attestor.kind === 'landlord',
    );
    if (!granted || granted.attestor.kind !== 'landlord') return null;
    return this.issue('revoke', input.agentId, input.propertyId, granted.attestor.phoneHash, input.now);
  }

  answerChallenge(input: { challengeId: string; code: string; now: Date }) {
    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) return null;
    if (challenge.used || challenge.expiresAt <= input.now) return null;
    if (challenge.attempts >= MAX_CODE_ATTEMPTS) return null;

    if (hashToken(input.code) !== challenge.codeHash) {
      this.challenges.set(challenge.id, { ...challenge, attempts: challenge.attempts + 1 });
      return null;
    }

    this.challenges.set(challenge.id, { ...challenge, used: true });

    if (challenge.purpose === 'grant') {
      this.evidence.push({
        kind: 'authority',
        agentId: challenge.agentId,
        attestor: { kind: 'landlord', phoneHash: challenge.landlordPhoneHash },
        at: input.now,
        revokedAt: null,
        propertyId: challenge.propertyId,
      });
      return { purpose: 'grant' as const, unpublished: [] };
    }

    const unpublished = this.withdraw(
      (e) =>
        e.kind === 'authority' &&
        e.agentId === challenge.agentId &&
        e.propertyId === challenge.propertyId &&
        e.attestor.kind === 'landlord' &&
        e.attestor.phoneHash === challenge.landlordPhoneHash,
      input.now,
    );
    return { purpose: 'revoke' as const, unpublished };
  }

  revokeIdentity(input: { agentId: string; now: Date }) {
    return this.withdraw(
      (e) => e.kind === 'identity' && e.agentId === input.agentId,
      input.now,
    );
  }

  /**
   * Withdraw the first matching live evidence and take its listings down.
   *
   * A Map cannot roll back, so the two mutations happen together with no
   * `await` between them — nothing can interleave, and nothing after `cascade`
   * returns can throw. The Postgres store does this the honest way, in a
   * transaction; here it has to be *arranged* to be atomic rather than
   * declared so.
   */
  private withdraw(match: (e: Evidence) => boolean, now: Date): readonly string[] {
    const index = this.evidence.findIndex((e) => match(e) && e.revokedAt === null);
    if (index < 0) return [];

    const revoked = { ...this.evidence[index]!, revokedAt: now };
    const going = cascade(revoked, [...this.listings.values()]);

    this.evidence[index] = revoked;
    for (const id of going) {
      const listing = this.listings.get(id)!;
      this.listings.set(id, { ...listing, publishedAt: null });
    }
    return going;
  }

  createListing(input: {
    agentId: string;
    propertyId: string;
    title: string;
    now: Date;
  }) {
    const listing: Listing = {
      id: randomUUID(),
      agentId: input.agentId,
      propertyId: input.propertyId,
      title: input.title,
      publishedAt: null,
      lastConfirmedAt: null,
    };
    this.listings.set(listing.id, listing);
    return listing;
  }

  listingsOf(agentId: string) {
    return [...this.listings.values()].filter((l) => l.agentId === agentId);
  }

  listing(id: string) {
    return this.listings.get(id) ?? null;
  }

  publishListing(id: string, now: Date) {
    const listing = this.listings.get(id);
    if (!listing) return;

    /*
      The store asks the rule again.

      The controller already checked `mayList`, so this looks redundant — it is
      the same belt-and-braces the registry uses on its one dangerous query.
      A published listing on an authority nobody granted is the exact harm this
      whole product sells itself as preventing, and one forgetful caller is all
      it would take.
    */
    const evidence = this.evidenceFor(listing.agentId);
    if (!mayList(evidence, listing.propertyId, now)) return;
    this.listings.set(id, { ...listing, publishedAt: now });
  }

  confirmStillAvailable(id: string, now: Date) {
    const listing = this.listings.get(id);
    if (!listing) return false;
    this.listings.set(id, { ...listing, lastConfirmedAt: now });
    return true;
  }

  publishedListings() {
    return [...this.listings.values()].filter((l) => l.publishedAt !== null);
  }
}
