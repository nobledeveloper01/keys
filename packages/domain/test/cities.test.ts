import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CITIES, areaOf, cityOf, isCityId } from '../src/cities.ts';
import { kmFrom, withinKm } from '../src/distance.ts';

const YABA = { latitude: 6.5095, longitude: 3.3711 };
const WUSE = { latitude: 9.0692, longitude: 7.4787 };
const MARINA = { latitude: 6.4507, longitude: 3.3939 };

describe('a city is data', () => {
  test('three cities, each with areas inside its own box', () => {
    assert.equal(CITIES.length, 3);
    for (const c of CITIES) {
      assert.ok(c.areas.length >= 8, c.name);
      for (const a of c.areas) assert.equal(cityOf(a.centre)?.id, c.id, `${a.name} is inside ${c.name}`);
    }
  });

  test('a listing belongs to the city whose box contains it, or to none', () => {
    assert.equal(cityOf(YABA)?.id, 'lagos');
    assert.equal(cityOf(WUSE)?.id, 'abuja');
    assert.equal(cityOf({ latitude: 0, longitude: 0 }), null, 'the sea belongs to no city');
    assert.equal(cityOf({ latitude: 7.3775, longitude: 3.947 }), null, 'Ibadan is not a city Keys serves yet');
    assert.ok(isCityId('lagos') && !isCityId('ibadan'));
  });

  test('a listing belongs to the nearest area within four kilometres, and to no area beyond it', () => {
    assert.equal(areaOf({ latitude: 6.512, longitude: 3.375 })?.id, 'lagos:yaba');
    assert.equal(areaOf(WUSE)?.id, 'abuja:wuse');
    assert.equal(areaOf({ latitude: 6.36, longitude: 3.06 }), null, 'inside the box, near nothing named');
  });
});

describe('a commute is a distance and never a time', () => {
  test('kilometres to one decimal, null without a point on either side', () => {
    const km = kmFrom(MARINA, YABA);
    assert.ok(km !== null && km > 6 && km < 8, `Marina to Yaba is about seven kilometres, got ${km}`);
    assert.equal(kmFrom(null, YABA), null);
    assert.equal(kmFrom(MARINA, { latitude: null, longitude: null }), null);
  });

  test('within is inclusive, and a listing with no point is never quietly inside', () => {
    assert.ok(withinKm(MARINA, YABA, 10));
    assert.ok(!withinKm(MARINA, YABA, 5));
    assert.ok(!withinKm(MARINA, { latitude: null, longitude: null }, 100));
  });

  test('nothing here says minutes', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('../src/distance.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /minute/i);
  });
});
