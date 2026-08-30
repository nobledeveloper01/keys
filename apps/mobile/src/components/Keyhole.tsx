import Svg, { Path } from 'react-native-svg';

/**
 * The product's mark: a keyhole.
 *
 * Drawn rather than assembled out of the icon set, because a logo made of two
 * borrowed glyphs is a placeholder that ships. The splash previously showed a
 * truck driving in under the word *Backhaul* — the animation had been ported
 * whole from the freight project, and every noun in it belonged to a different
 * company.
 *
 * A keyhole rather than a key. A key is a thing you own; a keyhole is the thing
 * you look through before you commit, which is what this product is for — you
 * check the number before you pay anybody anything.
 *
 * One path, no strokes, so it scales to any size without hairlines going soft
 * on a low-density screen, and it inherits its colour from the caller.
 */
export function Keyhole({ size = 72, colour }: { size?: number; colour: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityRole="image">
      {/*
        Circle and tapered stem as a single path: the bore, then a stem that
        widens toward the base the way a real ward cut does. The join is a
        smooth curve rather than a corner, so at small sizes it reads as one
        shape instead of a circle sitting on a triangle.
      */}
      <Path
        d="M24 6a11 11 0 0 0-5.6 20.46l-3.2 12.02A2 2 0 0 0 17.13 41h13.74a2 2 0 0 0 1.93-2.52l-3.2-12.02A11 11 0 0 0 24 6Z"
        fill={colour}
      />
    </Svg>
  );
}
