import Svg, { Path } from 'react-native-svg';

/**
 * The product's mark: a key inside a shield.
 *
 * The shield is an outline rather than a solid, so the key sits in open ground
 * and survives being small — a solid shield with a key knocked out of it closes
 * up at the sizes a tab bar and a masthead actually use.
 *
 * The key is upright on the shield's axis. It was drawn angled first, the way a
 * key is usually shown, and it sat badly: the bow crowded the top-right corner
 * and the shaft ran down into the shield's point, where the outline narrows.
 * Upright, the two shapes share a centre line and the margins are even.
 *
 * It replaced a plain keyhole. The keyhole said *look before you commit*, which
 * is right, but it was a single glyph anybody could draw and it read as generic
 * at every size. A shield around it says who is doing the looking.
 *
 * Two paths, no strokes, so it scales without hairlines going soft on a
 * low-density screen, and it inherits its colour from the caller.
 */
export function Mark({ size = 72, colour }: { size?: number; colour: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityRole="image">
      <Path fillRule="evenodd" clipRule="evenodd" fill={colour} d="M24 2.6 7.2 8.5v13.4c0 10.9 6.9 20.6 16.8 24.1 9.9-3.5 16.8-13.2 16.8-24.1V8.5L24 2.6Zm0 4.9 12.1 4.25v10.35c0 8.3-4.95 15.75-12.1 19-7.15-3.25-12.1-10.7-12.1-19V11.75L24 7.5Z" />
      <Path fill={colour} d="M24 11.9a6.6 6.6 0 0 0-2.35 12.77v8.98a1.6 1.6 0 0 0 1.6 1.6h1.5a1.6 1.6 0 0 0 1.6-1.6v-1.6h1.85a1.5 1.5 0 0 0 0-3h-1.85v-1.9h1.85a1.5 1.5 0 0 0 0-3h-1.85v-.48A6.6 6.6 0 0 0 24 11.9Zm0 3.7a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z" />
    </Svg>
  );
}
