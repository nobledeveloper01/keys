import { attempt, client, type ApiResult } from '@keys/api';
import { claimMessage, type CaptureClaim } from '@keys/domain';

import KeysCapture from '../native/NativeKeysCapture';
import KeysSigning from '../native/NativeKeysSigning';
import { decodeBase64 } from './base64';
import { sha256 } from './sha256';

/**
 * Take a photograph or a walkthrough for a listing, and send it signed.
 *
 * The production path. It began as a development probe in the settings screen
 * — which is how the whole chain got proven before there was a screen to put
 * it on — and this is that code with the diagnostic removed and a listing id
 * put in.
 *
 * Every failure is a sentence, never a thrown error. `capture()` rejects for
 * four ordinary reasons, and an uncaught rejection puts a red overlay in front
 * of somebody standing in a flat trying to photograph it.
 */
export async function captureFor(
  baseUrl: string,
  token: string,
  listingId: string,
  kind: 'photo' | 'video',
  deviceId: string,
): Promise<{ ok: true } | { ok: false; why: string }> {
  let taken: Awaited<ReturnType<typeof KeysCapture.capture>>;
  try {
    taken = await KeysCapture.capture(kind);
  } catch (error) {
    return { ok: false, why: error instanceof Error ? error.message : 'The camera did not open.' };
  }

  const claim: CaptureClaim = {
    sha256: sha256(decodeBase64(taken.pixels)),
    listingId,
    // The camera's time and place, not this function's. A capture that says
    // where the phone was when it uploaded rather than when it photographed
    // proves nothing about the property.
    capturedAt: new Date(taken.capturedAt),
    latitude: taken.latitude,
    longitude: taken.longitude,
    nonce: `${listingId}-${Date.now()}`,
    mockLocation: taken.mockLocation,
    durationSeconds: taken.durationSeconds ?? null,
  };

  let signature: string;
  try {
    // `claimMessage` from the domain — the same function the server uses to
    // rebuild what it verifies. Two implementations is a signature valid on
    // one side and not the other.
    signature = await KeysSigning.sign(claimMessage(claim));
  } catch {
    return { ok: false, why: 'This phone could not sign that photo.' };
  }

  const sent: ApiResult<unknown> = await attempt(() =>
    client({ baseUrl, agentToken: token }).submitCapture({
      deviceId,
      listingId,
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

  if (sent.ok) return { ok: true };
  return {
    ok: false,
    why: sent.failure.kind === 'refused' ? sent.failure.detail : 'Keys could not be reached.',
  };
}

/**
 * Register this phone's key, once, and remember what it was called.
 *
 * Not a hook: it is called from a button handler, and a hook waiting for a
 * screen is a guess at what that screen will need. One was written and deleted
 * for exactly that reason.
 */
export async function deviceIdFor(
  baseUrl: string,
  token: string,
  remembered: string | null,
): Promise<{ deviceId: string } | { why: string }> {
  if (remembered) return { deviceId: remembered };

  let publicKey: string;
  try {
    publicKey = await KeysSigning.publicKey();
  } catch {
    return { why: 'This phone has no key Keys can use.' };
  }

  const registered = await attempt(() =>
    client({ baseUrl, agentToken: token }).registerDevice(publicKey),
  );
  return registered.ok
    ? { deviceId: registered.value.deviceId }
    : {
        why:
          registered.failure.kind === 'refused'
            ? registered.failure.detail
            : 'Keys could not be reached.',
      };
}
