import { MAX_SCALE, type as typeScale } from '../src/design/tokens';

/**
 * A bigger variant must never render smaller than a smaller one.
 *
 * Each variant caps how far the reader's own text setting may enlarge it, and
 * those caps are independent numbers in a record — so it is entirely possible,
 * and was true, to cap a large variant below a small one. `title` was capped at
 * 1.8 while `body` was uncapped, so at iOS's largest accessibility size a title
 * rendered at 34 points above the body it labelled at 50. The language picker
 * showed each language's name smaller than its own caption, and every other
 * `title` over `body` in the product had the same inversion waiting in it.
 *
 * Caught by looking at a screen at 310%. This makes looking unnecessary.
 */

// iOS's largest accessibility content size is a little over 3×. Checked past it
// so the property holds rather than happening to hold at one setting.
const SCALES = [1, 1.5, 2, 2.5, 3.2, 4];

const VARIANTS = Object.keys(typeScale) as Array<keyof typeof typeScale>;

function renderedAt(variant: keyof typeof typeScale, scale: number): number {
  const cap = MAX_SCALE[variant];
  return typeScale[variant].fontSize * (cap === undefined ? scale : Math.min(scale, cap));
}

describe('the type scale stays in order at every text size', () => {
  it.each(SCALES)('holds its order at %s×', (scale) => {
    const inversions: string[] = [];

    for (const a of VARIANTS) {
      for (const b of VARIANTS) {
        // `bodyOutdoor` is deliberately the same size as `title`; equal is fine,
        // it is only an inversion when the larger one ends up smaller.
        if (typeScale[a].fontSize <= typeScale[b].fontSize) continue;
        if (renderedAt(a, scale) < renderedAt(b, scale)) {
          inversions.push(
            `${a} (${typeScale[a].fontSize}pt) renders at ${renderedAt(a, scale)} ` +
              `below ${b} (${typeScale[b].fontSize}pt) at ${renderedAt(b, scale)}`,
          );
        }
      }
    }

    expect(inversions).toEqual([]);
  });

  it('caps nothing, because a cap on one variant and not another is the inversion', () => {
    /*
      Any cap breaks the ordering unless every variant carries the same one,
      and a cap on every variant is a cap on body — which is the text a
      low-vision reader most needs enlarged.

      Stated here so that adding one back is a deliberate act with a failing
      test in front of it rather than a plausible-looking edit.

      It worked. An accessibility pass at iOS's largest size found the tab bar
      wrapping to three lines, diagnosed the empty record as a mechanism nobody
      had populated, and filled it in — `title: 1.8`, `body` uncapped, which is
      the inversion described at the top of this file, verbatim. This test was
      the only thing that said so.

      Furniture in a fixed slot uses `Text`'s per-call `maxScale` instead. That
      applies to one call site rather than to every use of a variant, so five
      tab labels sharing a cap invert nothing against each other.
    */
    const capped = VARIANTS.filter((v) => MAX_SCALE[v] !== undefined);
    expect(capped).toEqual([]);
  });
});
