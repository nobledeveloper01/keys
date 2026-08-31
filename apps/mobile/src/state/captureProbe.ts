import { attempt, client } from '@keys/api';
import { claimMessage, type CaptureClaim } from '@keys/domain';

import KeysCapture from '../native/NativeKeysCapture';
import KeysSigning from '../native/NativeKeysSigning';
import { decodeBase64 } from './base64';
import { sha256 } from './sha256';

/**
 * Takes a photograph and sends it as a signed capture.
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
  kind: 'photo' | 'video' = 'photo',
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
    The camera, and nowhere else.

    `KeysCapture` presents the camera and returns the greyscale grid the hash
    reads, with where it was taken. There is deliberately no branch here that
    accepts a photograph from anywhere else: the signature's whole claim is
    that the bytes came out of this camera, and an alternative path would be a
    hole with a button on it.
  */
  /*
    Caught, always.

    `capture()` rejects for four ordinary reasons — no camera, the agent
    cancelled, no location, the photo failed — and every one of them is a
    sentence to show rather than an exception. An uncaught rejection here puts
    a red error overlay in front of somebody standing in a flat trying to
    photograph it.
  */
  let taken: Awaited<ReturnType<typeof KeysCapture.capture>>;
  try {
    taken = await KeysCapture.capture(kind);
  } catch (error) {
    return error instanceof Error ? error.message : 'The camera did not open.';
  }
  const grid = decodeBase64(taken.pixels);

  const claim: CaptureClaim = {
    sha256: sha256(grid),
    listingId: 'probe-listing',
    // The camera's time and place, not this function's. A capture that says
    // where the phone was when it uploaded rather than when it photographed
    // is a capture that proves nothing about the property.
    capturedAt: new Date(taken.capturedAt),
    latitude: taken.latitude,
    longitude: taken.longitude,
    nonce: `probe-${Date.now()}`,
    mockLocation: taken.mockLocation,
    // The camera's own measurement, inside the signature. A duration the app
    // could choose is a two-second clip claiming thirty.
    durationSeconds: taken.durationSeconds ?? null,
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
      kind,
      durationSeconds: claim.durationSeconds,
      signature,
      pixels: taken.pixels,
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
