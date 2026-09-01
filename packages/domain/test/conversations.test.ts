import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  EXCHANGE_STATES,
  looksLikeAPhoneNumber,
  mayWithdrawOffer,
  maySeeContact,
  offerContact,
  type ExchangeState,
} from '../src/conversations.ts';

describe('exchanging numbers', () => {
  test('starts with nobody able to see anybody', () => {
    assert.equal(maySeeContact('none'), false);
  });

  test('one side offering is not an exchange', () => {
    // The whole mechanism, in one assertion. An agent who offers their number
    // must not thereby acquire the tenant's.
    assert.equal(maySeeContact(offerContact('none', 'agent')), false);
    assert.equal(maySeeContact(offerContact('none', 'tenant')), false);
  });

  test('the same side offering twice is still not an exchange', () => {
    const once = offerContact('none', 'agent');
    assert.equal(offerContact(once, 'agent'), 'agent_offered');
    assert.equal(maySeeContact(offerContact(once, 'agent')), false);
  });

  test('both sides offering, in either order, exchanges', () => {
    assert.equal(offerContact(offerContact('none', 'tenant'), 'agent'), 'exchanged');
    assert.equal(offerContact(offerContact('none', 'agent'), 'tenant'), 'exchanged');
    assert.ok(maySeeContact('exchanged'));
  });

  test('an exchange cannot be walked back into a state that hides less', () => {
    /*
      Once numbers are out they are out — pretending otherwise would be a
      promise this cannot keep, since the other party has already read it.
      What matters is that no sequence *narrows* the state and then widens it
      by a different route.
    */
    for (const by of ['tenant', 'agent'] as const) {
      assert.equal(offerContact('exchanged', by), 'exchanged');
    }
  });

  test('no state other than exchanged shows a number', () => {
    // Exhaustive over the ladder, so a new state defaults to hiding rather
    // than to showing.
    const showing = EXCHANGE_STATES.filter((s: ExchangeState) => maySeeContact(s));
    assert.deepEqual(showing, ['exchanged']);
  });
});

describe('spotting a number in a message', () => {
  test('catches the obvious path', () => {
    assert.ok(looksLikeAPhoneNumber('call me on 08031234567'));
    assert.ok(looksLikeAPhoneNumber('+234 803 123 4567'));
    assert.ok(looksLikeAPhoneNumber('080-3-123-4567'));
  });

  test('leaves ordinary sentences alone', () => {
    assert.ok(!looksLikeAPhoneNumber('Is it still available?'));
    assert.ok(!looksLikeAPhoneNumber('I can come at 4pm on the 12th'));
    // A price is not a phone number.
    assert.ok(!looksLikeAPhoneNumber('₦800,000 a year'));
  });

  test('is a detector and not a wall, and the doc comment says so', () => {
    /*
      Somebody determined will write it in words and get through. That is
      accepted: the point is that the *default* path — pasting your number
      into the first message — does not silently work, so nobody gives away
      their number without having decided to.
    */
    assert.ok(!looksLikeAPhoneNumber('zero eight zero three one two three'));
  });
});

describe('taking an offer back', () => {
  test('is allowed while the other side has not answered', () => {
    assert.ok(mayWithdrawOffer('tenant_offered', 'tenant'));
    assert.ok(mayWithdrawOffer('agent_offered', 'agent'));
  });

  test('is refused once both have offered', () => {
    /*
      The other party has already read it. A button claiming to un-send would
      be a promise this cannot keep, and the honest thing is to refuse rather
      than to pretend.
    */
    assert.equal(mayWithdrawOffer('exchanged', 'tenant'), false);
    assert.equal(mayWithdrawOffer('exchanged', 'agent'), false);
  });

  test('is not a way to withdraw the other side\'s offer', () => {
    assert.equal(mayWithdrawOffer('agent_offered', 'tenant'), false);
    assert.equal(mayWithdrawOffer('tenant_offered', 'agent'), false);
  });
});
