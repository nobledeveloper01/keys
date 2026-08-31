import { StyleSheet, View } from 'react-native';

import { Icon } from './Icon';
import { Press } from './Press';
import { Text } from './Text';
import { radius, space, target } from '../design/tokens';
import { useColours } from '../design/theme';

export interface Option {
  readonly id: string;
  readonly label: string;
}

/**
 * One of a short, closed list.
 *
 * A stack of rows rather than a dropdown. There are six report categories and
 * every one of them matters to the person choosing — a picker would hide five
 * of them behind a tap and put the most consequential decision on this screen
 * inside a control that shows one option at a time.
 *
 * The selected row is named to a screen reader through `accessibilityState`
 * rather than shown only as a tick and a tint, which is colour and shape
 * carrying meaning alone.
 */
export function Choice({
  options,
  chosen,
  onChoose,
}: {
  options: readonly Option[];
  chosen: string | null;
  onChoose: (id: string) => void;
}) {
  const colours = useColours();

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const on = option.id === chosen;
        return (
          <Press
            key={option.id}
            onPress={() => onChoose(option.id)}
            accessibilityLabel={option.label}
            feedback="opacity"
            style={styles.row}
          >
            <View
              accessible
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[
                styles.inner,
                {
                  backgroundColor: on ? colours.accentWash : colours.surfaceDim,
                  borderColor: on ? colours.accent : colours.outline,
                },
              ]}
            >
              <Text variant="body" style={styles.label}>
                {option.label}
              </Text>
              {on ? <Icon name="check" size="sm" colour={colours.accent} /> : null}
            </View>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space.sm },
  row: { marginBottom: space.sm },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: target.standard,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  // Takes the room, so a long category wraps instead of pushing the tick off.
  label: { flex: 1 },
});
