import type { TurboModule } from 'react-native';

/**
 * A native module, or a stand-in that refuses at use rather than at launch
 * (ADR-0018).
 *
 * `getEnforcing` throws at *import* on a platform without the module, which
 * means an Android build does not get as far as refusing to capture — it
 * does not start. The camera and the signing key are iOS-only until R14 and
 * the Keystore key are built, and an Android phone should still open, sign
 * in, search and read a listing, and be told plainly that it cannot capture.
 *
 * So when the registry has no module, every method of the stand-in rejects
 * with one sentence. The callers already treat a rejection from the camera
 * or the key as a refusal to show; nothing else changes.
 *
 * The registry call itself stays in each spec file, written out: React
 * Native's codegen parses every `Native*.ts` for a literal
 * `TurboModuleRegistry.get…<Spec>('Name')` and fails the native build when
 * it cannot find one — which is how a helper that hid the call broke both
 * platforms' builds on the first push. `getEnforcing` rather than `get`, for
 * the reason `NativeKeysSecrets.ts` gives.
 */
export function onThisPlatform<T extends TurboModule>(name: string, load: () => T): T {
  try {
    return load();
  } catch {
    return absent<T>(name);
  }
}

/**
 * The stand-in. Every method rejects with one sentence; `then` is left
 * undefined so an `await` on the module itself does not mistake it for a
 * promise.
 */
export function absent<T extends TurboModule>(name: string): T {
  return new Proxy({} as T, {
    get: (_target, method) =>
      typeof method === 'string' && method !== 'then'
        ? () => Promise.reject(new Error(`${name} is not on this platform yet.`))
        : undefined,
  });
}
