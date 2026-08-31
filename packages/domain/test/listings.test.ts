import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { TIERS } from '../src/agents.ts';
import { EN, conditionStepPhrase, conditionPhrase, say } from '../src/language.ts';
import {
  CAPTURE_RADIUS_M,
  CONFIRMATION_DAYS,
  MIN_VIDEO_SECONDS,
  VERIFIED_CONDITIONS,
  isVerified,
  provesPresence,
  unmetConditions,
  whatToDo,
  type Capture,
  type ListingEvidence,
} from '../src/listings.ts';

const NOW = new Date('2026-09-15T12:00:00Z');
const RECENTLY = new Date(NOW.getTime() - 3 * 86_400_000);

function photo(overrides: Partial<Capture> = {}): Capture {
  return {
    kind: 'photo',
    capturedInApp: true,
    signatureValid: true,
    distanceM: 30,
    durationSeconds: null,
    ...overrides,
  };
}

function video(overrides: Partial<Capture> = {}): Capture {
  return {
    kind: 'video',
    capturedInApp: true,
    signatureValid: true,
    distanceM: 30,
    durationSeconds: 45,
    ...overrides,
  };
}

const GOOD: ListingEvidence = {
  agentTier: 'authority',
  authorityLive: true,
  captures: [photo(), video()],
  blockedDuplicate: false,
  lastConfirmedAt: RECENTLY,
  upheldReports: 0,
  costsStated: true,
};

/*
  Phase 3's first exit gate, and it is exhaustive rather than sampled.

  The roadmap asks for property-based tests proving no input combination yields
  Verified unless all seven conditions hold. Seven independent switches is 128
  combinations — small enough to enumerate every one, which is strictly stronger
  than generating a few hundred random cases and hoping. Nothing here is left to
  a seed.
*/
const SWITCHES: readonly [name: string, break_: (e: ListingEvidence) => ListingEvidence][] = [
  ['agent_identity', (e) => ({ ...e, agentTier: 'unverified' })],
  ['landlord_authority', (e) => ({ ...e, authorityLive: false })],
  ['capture_on_site', (e) => ({ ...e, captures: e.captures.filter((c) => c.kind !== 'photo') })],
  ['walkthrough_video', (e) => ({ ...e, captures: e.captures.filter((c) => c.kind !== 'video') })],
  ['not_a_known_duplicate', (e) => ({ ...e, blockedDuplicate: true })],
  ['recently_confirmed', (e) => ({ ...e, lastConfirmedAt: null })],
  ['nothing_upheld', (e) => ({ ...e, upheldReports: 1 })],
  ['costs_stated', (e) => ({ ...e, costsStated: false })],
];

describe('no input combination yields Verified unless all seven hold', () => {
  test('the intact case is Verified, or the rest of this suite proves nothing', () => {
    assert.deepEqual([...unmetConditions(GOOD, NOW)], []);
    assert.ok(isVerified(GOOD, NOW));
  });

  test('all 128 combinations agree with the conditions they broke', () => {
    let verified = 0;
    for (let mask = 0; mask < 1 << SWITCHES.length; mask += 1) {
      let evidence = GOOD;
      const broken: string[] = [];
      for (const [index, [name, break_]] of SWITCHES.entries()) {
        if (mask & (1 << index)) {
          evidence = break_(evidence);
          broken.push(name);
        }
      }

      const unmet = unmetConditions(evidence, NOW);
      assert.equal(
        isVerified(evidence, NOW),
        broken.length === 0,
        `mask ${mask} broke [${broken.join(', ')}] and isVerified disagreed`,
      );
      // Not just the count: the named reasons are exactly what was broken, so
      // an agent is never told to fix something that is already fine.
      assert.deepEqual(
        [...unmet].sort(),
        [...broken].sort(),
        `mask ${mask}: reasons did not match what was broken`,
      );
      if (isVerified(evidence, NOW)) verified += 1;
    }
    assert.equal(verified, 1, 'exactly one of the 128 combinations may be Verified');
  });

  test('the badge and the reasons are one computation', () => {
    // Stated as a property rather than trusted from reading the source: there
    // must be no evidence for which these two disagree, in either direction.
    for (let mask = 0; mask < 1 << SWITCHES.length; mask += 1) {
      let evidence = GOOD;
      for (const [index, [, break_]] of SWITCHES.entries()) {
        if (mask & (1 << index)) evidence = break_(evidence);
      }
      assert.equal(isVerified(evidence, NOW), unmetConditions(evidence, NOW).length === 0);
    }
  });
});

describe('what a capture has to be', () => {
  test('an upload that did not come through the app proves nothing', () => {
    assert.ok(!provesPresence(photo({ capturedInApp: false })));
    const injected = { ...GOOD, captures: [photo({ capturedInApp: false }), video()] };
    assert.ok([...unmetConditions(injected, NOW)].includes('capture_on_site'));
  });

  test('a broken signature proves nothing, however it arrived', () => {
    assert.ok(!provesPresence(photo({ signatureValid: false })));
  });

  test('no location is not the same as a good location', () => {
    // Null must fail. A missing distance treated as zero is how a photo taken
    // anywhere becomes a photo taken at the property.
    assert.ok(!provesPresence(photo({ distanceM: null })));
  });

  test('the radius is inclusive at its edge and refuses one metre past it', () => {
    assert.ok(provesPresence(photo({ distanceM: CAPTURE_RADIUS_M })));
    assert.ok(!provesPresence(photo({ distanceM: CAPTURE_RADIUS_M + 1 })));
  });

  test('a short video is not a walkthrough, and the floor is inclusive', () => {
    const short = { ...GOOD, captures: [photo(), video({ durationSeconds: MIN_VIDEO_SECONDS - 1 })] };
    assert.ok([...unmetConditions(short, NOW)].includes('walkthrough_video'));

    const exact = { ...GOOD, captures: [photo(), video({ durationSeconds: MIN_VIDEO_SECONDS })] };
    assert.ok(!unmetConditions(exact, NOW).includes('walkthrough_video'));
  });

  test('a long video from somebody else’s listing is not a walkthrough either', () => {
    // The two media conditions are not "one of each". Each has to have been
    // captured, in the app, at the property.
    const borrowed = {
      ...GOOD,
      captures: [photo(), video({ capturedInApp: false, durationSeconds: 600 })],
    };
    assert.ok([...unmetConditions(borrowed, NOW)].includes('walkthrough_video'));
  });

  test('one capture cannot satisfy both conditions', () => {
    const onlyVideo = { ...GOOD, captures: [video()] };
    assert.ok([...unmetConditions(onlyVideo, NOW)].includes('capture_on_site'));
  });
});

describe('the fortnight', () => {
  test('is inclusive at its edge and lapses one second later', () => {
    const edge = new Date(NOW.getTime() - CONFIRMATION_DAYS * 86_400_000);
    assert.ok(isVerified({ ...GOOD, lastConfirmedAt: edge }, NOW));

    const lapsed = new Date(edge.getTime() - 1000);
    assert.ok(!isVerified({ ...GOOD, lastConfirmedAt: lapsed }, NOW));
  });

  test('never confirmed is not the same as confirmed long ago, and both fail', () => {
    assert.ok(!isVerified({ ...GOOD, lastConfirmedAt: null }, NOW));
  });
});

describe('the agent behind it', () => {
  test('every tier below identity fails, every tier at or above it passes', () => {
    for (const tier of TIERS) {
      const at = TIERS.indexOf(tier) >= TIERS.indexOf('identity');
      assert.equal(
        isVerified({ ...GOOD, agentTier: tier }, NOW),
        at,
        `${tier} disagreed`,
      );
    }
  });
});

describe('the server and the phone describe the same conditions', () => {
  test('every condition has a phrase, and every condition phrase has a condition', () => {
    /*
      Two lists of sentences about the same seven things — `whatToDo` in
      English for the API, and `condition_*` in four languages for the app —
      and nothing but this test stops them describing different sets. Adding an
      eighth condition and forgetting the phrase table would ship an app that
      renders a missing key to somebody in Kano.
    */
    const phrases = Object.keys(EN).filter((key) => key.startsWith('condition_'));
    assert.deepEqual(
      phrases.sort(),
      VERIFIED_CONDITIONS.map((c) => `condition_${c}`).sort(),
    );

    // And the checklist half, which is a second set that has to stay in step.
    const rows = Object.keys(EN).filter((key) => key.startsWith('step_'));
    assert.deepEqual(rows.sort(), VERIFIED_CONDITIONS.map((c) => `step_${c}`).sort());

    for (const condition of VERIFIED_CONDITIONS) {
      assert.equal(conditionPhrase(condition), `condition_${condition}`);
      assert.equal(conditionStepPhrase(condition), `step_${condition}`);
      assert.equal(typeof say('en', conditionStepPhrase(condition)), 'string');
      // And the phrase resolves — `say` throws or returns undefined for a key
      // no table holds, which is the failure this is standing in front of.
      assert.equal(typeof say('en', conditionPhrase(condition)), 'string');
    }
  });
});

describe('what an agent is told', () => {
  test('every condition has a sentence with something to do in it', () => {
    for (const condition of VERIFIED_CONDITIONS) {
      const said = whatToDo(condition);
      assert.ok(said.length > 30, `${condition} needs a real sentence`);
      assert.ok(
        !/failed|invalid|error/i.test(said),
        `${condition} tells somebody they have a problem rather than what to do`,
      );
    }
  });
});
