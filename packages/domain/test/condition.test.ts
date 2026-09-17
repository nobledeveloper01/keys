import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { acknowledgedByBoth, compare, recordIsWhole, recordMessage, unchanged, type ConditionRecord } from '../src/condition.ts';

const HASH = 'a'.repeat(64);
const AT = new Date('2026-09-01T10:00:00.000Z');

const MOVE_IN: ConditionRecord = {
  id: 'c-in',
  tenancyId: 'ten1',
  walk: 'move_in',
  comparesTo: null,
  takenAt: AT,
  rooms: [
    { name: 'Kitchen', items: [{ caption: 'Tap', photoHash: HASH, verdict: 'snag' }, { caption: 'Tiles', photoHash: HASH, verdict: 'fine' }] },
    { name: 'Bedroom', items: [{ caption: 'Window', photoHash: HASH, verdict: 'fine' }] },
  ],
};

describe('the condition record', () => {
  test('encodes the same bytes for the same content, and different bytes for one verdict changed', () => {
    const a = recordMessage(MOVE_IN);
    const rebuilt = { ...MOVE_IN, rooms: MOVE_IN.rooms.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) })) };
    assert.equal(recordMessage(rebuilt), a);
    const flipped = { ...MOVE_IN, rooms: [{ ...MOVE_IN.rooms[0]!, items: [{ ...MOVE_IN.rooms[0]!.items[0]!, verdict: 'fine' as const }, MOVE_IN.rooms[0]!.items[1]!] }, MOVE_IN.rooms[1]!] };
    assert.notEqual(recordMessage(flipped), a);
    assert.equal(a.split('\n').length, 4, 'a header and one line per item');
  });

  test('a caption with a pipe or a newline cannot forge a second item', () => {
    const tricky = { ...MOVE_IN, rooms: [{ name: 'Kitchen', items: [{ caption: 'Tap|forged|' + HASH + '|fine\nBedroom|x|' + HASH + '|snag', photoHash: HASH, verdict: 'snag' as const }] }] };
    assert.equal(recordMessage(tricky).split('\n').length, 2);
  });

  test('is whole only with rooms, captions and real hashes, and a move-out names its move-in', () => {
    assert.ok(recordIsWhole(MOVE_IN));
    assert.ok(!recordIsWhole({ ...MOVE_IN, rooms: [] }));
    assert.ok(!recordIsWhole({ ...MOVE_IN, rooms: [{ name: 'Kitchen', items: [{ caption: 'Tap', photoHash: 'nope', verdict: 'fine' }] }] }));
    assert.ok(!recordIsWhole({ ...MOVE_IN, walk: 'move_out' }), 'a move-out without a move-in is a move-in');
    assert.ok(recordIsWhole({ ...MOVE_IN, id: 'c-out', walk: 'move_out', comparesTo: 'c-in' }));
  });

  test('is acknowledged by both or by neither', () => {
    const ack = (by: string) => ({ by, at: AT, signature: 's' });
    assert.ok(!acknowledgedByBoth([], 't1', 'a1'));
    assert.ok(!acknowledgedByBoth([ack('t1')], 't1', 'a1'));
    assert.ok(!acknowledgedByBoth([ack('t1'), ack('t1')], 't1', 'a1'), 'the same party twice is one');
    assert.ok(acknowledgedByBoth([ack('t1'), ack('a1')], 't1', 'a1'));
  });

  test('the move-out beside the move-in says what changed, per room, and never a number', () => {
    const moveOut: ConditionRecord = {
      ...MOVE_IN,
      id: 'c-out',
      walk: 'move_out',
      comparesTo: 'c-in',
      rooms: [
        { name: 'Kitchen', items: [{ caption: 'Tap', photoHash: HASH, verdict: 'fine' }, { caption: 'Tiles', photoHash: HASH, verdict: 'snag' }, { caption: 'Sink', photoHash: HASH, verdict: 'fine' }] },
        { name: 'Bedroom', items: [] },
      ],
    };
    const changes = compare(MOVE_IN, moveOut);
    assert.deepEqual(changes.find((c) => c.room === 'Kitchen'), { room: 'Kitchen', newSnags: ['Tiles'], fixed: ['Tap'], missing: [], added: ['Sink'] });
    assert.deepEqual(changes.find((c) => c.room === 'Bedroom'), { room: 'Bedroom', newSnags: [], fixed: [], missing: ['Window'], added: [] });
    assert.ok(!unchanged(changes));
    assert.ok(unchanged(compare(MOVE_IN, { ...MOVE_IN, id: 'c-out', walk: 'move_out', comparesTo: 'c-in' })));
    assert.ok(!JSON.stringify(changes).match(/kobo|naira|₦/));
  });
});
