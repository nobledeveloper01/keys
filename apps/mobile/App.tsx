import { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Splash } from './src/components/Splash';
import { useColours, useTheme, ThemeProvider } from './src/design/theme';
import { LanguageProvider, useLanguage } from './src/state/language';
import { LanguageScreen } from './src/screens/LanguageScreen';
import { LookupScreen } from './src/screens/LookupScreen';

/*
  Where the server is.

  `10.0.2.2` is the host machine as seen from the Android emulator. It is a
  development default and it is written here rather than read from the
  environment, because React Native has no `process.env` at runtime and a
  build-time inlined URL that silently points at a laptop is exactly the
  failure the web surface refuses to allow. Phase 6 replaces this with a build
  configuration per flavour.
*/
const API_URL = 'http://10.0.2.2:5211';

/**
 * Where the app is, in one place.
 *
 * No navigation library yet — there is one screen behind one gate, and a
 * router for that is a dependency carrying no weight. It arrives in phase 4
 * with the tabs, and putting it in now would mean guessing the shape of a
 * navigation tree before any of the screens in it exist.
 */
function Shell() {
  const { chosen, ready } = useLanguage();
  const [splashDone, setSplashDone] = useState(false);
  const [picked, setPicked] = useState(false);
  const { isDark } = useTheme();
  const colours = useColours();

  // The splash waits for storage rather than for a timer. A phone that answers
  // in 40ms should not sit through a second of animation to prove it.
  if (!splashDone) {
    return <Splash ready={ready} onDone={() => setSplashDone(true)} />;
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colours.surface }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {chosen || picked ? (
        <LookupScreen baseUrl={API_URL} />
      ) : (
        <LanguageScreen onDone={() => setPicked(true)} />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <View style={styles.root}>
            <Shell />
          </View>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
