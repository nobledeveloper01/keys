import { attempt, client, type ApiResult } from '@keys/api';
import {
  MAX_CAPTURE_BYTES,
  claimMessage,
  isTooLarge,
  megabytes,
  shouldAskBeforeSpending,
  type CaptureClaim,
} from '@keys/domain';

import KeysCapture from '../native/NativeKeysCapture';
import KeysSigning from '../native/NativeKeysSigning';
import { decodeBase64 } from './base64';
import { sha256 } from './sha256';

/**
 * What happened when somebody tried to capture something.
 *
 * Three outcomes, not two. "It failed" and "they said no" are different things
 * to put in front of a person, and collapsing them means one of the two gets
 * the wrong words.
 */
export type CaptureOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly why: string }
  | { readonly declined: true };

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
  /**
   * Asked before anything is uploaded, when the upload is big enough and the
   * connection is metered. Returning false is somebody saying no, not an error.
   */
  confirmSpend: (bytes: number) => Promise<boolean> = () => Promise.resolve(true),
  metered = true,
): Promise<CaptureOutcome> {
  let taken: Awaited<ReturnType<typeof KeysCapture.capture>>;
  try {
    taken = await KeysCapture.capture(kind);
  } catch (error) {
    return { ok: false, why: error instanceof Error ? error.message : 'The camera did not open.' };
  }

  const bytes = decodeBase64(taken.pixels);

  /*
    Too big is refused here as well as on the server, so somebody finds out
    before they have paid to send it rather than after.

    Not downscaled. Re-encoding would make the signature stop matching the
    bytes it was taken over, and the signature is the only reason a capture
    proves anything.
  */
  if (isTooLarge(bytes.length)) {
    return {
      ok: false,
      why: `That is ${megabytes(bytes.length)}. Keys can send up to ${megabytes(MAX_CAPTURE_BYTES)} — record a shorter walkthrough.`,
    };
  }

  /*
    Ask before spending somebody's bundle.

    A walkthrough is the most expensive thing this product asks anybody to do,
    and data here is bought in bundles that run out. Saying so afterwards, in a
    progress bar, is saying so after the money is gone.

    Defaults to metered. A phone that cannot tell us what it is on is a phone we
    treat as costing money, because the failure that matters is spending
    somebody's data by assuming wifi.
  */
  if (shouldAskBeforeSpending(bytes.length, metered) && !(await confirmSpend(bytes.length))) {
    /*
      Its own outcome, not a failure with no reason.

      Every other `ok: false` here carries a sentence, and a caller with no
      sentence falls through to "No signal" — which would blame the network for
      a decision somebody made deliberately. The next time they saw that
      message they would have no reason to believe it.
    */
    return { declined: true };
  }

  const claim: CaptureClaim = {
    sha256: sha256(bytes),
    /*
      Null, because this phone has no photograph to send yet.

      The capture module emits the greyscale grid and nothing else, so the grid
      is still the capture and answers to `sha256` — exactly as it has since
      phase 3. When the native side emits a JPEG alongside the grid, `sha256`
      becomes the photograph's and this becomes the grid's, and both go inside
      the same signature. Until then a `null` here signs the literal `nogrid`,
      which the server rebuilds and matches.
    */
    gridSha256: null,
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
