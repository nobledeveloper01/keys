import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIRMATION_DAYS } from '../src/listings.ts';
import { DISTANCE_HORIZON_M, matches, rank } from '../src/search.ts';

const NOW = new Date('2026-09-15T12:00:00Z');
const YABA = { latitude: 6.5095, longitude: 3.3711 };
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function listing(id: string, overrides: Partial<Parameters<typeof rank>[0][number]> = {}) {
  return {
    id,
    verified: false,
    lastConfirmedAt: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

describe('what a tenant sees first', () => {
  test('Verified beats everything else put together', () => {
    /*
      The single most important property of this ranking, and the one somebody
      will eventually be asked to relax. A listing with no location, confirmed
      a fortnight ago, still outranks the freshest nearest unverified one.
    */
    const bare = listing('verified-and-nothing-else', {
      verified: true,
      lastConfirmedAt: daysAgo(CONFIRMATION_DAYS),
    });
    const best = listing('unverified-but-perfect', {
      lastConfirmedAt: NOW,
      ...YABA,
    });

    const order = rank([best, bare], YABA, NOW).map((r) => r.listing.id);
    assert.deepEqual(order, ['verified-and-nothing-else', 'unverified-but-perfect']);
  });

  test('among Verified listings, a recent confirmation wins', () => {
    const stale = listing('confirmed-twelve-days-ago', {
      verified: true,
      lastConfirmedAt: daysAgo(12),
    });
    const fresh = listing('confirmed-today', { verified: true, lastConfirmedAt: NOW });

    assert.deepEqual(
      rank([stale, fresh], null, NOW).map((r) => r.listing.id),
      ['confirmed-today', 'confirmed-twelve-days-ago'],
    );
  });

  test('a lapsed confirmation is worth nothing, not something negative', () => {
    // Past the fortnight the listing has already lost its badge. Subtracting
    // as well would push it below listings that were never confirmed at all,
    // which punishes an agent for having once done the right thing.
    const lapsed = listing('lapsed', { lastConfirmedAt: daysAgo(CONFIRMATION_DAYS * 3) });
    const never = listing('never-confirmed');
    const [first, second] = rank([lapsed, never], null, NOW);
    assert.equal(first!.score, second!.score);
  });

  test('nearer wins, and stops mattering past the horizon', () => {
    const near = listing('two-streets-away', {
      latitude: YABA.latitude + 0.002,
      longitude: YABA.longitude,
    });
    const far = listing('across-the-city', { latitude: 6.6, longitude: 3.5 });
    const beyond = listing('another-city', { latitude: 9.06, longitude: 7.49 });

    const order = rank([beyond, far, near], YABA, NOW).map((r) => r.listing.id);
    assert.equal(order[0], 'two-streets-away');

    // Past the horizon everything is equally far — Abuja and the next state
    // are not usefully ranked against each other for somebody searching Yaba.
    const scores = rank([beyond, far], YABA, NOW);
    const beyondScore = scores.find((r) => r.listing.id === 'another-city')!.score;
    assert.equal(beyondScore, 0);
    assert.ok(DISTANCE_HORIZON_M > 1_000);
  });

  test('a listing with no location is not pushed below everything', () => {
    // No coordinates is the ordinary state of a draft that was just published.
    // Treating it as infinitely far would bury it under every located listing
    // regardless of evidence.
    const located = listing('located', YABA);
    const nowhere = listing('no-location', { verified: true });
    assert.equal(rank([located, nowhere], YABA, NOW)[0]!.listing.id, 'no-location');
  });

  test('says why, in words an agent could be shown', () => {
    const one = listing('one', { verified: true, lastConfirmedAt: NOW, ...YABA });
    const [top] = rank([one], YABA, NOW);
    assert.deepEqual([...top!.because], ['verified', 'confirmed recently', 'nearby']);
  });

  test('is stable, so a refresh does not reshuffle the page', () => {
    // Two identical listings tie exactly. An unstable sort would swap them
    // between two identical searches, which reads as a broken page.
    const a = listing('aaa', { verified: true });
    const b = listing('bbb', { verified: true });
    assert.deepEqual(
      rank([b, a], null, NOW).map((r) => r.listing.id),
      rank([a, b], null, NOW).map((r) => r.listing.id),
    );
  });
});

describe('what counts as a match', () => {
  const fields = ['Two bedroom flat', '14 Herbert Macaulay, Yaba'];

  test('an empty search matches everything', () => {
    assert.ok(matches(fields, ''));
    assert.ok(matches(fields, '   '));
  });

  test('matches across fields, case-insensitively', () => {
    assert.ok(matches(fields, 'yaba'));
    assert.ok(matches(fields, 'BEDROOM'));
  });

  test('every word must match, so being specific narrows', () => {
    // "yaba flat" returning every flat in Lagos plus everything in Yaba is a
    // search that punishes you for adding a word.
    assert.ok(matches(fields, 'flat yaba'));
    assert.ok(!matches(fields, 'flat surulere'));
  });

  test('does not match on something that is in neither field', () => {
    assert.ok(!matches(fields, 'lekki'));
  });
});
