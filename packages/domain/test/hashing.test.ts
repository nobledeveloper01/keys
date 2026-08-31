import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  HASH_BITS,
  HashIndex,
  MATCH_THRESHOLD,
  bestDistance,
  dHash,
  distance,
  hashesFor,
  resize,
  verdictFor,
  type Grey,
} from '../src/hashing.ts';

/*
  Phase 3's second exit gate: an adversarial corpus.

  The roadmap names six attacks — resize, recompress, crop, watermark, flip and
  colour-shift — and asks that detection meet a threshold. Every one is applied
  here to synthetic images, because a synthetic image can be transformed exactly
  and a photograph cannot: with a real JPEG the test would be measuring the
  decoder as much as the hash, and a failure would be ambiguous about which.

  Recompression is modelled as quantisation plus noise, which is what it does to
  a grid of grey values. Flipping is included and is expected to *fail* — see
  the test that says so, because a gate that quietly excused it would be lying
  about what this product can catch.
*/

const SEED = 0x9e3779b9;

/** A deterministic generator. `Math.random()` in a corpus makes a flaky gate. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/**
 * A synthetic room: a bright window, a dark doorway, a floor gradient, and
 * texture. Structure at several scales, which is what a perceptual hash is
 * supposed to survive the loss of.
 */
function room(seed: number, width = 320, height = 240): Grey {
  /*
    Structure at the scale the hash actually reads.

    Two earlier versions of this generator produced images that all matched
    each other, and both times the instinct was to blame the threshold. The
    fixture was the problem: a difference hash sees a nine-by-eight thumbnail,
    so what distinguishes two images *to it* is their pattern of brightness at
    roughly one-eighth scale. Rooms built from a gradient and three big
    rectangles have almost no variation at that scale, whatever they look like
    at full size.

    So each room gets its own coarse block pattern — the scale the hash reads —
    over a gradient, plus fine noise that recompression is free to destroy.
    That is what a photograph of a real room has and what the first two
    fixtures did not.
  */
  const random = rng(seed);
  const pixels = new Uint8Array(width * height);
  const vertical = random() < 0.5;
  const base = 55 + random() * 40;

  // The distinguishing layer, at the resolution the thumbnail keeps.
  const blocksX = 10;
  const blocksY = 8;
  const blocks = Array.from({ length: blocksX * blocksY }, () => random() * 150);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const along = vertical ? y / height : x / width;
      const bx = Math.min(blocksX - 1, Math.floor((x / width) * blocksX));
      const by = Math.min(blocksY - 1, Math.floor((y / height) * blocksY));

      const value =
        base + along * 40 + blocks[by * blocksX + bx]! + (random() - 0.5) * 10;
      pixels[y * width + x] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }
  return { width, height, pixels };
}

function map(image: Grey, f: (v: number, x: number, y: number) => number): Grey {
  const pixels = new Uint8Array(image.pixels.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = y * image.width + x;
      pixels[i] = Math.max(0, Math.min(255, Math.round(f(image.pixels[i]!, x, y))));
    }
  }
  return { ...image, pixels };
}

function crop(image: Grey, fraction: number): Grey {
  const inset = Math.floor(Math.min(image.width, image.height) * fraction);
  const width = image.width - inset * 2;
  const height = image.height - inset * 2;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      pixels[y * width + x] = image.pixels[(y + inset) * image.width + (x + inset)]!;
    }
  }
  return { width, height, pixels };
}

function flipHorizontally(image: Grey): Grey {
  const pixels = new Uint8Array(image.pixels.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      pixels[y * image.width + x] = image.pixels[y * image.width + (image.width - 1 - x)]!;
    }
  }
  return { ...image, pixels };
}

/** A watermark: an opaque bar across the lower third, as a stock site adds. */
function watermark(image: Grey): Grey {
  return map(image, (v, x, y) => {
    const inBar =
      y > image.height * 0.62 &&
      y < image.height * 0.72 &&
      x > image.width * 0.1 &&
      x < image.width * 0.9;
    return inBar ? 245 : v;
  });
}

/** Recompression: quantise to a coarse ladder, then add ringing. */
function recompress(image: Grey, seed: number, step = 16): Grey {
  const random = rng(seed);
  return map(image, (v) => Math.round(v / step) * step + (random() - 0.5) * 6);
}

const ATTACKS: readonly [name: string, apply: (image: Grey, seed: number) => Grey][] = [
  ['resized to a quarter', (image) => resize(image, image.width / 4, image.height / 4)],
  ['resized up by half', (image) => resize(image, Math.round(image.width * 1.5), Math.round(image.height * 1.5))],
  ['recompressed hard', (image, seed) => recompress(image, seed)],
  ['cropped 6%', (image) => crop(image, 0.06)],
  ['watermarked', (image) => watermark(image)],
  ['brightened 30', (image) => map(image, (v) => v + 30)],
  ['darkened 30', (image) => map(image, (v) => v - 30)],
  ['contrast raised', (image) => map(image, (v) => (v - 128) * 1.25 + 128)],
  [
    'resized, recompressed and brightened together',
    (image, seed) =>
      map(recompress(resize(image, image.width / 2, image.height / 2), seed), (v) => v + 20),
  ],
];

const CORPUS = Array.from({ length: 12 }, (_, i) => room(SEED + i * 7919));

describe('the adversarial corpus', () => {
  test('every attack on every image is still recognised', () => {
    const missed: string[] = [];
    let worst = 0;

    for (const [index, original] of CORPUS.entries()) {
      const before = hashesFor(original);
      for (const [name, apply] of ATTACKS) {
        const after = hashesFor(apply(original, SEED + index));
        const d = bestDistance(before, after);
        worst = Math.max(worst, d);
        if (d > MATCH_THRESHOLD) missed.push(`image ${index}: ${name} moved ${d} bits`);
      }
    }

    assert.deepEqual(missed, [], missed.join('\n'));
    // The headroom, stated. Not pinned to an exact number — any harmless
    // improvement to the hash would fail that — but the gate is worthless if
    // the worst attack sits on the threshold, because then the next attack
    // nobody thought of is over it.
    assert.ok(
      worst <= MATCH_THRESHOLD - 2,
      `the worst attack moved ${worst} of ${HASH_BITS} bits, against a threshold of ${MATCH_THRESHOLD} — no headroom`,
    );
  });

  test('different rooms are not confused with each other', () => {
    // The other half, and the half that matters more: a false match takes an
    // honest agent's listing down.
    const collisions: string[] = [];
    let closest = HASH_BITS;
    for (let i = 0; i < CORPUS.length; i += 1) {
      for (let j = i + 1; j < CORPUS.length; j += 1) {
        const d = bestDistance(hashesFor(CORPUS[i]!), hashesFor(CORPUS[j]!));
        closest = Math.min(closest, d);
        if (d <= MATCH_THRESHOLD) collisions.push(`${i} and ${j} are ${d} apart`);
      }
    }
    assert.deepEqual(collisions, [], collisions.join('\n'));
    // Headroom on this side too. The gap between "the worst attack" and "the
    // closest two different rooms" is the whole margin this threshold sits in.
    assert.ok(
      closest >= MATCH_THRESHOLD + 3,
      `the two closest different rooms are ${closest} apart, against a threshold of ${MATCH_THRESHOLD}`,
    );
  });

  test('a horizontal flip is NOT caught, and this is written down rather than excused', () => {
    /*
      A mirrored image hashes to something unrelated, because every left-right
      comparison inverts. That is a real hole and a real attack — mirroring a
      photo is one tap.

      It is asserted here so that the gate states what this product cannot do.
      The fix is to index both the hash and its mirror, which doubles the index
      and is a decision to take deliberately rather than discover after somebody
      exploits it. Until then the roadmap carries it.
    */
    const original = CORPUS[0]!;
    const d = bestDistance(hashesFor(original), hashesFor(flipHorizontally(original)));
    assert.ok(
      d > MATCH_THRESHOLD,
      'a flip is now caught — good; index both orientations and delete this test',
    );
  });
});

describe('the index', () => {
  test('finds what a scan would find', () => {
    const index = new HashIndex();
    for (const [i, image] of CORPUS.entries()) index.addImage(`listing-${i}`, image);

    for (const [i, image] of CORPUS.entries()) {
      const stolen = crop(recompress(resize(image, 160, 120), SEED + i), 0.06);
      const found = index.nearImage(stolen);

      // Not "found something" — found the right one, first.
      assert.ok(found.length > 0, `image ${i} was not found at all`);
      assert.equal(found[0]!.id, `listing-${i}`);
    }
  });

  test('agrees with a linear scan on every query, which is the only thing that makes pruning safe', () => {
    const stored = CORPUS.map((image) => hashesFor(image));
    const index = new HashIndex();
    CORPUS.forEach((image, i) => index.addImage(`listing-${i}`, image));

    for (const [i, image] of CORPUS.entries()) {
      const query = hashesFor(watermark(image));
      const scanned = stored
        .map((hashes, j) => ({ id: `listing-${j}`, distance: bestDistance(query, hashes) }))
        .filter((m) => m.distance <= MATCH_THRESHOLD)
        .sort((a, b) => a.distance - b.distance);

      assert.deepEqual(
        index.nearImage(watermark(image)).map((m) => m.id),
        scanned.map((m) => m.id),
        `the tree pruned a branch a scan found, for image ${i}`,
      );
    }
  });

  test('an empty index answers nothing rather than throwing', () => {
    assert.deepEqual([...new HashIndex().near(123n)], []);
  });

  test('the same image twice is one entry', () => {
    const index = new HashIndex();
    const hash = dHash(CORPUS[0]!);
    index.add('a', hash);
    index.add('b', hash);
    assert.equal(index.count, 2, 'both adds are counted');
    assert.equal(index.near(hash).length, 1, 'but only one node holds that hash');
  });

  test('a listing indexed under both its hashes is reported once, at its best distance', () => {
    const index = new HashIndex();
    index.addImage('listing-0', CORPUS[0]!);
    const found = index.nearImage(CORPUS[0]!);
    assert.equal(found.length, 1, 'two hashes, one listing, one match');
    assert.equal(found[0]!.distance, 0);
  });
});

describe('what a match means', () => {
  test('nothing is blocked without a person', () => {
    assert.equal(verdictFor([{ id: 'x', distance: 0 }]), 'pending');
    assert.equal(verdictFor([]), 'allowed');
    // An identical image — the strongest possible signal — still only opens a
    // review. The same photograph legitimately appears on two listings when an
    // agency changes hands or a flat is re-let.
    assert.notEqual(verdictFor([{ id: 'x', distance: 0 }]), 'blocked');
  });
});

describe('what a shift costs, stated rather than assumed', () => {
  /*
    This suite exists because a claim in the source was false.

    `resize` averages over a box rather than sampling, and the comment above it
    said that is what makes the hash survive a shift. It does not — nothing
    could. A difference hash reads columns of a thumbnail, so content moving
    across the frame moves between columns whatever the filter does. Replacing
    the average with a sampler broke nothing in the corpus, which is what
    prompted the check; then the shift test failed with the average still in
    place, which is what showed the claim was wrong rather than untested.

    What averaging actually buys is stability under compression noise, and the
    corpus tests that. What a shift costs is measured here, so the limit is
    written down instead of assumed.
  */
  function shiftedBy(image: Grey, by: number): Grey {
    const pixels = new Uint8Array(image.pixels.length);
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        pixels[y * image.width + x] =
          image.pixels[y * image.width + Math.min(image.width - 1, x + by)]!;
      }
    }
    return { ...image, pixels };
  }

  function worstShift(by: number): number {
    return Math.max(
      ...CORPUS.map((image) => distance(dHash(image), dHash(shiftedBy(image, by)))),
    );
  }

  test('a few pixels — a hand-held reshoot — is still the same image', () => {
    assert.ok(
      worstShift(4) <= MATCH_THRESHOLD,
      `a 4px shift moved ${worstShift(4)} bits`,
    );
  });

  test('a deliberate re-frame is not, and that is the honest limit', () => {
    // Asserted in the failing direction on purpose. If this ever starts
    // passing, the hash has changed and the sentence in `resize` about what it
    // cannot do needs rewriting.
    assert.ok(
      worstShift(12) > MATCH_THRESHOLD,
      'a 12px shift is now matched — update the comment in resize()',
    );
  });

  test('the corpus stays stable when only noise changes', () => {
    /*
      The property averaging actually provides, at an amplitude where it shows.

      A gentle ±8 did not distinguish a box filter from a sampler; ±70 does —
      swapping `resize` for a nearest-neighbour sampler fails this and nothing
      else in the file. That amplitude is a very low-quality JPEG, which is what
      an image gets when it has been through WhatsApp twice, and it is exactly
      the state a stolen listing photo arrives in.
    */
    for (const [i, image] of CORPUS.entries()) {
      const noise = rng(SEED + i);
      const noisy = map(image, (v) => v + (noise() - 0.5) * 70);
      assert.ok(
        distance(dHash(image), dHash(noisy)) <= MATCH_THRESHOLD,
        `image ${i} moved ${distance(dHash(image), dHash(noisy))} bits on noise alone`,
      );
    }
  });
});
