import { ScrollView, StyleSheet, View } from 'react-native';

import { LANGUAGES, type Language } from '@keys/domain';

import { Button } from '../components/Button';
import { Choice } from '../components/Choice';
import { Text } from '../components/Text';
import { ThemeToggle } from '../components/ThemeToggle';
import { space } from '../design/tokens';
import { useState } from 'react';

import { probeCapture } from '../state/captureProbe';
import { useLanguage } from '../state/language';
import { useSession } from '../state/session';
import { LANGUAGE_NAMES } from '../state/languageNames';


/**
 * The two things about this app somebody may want to change.
 *
 * It exists mostly because of one of them. `ThemeToggle` was written in phase
 * 0, is covered by the palette gate, and had never once been mounted — which
 * meant the dark half of a generated palette had never appeared on a screen in
 * this product. `wired-check` exempts components on purpose, because a design
 * system that had to be deleted and rewritten one screen at a time would be
 * worse; the cost of that exemption was carried in the roadmap as an open item
 * for two phases. This closes it.
 *
 * The language can be changed here, not only at first run. A phone shared
 * between a shop owner and their nephew is one phone with two readers, and a
 * choice made once on installation is not a setting.
 */
export function SettingsScreen({ baseUrl }: { baseUrl: string }) {
  const { t, language, setLanguage } = useLanguage();
  const { token } = useSession();
  const [key, setKey] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text variant="headline">{t('tab_settings')}</Text>

      <Text variant="title" style={styles.heading}>
        {t('appearance')}
      </Text>
      <View style={styles.toggle}>
        <ThemeToggle />
      </View>

      <Text variant="title" style={styles.heading}>
        {t('language_setting')}
      </Text>
      <Choice
        options={LANGUAGES.map((code) => ({ id: code, label: LANGUAGE_NAMES[code] }))}
        chosen={language}
        onChoose={(id) => setLanguage(id as Language)}
      />

      {/*
        A development affordance, and it says so.

        untranslated-check: English on purpose. This is a developer control for
        proving the signing module reaches the enclave and the server accepts
        what it produces; it never ships to an agent, and translating it would
        be translating a diagnostic.
      */}
      {__DEV__ && (
        <>
          <Text variant="title" style={styles.heading}>
            Device key
          </Text>
          <Button
            label="Sign a capture with this phone"
            disabled={token === null}
            onPress={() => {
              void probeCapture(baseUrl, token).then(setKey);
            }}
          />
          {key !== null && (
            <Text variant="body" style={styles.heading}>
              {key}
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingTop: space.xl, flexGrow: 1 },
  heading: { marginTop: space.xl },
  toggle: { marginTop: space.sm, alignSelf: 'flex-start' },
});
