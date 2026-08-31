import { attempt, client } from '@keys/api';
import { claimMessage, type CaptureClaim } from '@keys/domain';

import KeysSigning from '../native/NativeKeysSigning';
import { sha256 } from './sha256';

/**
 * Proves this phone can produce a capture the server accepts.
 *
 * A development control, and the only honest way to know the chain works:
 * enclave key → SPKI DER the server can parse → a claim string both sides
 * build identically → a DER signature Node verifies. Four encodings that all
 * have to agree, none of which fails loudly when it does not — a mismatched
 * one comes back as `bad_signature`, which is the same answer a genuine forgery
 * gets.
 *
 * It sends a real capture through the real route rather than checking the
 * pieces separately, because the pieces were each correct in the version of
 * this that did not work.
 *
 * Registration happens inline here rather than through a `useDevice` hook.
 * There was one; it had no caller, because the capture *screen* does not exist
 * yet — the camera is still to be written. A hook waiting for a screen that
 * has not been designed is a guess at what that screen will need, and this
 * repo deletes those rather than keeping them warm. It comes back when
 * something mounts it.
 */
export async function probeCapture(
  baseUrl: string,
  token: string | null,
): Promise<string> {
  if (!token) return 'Open an agent account first.';

  const api = client({ baseUrl, agentToken: token });

  const [publicKey, enclave] = await Promise.all([
    KeysSigning.publicKey(),
    KeysSigning.hasSecureEnclave(),
  ]);

  const registered = await attempt(() => api.registerDevice(publicKey));
  if (!registered.ok) return `Could not register this device: ${describe(registered.failure)}`;

  /*
    A grid this function builds, not a photograph.

    The camera is not written yet. What is being proven here is the signing
    chain, and a real photograph would prove the same thing while needing a
    camera permission dialogue in the middle of a diagnostic.
  */
  const width = 40;
  const height = 32;
  const pixels = new Uint8Array(width * height);
  let state = 12345;
  for (let i = 0; i < pixels.length; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    pixels[i] = state >>> 24;
  }
  const grid = new Uint8Array(12 + pixels.length);
  grid.set([...'KEYSGREY'].map((c) => c.charCodeAt(0)), 0);
  grid[8] = width >> 8;
  grid[9] = width & 0xff;
  grid[10] = height >> 8;
  grid[11] = height & 0xff;
  grid.set(pixels, 12);

  const claim: CaptureClaim = {
    sha256: sha256(grid),
    listingId: 'probe-listing',
    capturedAt: new Date(),
    latitude: 6.5244,
    longitude: 3.3792,
    nonce: `probe-${Date.now()}`,
    mockLocation: false,
  };

  // `claimMessage` from the domain, which is the same function the server uses
  // to rebuild what it verifies. Two implementations of that string is a
  // signature valid on one side and not the other.
  const signature = await KeysSigning.sign(claimMessage(claim));

  const sent = await attempt(() =>
    api.submitCapture({
      deviceId: registered.value.deviceId,
      listingId: claim.listingId,
      sha256: claim.sha256,
      capturedAt: claim.capturedAt.toISOString(),
      latitude: claim.latitude,
      longitude: claim.longitude,
      nonce: claim.nonce,
      mockLocation: claim.mockLocation,
      kind: 'photo',
      durationSeconds: null,
      signature,
      pixels: base64(grid),
    }),
  );

  const where = enclave ? 'Secure Enclave' : 'software key (no enclave)';
  return sent.ok
    ? `Accepted. Signed by the ${where}.`
    : `Refused: ${describe(sent.failure)}`;
}

function describe(failure: { kind: string; detail?: string }): string {
  return failure.kind === 'refused' ? (failure.detail ?? 'refused') : 'could not reach Keys';
}

function base64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += alphabet[(triple >> 18) & 63]! + alphabet[(triple >> 12) & 63]!;
    out += b === undefined ? '=' : alphabet[(triple >> 6) & 63]!;
    out += c === undefined ? '=' : alphabet[triple & 63]!;
  }
  return out;
}
