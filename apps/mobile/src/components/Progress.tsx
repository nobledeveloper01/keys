import { StyleSheet, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';
import { radius, space } from '../design/tokens';
import { useColours } from '../design/theme';

export interface Step {
  readonly id: string;
  /** Short, and true in both states: "Walkthrough recorded" or "Record a walkthrough". */
  readonly label: string;
  /**
   * The instruction, shown on the next step and nowhere else.
   *
   * Six paragraphs is not a checklist. The long version earns its length only
   * on the one thing somebody can act on now.
   */
  readonly detail: string;
  readonly done: boolean;
}

/**
 * What is done and what is left, in that order.
 *
 * The agent screen used to render only the *unmet* conditions, as a list of
 * paragraphs. Two things were wrong with that. An agent who had completed four
 * of seven saw no evidence of it — the list only ever shrank, and a list that
 * only shrinks reads as a list of complaints. And the paragraphs were the same
 * weight as everything else on the screen, so the one that could be acted on
 * now looked like the one that could not.
 *
 * Done steps are ticked and quiet. The next thing to do is the first unticked
 * row, and it is the only one at full weight.
 */
export function Progress({ steps }: { steps: readonly Step[] }) {
  const colours = useColours();
  const next = steps.find((step) => !step.done);

  return (
    <View style={styles.list}>
      {steps.map((step) => {
        const isNext = step.id === next?.id;
        return (
          <View key={step.id} style={styles.row}>
            <View
              style={[
                styles.mark,
                {
                  backgroundColor: step.done ? colours.clearWash : 'transparent',
                  borderColor: step.done
                    ? colours.clear
                    : isNext
                      ? colours.accent
                      : colours.outline,
                },
              ]}
            >
              {step.done ? <Icon name="check" size="sm" colour={colours.clear} /> : null}
            </View>
            <View style={styles.label}>
              <Text
                variant="body"
                tone={step.done ? 'secondary' : isNext ? 'primary' : 'secondary'}
              >
                {step.label}
              </Text>
              {isNext && (
                <Text variant="label" tone="secondary" style={styles.detail}>
                  {step.detail}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space.sm, gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  mark: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    // Nudged to sit on the first line of the label rather than centred against
    // a paragraph that may wrap to three.
    marginTop: 2,
  },
  label: { flex: 1 },
  detail: { marginTop: 2 },
});
