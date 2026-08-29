import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { ApiError, attempt } from '../src/index.ts';

/**
 * `unreachable` and `refused` are not the same failure.
 *
 * The whole reason this function exists is that a phone with no signal has
 * been told nothing, and a phone that got a 422 has been told something
 * specific. Collapsing them is how an app shows "no upheld reports" about a
 * number it never managed to ask about.
 */
describe('attempt', () => {
  test('carries a value through', async () => {
    const result = await attempt(() => Promise.resolve(41 + 1));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value, 42);
  });

  test('an answer from the server is a refusal, with its own words kept', async () => {
    const result = await attempt(() =>
      Promise.reject(new ApiError(422, 'The seven days are not up.', 'reply_window_open')),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.failure.kind, 'refused');
    if (result.failure.kind !== 'refused') return;
    assert.equal(result.failure.status, 422);
    assert.equal(result.failure.code, 'reply_window_open');
    assert.equal(result.failure.detail, 'The seven days are not up.');
  });

  test('anything that is not an answer is unreachable', async () => {
    for (const thrown of [
      new TypeError('Network request failed'),
      new Error('socket hang up'),
      'a string, because fetch implementations differ',
    ]) {
      const result = await attempt(() => Promise.reject(thrown));
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.failure.kind, 'unreachable', String(thrown));
    }
  });

  test('a refusal with no code is still a refusal', async () => {
    const result = await attempt(() => Promise.reject(new ApiError(500, 'Server error.')));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.failure.kind, 'refused');
    if (result.failure.kind !== 'refused') return;
    assert.equal(result.failure.code, null);
  });
});
