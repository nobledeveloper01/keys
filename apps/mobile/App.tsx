import { useState } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from './src/components/Ambient';
import { Splash } from './src/components/Splash';
import { Tabs, type Tab } from './src/components/Tabs';
import { useColours, useTheme, ThemeProvider } from './src/design/theme';
import { useDeepLink } from './src/state/deepLink';
import { LanguageProvider, useLanguage } from './src/state/language';
import { SessionProvider } from './src/state/session';
import { AgentScreen } from './src/screens/AgentScreen';
import { LanguageScreen } from './src/screens/LanguageScreen';
import { LookupScreen } from './src/screens/LookupScreen';
import { ReplyScreen } from './src/screens/ReplyScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

/*
  Where the server is, in development.

  The two simulators disagree about what "this machine" is called: the Android
  emulator reaches the host at `10.0.2.2`, and the iOS simulator shares the
  host's own loopback. Hardcoding either one makes the app silently unreachable
  on the other platform, which looks like a broken server rather than a wrong
  address.

  Written here rather than read from the environment because React Native has no
  `process.env` at runtime, and a build-time inlined URL that quietly points at
  somebody's laptop is exactly the failure the web surface refuses to allow.
  Phase 6 replaces this with a build configuration per flavour, and a release
  build has no business carrying a loopback address at all.
*/
const API_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:5211',
      default: 'http://127.0.0.1:5211',
    })
  : '';

/**
 * Where the app is, in one place.
 *
 * Still no navigation library. There are two destinations and they are not
 * steps in a flow, so what is needed is which of two screens is showing —
 * which is a `useState`, not a dependency with a navigator, a stack, a param
 * list and a linking config.
 *
 * That will stop being true. Phase 4 brings listing pages reached from search
 * results, and a back stack you can push onto is exactly what a library is
 * for; the moment there is a second thing to go *back* to, this becomes a
 * router. Writing one now would be building the general case from a sample of
 * two.
 */
/*
  Everything but the bottom.

  The tab bar reads the home-indicator inset itself and pads for it, so leaving
  the bottom edge here as well applied it twice: the bar sat above a strip of
  bare background with the ambient gradient showing through, which reads as the
  bar having come loose. This app has made the double-inset mistake once
  before, between `SafeAreaView` and a screen header, and it cost 94 points of
  dead space at the top.

  Whichever element paints to the edge owns the inset. Here that is the bar.
*/
const SIDES = ['top', 'left', 'right'] as const;

function Shell() {
  const { chosen, ready, t } = useLanguage();
  const [splashDone, setSplashDone] = useState(false);
  const [picked, setPicked] = useState(false);
  const [tab, setTab] = useState('check');

  /*
    One level of depth inside the Check tab, and no more.

    Reporting is reached from a result — you look a number up, it is the person
    who took your money, you report it — so it is not a peer of the tabs and
    should not be one. A number here rather than a boolean because it carries
    the number being reported, which the lookup already has and nobody should
    retype while angry.

    This is a stack of one. It stays a `useState` until phase 4 puts listing
    pages behind search results and there is a second thing to go *back* to;
    that is when a router earns its dependency, not before.
  */
  const [reporting, setReporting] = useState<string | null>(null);

  /*
    A link from a text message, which is not a destination anybody navigates to.

    It takes the whole screen, above the tabs, because somebody who has just
    been accused of something and tapped the link in that message is not
    browsing — and offering them Check and Account underneath would be the app
    asking what else it can interest them in.
  */
  const { destination, clear } = useDeepLink();

  /*
    What the screen has just found out, lifted to the shell.

    The ambient light is behind everything, so it cannot live inside the screen
    that knows the answer. The screen reports the verdict up; the shell colours
    the room.
  */
  const [verdict, setVerdict] = useState<string | undefined>(undefined);
  const { isDark } = useTheme();
  const colours = useColours();

  // The splash waits for storage rather than for a timer. A phone that answers
  // in 40ms should not sit through a second of animation to prove it.
  if (!splashDone) {
    return <Splash ready={ready} onDone={() => setSplashDone(true)} />;
  }

  const tabs: readonly Tab[] = [
    { id: 'check', label: t('tab_check'), icon: 'search' },
    { id: 'account', label: t('tab_account'), icon: 'shield' },
    { id: 'settings', label: t('tab_settings'), icon: 'auto' },
  ];

  /*
    The language gate comes before the tabs, not inside them.

    Somebody who has not chosen a language cannot read the tab labels, so
    showing the bar underneath the picker would be furniture in a language they
    may not speak.
  */
  if (!chosen && !picked) {
    return (
      <SafeAreaView
        edges={SIDES}
        style={[styles.root, { backgroundColor: colours.surface }]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Ambient />
        <LanguageScreen onDone={() => setPicked(true)} />
      </SafeAreaView>
    );
  }

  if (destination?.screen === 'reply') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colours.surface }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Ambient />
        <ReplyScreen baseUrl={API_URL} token={destination.token} onDone={clear} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={SIDES} style={[styles.root, { backgroundColor: colours.surface }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/*
        The ambient light follows the lookup's verdict, and only the lookup's.
        Tinting the agent's own screen red because a tenant's search found
        something would be the room reacting to the wrong room.
      */}
      <Ambient tone={tab === 'check' ? verdict : undefined} />

      <View style={styles.body}>
        {tab === 'check' &&
          (reporting === null ? (
            <LookupScreen
              baseUrl={API_URL}
              onVerdict={setVerdict}
              onReport={setReporting}
            />
          ) : (
            <ReportScreen
              baseUrl={API_URL}
              phone={reporting}
              onDone={() => setReporting(null)}
              onCancel={() => setReporting(null)}
            />
          ))}
        {tab === 'account' && <AgentScreen baseUrl={API_URL} />}
        {tab === 'settings' && <SettingsScreen baseUrl={API_URL} />}
      </View>

      {/*
        The bar stays while reporting.

        Hiding it would make the report screen a modal somebody can only leave
        through one button, and a person who opened it by accident, on a bad
        connection, angry, should be able to walk away the same way they walk
        away from anything else in this app.
      */}
      <Tabs
        tabs={tabs}
        active={tab}
        onChange={(next) => {
          setTab(next);
          setReporting(null);
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <SessionProvider>
            <View style={styles.root}>
              <Shell />
            </View>
          </SessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // The screen takes the space the tab bar does not. Without this the bar
  // floats over the bottom of a scroll view and eats the last row of content.
  body: { flex: 1 },
});
