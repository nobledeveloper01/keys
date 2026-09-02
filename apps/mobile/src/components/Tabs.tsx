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
              {/*
                Two lines at most, and a tighter cap than `label` elsewhere.

                Five destinations across a phone is the tightest slot in this
                app. At the largest accessibility size these wrapped to three
                lines each and the bar took forty per cent of the screen — so
                the label is bounded here rather than everywhere `label` is
                used, because a field label has room that a tab does not.

                Both icon *and* words are kept: an icon alone is a guess a
                first-time reader makes in a language that may not be theirs,
                and that is truer at 200% text, not less true.
              */}
              <Text
                variant="label"
                tone={on ? 'accent' : 'secondary'}
                style={styles.label}
                /*
                  One line, shrinking to fit rather than breaking.

                  At two lines the longest label — "Messages" — wrapped to an
                  orphaned "s", which is worse than a slightly smaller word:
                  the reader has to reassemble it. `adjustsFontSizeToFit` keeps
                  the word whole inside the slot it has, and `minimumFontScale`
                  stops it shrinking past legibility. A tab label that does not
                  fit is not accessible either.
                */
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                maxScale={1.3}
              >
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
