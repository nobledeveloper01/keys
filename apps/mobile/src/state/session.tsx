import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'keys.agent.token';

/**
 * The agent's session on this phone.
 *
 * ## Where the token lives, and why that is not good enough yet
 *
 * `AsyncStorage`, which on iOS is a plain file in the app container and on
 * Android is unencrypted shared preferences. That is the same place the app
 * already keeps the language choice, and for a language choice it is fine.
 *
 * For a bearer token that lets somebody publish listings under an agent's name
 * it is not. It belongs in the Keychain or the Android Keystore, which needs a
 * native module this app does not have — and adding one at the same time as
 * the screens that use it would mean shipping both untested. So the token is
 * here, the gap is written down rather than assumed away, and it is carried as
 * a release gate: **no agent account reaches a real phone until this moves.**
 *
 * The web surface does not have this problem — its session is an httpOnly
 * cookie the browser will not hand to script — which is worth saying because
 * "the web did it properly" is the reason this looks like an oversight rather
 * than a decision.
 */
interface Session {
  readonly token: string | null;
  readonly ready: boolean;
  readonly signIn: (token: string) => void;
  readonly signOut: () => void;
}

const Context = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (live && stored) setToken(stored);
      } catch {
        // A phone with storage unavailable is a phone that is signed out, not
        // a phone that crashes on launch.
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const signIn = useCallback((next: string) => {
    setToken(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ token, ready, signIn, signOut }),
    [token, ready, signIn, signOut],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): Session {
  const session = useContext(Context);
  if (!session) throw new Error('useSession outside SessionProvider');
  return session;
}
