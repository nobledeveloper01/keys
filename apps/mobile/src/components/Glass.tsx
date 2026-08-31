import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { useColours } from '../design/theme';
import { radius, space } from '../design/tokens';

/**
 * A translucent surface that sits on the background rather than punching a
 * hole in it.
 *
 * No `BlurView`. Real backdrop blur on Android means a third-party native
 * module and a measurable frame cost on the 2GB Transsion handsets this
 * product is built for — and the effect it buys is mostly indistinguishable,
 * at these opacities, from a flat translucent fill over a gradient. So: a
 * composited translucent white, a hairline that catches the light at the top
 * edge, and no native dependency.
 *
 * The `elevated` variant is for the one card on a screen that should be read
 * first.
 */
export function Glass({
  children,
  elevated = false,
  tone,
  style,
}: {
  children: ReactNode;
  elevated?: boolean;
  /** Border and wash for a status card. Defaults to the neutral surface. */
  tone?: { readonly line: string; readonly wash: string };
  style?: ViewStyle | ViewStyle[];
}) {
  const colours = useColours();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone?.wash ?? (elevated ? colours.surfaceRaised : colours.surfaceDim),
          borderColor: tone?.line ?? colours.outline,
        },
        elevated ? styles.lifted : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.lg,
  },
  lifted: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    default: { elevation: 6 },
  }) satisfies ViewStyle | undefined,
});
