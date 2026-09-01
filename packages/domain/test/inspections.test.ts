import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  OUTCOMES,
  feeWasHonoured,
  liftsSuspension,
  mayRecordOutcome,
  suspendsVerified,
  type Inspection,
  type Suspension,
} from '../src/inspections.ts';

const WEDNESDAY = new Date('2026-09-02T10:00:00.000Z');
const THURSDAY = new Date('2026-09-03T10:00:00.000Z');
const LAST_WEEK = new Date('2026-08-26T10:00:00.000Z');

const REPORTED: Suspension = {
  listingId: 'l1',
  reportedBy: 't1',
  at: WEDNESDAY,
  liftedAt: null,
};

describe('which outcomes touch the badge', () => {
  test('only "it was not there"', () => {
    const suspending = OUTCOMES.filter(suspendsVerified);
    assert.deepEqual(suspending, ['did_not_exist']);
  });

  test('a missed appointment does not', () => {
    /*
      Rude, and worth recording, and not a claim that the listing is fiction.
      Suspending a real property for a missed appointment would make this
      something agents route around rather than answer.
    */
    assert.equal(suspendsVerified('agent_did_not_show'), false);
    assert.equal(suspendsVerified('asked_for_more_money'), false);
  });
});

describe('lifting a suspension', () => {
  test('a fresh capture at the property lifts it, with no reviewer involved', () => {
    /*
      The load-bearing idea. An automatic suspension only a reviewer can lift
      is a griefing tool — one stranger takes a competitor off the market for
      as long as the queue is. The remedy is the evidence the badge already
      rests on, produced again.
    */
    assert.ok(liftsSuspension(REPORTED, { provesPresence: true, capturedAt: THURSDAY }));
  });

  test('a photograph from before the complaint does not', () => {
    // It proves the flat existed last week, which nobody disputes. The claim
    // is that somebody went there this week and found nothing.
    assert.equal(
      liftsSuspension(REPORTED, { provesPresence: true, capturedAt: LAST_WEEK }),
      false,
    );
  });

  test('a capture that does not prove presence does not, however fresh', () => {
    // Off-site, unsigned, or out of radius. An agent who could satisfy this
    // from their sofa would make the remedy worthless.
    assert.equal(
      liftsSuspension(REPORTED, { provesPresence: false, capturedAt: THURSDAY }),
      false,
    );
  });

  test('does not expire on its own', () => {
    /*
      A timeout would make waiting the cheapest response to a true report,
      which is exactly backwards. Ten years later, with no evidence and no
      reviewer, it still stands.
    */
    const decade = new Date('2036-09-02T10:00:00.000Z');
    assert.equal(liftsSuspension(REPORTED, { provesPresence: false, capturedAt: decade }), false);
  });

  test('a reviewer can lift it, and then it stays lifted', () => {
    const cleared: Suspension = { ...REPORTED, liftedAt: THURSDAY };
    assert.ok(liftsSuspension(cleared, { provesPresence: false, capturedAt: LAST_WEEK }));
  });
});

describe('who may say what happened', () => {
  const agreed: Inspection = {
    id: 'i1',
    listingId: 'l1',
    tenantId: 't1',
    state: 'agreed',
    feeKobo: 0,
    outcome: null,
  };

  test('somebody whose inspection the agent agreed to', () => {
    assert.ok(mayRecordOutcome(agreed));
  });

  test('not before it happened', () => {
    assert.equal(mayRecordOutcome({ ...agreed, state: 'requested' }), false);
    assert.equal(mayRecordOutcome({ ...agreed, state: 'declined' }), false);
  });

  test('and not twice', () => {
    // Otherwise one tenant could suspend a listing, watch the agent lift it,
    // and suspend it again on the same visit.
    assert.equal(mayRecordOutcome({ ...agreed, outcome: 'as_described' }), false);
  });
});

describe('the inspection fee', () => {
  test('what was asked for at the door has to be what was declared', () => {
    assert.ok(feeWasHonoured(5_000_00, 5_000_00));
    assert.ok(feeWasHonoured(5_000_00, 0));
    assert.equal(feeWasHonoured(5_000_00, 5_001_00), false);
  });

  test('a declared zero means nothing may be asked for', () => {
    // The claim an agent can be held to. Silence could not be.
    assert.ok(feeWasHonoured(0, 0));
    assert.equal(feeWasHonoured(0, 1), false);
  });
});
