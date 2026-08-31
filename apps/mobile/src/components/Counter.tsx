import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type TextStyle } from 'react-native';

import { Text } from './Text';

/**
 * A number that arrives rather than appears.
 *
 * It counts from zero to the answer over about half a second. On a screen whose
 * whole job is to report a count, watching it land reads as *this was looked
 * up* — where the same figure simply appearing reads as something the app
 * already knew.
 *
 * **It never counts down and it never overshoots.** A number that runs past the
 * answer and settles back is a slot machine, and this one is telling somebody
 * how many people have reported the person asking them for money.
 *
 * Reduced motion gets the figure immediately. So does any count above twenty,
 * where the tick becomes a blur that says nothing and only delays the reading.
 */
export function Counter({
  to,
  style,
}: {
  to: number;
  style?: TextStyle | TextStyle[];
}) {
  const [shown, setShown] = useState(to);
  const driver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    /*
      The running animation, so unmounting can stop it.

      Setting a `cancelled` flag is not enough: `Animated.timing` keeps its own
      timer and goes on calling the listener after the component is gone. Jest
      caught it — the suite passed and then the process would not exit, with
      the environment torn down under a timer that was still firing. On a phone
      the same leak is a counter animating a screen the reader has left.
    */
    let running: Animated.CompositeAnimation | undefined;
    let listener: string | undefined;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced || to > 20) {
        setShown(to);
        return;
      }

      setShown(0);
      driver.setValue(0);
      listener = driver.addListener(({ value }) => {
        setShown(Math.round(value * to));
      });

      running = Animated.timing(driver, {
        toValue: 1,
        duration: 520,
        // `Easing.cubic` passed bare hands a method around unbound, which lint
        // objects to and which this codebase already writes as a bezier instead.
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        // The listener reads the value on the JavaScript side, so this one
        // cannot go native. It is a single number for half a second.
        useNativeDriver: false,
      });
      running.start(() => {
        if (listener !== undefined) driver.removeListener(listener);
        if (!cancelled) setShown(to);
      });
    });

    return () => {
      cancelled = true;
      running?.stop();
      if (listener !== undefined) driver.removeListener(listener);
    };
  }, [to, driver]);

  return (
    <Text
      variant="display"
      tabular
      style={style}
      // The final figure, always — a screen reader should not be read a number
      // that is still moving.
      accessibilityLabel={String(to)}
    >
      {String(shown)}
    </Text>
  );
}
