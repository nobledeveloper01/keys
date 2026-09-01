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

const STORAGE_KEY = 'keys.tenant.token';

/**
 * The tenant's session on this phone.
 *
 * Separate from `useSession`, which is the agent's, and separate on purpose:
 * one token for both would mean every route meaning "an agent" would accept a
 * tenant token that happened to resolve, and the difference between the two is
 * the difference between somebody who can publish a listing and somebody who
 * cannot.
 *
 * It shares the agent session's problem exactly — `AsyncStorage` is a plain
 * file on iOS and unencrypted preferences on Android — and it is carried under
 * the same release gate. A tenant token is worth less than an agent's; it is
 * still somebody's conversations.
 */
interface TenantSession {
  readonly token: string | null;
  readonly ready: boolean;
  readonly signIn: (token: string) => void;
  readonly signOut: () => void;
}

const Context = createContext<TenantSession | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (live && stored) setToken(stored);
      } catch {
        // Storage unavailable is a phone that is signed out, not one that
        // crashes on launch.
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

export function useTenant(): TenantSession {
  const session = useContext(Context);
  if (!session) throw new Error('useTenant outside TenantProvider');
  return session;
}
