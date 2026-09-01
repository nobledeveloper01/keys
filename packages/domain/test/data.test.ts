import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  ASK_BEFORE_SPENDING_BYTES,
  MAX_CAPTURE_BYTES,
  MB,
  isTooLarge,
  megabytes,
  shouldAskBeforeSpending,
} from '../src/data.ts';

describe('writing a size somebody can weigh', () => {
  test('one decimal under ten megabytes, none above', () => {
    // "4.2 MB" is a number somebody can hold against what is left on their
    // phone. "4.23 MB" is the same number pretending to be a measurement.
    assert.equal(megabytes(4.23 * MB), '4.2 MB');
    assert.equal(megabytes(42.7 * MB), '43 MB');
  });

  test('says nothing rather than something wrong', () => {
    assert.equal(megabytes(Number.NaN), '');
    assert.equal(megabytes(-1), '');
  });
});

describe('asking before spending somebody\'s bundle', () => {
  test('never asks on wifi, where the question has no answer behind it', () => {
    assert.equal(shouldAskBeforeSpending(50 * MB, false), false);
  });

  test('asks on a metered connection once it is worth the interruption', () => {
    assert.ok(shouldAskBeforeSpending(ASK_BEFORE_SPENDING_BYTES, true));
    assert.ok(shouldAskBeforeSpending(5 * MB, true));
  });

  test('does not stop somebody over a photograph', () => {
    // A question nobody needed is a question people learn to dismiss without
    // reading, which is how the one that mattered gets dismissed too.
    assert.equal(shouldAskBeforeSpending(300_000, true), false);
  });
});

describe('the cap', () => {
  test('refuses what is too big rather than shrinking it', () => {
    /*
      Not downscaled. Re-encoding somebody's evidence in the background is the
      quiet helpfulness that makes a signature stop matching the bytes it was
      taken over — and the signature is the whole reason a capture proves
      anything.
    */
    assert.ok(isTooLarge(MAX_CAPTURE_BYTES + 1));
    assert.equal(isTooLarge(MAX_CAPTURE_BYTES), false);
  });

  test('leaves room for a real walkthrough', () => {
    // Thirty seconds at a sensible bitrate has to fit, or the cap refuses the
    // thing the product asks for.
    assert.ok(MAX_CAPTURE_BYTES >= 5 * MB);
  });
});
