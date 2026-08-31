import Svg, { Path } from 'react-native-svg';

/**
 * The mark's two halves, drawn separately.
 *
 * Only the splash needs this. Everywhere else the mark is one shape and should
 * stay one component — but the splash animates the key turning inside the
 * shield, and you cannot rotate half of an SVG that renders as a single node.
 *
 * The paths are the same strings `Mark.tsx` holds, and `scripts/mark-check.py`
 * compares all three files, so a change to the mark that forgets this one fails
 * the build rather than leaving the splash drawing last month's logo.
 */
export function Shield({ size, colour }: { size: number; colour: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fillRule="evenodd" clipRule="evenodd" fill={colour} d="M24 2.6 7.2 8.5v13.4c0 10.9 6.9 20.6 16.8 24.1 9.9-3.5 16.8-13.2 16.8-24.1V8.5L24 2.6Zm0 4.9 12.1 4.25v10.35c0 8.3-4.95 15.75-12.1 19-7.15-3.25-12.1-10.7-12.1-19V11.75L24 7.5Z" />
    </Svg>
  );
}

export function Key({ size, colour }: { size: number; colour: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill={colour} d="M24 11.9a6.6 6.6 0 0 0-2.35 12.77v8.98a1.6 1.6 0 0 0 1.6 1.6h1.5a1.6 1.6 0 0 0 1.6-1.6v-1.6h1.85a1.5 1.5 0 0 0 0-3h-1.85v-1.9h1.85a1.5 1.5 0 0 0 0-3h-1.85v-.48A6.6 6.6 0 0 0 24 11.9Zm0 3.7a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z" />
    </Svg>
  );
}
