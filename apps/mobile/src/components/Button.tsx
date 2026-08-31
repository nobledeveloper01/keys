import { StyleSheet, View } from 'react-native';

import { Gradient } from './Gradient';
import { Press } from './Press';
import { Text } from './Text';
import { controlGradient, radius, space, target } from '../design/tokens';
import { useColours } from '../design/theme';

interface Props {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly quiet?: boolean;
  readonly accessibilityHint?: string | undefined;
}

/**
 * One button, two weights.
 *
 * The filled one uses `controlGradient` rather than the brand gradient: the
 * brand one is decorative and its lightest stop puts white text at 4.43:1,
 * under the floor. That is why there are two gradients in the palette at all,
 * and picking the wrong one here is how the distinction gets lost.
 *
 * A disabled button stays visible and stays labelled. Hiding it would leave a
 * reader wondering where the action went; greying it out and saying why beside
 * it tells them what to do instead.
 */
export function Button({ label, onPress, disabled = false, quiet = false, accessibilityHint }: Props) {
  const colours = useColours();

  if (quiet) {
    return (
      <Press
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={label}
        {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
        feedback="opacity"
        style={styles.quiet}
      >
        <Text variant="label" tone="accent">
          {label}
        </Text>
      </Press>
    );
  }

  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      style={styles.press}
    >
      {/*
        The box sizes to the label; the gradient fills the box behind it.

        The obvious nesting — a `Gradient` wrapping the label — clipped it:
        "Open an account" came out as "Open an accou", cut by a hard vertical
        edge. `Gradient` paints with an SVG `<Rect width="100%">`, and a
        percentage inside a container whose own width is being decided *by its
        children* is a measurement with nothing to measure against. The
        disabled variant is a plain `View` and was fine, which is what pointed
        at the gradient rather than at the text.

        So the plain View owns the layout in both states and the gradient is
        absolutely positioned behind. `overflow: hidden` because the rectangle
        does not know about the pill radius.
      */}
      <View
        style={[
          styles.solid,
          disabled ? { backgroundColor: colours.surfaceDim } : null,
        ]}
      >
        {!disabled && (
          <Gradient colours={controlGradient} style={StyleSheet.absoluteFill} />
        )}
        <Text variant="label" tone={disabled ? 'secondary' : 'primary'} style={disabled ? null : { color: colours.onAccent }}>
          {label}
        </Text>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  press: { marginTop: space.md, alignSelf: 'flex-start' },
  quiet: { marginTop: space.md, alignSelf: 'flex-start', minHeight: target.standard, justifyContent: 'center' },
  solid: {
    minHeight: target.standard,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
