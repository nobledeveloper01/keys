import { StyleSheet, View } from 'react-native';

import { Icon } from './Icon';
import { Press } from './Press';
import { Text } from './Text';
import { radius, space, target } from '../design/tokens';
import { useColours } from '../design/theme';

/**
 * One property, in a list of them.
 *
 * The whole reason this exists: the agent screen used to render every action
 * for every listing inline — mark, photograph, record, publish, confirm — so
 * three properties meant fifteen buttons in one scroll and no way to see, at a
 * glance, which one needed attention.
 *
 * A row says what it is, where it is, and where it stands. Everything you can
 * *do* to it lives on its own screen, which is also where the actions stop
 * needing to ask which property they apply to.
 */
export function PropertyRow({
  title,
  address,
  status,
  tone,
  onPress,
}: {
  title: string;
  address: string;
  /** Short. "Verified", "Draft", "2 left to do" — not a sentence. */
  status: string;
  tone: 'clear' | 'caution' | 'quiet';
  onPress: () => void;
}) {
  const colours = useColours();
  const dot =
    tone === 'clear' ? colours.clear : tone === 'caution' ? colours.caution : colours.textSecondary;

  return (
    <Press
      onPress={onPress}
      accessibilityLabel={`${title}. ${status}`}
      feedback="opacity"
      style={styles.press}
    >
      <View
        style={[
          styles.row,
          { backgroundColor: colours.surfaceRaised, borderColor: colours.outline },
        ]}
      >
        <View style={styles.body}>
          <Text variant="title" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="label" tone="secondary" numberOfLines={1} style={styles.address}>
            {address}
          </Text>
          <View style={styles.status}>
            {/*
              A dot and a word, never a dot alone. Status by colour is the
              accessibility mistake this product refuses everywhere else, and
              "amber" means nothing to somebody who cannot see it.
            */}
            <View style={[styles.dot, { backgroundColor: dot }]} />
            <Text variant="label" style={{ color: dot }}>
              {status}
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" size="sm" colour={colours.textSecondary} />
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  press: { marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: target.standard + 16,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  body: { flex: 1, gap: 2 },
  address: { marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
