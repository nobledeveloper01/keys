import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * A mesh gradient: several coloured lights blended into one field.
 *
 * A linear gradient runs corner to corner and looks like exactly that — two
 * colours and a diagonal. Four radial pools at different sizes and offsets read
 * as depth instead, because no two areas of the field are the same and the eye
 * cannot find the axis.
 *
 * Drawn with `react-native-svg`, which is already here for the mark, so this
 * costs no native dependency and composites on the GPU like any other layer.
 *
 * The pools are placed rather than random. A random mesh has to be regenerated
 * until it looks right, and then it is a fixed layout that nobody can reason
 * about; these four are where they are so the brightest point sits above and
 * left of the mark, and the darkest falls away beneath it.
 */
export function Mesh({
  width,
  height,
  base,
  pools,
}: {
  width: number;
  height: number;
  base: string;
  /** `[colour, x%, y%, radius%, opacity]` for each light. */
  pools: ReadonlyArray<readonly [string, number, number, number, number]>;
}) {
  return (
    <Svg width={width} height={height}>
      <Defs>
        {pools.map(([colour, , , , opacity], i) => (
          <RadialGradient key={`g${i}`} id={`pool${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colour} stopOpacity={opacity} />
            <Stop offset="55%" stopColor={colour} stopOpacity={opacity * 0.5} />
            <Stop offset="100%" stopColor={colour} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>

      <Rect x="0" y="0" width={width} height={height} fill={base} />

      {pools.map(([, x, y, r, ], i) => (
        <Ellipse
          key={`e${i}`}
          cx={(x / 100) * width}
          cy={(y / 100) * height}
          rx={(r / 100) * width}
          ry={(r / 100) * width}
          fill={`url(#pool${i})`}
        />
      ))}
    </Svg>
  );
}
