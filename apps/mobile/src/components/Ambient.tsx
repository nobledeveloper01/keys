import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Glow } from './Glow';
import { useTheme } from '../design/theme';

/**
 * The light behind every screen, and it answers.
 *
 * Two soft lights, and the top one takes the colour of whatever the screen has
 * just found out. A number with nothing against it warms the whole page green;
 * a number with an upheld report turns it red. Not a badge, not a border — the
 * room the answer is read in changes colour.
 *
 * This is the one piece of the interface that is trying to be memorable rather
 * than merely correct, and it is doing a job while it does it: on a phone held
 * at arm's length in daylight, the verdict is legible from further away than
 * any text on the screen, and it is legible before the words are read.
 *
 * It is never the *only* carrier of the verdict — the card states it in words
 * and a number, in four languages. Colour alone would fail a colour-blind
 * reader and would be a claim made by decoration, which this product does not
 * make anywhere else.
 *
 * Both themes get it, at different strengths. On white the opacity that reads
 * as depth over `#0A0A14` reads as a printing fault, so light runs at about a
 * third of dark's.
 */
export function Ambient({ tone }: { tone?: string | undefined }) {
  const { isDark, colours } = useTheme();
  const resting = colours.accent;

  /*
    Crossfaded, not swapped.

    Two stacked glows with opposite opacities, because a colour cannot be
    animated on the native driver — an interpolated `stopColor` would run on the
    JavaScript thread and stutter on exactly the handsets this is for.
  */
  const shift = useRef(new Animated.Value(0)).current;
  const held = useRef(resting);
  if (tone !== undefined && tone !== held.current) held.current = tone;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: tone === undefined ? 0 : 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [tone, shift]);

  const strength = isDark ? 0.3 : 0.11;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.one}>
        <Animated.View
          style={{ opacity: shift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}
        >
          <Glow size={420} colour={resting} intensity={strength} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: shift }]}>
          <Glow size={420} colour={held.current} intensity={strength * 1.25} />
        </Animated.View>
      </View>

      <View style={styles.two}>
        <Glow
          size={380}
          colour={isDark ? '#3DDC97' : '#8B7CFF'}
          intensity={isDark ? 0.13 : 0.07}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  one: { position: 'absolute', top: -160, right: -170 },
  two: { position: 'absolute', bottom: -170, left: -160 },
});
