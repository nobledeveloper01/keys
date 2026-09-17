import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { TICKET_EDGES, TICKET_STATES, daysWaiting, mayMove, move, movesFor, open, stateOf, type Ticket } from '../src/maintenance.ts';

const MON = new Date('2026-09-14T08:00:00.000Z');
const FRI = new Date('2026-09-18T08:00:00.000Z');

function fresh(): Ticket {
  return open('k1', 'ten1', 't1', MON, 'plumbing', 'Kitchen tap drips when closed', []);
}

describe('the ticket', () => {
  test('the edges are exactly these, and every state is reachable', () => {
    assert.deepEqual(
      TICKET_EDGES.map(([f, t, p]) => `${f}->${t}:${p}`),
      [
        'open->acknowledged:letting',
        'acknowledged->assigned:letting',
        'assigned->in_progress:letting',
        'acknowledged->in_progress:letting',
        'in_progress->resolved:letting',
        'assigned->resolved:letting',
        'acknowledged->resolved:letting',
        'resolved->closed:tenant',
        'resolved->open:tenant',
        'closed->open:tenant',
      ],
    );
    const reachable = new Set<string>(['open']);
    for (const [, to] of TICKET_EDGES) reachable.add(to);
    assert.deepEqual([...reachable].sort(), [...TICKET_STATES].sort());
  });

  test('the tenant cannot resolve their own ticket and the letting side cannot close it', () => {
    const t = fresh();
    assert.ok(!mayMove(t, 'resolved', 'tenant'));
    assert.ok(mayMove(t, 'acknowledged', 'letting'));
    const acked = move(t, 'a1', 'letting', MON, 'acknowledged', null)!;
    const resolved = move(acked, 'a1', 'letting', FRI, 'resolved', 'replaced the washer')!;
    assert.equal(move(resolved, 'a1', 'letting', FRI, 'closed', null), null);
    assert.deepEqual(movesFor(resolved, 'tenant'), ['closed', 'open']);
    const closed = move(resolved, 't1', 'tenant', FRI, 'closed', null)!;
    assert.equal(stateOf(closed), 'closed');
    assert.equal(closed.events.length, 4, 'every move is on the history');
  });

  test('a reopened ticket is the same history, and waits from the reopening', () => {
    let t = move(fresh(), 'a1', 'letting', MON, 'acknowledged', null)!;
    t = move(t, 'a1', 'letting', MON, 'resolved', null)!;
    t = move(t, 't1', 'tenant', FRI, 'open', 'still drips')!;
    assert.equal(stateOf(t), 'open');
    assert.equal(daysWaiting(t, new Date('2026-09-20T08:00:00.000Z')), 2);
    assert.equal(daysWaiting(fresh(), FRI), 4);
    assert.equal(daysWaiting(move(fresh(), 'a1', 'letting', MON, 'acknowledged', null)!, FRI), null);
  });
});
