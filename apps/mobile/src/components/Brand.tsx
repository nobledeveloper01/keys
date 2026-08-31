import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { say } from '@keys/domain';

import { Gradient } from './Gradient';
import { Mark } from './Mark';
import { Text } from './Text';
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
  // Same reasoning as the language screen: below the width for both, the mark
  // goes above the name rather than the name breaking in half.
  const { fontScale } = useWindowDimensions();


  return (
    <View style={[styles.row, fontScale > 1.6 ? styles.stacked : null]}>
      <Gradient style={styles.mark}>
        <Mark size={18} colour="#FFFFFF" />
      </Gradient>
      {/* The one phrase every language borrows unchanged. */}
      <Text variant="title" numberOfLines={1}>
        {say('en', 'app_name')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  mark: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
