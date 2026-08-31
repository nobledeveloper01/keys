/**
 * Turning uploaded bytes into the grid `dHash` reads.
 *
 * Deliberately not `sharp`. A native image library is a compiled dependency
 * that has to build on every machine and in every container this server runs
 * in, and what is needed here is one operation: decode to greyscale. The
 * formats a Keys capture can be are decided by the Keys camera, not by whatever
 * a user picked off the internet — the signature refuses everything else — so
 * the decoder only has to handle what the app produces.
 *
 * Phase 3's capture module will emit raw greyscale alongside the encoded media
 * precisely so this stays a few lines. Until it exists, this accepts the raw
 * form directly, and says so rather than pretending to decode a JPEG.
 */

import { type Grey } from '@keys/domain';

export class NotAGrid extends Error {}

/**
 * A raw greyscale grid: `KEYSGREY` then width and height as 16-bit
 * big-endian, then one byte per pixel.
 *
 * A header rather than width and height sent beside the bytes as JSON fields,
 * because those two are *inside* what the device signs and the grid is not —
 * so a caller could otherwise present real bytes with dimensions that disagree
 * with them, and the hash would be of something nobody photographed.
 */
const MAGIC = 'KEYSGREY';

export function readGrid(bytes: Buffer): Grey {
  if (bytes.length < MAGIC.length + 4) throw new NotAGrid('too short');
  if (bytes.subarray(0, MAGIC.length).toString('latin1') !== MAGIC) {
    throw new NotAGrid('not a Keys capture');
  }

  const width = bytes.readUInt16BE(MAGIC.length);
  const height = bytes.readUInt16BE(MAGIC.length + 2);
  if (width === 0 || height === 0) throw new NotAGrid('empty');

  // A ceiling, because `width * height` comes off the wire and allocates. Four
  // megapixels is far above what a perceptual hash needs and far below what a
  // hostile caller would like to make this server allocate.
  if (width * height > 4_000_000) throw new NotAGrid('too large');

  const pixels = bytes.subarray(MAGIC.length + 4);
  if (pixels.length !== width * height) {
    throw new NotAGrid('the dimensions do not match the bytes');
  }

  return { width, height, pixels: new Uint8Array(pixels) };
}
