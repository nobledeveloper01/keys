import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * One soft light.
 *
 * A plain `View` with a `borderRadius` and an opacity gives a circle with a
 * hard edge — which is what the first pass at this rendered, and it reads as a
 * flat disc sitting on the background rather than as light coming through it.
 * A radial gradient from the colour to fully transparent is the difference
 * between the two, and `react-native-svg` is already here for the mark.
 *
 * `pointerEvents` is left to the caller's wrapper; this draws and nothing else.
 */
export function Glow({
  size,
  colour,
  intensity = 0.5,
}: {
  size: number;
  colour: string;
  /** Opacity at the centre. It falls to nothing at the edge. */
  intensity?: number;
}) {
  // Unique per instance, or two glows on one screen share a definition and the
  // second silently takes the first one's colour.
  const id = `glow-${colour.replace('#', '')}-${Math.round(intensity * 100)}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={colour} stopOpacity={intensity} />
          <Stop offset="55%" stopColor={colour} stopOpacity={intensity * 0.45} />
          <Stop offset="100%" stopColor={colour} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}
