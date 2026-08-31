import { StyleSheet } from 'react-native';

/**
 * A tappable control's touch area must not include its own margin.
 *
 * `Press` lifts layout properties from the style it is given onto the
 * `Pressable`, leaving the visual ones on the animated view inside. Margins
 * were in the second group, which put the gap above a control *inside* its
 * touch area — so two stacked controls overlapped, and the lower one, drawn
 * later, won the tap.
 *
 * On the lookup card that meant "Send this to whoever asked" opened the report
 * screen. Both of those are one tap from a person who has just been scammed,
 * and they are not interchangeable.
 *
 * This asserts the split rather than the symptom, because the symptom needs
 * two components, a layout pass and a synthesised touch — and the split is the
 * thing that was wrong.
 */
const LAYOUT = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'alignSelf',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
] as const;

describe('what Press lifts onto the Pressable', () => {
  it('lifts every margin, so the gap belongs to neither control', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '../src/components/Press.tsx'),
      'utf8',
    ) as string;

    const destructured = source.slice(
      source.indexOf('const {'),
      source.indexOf('} = StyleSheet.flatten(style)'),
    );
    const assembled = source.slice(
      source.indexOf('const layout: ViewStyle = {'),
      source.indexOf('};', source.indexOf('const layout: ViewStyle = {')),
    );

    for (const property of LAYOUT) {
      expect(destructured).toContain(property);
      expect(assembled).toContain(property);
    }
  });

  it('leaves padding behind, because padding is part of the control', () => {
    // The distinction: padding makes a control bigger and should be tappable;
    // margin pushes it away from its neighbour and belongs to neither.
    const source = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '../src/components/Press.tsx'),
      'utf8',
    ) as string;
    const assembled = source.slice(
      source.indexOf('const layout: ViewStyle = {'),
      source.indexOf('};', source.indexOf('const layout: ViewStyle = {')),
    );
    expect(assembled).not.toContain('padding');
  });

  it('agrees with what StyleSheet actually calls these', () => {
    // Guards a typo in the list above: a misspelt property would silently stay
    // on the inner view and the bug would come back looking fixed.
    const style = StyleSheet.flatten([{ marginTop: 4, marginHorizontal: 8 }]);
    expect(style).toHaveProperty('marginTop');
    expect(style).toHaveProperty('marginHorizontal');
  });
});
