import { Injectable } from '@nestjs/common';

import { HashIndex, type DuplicateDecision, type Grey, type Match } from '@keys/domain';

export interface Device {
  readonly id: string;
  readonly agentId: string;
  /** SPKI DER, base64. Registered once and never updated. */
  readonly publicKey: string;
  readonly registeredAt: Date;
}

export interface StoredCapture {
  readonly id: string;
  readonly listingId: string;
  readonly deviceId: string;
  readonly sha256: string;
  readonly capturedAt: Date;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceM: number | null;
  readonly kind: 'photo' | 'video';
  readonly durationSeconds: number | null;
  /**
   * Where the photograph or video is, or null when only a grid arrived.
   *
   * The SHA-256 of the media, which is also its key in the media store and the
   * hash inside the signature. One value doing all three jobs is deliberate:
   * a separate id would need a column saying which hash it was supposed to be,
   * and a column can be wrong.
   */
  readonly mediaKey: string | null;
  /** Listings whose images this one resembles. Empty is the ordinary case. */
  readonly looksLike: readonly Match[];
}

/**
 * A match somebody has to look at.
 *
 * Keyed by the pair, not by the capture, because the question a reviewer
 * answers is *may these two listings both use this picture* — and answering it
 * once should settle it for every photograph the two share rather than
 * arriving again with the next upload.
 */
export interface DuplicatePair {
  readonly listingId: string;
  readonly matchedListingId: string;
  readonly distance: number;
  readonly firstSeenAt: Date;
  readonly decision: DuplicateDecision;
  /** Who decided, and why. Null while it is pending. */
  readonly reviewer: string | null;
  readonly reasoning: string | null;
}

type Await<T> = Promise<T> | T;

/**
 * Devices, the captures they signed, and the nonces they have spent.
 *
 * A device's public key is written once, at registration, and there is no
 * method here that replaces one. That is the whole security property: an
 * attacker who can rotate a device's key can sign anything as that device, so
 * the absence of `updateKey` is deliberate rather than unfinished. A lost
 * phone is a new device.
 */
@Injectable()
export abstract class CapturesStore {
  abstract registerDevice(input: {
    agentId: string;
    publicKey: string;
    now: Date;
  }): Await<Device>;

  abstract device(id: string): Await<Device | null>;

  /**
   * Claim a nonce, returning false if it was already spent.
   *
   * One call, not "check then record". Two calls race, and the window between
   * them is exactly long enough to accept the same signed capture twice.
   */
  abstract claimNonce(nonce: string, now: Date): Await<boolean>;

  abstract record(capture: StoredCapture): Await<void>;
  abstract capturesFor(listingId: string): Await<readonly StoredCapture[]>;

  /**
   * What else looks like this picture, and remember it.
   *
   * One call, because the two halves must not drift: an image checked against
   * the index and then not added is an image the next upload cannot match, and
   * one added before being checked matches itself.
   */
  abstract indexAndMatch(listingId: string, image: Grey): Await<readonly Match[]>;

  /** Open a pair for review, or leave an already-decided one alone. */
  abstract openPairs(
    listingId: string,
    matches: readonly Match[],
    now: Date,
  ): Await<void>;

  abstract pendingPairs(): Await<readonly DuplicatePair[]>;

  abstract decidePair(input: {
    listingId: string;
    matchedListingId: string;
    decision: Exclude<DuplicateDecision, 'pending'>;
    reviewer: string;
    reasoning: string;
  }): Await<boolean>;

  /**
   * Whether a reviewer has blocked any image on this listing.
   *
   * The Verified computation reads this and nothing else about duplicates —
   * `pending` is not `blocked`, and a listing must not lose its badge because
   * somebody has not got to it yet.
   */
  abstract isBlocked(listingId: string): Await<boolean>;
}

@Injectable()
export class InMemoryCapturesStore extends CapturesStore {
  private readonly devices = new Map<string, Device>();

  private readonly nonces = new Set<string>();

  private readonly captures: StoredCapture[] = [];

  private readonly images = new HashIndex();

  private readonly pairs = new Map<string, DuplicatePair>();

  private next = 0;

  registerDevice(input: { agentId: string; publicKey: string; now: Date }) {
    // Deterministic ids rather than random ones: the suite asserts on them,
    // and a device id is not a secret — the public key is public and the
    // signature is what proves anything.
    this.next += 1;
    const device: Device = {
      id: `device-${this.next}`,
      agentId: input.agentId,
      publicKey: input.publicKey,
      registeredAt: input.now,
    };
    this.devices.set(device.id, device);
    return device;
  }

  device(id: string) {
    return this.devices.get(id) ?? null;
  }

  claimNonce(nonce: string) {
    if (this.nonces.has(nonce)) return false;
    this.nonces.add(nonce);
    return true;
  }

  record(capture: StoredCapture) {
    this.captures.push(capture);
  }

  capturesFor(listingId: string) {
    return this.captures.filter((c) => c.listingId === listingId);
  }

  /** One key per unordered pair, so A→B and B→A are the same question. */
  private static key(a: string, b: string): string {
    return [a, b].sort().join('\u0000');
  }

  openPairs(listingId: string, matches: readonly Match[], now: Date) {
    for (const match of matches) {
      const key = InMemoryCapturesStore.key(listingId, match.id);
      const existing = this.pairs.get(key);
      // A decided pair stays decided. Re-opening it on the next upload would
      // hand a reviewer the same question they already answered, and would let
      // an agent reset a block by uploading the picture again.
      if (existing) continue;
      this.pairs.set(key, {
        listingId,
        matchedListingId: match.id,
        distance: match.distance,
        firstSeenAt: now,
        decision: 'pending',
        reviewer: null,
        reasoning: null,
      });
    }
  }

  pendingPairs() {
    return [...this.pairs.values()]
      .filter((p) => p.decision === 'pending')
      .sort((a, b) => a.distance - b.distance);
  }

  decidePair(input: {
    listingId: string;
    matchedListingId: string;
    decision: Exclude<DuplicateDecision, 'pending'>;
    reviewer: string;
    reasoning: string;
  }) {
    const key = InMemoryCapturesStore.key(input.listingId, input.matchedListingId);
    const pair = this.pairs.get(key);
    if (!pair || pair.decision !== 'pending') return false;
    this.pairs.set(key, {
      ...pair,
      decision: input.decision,
      reviewer: input.reviewer,
      reasoning: input.reasoning,
    });
    return true;
  }

  isBlocked(listingId: string) {
    /*
      Only the copy is blocked, not the original.

      A pair is stored unordered so one decision settles the question, but the
      consequence is not symmetric: `listingId` is whoever uploaded second, and
      blocking the listing that had the picture first would punish the agent
      who was copied.
    */
    return [...this.pairs.values()].some(
      (p) => p.decision === 'blocked' && p.listingId === listingId,
    );
  }

  indexAndMatch(listingId: string, image: Grey) {
    /*
      Matched before it is added, and its own listing filtered out.

      Without the filter, an agent adding a second photograph of the same room
      matches their own first one and opens a duplicate review against
      themselves — which is both wrong and the fastest way to make reviewers
      stop reading the queue.
    */
    const found = this.images
      .nearImage(image)
      .filter((match) => match.id !== listingId);
    this.images.addImage(listingId, image);
    return found;
  }
}
