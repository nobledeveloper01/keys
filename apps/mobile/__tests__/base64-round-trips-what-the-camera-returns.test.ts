import { decodeBase64 } from '../src/state/base64';

/**
 * The grid the camera returns has to survive the trip to the hash.
 *
 * The native side hands back base64; the hash is computed over the bytes, and
 * the same base64 string is uploaded. If the decoder is wrong, the hash is of
 * something other than what the server receives — `bytes_do_not_match` on a
 * genuine photograph, indistinguishable from a forgery.
 *
 * Padding is where a hand-written base64 decoder goes wrong, so the lengths
 * below cover all three cases: none, one `=`, and two.
 */
describe('the base64 the camera returns', () => {
  it('round-trips at every padding length', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 6, 7, 8, 63, 64, 65]) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) bytes[i] = (i * 91) & 0xff;
      const encoded = Buffer.from(bytes).toString('base64');
      expect([...decodeBase64(encoded)]).toEqual([...bytes]);
    }
  });

  it('round-trips a capture-sized grid', () => {
    const bytes = new Uint8Array(12 + 320 * 240);
    let state = 7;
    for (let i = 0; i < bytes.length; i += 1) {
      state = (state * 1664525 + 1013904223) >>> 0;
      bytes[i] = state >>> 24;
    }
    const encoded = Buffer.from(bytes).toString('base64');
    expect(decodeBase64(encoded)).toHaveLength(bytes.length);
    expect([...decodeBase64(encoded).subarray(0, 8)]).toEqual([...bytes.subarray(0, 8)]);
  });
});
