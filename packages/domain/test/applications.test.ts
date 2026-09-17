import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { APPLICATION_EDGES, APPLICATION_STATES, applicationMovesFor, isOpen, mayApply, mayMoveApplication, profileIsWhole, stateOfApplication, type Application } from '../src/applications.ts';

const NOW = new Date('2026-09-17T10:00:00.000Z');

function application(events: Application['events'] = [{ kind: 'submitted', by: 't1', at: NOW }]): Application {
  return {
    id: 'ap1',
    listingId: 'l1',
    tenantId: 't1',
    agentId: 'a1',
    profile: { occupation: 'Nurse', householdSize: 2, moveInBy: '2026-11-01', note: '' },
    standing: { accountAgeDays: 40, tenanciesRecorded: 1 },
    events,
  };
}

describe('an application', () => {
  test('the edges are exactly these, and every state is reachable', () => {
    assert.deepEqual(
      APPLICATION_EDGES.map(([f, t, p]) => `${f}->${t}:${p}`),
      [
        'submitted->seen:agent',
        'seen->shortlisted:agent',
        'shortlisted->offered:agent',
        'submitted->declined:agent',
        'seen->declined:agent',
        'shortlisted->declined:agent',
        'submitted->withdrawn:tenant',
        'seen->withdrawn:tenant',
        'shortlisted->withdrawn:tenant',
        'offered->withdrawn:tenant',
      ],
    );
    const reachable = new Set<string>(['submitted']);
    for (const [, to] of APPLICATION_EDGES) reachable.add(to);
    assert.deepEqual([...reachable].sort(), [...APPLICATION_STATES].sort());
  });

  test('the tenant cannot shortlist themselves and the agent cannot withdraw for them; declined is final', () => {
    const a = application();
    assert.ok(!mayMoveApplication(a, 'shortlisted', 'tenant'));
    assert.ok(mayMoveApplication(a, 'seen', 'agent'));
    assert.ok(!mayMoveApplication(a, 'withdrawn', 'agent'));
    assert.deepEqual(applicationMovesFor(a, 'agent'), ['seen', 'declined']);
    const declined = application([...a.events, { kind: 'moved', by: 'a1', at: NOW, to: 'declined' }]);
    assert.equal(stateOfApplication(declined), 'declined');
    assert.ok(!isOpen(declined));
    assert.deepEqual(applicationMovesFor(declined, 'agent'), []);
    assert.deepEqual(applicationMovesFor(declined, 'tenant'), []);
  });

  test('one open application per tenant per listing; a closed one can be followed', () => {
    const open = application();
    assert.ok(!mayApply([open], 't1', 'l1'));
    assert.ok(mayApply([open], 't1', 'l2'));
    assert.ok(mayApply([open], 't2', 'l1'));
    const withdrawn = application([...open.events, { kind: 'moved', by: 't1', at: NOW, to: 'withdrawn' }]);
    assert.ok(mayApply([withdrawn], 't1', 'l1'));
  });

  test('the profile is whole with an occupation, a household of one to twenty, a date and a short note', () => {
    assert.ok(profileIsWhole({ occupation: 'Nurse', householdSize: 1, moveInBy: '2026-11-01', note: '' }));
    assert.ok(!profileIsWhole({ occupation: ' ', householdSize: 1, moveInBy: '2026-11-01', note: '' }));
    assert.ok(!profileIsWhole({ occupation: 'Nurse', householdSize: 0, moveInBy: '2026-11-01', note: '' }));
    assert.ok(!profileIsWhole({ occupation: 'Nurse', householdSize: 2, moveInBy: 'soon', note: '' }));
    assert.ok(!profileIsWhole({ occupation: 'Nurse', householdSize: 2, moveInBy: '2026-11-01', note: 'x'.repeat(1001) }));
  });

  test('nothing in the shape is a score, a ratio, a risk or an income', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('../src/applications.ts', import.meta.url), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(code, /score|ratio|risk|income|credit/i);
  });
});
