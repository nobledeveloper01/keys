import { Injectable } from '@nestjs/common';

import { HashIndex, type Grey, type Match } from '@keys/domain';

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
  /** Listings whose images this one resembles. Empty is the ordinary case. */
  readonly looksLike: readonly Match[];
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
}

@Injectable()
export class InMemoryCapturesStore extends CapturesStore {
  private readonly devices = new Map<string, Device>();

  private readonly nonces = new Set<string>();

  private readonly captures: StoredCapture[] = [];

  private readonly images = new HashIndex();

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
