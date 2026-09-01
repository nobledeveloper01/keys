import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  FEATURED_CAP,
  featuredAmong,
  isFeatured,
  withoutFeatured,
} from '../src/featured.ts';
import { rank } from '../src/search.ts';

const NOW = new Date('2026-09-01T10:00:00.000Z');
const LATER = new Date('2026-09-08T10:00:00.000Z');
const EARLIER = new Date('2026-08-25T10:00:00.000Z');

const listing = (id: string, over: Partial<{ verified: boolean; featuredUntil: Date | null }> = {}) => ({
  id,
  verified: true,
  featuredUntil: LATER,
  ...over,
});

describe('whether a paid slot is live', () => {
  test('needs the badge, which is the thing that cannot be bought', () => {
    /*
      The whole point. A slot must not be a way to put an unchecked listing in
      front of somebody — if it were, the money would be buying exactly what
      the badge is supposed to mean.
    */
    assert.equal(isFeatured(listing('a', { verified: false }), NOW), false);
  });

  test('needs to be in date', () => {
    assert.equal(isFeatured(listing('a', { featuredUntil: EARLIER }), NOW), false);
    assert.ok(isFeatured(listing('a'), NOW));
  });

  test('is not live for a listing nobody bought a slot for', () => {
    assert.equal(isFeatured(listing('a', { featuredUntil: null }), NOW), false);
  });
});

describe('the paid band', () => {
  test('can only hold listings the search already returned', () => {
    /*
      Enforced by the shape of the function, not by remembering it: there is no
      way to pass this a listing the search did not return, so a paid slot
      showing a flat in Ikeja to somebody searching Surulere is not something
      this can be made to do by a caller in a hurry.
    */
    const results = [listing('a'), listing('b')];
    const band = featuredAmong(results, NOW);
    assert.deepEqual(
      band.map((l) => l.id),
      ['a', 'b'],
    );
  });

  test('is capped, so the free answer is never below the fold', () => {
    const many = Array.from({ length: 10 }, (_, i) => listing(`l${i}`));
    assert.equal(FEATURED_CAP, 3);
    assert.equal(featuredAmong(many, NOW).length, 3);
  });

  test('empties the moment a listing loses its badge', () => {
    // The same recomputation everything else here rests on: nothing to
    // re-index, so nothing can be behind.
    const results = [listing('a', { verified: false }), listing('b')];
    assert.deepEqual(
      featuredAmong(results, NOW).map((l) => l.id),
      ['b'],
    );
  });

  test('breaks ties by id rather than by who paid more', () => {
    // A second auction inside the slot would be a ranking again, and this
    // module exists in order not to have one.
    const results = [listing('c'), listing('a'), listing('b')];
    assert.deepEqual(
      featuredAmong(results, NOW, 2).map((l) => l.id),
      ['a', 'b'],
    );
  });

  test('a cap of nothing is a band of nothing', () => {
    assert.deepEqual(featuredAmong([listing('a')], NOW, 0), []);
  });
});

describe('the list underneath', () => {
  test('does not show the same listing again', () => {
    // Paying buys a different position, not two of them — and a reader
    // scrolling past the band does not meet the same flat wearing no label,
    // which would make the label look optional.
    const results = [listing('a'), listing('b'), listing('c')];
    const band = featuredAmong(results, NOW, 1);
    assert.deepEqual(
      withoutFeatured(results, band).map((l) => l.id),
      ['b', 'c'],
    );
  });

  test('is untouched when nothing was bought', () => {
    const results = [listing('a', { featuredUntil: null }), listing('b', { featuredUntil: null })];
    const band = featuredAmong(results, NOW);
    assert.equal(band.length, 0);
    assert.deepEqual(withoutFeatured(results, band), results);
  });
});

describe('the ranking itself', () => {
  test('has no way to know that featuring exists', () => {
    /*
      The invariant this whole module is for. `rank()` takes no featured input
      and a scored listing has no field for one — so a paid slot cannot become
      a boost by somebody threading a parameter through in a later phase.

      Asserted on the signature rather than on behaviour, because behaviour
      would only tell us that today's `rank` ignores it.
    */
    assert.equal(rank.length, 3);
    const source = rank.toString();
    assert.ok(!/featur/i.test(source), 'rank() must not mention featuring');
  });
});
