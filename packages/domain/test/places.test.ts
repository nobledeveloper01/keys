import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CAPTURE_RADIUS_M } from '../src/listings.ts';
import { isPlausiblePoint, metresBetween } from '../src/places.ts';

const YABA = { latitude: 6.5095, longitude: 3.3711 };
const SURULERE = { latitude: 6.5027, longitude: 3.3550 };

describe('how far apart two places are', () => {
  test('is zero for the same point', () => {
    assert.equal(Math.round(metresBetween(YABA, YABA)), 0);
  });

  test('agrees with the real distance between two Lagos districts', () => {
    // Yaba to Surulere is a little under two kilometres. Asserted as a range
    // rather than a number, because the point is that the formula is right and
    // not that it reproduces one arbitrary figure.
    const d = metresBetween(YABA, SURULERE);
    assert.ok(d > 1_700 && d < 2_100, `${Math.round(d)} m`);
  });

  test('is symmetric, which a sign error would break', () => {
    assert.equal(
      Math.round(metresBetween(YABA, SURULERE)),
      Math.round(metresBetween(SURULERE, YABA)),
    );
  });

  test('a step across the street is inside the capture radius', () => {
    // Roughly 100 m north. The radius is 200 m because civilian GPS in a dense
    // street is out by tens of metres, and a tighter one fails honest agents.
    const nearby = { latitude: YABA.latitude + 0.0009, longitude: YABA.longitude };
    assert.ok(metresBetween(YABA, nearby) < CAPTURE_RADIUS_M);
  });

  test('a step to the next neighbourhood is not', () => {
    assert.ok(metresBetween(YABA, SURULERE) > CAPTURE_RADIUS_M);
  });

  test('does not go wrong across the equator or the meridian', () => {
    // Nigeria sits just above the equator and just east of the meridian, so
    // both zero-crossings are inside the market rather than exotic.
    const north = { latitude: 0.001, longitude: 0.001 };
    const south = { latitude: -0.001, longitude: -0.001 };
    assert.ok(metresBetween(north, south) > 250 && metresBetween(north, south) < 350);
  });
});

describe('what counts as a coordinate', () => {
  test('refuses null island, which is what an uninitialised location looks like', () => {
    // 0,0 is in the Gulf of Guinea, ~700 km off Lagos — plausible enough for a
    // Nigerian product to be the one wrong answer nobody questions.
    assert.ok(!isPlausiblePoint({ latitude: 0, longitude: 0 }));
  });

  test('accepts a real Lagos coordinate', () => {
    assert.ok(isPlausiblePoint(YABA));
  });

  test('refuses anything off the globe or not a number', () => {
    assert.ok(!isPlausiblePoint({ latitude: 91, longitude: 0 }));
    assert.ok(!isPlausiblePoint({ latitude: 0, longitude: 181 }));
    assert.ok(!isPlausiblePoint({ latitude: Number.NaN, longitude: 3.37 }));
  });

  test('accepts a genuine zero on one axis only', () => {
    // Only both being zero is suspicious. A property on the equator is a
    // property, and refusing it would be the check overreaching.
    assert.ok(isPlausiblePoint({ latitude: 0, longitude: 3.3711 }));
  });
});
