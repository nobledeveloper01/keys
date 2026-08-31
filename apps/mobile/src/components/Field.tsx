import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Text } from './Text';
import { radius, space, target, type } from '../design/tokens';
import { useColours } from '../design/theme';

interface Props {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string | undefined;
  readonly help?: string | undefined;
  readonly keyboard?: KeyboardTypeOptions | undefined;
  readonly autoComplete?: 'name' | 'tel' | 'off' | undefined;
}

/**
 * A labelled text field.
 *
 * The label is a real one above the box, not a placeholder. A placeholder
 * disappears the moment somebody starts typing, which is exactly when they are
 * most likely to be interrupted and come back not knowing what the half-filled
 * box was for — and it is invisible to a screen reader once replaced.
 *
 * `SearchField` is not reused here: it carries a magnifying glass and a clear
 * button and labels its return key `search`. Sharing them would mean one
 * component with a mode switch, and the modes have nothing in common but a
 * border.
 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
  keyboard,
  autoComplete,
}: Props) {
  const colours = useColours();

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colours.textSecondary}
        // The label is the accessible name. Without this a screen reader reads
        // the placeholder, or nothing at all once one has been typed over.
        accessibilityLabel={label}
        keyboardType={keyboard}
        autoComplete={autoComplete}
        autoCorrect={false}
        autoCapitalize={autoComplete === 'name' ? 'words' : 'none'}
        style={[
          styles.input,
          {
            color: colours.textPrimary,
            backgroundColor: colours.surfaceDim,
            borderColor: colours.outline,
            fontFamily: type.body.fontFamily,
            fontSize: type.body.fontSize,
          },
        ]}
      />
      {help ? (
        <Text variant="label" tone="secondary" style={styles.help}>
          {help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.md },
  label: { marginBottom: space.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    // Height rather than padding, so the box does not shrink below the touch
    // minimum when the reader's text scale is small.
    minHeight: target.standard,
  },
  help: { marginTop: space.xs },
});
