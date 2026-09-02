import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIRMATION_DAYS } from '../src/listings.ts';
import { MAX_SAVED, keepNewest, mayShowBadgeOffline, savedAge } from '../src/saved.ts';

const NOW = new Date('2026-09-02T10:00:00.000Z');
const ago = (days: number) => ({ savedAt: new Date(NOW.getTime() - days * 86_400_000) });

describe('what a saved copy may claim', () => {
  test('never the badge, at any age', () => {
    /*
      Not "not when it is old" — never, including a copy saved thirty seconds
      ago. A badge means *Keys checked this and stands behind it*, and a phone
      with no signal cannot check anything. Thirty seconds versus thirty days is
      not a difference in what the app knows, only in how likely it is to be
      wrong, and a claim that is probably right is the kind this product refuses
      everywhere else.
    */
    assert.equal(mayShowBadgeOffline(), false);
  });
});

describe('how old a saved copy is', () => {
  test('today, then recent, then old', () => {
    assert.equal(savedAge(ago(0), NOW, CONFIRMATION_DAYS), 'today');
    assert.equal(savedAge(ago(3), NOW, CONFIRMATION_DAYS), 'recent');
    assert.equal(savedAge(ago(30), NOW, CONFIRMATION_DAYS), 'old');
  });

  test('turns old exactly where a confirmation would have lapsed', () => {
    /*
      The boundary is `CONFIRMATION_DAYS` and not by coincidence: a Verified
      listing is one somebody confirmed within the fortnight, so a copy older
      than that is older than the freshest claim the live product would have
      made about it.
    */
    assert.equal(savedAge(ago(CONFIRMATION_DAYS - 0.5), NOW, CONFIRMATION_DAYS), 'recent');
    assert.equal(savedAge(ago(CONFIRMATION_DAYS), NOW, CONFIRMATION_DAYS), 'old');
  });

  test('a copy from the future is today, not a negative age', () => {
    // A phone whose clock is ahead should not produce an age nobody can render.
    assert.equal(savedAge({ savedAt: new Date(NOW.getTime() + 86_400_000) }, NOW, 14), 'today');
  });
});

describe('keeping a bounded number', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({
    id: `l${String(i).padStart(2, '0')}`,
    savedAt: new Date(NOW.getTime() - i * 60_000),
  }));

  test('keeps the newest, up to the limit', () => {
    const kept = keepNewest(many);
    assert.equal(kept.length, MAX_SAVED);
    assert.equal(kept[0]!.id, 'l00');
  });

  test('drops the oldest rather than the least opened', () => {
    /*
      Opening is not recorded, and inventing a counter to decide what to delete
      would mean watching what somebody reads in order to manage storage.
    */
    const kept = keepNewest(many).map((s) => s.id);
    assert.ok(!kept.includes('l59'));
  });

  test('breaks ties by id, so two phones with the same saves keep the same ones', () => {
    const sameMoment = [
      { id: 'b', savedAt: NOW },
      { id: 'a', savedAt: NOW },
    ];
    assert.deepEqual(
      keepNewest(sameMoment, 1).map((s) => s.id),
      ['a'],
    );
  });

  test('a limit of nothing keeps nothing', () => {
    assert.deepEqual(keepNewest(many, 0), []);
  });
});
