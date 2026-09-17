import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { GUIDE_FLOOR, guideFor, type Answer } from '../src/guides.ts';

function answer(tenantId: string, power: Answer['power'] = 'under_4h', month = '2026-09'): Answer {
  return { tenantId, areaId: 'lagos:yaba', month, power, water: 'borehole', transport: ['bus', 'keke', 'keke'], market: 'walking' };
}

describe('an area guide', () => {
  test('is nothing below five separate tenants, however many answers', () => {
    const four = ['a', 'b', 'c', 'd'].map((t) => answer(t));
    assert.equal(guideFor('lagos:yaba', four), null);
    assert.equal(guideFor('lagos:yaba', [...four, answer('a'), answer('a')]), null, 'one tenant three times is one tenant');
    assert.equal(GUIDE_FLOOR, 5);
  });

  test('counts only the latest answer per tenant, and a mode ticked twice counts once', () => {
    const answers = [answer('a', 'over_16h'), ...['b', 'c', 'd', 'e'].map((t) => answer(t)), answer('a', 'under_4h', '2026-10')];
    const g = guideFor('lagos:yaba', answers)!;
    assert.equal(g.answers, 5);
    assert.equal(g.power.under_4h, 5);
    assert.equal(g.power.over_16h, 0);
    assert.equal(g.transport.keke, 5);
    assert.equal(g.transport.bus, 5);
    assert.equal(g.transport.train, 0);
  });

  test('carries counts and nothing about a person — no id, no day', () => {
    const g = guideFor('lagos:yaba', ['a', 'b', 'c', 'd', 'e'].map((t) => answer(t)))!;
    const text = JSON.stringify(g);
    assert.doesNotMatch(text, /tenantId|month|"a"|2026-09/);
  });

  test('answers for another area do not count', () => {
    const answers = ['a', 'b', 'c', 'd', 'e'].map((t) => ({ ...answer(t), areaId: 'lagos:ikeja' }));
    assert.equal(guideFor('lagos:yaba', answers), null);
    assert.ok(guideFor('lagos:ikeja', answers));
  });
});
