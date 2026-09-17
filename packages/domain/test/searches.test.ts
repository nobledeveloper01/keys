import { test } from 'node:test';
import assert from 'node:assert/strict';

import { marketMoves, sameSearch, type Seen } from '../src/searches.ts';

const seen = (id: string, agentId: string, rent: number | null, resembles: string[] = []): Seen => ({ id, agentId, annualRentKobo: rent, resembles });

test('what moved: reappearances first, then new, price and gone; a reappearance is not also new (ADR-0020)', () => {
  const previous = [seen('a', 'agent-1', 800_000_00), seen('b', 'agent-2', 500_000_00), seen('c', 'agent-3', null)];
  const current = [
    seen('a', 'agent-1', 900_000_00),
    seen('c', 'agent-3', 650_000_00),
    // The same photographs as `b`, under a different agent, at a different price.
    seen('d', 'agent-9', 450_000_00, ['b']),
    seen('e', 'agent-4', 700_000_00),
    // Resembles a listing it shares an agent with: the same agent relisting is not the signal.
    seen('f', 'agent-1', 300_000_00, ['a']),
  ];
  assert.deepEqual(marketMoves(previous, current), [
    { kind: 'reappeared', id: 'd', previousId: 'b' },
    { kind: 'new', id: 'e' },
    { kind: 'new', id: 'f' },
    { kind: 'price', id: 'a', fromKobo: 800_000_00, toKobo: 900_000_00 },
    { kind: 'gone', id: 'b' },
  ]);
  // A price that appeared where there was none is not a change.
  assert.equal(marketMoves(previous, current).some((m) => m.kind === 'price' && m.id === 'c'), false);
  // Nothing moved is nothing said.
  assert.deepEqual(marketMoves(current, current), []);
});

test('the same question spelt the same way is one saved search', () => {
  const base = { q: 'Yaba two bed', cityId: 'lagos', place: null, withinKm: null, verifiedOnly: true };
  assert.equal(sameSearch(base, { ...base, q: '  yaba TWO bed ' }), true);
  assert.equal(sameSearch(base, { ...base, verifiedOnly: false }), false);
  assert.equal(sameSearch({ ...base, place: { latitude: 6.5, longitude: 3.37 } }, { ...base, place: { latitude: 6.50001, longitude: 3.37 } }), true);
  assert.equal(sameSearch({ ...base, place: { latitude: 6.5, longitude: 3.37 } }, base), false);
});
