import { createHash } from 'node:crypto';

import { sha256 } from '../src/state/sha256';

/**
 * The hash the phone computes must be the hash the server computes.
 *
 * React Native has no `crypto.subtle` and no Node `crypto`, so the capture
 * probe carries its own SHA-256. That is a second implementation of something
 * the server also does — and the server compares the two by equality, so a
 * one-bit difference is `bytes_do_not_match` on a genuine capture, which is
 * the same answer a forged one gets.
 *
 * Compared against Node's, over shapes that exercise the padding boundaries:
 * a block boundary is where a hand-written SHA-256 goes wrong.
 */
/*
  Imported from `sha256`, not from the capture probe.

  The probe's first line is `TurboModuleRegistry.getEnforcing`, which runs at
  import time — so importing the hash from there pulled a native binary that
  does not exist under Jest and this file could not run at all. A pure function
  belongs somewhere it can be imported without starting a bridge.
*/
const phoneHash = sha256;

function nodeHash(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

describe("the phone's SHA-256", () => {
  it('agrees with the server on an empty input', () => {
    const empty = new Uint8Array(0);
    expect(phoneHash(empty)).toBe(nodeHash(empty));
  });

  it('agrees across every length around a block boundary', () => {
    // 55, 56 and 64 are where the padding decides whether it needs another
    // block. Every hand-written SHA-256 that is wrong is wrong here.
    for (const length of [1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 128]) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) bytes[i] = (i * 37) & 0xff;
      expect(phoneHash(bytes)).toBe(nodeHash(bytes));
    }
  });

  it('agrees on a capture-sized grid', () => {
    const bytes = new Uint8Array(12 + 40 * 32);
    let state = 12345;
    for (let i = 0; i < bytes.length; i += 1) {
      state = (state * 1664525 + 1013904223) >>> 0;
      bytes[i] = state >>> 24;
    }
    expect(phoneHash(bytes)).toBe(nodeHash(bytes));
  });
});
