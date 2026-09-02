import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * Where a session token lives.
 *
 * The Keychain on iOS, and nothing else. `AsyncStorage` is a plain file in the
 * app container — readable on a jailbroken phone, present in an unencrypted
 * backup — which is fine for a language choice and not fine for a bearer token
 * that lets somebody publish listings under an agent's name.
 *
 * ## Why this is `get` rather than `getEnforcing`
 *
 * Every other native module in this app uses `getEnforcing`, which throws at
 * *import* time on a platform that does not provide it. That is right for the
 * camera and the signing key: a build without them is a broken build.
 *
 * This one is different, because Android has no implementation yet and
 * `getEnforcing` would mean the Android app fails to start rather than failing
 * to sign in. `get` returns null there, and `state/secrets.ts` turns that into
 * a refusal with a sentence — a phone that cannot keep a token safely does not
 * get to keep one at all.
 *
 * The thing that must never happen is a silent fallback to `AsyncStorage`,
 * which would look exactly like this gate being closed.
 */
export interface Spec extends TurboModule {
  /** Store a value under a key. Resolves false if the Keychain refused. */
  setSecret(key: string, value: string): Promise<boolean>;

  /** The value, or null. A missing item is a signed-out phone, not an error. */
  getSecret(key: string): Promise<string | null>;

  /** Forget it. Removing something absent is a success. */
  removeSecret(key: string): Promise<boolean>;
}

/*
  `getEnforcing` in a try/catch, not `get`.

  The intent is "null when this platform has no implementation", and `get` is
  the method whose signature says exactly that — but it returned null for a
  module that is demonstrably in the binary, registered beside two others that
  resolve. These are legacy `RCT_EXTERN_MODULE` modules reached through the
  bridgeless interop layer, and that layer is consulted on the enforcing path.

  So: ask the way that works, and turn the throw into the null the rest of this
  app wants. The `catch` is the platform check; it is not swallowing a bug.
*/
function keychain(): Spec | null {
  try {
    return TurboModuleRegistry.getEnforcing<Spec>('KeysSecrets');
  } catch {
    return null;
  }
}

export default keychain();
