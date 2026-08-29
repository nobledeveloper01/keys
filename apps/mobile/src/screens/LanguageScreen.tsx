import { ScrollView, StyleSheet, View } from 'react-native';

import { LANGUAGES, type Language, say } from '@keys/domain';

import { Card } from '../components/Card';
import { Press } from '../components/Press';
import { Text } from '../components/Text';
import { space } from '../design/tokens';
import { useLanguage } from '../state/language';

/**
 * Which language to read in, asked before anything else.
 *
 * Each option is written in its own language, never in English and never as an
 * exonym — somebody picking Hausa should find the word they would write, not
 * the word we would write about them. English is offered last, deliberately:
 * putting it first makes the other three look like an afterthought.
 */
// untranslated-check: these are the four language names, each already written
// in its own language. Putting them through `say()` would mean translating the
// word "Hausa" into Yoruba for somebody who is looking for the word "Hausa".
const NAMES: Readonly<Record<Language, string>> = {
  ha: 'Hausa',
  yo: 'Yorùbá',
  ig: 'Igbo',
  en: 'English',
};

export function LanguageScreen({ onDone }: { onDone: () => void }) {
  const { setLanguage } = useLanguage();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {LANGUAGES.map((language) => (
        <Press
          key={language}
          accessibilityLabel={NAMES[language]}
          onPress={() => {
            setLanguage(language);
            onDone();
          }}
          feedback="scale"
        >
          <Card emphasis="raised" style={styles.card}>
            <Text variant="title">{NAMES[language]}</Text>
            {/* The product's own promise, in the language being offered. */}
            <Text variant="body" tone="secondary">
              {say(language, 'check_a_number')}
            </Text>
          </Card>
        </Press>
      ))}
      <View style={styles.foot} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, gap: space.sm, justifyContent: 'center', flexGrow: 1 },
  card: { marginBottom: space.sm },
  foot: { height: space.lg },
});
