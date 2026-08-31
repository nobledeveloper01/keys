/**
 * base64 back to bytes.
 *
 * The camera hands back the grid as base64. The hash is computed over the
 * bytes and the same string is uploaded, so a decoder that is wrong means
 * hashing something other than what the server receives —
 * `bytes_do_not_match` on a genuine photograph, indistinguishable from a
 * forgery. Padding is where a hand-written one goes wrong.
 *
 * Its own module, away from anything native, for the second time in this
 * project: a file whose first line is `TurboModuleRegistry.getEnforcing`
 * cannot be imported by a test at all, because that call runs at import time.
 * The rule that keeps falling out of this — a pure function does not live
 * beside a bridge.
 */
export function decodeBase64(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = encoded.replace(/=+$/, '');
  const bytes = new Uint8Array((clean.length * 3) >> 2);
  let accumulator = 0;
  let bits = 0;
  let out = 0;
  for (const character of clean) {
    accumulator = (accumulator << 6) | alphabet.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (accumulator >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, out);
}
