import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { boundingBox, metresBetween } from '../src/places.ts';

const YABA = { latitude: 6.5095, longitude: 3.3711 };

describe('a box that narrows without deciding', () => {
  test('contains every point the radius contains', () => {
    /*
      The property that matters. A box a few metres too wide costs a handful of
      rows; a box a few metres too narrow silently loses a result nobody can
      tell is missing — so this walks the compass and checks that a point the
      domain would keep is inside the box that fetches it.
    */
    for (const metres of [50, 200, 1_000, 5_000]) {
      const box = boundingBox(YABA, metres);
      for (let bearing = 0; bearing < 360; bearing += 15) {
        const radians = (bearing * Math.PI) / 180;
        // A point just inside the radius, in every direction.
        const latitude = YABA.latitude + ((metres * 0.99) / 111_320) * Math.cos(radians);
        const longitude =
          YABA.longitude +
          ((metres * 0.99) / (111_320 * Math.cos((YABA.latitude * Math.PI) / 180))) *
            Math.sin(radians);

        const inside = metresBetween(YABA, { latitude, longitude }) <= metres;
        if (!inside) continue;

        assert.ok(
          latitude <= box.north && latitude >= box.south,
          `${bearing}° at ${metres}m fell outside the box latitudinally`,
        );
        assert.ok(
          longitude <= box.east && longitude >= box.west,
          `${bearing}° at ${metres}m fell outside the box longitudinally`,
        );
      }
    }
  });

  test('is a box, not a circle — it holds corners the radius does not', () => {
    // Said out loud because it is the whole point: the box narrows, and
    // `metresBetween` is what decides. A caller that treated the box as the
    // answer would return the corners.
    const box = boundingBox(YABA, 1_000);
    const corner = { latitude: box.north, longitude: box.east };
    assert.ok(metresBetween(YABA, corner) > 1_000);
  });

  test('grows with the radius', () => {
    const small = boundingBox(YABA, 100);
    const large = boundingBox(YABA, 10_000);
    assert.ok(large.north > small.north);
    assert.ok(large.west < small.west);
  });
});
