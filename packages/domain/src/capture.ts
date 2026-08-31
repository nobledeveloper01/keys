/**
 * Proving a photograph was taken in the app, at the property, on a device Keys
 * knows.
 *
 * The attack is the one every listing site loses to: an agent saves somebody
 * else's photographs and uploads them as their own flat. A gallery picker
 * cannot tell them apart from a real capture, so the app must not have one —
 * the camera writes bytes and signs a statement about them, and the server
 * accepts nothing that is not signed.
 *
 * ## What a signature does and does not prove
 *
 * It proves the bytes came out of the Keys camera on a device registered to
 * this agent, at a stated place and time, and have not changed since. The key
 * that signed it is generated in the Secure Enclave and cannot be exported —
 * which is why the scheme is ECDSA P-256 and not Ed25519, the enclave holding
 * P-256 keys and nothing else. It does
 * **not** prove the agent was photographing their own property — a device can
 * be pointed at a printout of somebody else's listing. That is what perceptual
 * hashing is for, and the two defences are separate on purpose: one is about
 * the path the bytes took, the other about what is in them.
 *
 * ## Why the message is built here
 *
 * The phone signs a string and the server verifies the same string. If those
 * two are built in two places, they differ the first time a field is added,
 * and the failure is every capture being rejected in production while both
 * sides look correct. One function, imported by both.
 */

export interface CaptureClaim {
  /** SHA-256 of the media bytes, lower-case hex. */
  readonly sha256: string;
  readonly listingId: string;
  readonly capturedAt: Date;
  readonly latitude: number;
  readonly longitude: number;
  /** Once per capture. What makes a replayed signature useless. */
  readonly nonce: string;
  /** Whether the operating system reported the location as mocked. */
  readonly mockLocation: boolean;
  /**
   * How long a walkthrough runs. Null for a photograph.
   *
   * Inside the signature, for the same reason `mockLocation` is: the
   * `walkthrough_video` condition asks for thirty seconds, and a duration sent
   * beside the signature is a number the client chooses. A two-second clip
   * claiming thirty would satisfy the condition that exists to make somebody
   * walk the flat.
   */
  readonly durationSeconds: number | null;
}

/**
 * The exact bytes both sides sign.
 *
 * Newline-separated with a version prefix, rather than JSON. JSON key order is
 * not guaranteed across two runtimes, and a canonicalisation bug here is a
 * signature that verifies on the phone and fails on the server for reasons
 * nobody can see. The version prefix means a future field is a new scheme
 * rather than a silent break.
 *
 * `mockLocation` is inside the signature deliberately. A flag the client sends
 * beside the signature is a flag the client can flip; inside it, changing the
 * answer invalidates the whole capture.
 *
 * **The timestamp is canonicalised to millisecond precision**, because that is
 * what `toISOString` emits. Anything signing this from outside JavaScript has
 * to do the same: a client that sends microseconds signs one string while the
 * server — which parses to a `Date` and formats again — verifies another, and
 * the failure is a `bad_signature` on a capture that is entirely genuine. Six
 * digits of precision cost half an hour the first time it happened, from a
 * script written to exercise this very route.
 */
export function claimMessage(claim: CaptureClaim): string {
  return [
    /*
      v2, because the shape changed.

      `durationSeconds` moved inside the signature when it turned out a client
      could claim thirty seconds for a two-second clip. The version prefix
      exists so that is a new scheme rather than a silent break — an old client
      signs a v1 string, the server rebuilds a v2 one, and the mismatch is a
      refusal rather than a capture verified against the wrong statement.
    */
    'keys.capture.v2',
    claim.sha256,
    claim.listingId,
    claim.capturedAt.toISOString(),
    claim.latitude.toFixed(6),
    claim.longitude.toFixed(6),
    claim.nonce,
    claim.mockLocation ? 'mock' : 'real',
    // Whole seconds. A float's decimal representation differs between two
    // runtimes, and a signature is over bytes.
    claim.durationSeconds === null ? 'still' : String(Math.floor(claim.durationSeconds)),
  ].join('\n');
}

/**
 * How stale a capture may be when it arrives.
 *
 * Twelve hours, not five minutes. An agent photographs three flats in a
 * morning on a phone with no data and uploads that evening — refusing that
 * would push them to the workaround this whole mechanism exists to prevent.
 * What the window is actually for is bounding replay: a nonce store only has
 * to remember this long.
 */
export const CAPTURE_FRESHNESS_HOURS = 12;

/** And how far in the future, for a phone whose clock is simply wrong. */
export const CAPTURE_CLOCK_SKEW_MINUTES = 30;

export const CAPTURE_REFUSALS = [
  'unknown_device',
  'not_this_agents_device',
  'bad_signature',
  'bytes_do_not_match',
  'replayed',
  'stale',
  'from_the_future',
  'mock_location',
] as const;

export type CaptureRefusal = (typeof CAPTURE_REFUSALS)[number];

export interface CaptureContext {
  /** Whether Keys has ever seen this device. */
  readonly deviceKnown: boolean;
  /** Whether the device is registered to the agent making this request. */
  readonly deviceBelongsToAgent: boolean;
  /** Whether the signature verified against the device's public key. */
  readonly signatureValid: boolean;
  /** Whether the stored bytes hash to what the claim says. */
  readonly bytesMatch: boolean;
  /** Whether this nonce has been used before. */
  readonly nonceSeen: boolean;
}

/**
 * Why a capture is refused, or nothing.
 *
 * Every reason, not the first — a client fixing one problem at a time against
 * a server that reports one problem at a time is a debugging session nobody
 * needs, and the refusals are not ranked in any meaningful order anyway.
 *
 * The order in the returned list is the order of `CAPTURE_REFUSALS`, so two
 * runs on the same input produce the same list.
 */
export function refuseCapture(
  claim: CaptureClaim,
  context: CaptureContext,
  now: Date,
): readonly CaptureRefusal[] {
  const refusals: CaptureRefusal[] = [];

  if (!context.deviceKnown) refusals.push('unknown_device');
  else if (!context.deviceBelongsToAgent) refusals.push('not_this_agents_device');

  if (!context.signatureValid) refusals.push('bad_signature');
  if (!context.bytesMatch) refusals.push('bytes_do_not_match');
  if (context.nonceSeen) refusals.push('replayed');

  const age = now.getTime() - claim.capturedAt.getTime();
  if (age > CAPTURE_FRESHNESS_HOURS * 3_600_000) refusals.push('stale');
  if (age < -CAPTURE_CLOCK_SKEW_MINUTES * 60_000) refusals.push('from_the_future');

  /*
    A mocked location is refused outright rather than downgraded.

    Every other refusal here is about the path the bytes took. This one is a
    statement of intent: developer options do not enable a location spoofer by
    accident, and the only reason to run one while photographing a flat is to
    claim you are somewhere you are not. Accepting it unverified would put the
    capture in the album with a quiet asterisk nobody reads.
  */
  if (claim.mockLocation) refusals.push('mock_location');

  return refusals;
}

/**
 * What to say about a refusal.
 *
 * Written for the agent, not for a log. Two of these describe a device the
 * agent may genuinely not understand is the problem, so they say what to do
 * rather than what went wrong.
 */
export function refusalMeans(refusal: CaptureRefusal): string {
  switch (refusal) {
    case 'unknown_device':
      return 'This phone is not registered with Keys. Sign in on it once and try again.';
    case 'not_this_agents_device':
      return 'This phone is registered to a different account.';
    case 'bad_signature':
    case 'bytes_do_not_match':
      return 'This photo did not come from the Keys camera, or it changed after it was taken. Photos from your gallery cannot be used.';
    case 'replayed':
      return 'This capture has already been sent.';
    case 'stale':
      return `Captures have to be sent within ${CAPTURE_FRESHNESS_HOURS} hours. Take it again.`;
    case 'from_the_future':
      return "This phone's clock is wrong. Correct the date and time, then take it again.";
    case 'mock_location':
      return 'This phone is reporting a fake location. Turn off any location-spoofing app.';
  }
}
