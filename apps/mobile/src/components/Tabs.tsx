import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './Icon';
import { Press } from './Press';
import { Text } from './Text';
import { space, target } from '../design/tokens';
import { useColours } from '../design/theme';

export interface Tab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
}

/**
 * The bottom bar.
 *
 * Two tabs, and it took until now to be allowed to write one. The roadmap put
 * navigation in phase 4 on the grounds that a tree drawn before its screens
 * exist is a guess — which was right, and is no longer the situation: there is
 * a screen a tenant uses and a screen an agent uses, and they are not steps in
 * a flow.
 *
 * Icons **and** labels, both. An icon alone is a guess a first-time user makes
 * in a language that may not be theirs, and the label is the part that carries
 * the four translations.
 */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  const colours = useColours();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colours.surface,
          borderTopColor: colours.outline,
          // The home indicator, not a guessed constant. A fixed 34 is right on
          // exactly one device and wrong on every other.
          paddingBottom: Math.max(insets.bottom, space.sm),
        },
      ]}
    >
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <Press
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityLabel={tab.label}
            feedback="opacity"
            style={styles.tab}
          >
            <View
              accessible
              accessibilityRole="tab"
              // Said, not implied by colour. A screen reader has no access to
              // "the purple one", and colour alone is the accessibility
              // mistake this product refuses everywhere else.
              accessibilityState={{ selected: on }}
              style={styles.inner}
            >
              <Icon
                name={tab.icon}
                size="md"
                colour={on ? colours.accent : colours.textSecondary}
              />
              <Text variant="label" tone={on ? 'accent' : 'secondary'} style={styles.label}>
                {tab.label}
              </Text>
            </View>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
  },
  tab: { flex: 1, minHeight: target.standard },
  inner: { alignItems: 'center', justifyContent: 'center', gap: space.xs },
  label: { textAlign: 'center' },
});
