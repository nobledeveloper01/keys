import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { brandGradient } from '../design/tokens';

/**
 * A gradient fill, drawn with the SVG library the app already has.
 *
 * Deliberately not `react-native-linear-gradient`. That would be a second
 * native module to link, pod-install and keep building on two platforms, to
 * paint something `react-native-svg` — already here for the mark — paints with
 * a `<Rect>`. A dependency is a thing somebody has to keep working; this is
 * eleven lines.
 *
 * It renders behind its children at any size, so a caller does not have to know
 * the dimensions in advance.
 */
export function Gradient({
  children,
  style,
  colours = brandGradient,
  /** 0 is left-to-right, 1 is the 140° diagonal the brand uses. */
  diagonal = true,
}: {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  colours?: readonly string[];
  diagonal?: boolean;
}) {
  return (
    <View style={style}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient
            id="brand"
            x1="0"
            y1="0"
            x2={diagonal ? '1' : '1'}
            y2={diagonal ? '1' : '0'}
          >
            {colours.map((colour, i) => (
              <Stop
                key={colour}
                offset={`${(i / (colours.length - 1)) * 100}%`}
                stopColor={colour}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#brand)" />
      </Svg>
      {children}
    </View>
  );
}
