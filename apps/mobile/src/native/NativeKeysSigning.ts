import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * The device key, and the only thing that can sign a capture.
 *
 * ## What the native side promises
 *
 * A P-256 key pair generated inside the Secure Enclave, whose private half
 * **cannot be read by anything, including this app**. Signing happens in the
 * enclave; what crosses back is a signature.
 *
 * P-256 rather than Ed25519 because the enclave holds P-256 keys and nothing
 * else. Ed25519 would mean a private key in software, and a signing key that
 * can be extracted from a backup or a jailbroken phone is an attacker who can
 * sign captures for a property they have never visited — which is the entire
 * thing this mechanism exists to prevent.
 *
 * ## What it does not promise
 *
 * That the photograph is of the right building. A camera can be pointed at a
 * printout. This proves the *path* the bytes took; perceptual hashing is what
 * asks about their content, and keeping the two apart is what stops either
 * being asked to do a job it cannot.
 */
export interface Spec extends TurboModule {
  /**
   * The device's public key, SPKI DER as base64, generating one if this phone
   * has none. Idempotent: the same phone returns the same key until the app is
   * deleted, because the private half is not something we could restore.
   */
  publicKey(): Promise<string>;

  /** ECDSA P-256 over SHA-256 of `message`, DER as base64. */
  sign(message: string): Promise<string>;

  /**
   * Whether this device has a Secure Enclave at all.
   *
   * A simulator does not. Reported rather than hidden, because a capture
   * signed by a software key is a weaker claim than one signed by the enclave
   * and the server should eventually be able to tell — see the comment in
   * `KeysSigning.swift` about what this costs.
   */
  hasSecureEnclave(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('KeysSigning');
