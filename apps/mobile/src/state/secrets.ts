import AsyncStorage from '@react-native-async-storage/async-storage';

import KeysSecrets from '../native/NativeKeysSecrets';

/**
 * Session tokens, and the one place that decides where they live.
 *
 * They lived in `AsyncStorage` — a plain file in the app container on iOS,
 * unencrypted shared preferences on Android. That was written down as a release
 * gate the day it was introduced, with the note that no agent account should
 * reach a real phone until it moved. This is the move.
 *
 * ## A phone that cannot keep a token safely does not keep one
 *
 * The tempting shape here is a fallback: use the Keychain if it is there, and
 * `AsyncStorage` if it is not. That would make every platform work and would
 * make this gate *look* closed while the exact thing it names is still
 * happening on whichever platform lacks the module.
 *
 * So there is no fallback. `available()` says whether a token can be kept, and
 * a surface that cannot keep one refuses to sign in and says why. Android will
 * fail that way until a Keystore implementation exists, which is worse for
 * Android and honest about which.
 *
 * ## Moving what is already there
 *
 * A phone that has signed in before has a token in the old place. `migrate()`
 * lifts it across once and deletes the original — reading it, writing it to the
 * Keychain, and only then removing it, so a crash in the middle leaves the
 * token somewhere rather than nowhere. Somebody signed out by an upgrade is a
 * person who has to find their password; a token left behind in a file is the
 * thing this whole change is about.
 */

/** Whether this phone can keep a token at all. */
export function available(): boolean {
  return KeysSecrets !== null;
}

export async function get(key: string): Promise<string | null> {
  if (!KeysSecrets) return null;
  try {
    return await KeysSecrets.getSecret(key);
  } catch {
    // A Keychain that will not answer is a signed-out phone, not a crash on
    // launch. The person signs in again; nothing is silently written elsewhere.
    return null;
  }
}

/**
 * Store a token, or say that it could not be stored.
 *
 * The boolean matters. A caller that ignores it and shows a signed-in screen
 * over a token that was never written has produced a session that vanishes on
 * the next launch with no explanation.
 */
export async function set(key: string, value: string): Promise<boolean> {
  if (!KeysSecrets) return false;
  try {
    return await KeysSecrets.setSecret(key, value);
  } catch {
    return false;
  }
}

export async function remove(key: string): Promise<void> {
  if (!KeysSecrets) return;
  try {
    await KeysSecrets.removeSecret(key);
  } catch {
    // Nothing useful to do and nothing to tell anybody: they asked to sign
    // out, and the screen has already stopped showing their account.
  }
}

/**
 * Lift a token out of the old place, once.
 *
 * Ordered so that a crash cannot lose it: read, write, verify the write, and
 * only then delete. The cost of getting that order wrong is somebody signed out
 * with no way to know why; the cost of leaving the old copy behind is the
 * vulnerability this file exists to close, so the delete is not optional
 * either — it just goes last.
 */
export async function migrate(key: string): Promise<string | null> {
  if (!KeysSecrets) return null;

  const already = await get(key);
  if (already !== null) {
    /*
      Already moved — but the old copy still has to go.

      The first version returned here, which left the token in the file on
      every launch after the one that moved it. The write and the delete are
      not one operation: a phone killed between them, or a delete that failed
      once, would keep a readable token in the app container for ever while
      this function reported success. Sweeping on every launch is cheap and is
      the only version that converges.
    */
    await AsyncStorage.removeItem(key).catch(() => {});
    return already;
  }

  const old = await AsyncStorage.getItem(key).catch(() => null);
  if (old === null) return null;

  const stored = await set(key, old);
  if (!stored) {
    /*
      Left where it was.

      A token that could not be written to the Keychain and has been deleted
      from the file is a token that is gone. Leaving it means this phone is
      still exposed and will try again next launch, which is the better of two
      bad outcomes and the one somebody can recover from.
    */
    return old;
  }

  await AsyncStorage.removeItem(key).catch(() => {});
  return old;
}
