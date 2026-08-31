import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  CUSTOMARY_FEE_PERCENT,
  costsAreStated,
  extrasKobo,
  feePercent,
  moveInCostKobo,
  naira,
} from '../src/money.ts';

/*
  A local zero, not a domain constant. All-zero costs read as "not stated" and
  mean "everything is free"; the domain keeps absence as `null` so the two
  cannot be confused, and this file needs the zeroes only as a starting point.
*/
const ZEROES = {
  annualRentKobo: 0,
  agencyFeeKobo: 0,
  legalFeeKobo: 0,
  cautionDepositKobo: 0,
  serviceChargeKobo: 0,
};

/** ₦800,000 a year, with the customary ten per cent each way. */
const TYPICAL = {
  annualRentKobo: 800_000_00,
  agencyFeeKobo: 80_000_00,
  legalFeeKobo: 80_000_00,
  cautionDepositKobo: 100_000_00,
  serviceChargeKobo: 40_000_00,
};

describe('what a place actually costs', () => {
  test('adds up to what somebody hands over before they get keys', () => {
    // ₦800,000 advertised. ₦1,100,000 to move in. That gap is the complaint.
    assert.equal(moveInCostKobo(TYPICAL), 1_100_000_00);
    assert.equal(naira(moveInCostKobo(TYPICAL)), '₦1,100,000');
  });

  test('names the extras on their own, because that is the surprise', () => {
    assert.equal(extrasKobo(TYPICAL), 300_000_00);
    assert.equal(naira(extrasKobo(TYPICAL)), '₦300,000');
  });

  test('includes the deposit, refundable or not', () => {
    /*
      It comes back at the end in principle. In cash terms it is money that has
      to exist on the day, and a tenant who budgeted for rent and fees and is
      then asked for a deposit does not move in.
    */
    const withoutDeposit = { ...TYPICAL, cautionDepositKobo: 0 };
    assert.equal(
      moveInCostKobo(TYPICAL) - moveInCostKobo(withoutDeposit),
      TYPICAL.cautionDepositKobo,
    );
  });

  test('is exact, because money in a float is wrong later rather than now', () => {
    // Ten per cent of ₦833,333 is where a `double` starts lying. Everything
    // here is integer kobo and nothing divides.
    const awkward = {
      ...ZEROES,
      annualRentKobo: 833_333_00,
      agencyFeeKobo: 83_333_30,
    };
    assert.ok(Number.isSafeInteger(moveInCostKobo(awkward)));
    assert.equal(moveInCostKobo(awkward), 916_666_30);
  });
});

describe('whether a fee is unusual', () => {
  test('names the customary ten per cent', () => {
    assert.equal(CUSTOMARY_FEE_PERCENT, 10);
    assert.equal(feePercent(TYPICAL.agencyFeeKobo, TYPICAL.annualRentKobo), 10);
  });

  test('says fifteen when it is fifteen, rather than hiding it', () => {
    // Keys does not forbid it. It says the number where the reader is already
    // looking, instead of leaving them to work it out after they have paid.
    assert.equal(feePercent(120_000_00, 800_000_00), 15);
  });

  test('has no answer when there is no rent, rather than saying zero', () => {
    assert.equal(feePercent(50_000_00, 0), null);
  });
});

describe('whether the costs have been stated', () => {
  test('a full set is stated', () => {
    assert.ok(costsAreStated(TYPICAL));
  });

  test('an explicit zero fee is a statement; it is not the same as silence', () => {
    /*
      The whole point. "No agency fee" is a claim an agent can be held to;
      "we have not said" is the thing this product exists to make worse.
    */
    assert.ok(costsAreStated({ ...TYPICAL, agencyFeeKobo: 0 }));
  });

  test('no rent is not stated costs', () => {
    assert.ok(!costsAreStated(ZEROES));
    assert.ok(!costsAreStated({ ...TYPICAL, annualRentKobo: 0 }));
  });

  test('refuses a negative fee and a fractional kobo', () => {
    assert.ok(!costsAreStated({ ...TYPICAL, agencyFeeKobo: -1 }));
    assert.ok(!costsAreStated({ ...TYPICAL, legalFeeKobo: 1.5 }));
  });
});

describe('writing naira', () => {
  test('groups thousands and drops the kobo', () => {
    assert.equal(naira(1_250_000_00), '₦1,250,000');
    assert.equal(naira(0), '₦0');
  });

  test('renders nothing for a figure that is not one', () => {
    /*
      An older server omits the field and the client hands over `undefined`.
      "₦NaN" beside a real address looks like a price, which is worse than
      showing no price at all.
    */
    assert.equal(naira(Number.NaN), '');
    assert.equal(naira(undefined as unknown as number), '');
  });

  test('rounds down, so a total is never more than what will be asked', () => {
    assert.equal(naira(99), '₦0');
    assert.equal(naira(1_000_99), '₦1,000');
  });
});
