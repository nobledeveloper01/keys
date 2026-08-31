import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { say } from '@keys/domain';

import { Glow } from './Glow';
import { Gradient } from './Gradient';
import { Key, Shield } from './MarkParts';
import { Text } from './Text';
import { SPLASH_FIELD, motion, space } from '../design/tokens';

interface Props {
  /** Called once the splash has finished leaving. */
  readonly onDone: () => void;
  /** Whether the app behind it is ready to be shown. */
  readonly ready: boolean;
}

/**
 * The accent, written out because this draws before the theme is chosen.
 *
 * Exported so the frame *behind* the splash can use it too. It was the theme's
 * surface, which is white until the stored appearance has been read — so the
 * splash's own fade-out revealed a white rectangle for a few frames on a dark
 * phone. Only visible on a screenshot taken during the departure.
 */
// The field, and the native launch screen's background, are the same value in
// two places that cannot import each other — a storyboard cannot read this
// file. `scripts/splash-colour-check.py` fails the build when they drift, which
// is the only thing that stops the hand-over flashing.
// Re-exported: `splash-colour-check` reads it from here, where the field is.
export { SPLASH_FIELD };
const FIELD = SPLASH_FIELD;

/**
 * The first thing anybody sees.
 *
 * It takes over from the native launch screen — the same blue, the same mark,
 * in the same place — so the hand-over is invisible and the two read as one
 * thing rather than as two loads. The native one cannot animate; this one can,
 * and what it animates is the product's own sentence.
 *
 * **The key turns in the lock.** The shield arrives first and settles; the key
 * drops into it and rotates a quarter turn, the way a key does; the shield
 * answers with one pulse of light, and the name comes up.
 *
 * That is the only motion the mark can perform that means anything. A logo
 * that spins, slides or bounces is decoration — this one does the thing the
 * product does, once, in the second the app takes to start.
 *
 * Behind it, two soft lights drift across the gradient at different speeds.
 * They are the only decorative motion in the product and they earn their place
 * by making a flat field look like it has depth in the second before the app
 * appears — on a handset where that second is real.
 *
 * It is on screen for the second the app takes to start on the handsets it is
 * built for, which is long enough for a person to take in one shape.
 *
 * This animation arrived from the freight project with a truck driving in
 * under the word *Backhaul*, and shipped that way until somebody watched the
 * app start. The timing was right and every noun in it was wrong.
 *
 * **It never blocks.** The animation runs while the app starts behind it, and
 * it leaves as soon as both are done — whichever finishes last. A splash that
 * holds a ready app back for the sake of its own timing is an app that is
 * slower than it needs to be, on phones that are slow enough already.
 *
 * **Reduced motion is honoured.** Somebody who has asked their phone to stop
 * animating things gets the mark, held, and then the app.
 */
export function Splash({ onDone, ready }: Props) {
  // One driver for the whole sequence: every piece below reads a slice of it,
  // so nothing can drift out of step with anything else.
  const run = useRef(new Animated.Value(0)).current;
  const leave = useRef(new Animated.Value(0)).current;

  // When this splash appeared. The dwell below is measured from it, so a phone
  // that starts fast still shows the mark rather than flashing it.
  const shownAt = useRef(Date.now()).current;
  const finished = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((still) => {
      if (cancelled) return;

      Animated.timing(run, {
        toValue: 1,
        // Snapped to its end for somebody who asked their phone to stop
        // animating things — they get the finished mark, held for the dwell
        // below rather than skipped. The first version cut the duration to a
        // millisecond and called that "held", which made the whole splash
        // 300 ms on any device with the setting on.
        duration: still ? 0 : ARRIVE_MS,
        easing: ARRIVE_CURVE,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelled = true;
    };
  }, [run]);

  /*
    Leaves when the app is ready and the mark has been up long enough.

    Both, not either. Leaving the moment the app is ready makes the splash a
    flash on a fast phone, which reads as a glitch rather than as a start;
    waiting for the full animation on a slow one holds a ready app behind a
    picture. `DWELL_MS` is the floor and the app is the ceiling.
  */
  useEffect(() => {
    if (!ready || finished.current) return undefined;

    const waited = Date.now() - shownAt;
    const timer = setTimeout(() => {
      if (finished.current) return;
      finished.current = true;

      Animated.timing(leave, {
        toValue: 1,
        duration: motion.slow,
        easing: LEAVE_CURVE,
        useNativeDriver: true,
      }).start(onDone);
    }, Math.max(0, DWELL_MS - waited));

    return () => clearTimeout(timer);
  }, [ready, leave, onDone, shownAt]);

  // The mark resolves in place rather than travelling. `out(cubic)` on the driver
  // means it arrives fast and stops gently, which is what a heavy thing does.
  /*
    The two ambient lights, on their own clock.

    Separate from `run`, because the key's sequence finishes and these keep
    breathing for as long as the splash is up. Held at zero under reduced
    motion rather than started and cancelled, so nothing moves at all.
  */
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      Animated.loop(
        Animated.sequence([
          Animated.timing(drift, {
            toValue: 1,
            duration: 5200,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
            useNativeDriver: true,
          }),
          Animated.timing(drift, {
            toValue: 0,
            duration: 5200,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
    return () => {
      cancelled = true;
    };
  }, [drift]);

  const driftOne = drift.interpolate({ inputRange: [0, 1], outputRange: [-26, 26] });
  const driftTwo = drift.interpolate({ inputRange: [0, 1], outputRange: [30, -30] });

  /*
    One driver, five slices.

    Every piece below reads a window of the same 0→1 value, so nothing can drift
    out of step with anything else and the whole sequence can be scrubbed by
    changing one duration.

      0.00–0.42  the shield arrives and settles
      0.30–0.62  the key drops in
      0.34–0.70  the key turns a quarter
      0.62–0.88  the lock answers with one pulse
      0.70–1.00  the name comes up
  */
  const shieldScale = run.interpolate({
    inputRange: [0, 0.42, 1],
    outputRange: [0.72, 1, 1],
  });
  const shieldIn = run.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });

  const keyDrop = run.interpolate({
    inputRange: [0, 0.3, 0.62, 1],
    outputRange: [-34, -34, 0, 0],
  });
  const keyIn = run.interpolate({
    inputRange: [0, 0.3, 0.46, 1],
    outputRange: [0, 0, 1, 1],
  });
  const keyTurn = run.interpolate({
    inputRange: [0, 0.34, 0.7, 1],
    outputRange: ['-88deg', '-88deg', '0deg', '0deg'],
  });

  // One pulse outward as the key lands, then gone. Not a loop — a loop would be
  // a spinner, and a spinner says "waiting" when this is saying "open".
  const pulseScale = run.interpolate({
    inputRange: [0, 0.62, 0.88, 1],
    outputRange: [0.6, 0.6, 1.85, 1.85],
  });
  const pulseIn = run.interpolate({
    inputRange: [0, 0.62, 0.74, 0.88, 1],
    outputRange: [0, 0, 0.42, 0, 0],
  });

  const wordsIn = run.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1] });
  const wordsUp = run.interpolate({ inputRange: [0, 0.7, 1], outputRange: [14, 14, 0] });

  return (
    <Animated.View
      // Not announced. A screen reader user gets the app itself a moment
      // later, and a splash that speaks is a splash that has to be dismissed.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.field,
        {
          opacity: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { scale: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
          ],
        },
      ]}
    >
      {/* The brand gradient, over the flat field the launch screen shares. */}
      <Gradient style={StyleSheet.absoluteFill} />

      {/*
        Ambient light, behind everything.

        Two blurred circles on slow, out-of-phase drifts. `translate` only, so
        it stays on the compositor, and both are frozen when the reader has
        asked for less motion.
      */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowOne,
          { transform: [{ translateX: driftOne }, { translateY: driftOne }] },
        ]}
      >
        <Glow size={460} colour="#D9D3FF" intensity={0.5} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowTwo,
          { transform: [{ translateX: driftTwo }, { translateY: driftOne }] },
        ]}
      >
        <Glow size={400} colour="#2A1E7E" intensity={0.55} />
      </Animated.View>

      <View style={styles.mark}>
        {/* The pulse sits behind the shield and is gone by the end. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            { opacity: pulseIn, transform: [{ scale: pulseScale }] },
          ]}
        />

        <Animated.View style={{ opacity: shieldIn, transform: [{ scale: shieldScale }] }}>
          <Shield size={104} colour="#FFFFFF" />
        </Animated.View>

        {/*
          The key, over the shield and rotating about the same centre.

          Absolutely positioned rather than nested, because the two SVGs share a
          48×48 viewBox — laying one exactly over the other is what keeps the
          key turning inside the bore instead of beside it.
        */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.key,
            {
              opacity: keyIn,
              transform: [{ translateY: keyDrop }, { rotate: keyTurn }],
            },
          ]}
        >
          <Key size={104} colour="#FFFFFF" />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: wordsIn, transform: [{ translateY: wordsUp }] }}>
        <Text variant="headline" style={styles.word}>
          {/*
            Through the phrase table, not typed here. It is the one phrase every
            language borrows unchanged, and routing it through `say` means the
            name on the splash and the name everywhere else cannot drift apart.
          */}
          {say('en', 'app_name')}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

/*
  The curves, as beziers rather than as `Easing.out(Easing.cubic)`.

  Same shapes — ease-out-cubic and ease-in-cubic — written as calls because
  passing `Easing.cubic` hands a method around unbound, which lint objects to
  and which is a real hazard the day that method reads `this`.

  Out for the arrival and in for the departure: a heavy thing arrives fast and
  settles, and leaves by gathering speed. The reverse pair is what makes motion
  feel like paper.
*/
const ARRIVE_CURVE = Easing.bezier(0.33, 1, 0.68, 1);
const LEAVE_CURVE = Easing.bezier(0.32, 0, 0.67, 0);

/**
 * How long the arrival takes.
 *
 * Longer than any other motion in the product — `motion.slow` is 320 ms and is
 * the cap for a screen transition — because this one is not a transition. It
 * is the only moment the app has to say what it is for, and it is covering a
 * cold start that takes longer than this on the handsets that matter.
 */
const ARRIVE_MS = 900;

/**
 * The least time the mark is on screen.
 *
 * Longer than the arrival, so the finished mark is held for a beat before it
 * leaves — a splash that departs on the frame it completes reads as an
 * interruption. It is also the floor for somebody with reduced motion on,
 * where there is no arrival to watch.
 *
 * It costs nothing on the handsets this product is built for: a cold start
 * there is longer than this, so the app is the thing being waited for and this
 * number never comes into it.
 */
const DWELL_MS = 1_150;

const styles = StyleSheet.create({
  glowOne: { position: 'absolute', top: '6%', left: '-38%' },
  glowTwo: { position: 'absolute', bottom: '6%', right: '-34%' },
  field: {
    backgroundColor: FIELD,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    // Above everything, including the offline banner and the tab bar.
    zIndex: 100,
  },
  mark: { alignItems: 'center', justifyContent: 'center' },
  key: { position: 'absolute' },
  pulse: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  word: { color: '#FFFFFF' },
});
