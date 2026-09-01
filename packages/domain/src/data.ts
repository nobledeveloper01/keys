/**
 * What an action will cost somebody in data.
 *
 * Nigerian mobile data is bought in bundles and runs out. A tenant on a
 * ₦1,000 plan has roughly a gigabyte for the month, and a walkthrough video is
 * the most expensive thing this product asks anybody to do — a minute of it can
 * be a tenth of that.
 *
 * So the app says what an upload will cost *before* it starts, in megabytes and
 * in the reader's language. Not a progress bar afterwards: by then the money is
 * gone. An app that spends somebody's bundle without asking has made a decision
 * that was theirs to make, and on a plan that runs out it is the difference
 * between finishing the listing and not.
 */

/** One megabyte, in bytes. Decimal, because that is how bundles are sold. */
export const MB = 1_000_000;

/**
 * The most a single capture may be.
 *
 * Six megabytes. A thirty-second walkthrough at a sensible bitrate fits, and
 * anything much larger is a phone that has decided to record in 4K on a plan
 * that cannot carry it.
 *
 * The cap is refused rather than silently downscaled. Re-encoding somebody's
 * evidence in the background is exactly the kind of quiet helpfulness that
 * makes a signature stop matching the bytes it was taken over.
 */
export const MAX_CAPTURE_BYTES = 6 * MB;

/**
 * What Keys will not upload on a metered connection without being asked twice.
 *
 * A photograph is small enough that stopping to ask about it is a nuisance; a
 * video is not. Two megabytes is the line, chosen so that the thing which
 * triggers the question is nearly always the video.
 */
export const ASK_BEFORE_SPENDING_BYTES = 2 * MB;

/**
 * Megabytes, written the way somebody reading a data bundle writes them.
 *
 * One decimal place under ten megabytes and none above it — "4.2 MB" is a
 * number somebody can weigh against what is left on their phone, and "4.23 MB"
 * is the same number pretending to be a measurement.
 */
export function megabytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const mb = bytes / MB;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

/**
 * Whether this upload should stop and ask first.
 *
 * On wifi, never — the data is not being metered and a question about cost
 * would be a question with no answer behind it. On anything else, once the
 * upload is big enough to be worth a person's attention.
 */
export function shouldAskBeforeSpending(bytes: number, metered: boolean): boolean {
  if (!metered) return false;
  return bytes >= ASK_BEFORE_SPENDING_BYTES;
}

/** Whether this is simply too big to send at all. */
export function isTooLarge(bytes: number): boolean {
  return bytes > MAX_CAPTURE_BYTES;
}
