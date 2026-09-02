import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { available, migrate, remove, set } from './secrets';

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
  /**
   * Store a token. Resolves false when this phone has nowhere safe to put one,
   * in which case nothing was stored and nobody is signed in.
   */
  readonly signIn: (token: string) => Promise<boolean>;
  readonly signOut: () => void;
  /**
   * Whether this phone can keep a session at all.
   *
   * False where there is no Keychain module — Android, today. There is
   * deliberately no fallback to `AsyncStorage`: that would make this look
   * closed while the exact thing it guards against carried on happening.
   */
  readonly canKeepASession: boolean;
}

const Context = createContext<TenantSession | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        // Lifts an existing token out of `AsyncStorage` on the first launch
        // after the upgrade, then reads from the Keychain thereafter.
        const stored = await migrate(STORAGE_KEY);
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

  /*
    Signing in can fail, and the caller has to be able to see that.

    A screen that shows an account over a token which was never stored has
    produced a session that vanishes on the next launch with no explanation —
    so this returns whether it worked rather than swallowing it.
  */
  const signIn = useCallback(async (next: string) => {
    const stored = await set(STORAGE_KEY, next);
    if (stored) setToken(next);
    return stored;
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    void remove(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ token, ready, signIn, signOut, canKeepASession: available() }),
    [token, ready, signIn, signOut],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTenant(): TenantSession {
  const session = useContext(Context);
  if (!session) throw new Error('useTenant outside TenantProvider');
  return session;
}
