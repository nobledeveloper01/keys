import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

/**
 * Where a link the app was opened with wants to go.
 *
 * Two shapes reach here and they carry the same thing:
 *
 *   https://keys.ng/reply?token=…      a universal link, what Keys actually sends
 *   keys://reply?token=…               the custom scheme, for development
 *
 * The https form is the one in the SMS, because it works for the majority of
 * recipients who do not have the app — they get the web page instead of a link
 * that does nothing. See the entitlement and the association file for what
 * makes iOS hand it to us rather than to Safari.
 */
export type Destination =
  | { readonly screen: 'reply'; readonly token: string }
  | { readonly screen: 'authority'; readonly challengeId: string };

/**
 * Parsed by hand rather than with `URL`.
 *
 * Hermes has `URL`, but it is strict about schemes it does not recognise and
 * this has to read `keys://reply?token=…` as well as an https URL. The shapes
 * are two known paths and one query parameter each; a parser for that is six
 * lines, and six lines is cheaper than a polyfill.
 */
export function destinationOf(link: string): Destination | null {
  const [path, query = ''] = link.split('?');
  const parameter = (name: string): string | null => {
    for (const pair of query.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (key === name && value) return decodeURIComponent(value);
    }
    return null;
  };

  /*
    Matched on the path's ending, not on the whole URL.

    `https://keys.ng/reply` and `keys://reply` differ in everything before the
    last segment, and a rule written against either one in full breaks the
    other. What matters is which of two screens the link names.
  */
  const last = (path ?? '').replace(/\/+$/, '').split('/').pop() ?? '';

  if (last === 'reply') {
    const token = parameter('token');
    return token ? { screen: 'reply', token } : null;
  }
  if (last === 'authority') {
    const challengeId = parameter('c');
    return challengeId ? { screen: 'authority', challengeId } : null;
  }
  return null;
}

/**
 * The link the app was opened with, and any that arrive while it is running.
 *
 * Both, because they are different situations and missing either one is a
 * whole broken path: a cold start opens through `getInitialURL`, and a tap
 * while the app is already in memory arrives as an event. The second is the
 * common one — somebody reads the SMS, opens Keys to look, goes back to the
 * message and taps the link.
 */
export function useDeepLink(): {
  readonly destination: Destination | null;
  readonly clear: () => void;
} {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let live = true;

    void Linking.getInitialURL().then((url) => {
      if (live && url) setDestination(destinationOf(url));
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      setDestination(destinationOf(url));
    });

    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  return { destination, clear: () => setDestination(null) };
}
