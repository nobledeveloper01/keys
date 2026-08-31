import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { LANGUAGES, say } from '@keys/domain';

import { Glass } from '../components/Glass';
import { Gradient } from '../components/Gradient';
import { Mark } from '../components/Mark';
import { Press } from '../components/Press';
import { Text } from '../components/Text';
import { radius, space } from '../design/tokens';
import { useLanguage } from '../state/language';
import { LANGUAGE_NAMES } from '../state/languageNames';

/**
 * Which language to read in, asked before anything else.
 *
 * The names themselves live in `state/languageNames`, because the settings
 * screen offers the same four and a second copy is a second place somebody
 * adds a fifth language to.
 */
export function LanguageScreen({ onDone }: { onDone: () => void }) {
  const { setLanguage } = useLanguage();
  /*
    The mark grows with the name beside it.

    A fixed 44-point square next to a wordmark that scales to three times its
    size leaves a postage stamp beside a headline. `fontScale` is the reader's
    own text setting, which is the same thing the name is scaling by.
  */
  const { fontScale } = useWindowDimensions();
  const markSize = Math.round(44 * fontScale);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {/*
        The product's name, and nothing else, above the choice.

        There is no title on this screen because a title would have to be in
        one of the four languages before the reader has told us which one they
        read — and picking one to ask the question in is the small rudeness this
        whole screen exists to avoid. A name is not translated in any of them,
        so the name is the one thing that can appear here honestly.

        Without it the four cards floated in the middle of an empty screen with
        nothing above them, which reads as a screen that failed to load rather
        than as a question.
      */}
      {/*
        The mark, not just the word.

        The lookup screen shows the keyhole beside the name and this one showed
        the name alone, so the first screen of the product was the only one
        without its mark on it — and the reader met the brand twice, differently,
        in the first two seconds.
      */}
      {/*
        The lockup stacks when the name no longer fits beside the mark.

        `flexShrink` was not enough: a shrunk row wraps the word itself, so at
        the largest accessibility size the product's own name rendered as
        “Key / s” on the first screen a reader sees. Above about 1.6× there is
        no width for both, so the mark goes above the name instead — which is
        what a lockup is supposed to do rather than break a word in half.
      */}
      <View style={[styles.brand, fontScale > 1.6 ? styles.brandStacked : null]}>
        <Gradient
          style={{
            ...styles.mark,
            width: markSize,
            height: markSize,
            borderRadius: Math.round(radius.lg * fontScale),
          }}
        >
          <Mark size={Math.round(28 * fontScale)} colour="#FFFFFF" />
        </Gradient>
        {/*
          `flexShrink`, or the wordmark runs off the right edge.

          At the largest accessibility size the mark and the name together are
          wider than the screen, and a row that cannot give way just overflows —
          the product's own name was cut off mid-word on the first screen a
          reader sees.
        */}
        <Text variant="display" style={styles.word} numberOfLines={1}>
          {say('en', 'app_name')}
        </Text>
      </View>
      {LANGUAGES.map((language) => (
        <Press
          key={language}
          accessibilityLabel={LANGUAGE_NAMES[language]}
          // Without this a screen reader announces four buttons named only
          // after languages, with nothing saying what pressing one does.
          accessibilityHint={say(language, 'check_a_number')}
          onPress={() => {
            setLanguage(language);
            onDone();
          }}
          feedback="scale"
        >
          <Glass style={styles.card}>
            <Text variant="title">{LANGUAGE_NAMES[language]}</Text>
            {/* The product's own promise, in the language being offered. */}
            <Text variant="body" tone="secondary">
              {say(language, 'check_a_number')}
            </Text>
          </Glass>
        </Press>
      ))}
      <View style={styles.foot} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /*
    Anchored near the top rather than centred.

    `justifyContent: 'center'` put roughly four hundred points of white above
    the first card on a tall phone. Centring works for one or two elements; for
    a list of four it just moves the whole thing away from the thumb.
  */
  page: { padding: space.lg, paddingTop: space.xxl, gap: space.sm, flexGrow: 1 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.xl,
  },
  word: { flexShrink: 1 },
  brandStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  mark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  card: { marginBottom: space.sm },
  foot: { height: space.lg },
});
