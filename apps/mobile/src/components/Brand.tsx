import { StyleSheet, View } from 'react-native';

import { say } from '@keys/domain';

import { Keyhole } from './Keyhole';
import { Text } from './Text';
import { useColours } from '../design/theme';
import { radius, space } from '../design/tokens';

/**
 * The mark and the name, at the top of a screen.
 *
 * The web surface grew a masthead because four pages opened with a bare
 * heading and nothing said what the site was. The app had exactly the same
 * hole: a title, a rule, and a search field, on a screen somebody reached from
 * a link a friend sent them.
 *
 * Small, because the renter face has one job and the brand is not it. It is
 * there to answer *whose* answer this is, not to be looked at.
 */
export function Brand() {
  const colours = useColours();

  return (
    <View style={styles.row}>
      <View style={[styles.mark, { backgroundColor: colours.accent }]}>
        <Keyhole size={16} colour={colours.onAccent} />
      </View>
      {/* The one phrase every language borrows unchanged. */}
      <Text variant="title">{say('en', 'app_name')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mark: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
