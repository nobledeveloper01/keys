import { test } from 'node:test';
import assert from 'node:assert/strict';

import { move, open } from '../src/maintenance.ts';
import { portfolio } from '../src/portfolio.ts';
import type { Tenancy } from '../src/tenancy.ts';

const JAN = new Date('2026-01-01T00:00:00.000Z');
const NOW = new Date('2026-03-10T00:00:00.000Z');

function tenancy(id: string, property: string, recorded: ReadonlyArray<[number, number]>): Tenancy {
  return {
    id,
    agreement: { templateVersion: 'v', propertyId: property, tenantId: `t-${id}`, lettingId: 'a1', rentKobo: 100_00, period: 'monthly', periods: 12, cautionDepositKobo: 0, startsOn: JAN },
    entries: [
      { kind: 'agreement_signed', by: `t-${id}`, at: JAN, signature: 's' },
      { kind: 'agreement_signed', by: 'a1', at: JAN, signature: 's' },
      ...recorded.map(([period, amount], i) => ({ kind: 'payment_recorded' as const, id: `p${i}`, by: 'a1', at: JAN, periodIndex: period, amountKobo: amount, receivedOn: JAN, note: null })),
    ],
  };
}

test('the portfolio is facts per tenancy — the next due, what is recorded, periods short, tickets waiting — and never a total across them', () => {
  const a = tenancy('A', 'p1', [[1, 100_00], [2, 100_00], [3, 100_00]]);
  const b = tenancy('B', 'p2', [[1, 100_00]]);
  const waiting = open('k1', 'B', 't-B', new Date('2026-03-01T00:00:00.000Z'), 'electrical', 'no light in the kitchen', []);
  const done = move(move(open('k2', 'A', 't-A', JAN, 'pests', 'ants', []), 'a1', 'letting', JAN, 'acknowledged', null)!, 'a1', 'letting', JAN, 'resolved', null)!;
  const rows = portfolio([a, b], [waiting, done], NOW);
  const rowA = rows.find((r) => r.tenancyId === 'A')!;
  const rowB = rows.find((r) => r.tenancyId === 'B')!;
  assert.equal(rowA.nextDueOn!.toISOString().slice(0, 10), '2026-04-01');
  assert.equal(rowA.periodsShort, 0);
  assert.equal(rowA.openTickets, 1, 'resolved is not closed');
  assert.equal(rowA.longestWaitingDays, null);
  assert.equal(rowB.periodsShort, 2, 'February and March, with nothing recorded');
  assert.equal(rowB.longestWaitingDays, 9);
  assert.ok(!('totalKobo' in rowA) && !JSON.stringify(rows).includes('total'));
});
