import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  agreementIsWhole,
  agreementMessage,
  agreementSigned,
  mayAppend,
  receiptText,
  receipts,
  reminderOn,
  rentStanding,
  schedule,
  type Agreement,
  type Tenancy,
} from '../src/tenancy.ts';

const JAN = new Date('2026-01-01T00:00:00.000Z');

const AGREEMENT: Agreement = {
  templateVersion: 'ng-tenancy-2026-09',
  propertyId: 'p1',
  tenantId: 't1',
  lettingId: 'a1',
  rentKobo: 100_000_00,
  period: 'monthly',
  periods: 12,
  cautionDepositKobo: 100_000_00,
  startsOn: JAN,
};

function signed(): Tenancy {
  return {
    id: 'ten1',
    agreement: AGREEMENT,
    entries: [
      { kind: 'agreement_signed', by: 't1', at: JAN, signature: 's-t' },
      { kind: 'agreement_signed', by: 'a1', at: JAN, signature: 's-a' },
    ],
  };
}

describe('the agreement', () => {
  test('is whole only with both parties, distinct, a positive rent and at least one period', () => {
    assert.ok(agreementIsWhole(AGREEMENT));
    assert.ok(!agreementIsWhole({ ...AGREEMENT, lettingId: 't1' }), 'a party cannot let to themselves');
    assert.ok(!agreementIsWhole({ ...AGREEMENT, rentKobo: 0 }));
    assert.ok(!agreementIsWhole({ ...AGREEMENT, rentKobo: 10.5 }), 'kobo are integers');
    assert.ok(!agreementIsWhole({ ...AGREEMENT, periods: 0 }));
  });

  test('signs the same bytes whatever the object order, and different bytes for a different rent', () => {
    const a = agreementMessage(AGREEMENT);
    const b = agreementMessage({ ...AGREEMENT });
    assert.equal(a, b);
    assert.notEqual(agreementMessage({ ...AGREEMENT, rentKobo: 100_000_01 }), a);
    assert.ok(a.startsWith('keys.agreement.v1\n'));
    assert.ok(a.includes('\n2026-01-01'), 'the date is a day, so two phones in two zones sign the same thing');
  });

  test('is signed only by both, each once', () => {
    const t: Tenancy = { id: 'x', agreement: AGREEMENT, entries: [] };
    assert.ok(!agreementSigned(t));
    const one: Tenancy = { ...t, entries: [{ kind: 'agreement_signed', by: 't1', at: JAN, signature: 's' }] };
    assert.ok(!agreementSigned(one));
    assert.ok(!mayAppend(one, { kind: 'agreement_signed', by: 't1', at: JAN, signature: 's' }), 'not twice');
    assert.ok(!mayAppend(one, { kind: 'agreement_signed', by: 'stranger', at: JAN, signature: 's' }));
    assert.ok(agreementSigned(signed()));
  });
});

describe('the schedule', () => {
  test('is one entry per period from the start date, monthly, quarterly and yearly', () => {
    const monthly = schedule(AGREEMENT);
    assert.equal(monthly.length, 12);
    assert.equal(monthly[0]!.dueOn.toISOString().slice(0, 10), '2026-01-01');
    assert.equal(monthly[11]!.dueOn.toISOString().slice(0, 10), '2026-12-01');
    const yearly = schedule({ ...AGREEMENT, period: 'yearly', periods: 2 });
    assert.equal(yearly[1]!.dueOn.toISOString().slice(0, 10), '2027-01-01');
    const quarterly = schedule({ ...AGREEMENT, period: 'quarterly', periods: 4 });
    assert.equal(quarterly[3]!.dueOn.toISOString().slice(0, 10), '2026-10-01');
  });

  test('a reminder is 30, 14 or 7 days before, and on no other day', () => {
    const due = schedule(AGREEMENT)[1]!; // 2026-02-01
    assert.equal(reminderOn(due, new Date('2026-01-02T09:00:00.000Z')), 30);
    assert.equal(reminderOn(due, new Date('2026-01-18T09:00:00.000Z')), 14);
    assert.equal(reminderOn(due, new Date('2026-01-25T09:00:00.000Z')), 7);
    assert.equal(reminderOn(due, new Date('2026-01-26T09:00:00.000Z')), null);
    assert.equal(reminderOn(due, new Date('2026-02-01T09:00:00.000Z')), null);
  });
});

describe('what is recorded', () => {
  test('only the letting side records, only after both signed, only the tenant disputes, and a correction replaces the amount while leaving the entry', () => {
    let t = signed();
    const record = { kind: 'payment_recorded' as const, id: 'pay1', by: 'a1', at: JAN, periodIndex: 1, amountKobo: 100_000_00, receivedOn: JAN, note: null };
    assert.ok(!mayAppend(t, { ...record, by: 't1' }), 'the tenant does not record');
    assert.ok(!mayAppend({ ...t, entries: [] }, record), 'not before signing');
    assert.ok(mayAppend(t, record));
    t = { ...t, entries: [...t.entries, record] };
    assert.equal(rentStanding(t)[0]!.recordedKobo, 100_000_00);
    const wrong = { kind: 'payment_recorded' as const, id: 'pay2', by: 'a1', at: JAN, periodIndex: 2, amountKobo: 900_000_00, receivedOn: JAN, note: null };
    t = { ...t, entries: [...t.entries, wrong] };
    const fix = { kind: 'payment_corrected' as const, id: 'fix1', by: 'a1', at: JAN, corrects: 'pay2', amountKobo: 90_000_00, note: 'one zero too many' };
    assert.ok(mayAppend(t, fix));
    t = { ...t, entries: [...t.entries, fix] };
    assert.equal(rentStanding(t)[1]!.recordedKobo, 90_000_00);
    assert.equal(t.entries.length, 5, 'nothing was removed');
    const dispute = { kind: 'payment_disputed' as const, by: 't1', at: JAN, disputes: 'pay2', note: 'I paid the full amount' };
    assert.ok(!mayAppend(t, { ...dispute, by: 'a1' }));
    assert.ok(!mayAppend(t, { ...dispute, disputes: 'nope' }), 'only something recorded can be disputed');
    t = { ...t, entries: [...t.entries, dispute] };
    assert.ok(rentStanding(t)[1]!.disputed);
    assert.ok(!rentStanding(t)[0]!.disputed);
  });

  test('the receipt carries the correction rather than hiding it, and says Keys did not touch the money', () => {
    const t: Tenancy = {
      ...signed(),
      entries: [
        ...signed().entries,
        { kind: 'payment_recorded', id: 'pay1', by: 'a1', at: JAN, periodIndex: 3, amountKobo: 100_000_00, receivedOn: JAN, note: null },
        { kind: 'payment_corrected', id: 'fix1', by: 'a1', at: JAN, corrects: 'pay1', amountKobo: 95_000_00, note: 'agreed' },
      ],
    };
    const [r] = receipts(t);
    assert.equal(r!.correctedToKobo, 95_000_00);
    const text = receiptText(r!);
    assert.match(text, /period: 3 of 12/);
    assert.match(text, /corrected to: 9500000 kobo/);
    assert.match(text, /did not receive, hold or move the money/);
    assert.doesNotMatch(text, /balance|paid in full/i);
  });

  test('nothing is appended after the tenancy ended', () => {
    const t: Tenancy = { ...signed(), entries: [...signed().entries, { kind: 'ended', by: 't1', at: JAN, note: null }] };
    assert.ok(!mayAppend(t, { kind: 'payment_recorded', id: 'p', by: 'a1', at: JAN, periodIndex: 1, amountKobo: 1, receivedOn: JAN, note: null }));
  });
});
