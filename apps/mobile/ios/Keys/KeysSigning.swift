import CryptoKit
import Foundation
import LocalAuthentication
import React

/**
 A P-256 key this phone generates and cannot export, and the signing that uses it.

 ## Why the private key never appears in this file

 Everything Keys claims about a photograph rests on one property: the signature
 could only have been made by this device. A private key held in software — even
 in the Keychain — can be recovered from a device backup or a jailbroken phone,
 and a stolen signing key is somebody able to sign captures for a property they
 have never stood in. So the key is generated *inside* the Secure Enclave, the
 signing happens inside it too, and what crosses this boundary is a signature.

 That constraint chose the curve. The enclave holds P-256 and nothing else —
 there is no `SecureEnclave.Curve25519` — so the server verifies ECDSA P-256
 over SHA-256 rather than the Ed25519 it was originally written for.

 ## The simulator, and being honest about it

 A simulator has no enclave. `SecureEnclave.isAvailable` is false and the
 fallback below generates an ordinary software key so the flow can be developed
 and tested at all.

 **That fallback is a real weakening and it is not currently visible to the
 server.** A capture signed by a software key verifies exactly like one signed
 by the enclave; the server cannot tell them apart, because a P-256 public key
 does not say where its private half lives. Closing that needs attestation —
 `SecKeyCreateRandomKey` with an attestation key, or App Attest — which is a
 phase 6 problem. Until then `hasSecureEnclave()` reports it and the roadmap
 carries it, rather than the fallback sitting here unmentioned.
 */
@objc(KeysSigning)
final class KeysSigning: NSObject {
  /// The Keychain label under which the wrapped enclave key is stored.
  private static let tag = "ng.keys.app.capture-key"

  @objc static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Storage

  /**
   The enclave key's *representation*, not the key.

   A Secure Enclave key is handed back as an opaque blob that only that
   enclave can rehydrate. Storing it is not storing a private key: on another
   device it is bytes that do nothing.
   */
  private static func stored() -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: tag,
      kSecReturnData as String: true,
    ]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess else { return nil }
    return item as? Data
  }

  private static func store(_ data: Data) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: tag,
    ]
    SecItemDelete(query as CFDictionary)

    var add = query
    add[kSecValueData as String] = data
    /*
      `WhenUnlockedThisDeviceOnly`, and both halves matter.

      `ThisDeviceOnly` keeps it out of a backup, so restoring a phone does not
      restore the ability to sign as it. `WhenUnlocked` because captures are
      signed while somebody is holding the phone, and a looser class would let
      a locked device sign.
    */
    add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    SecItemAdd(add as CFDictionary, nil)
  }

  // MARK: - The key

  private static func enclaveKey() throws -> SecureEnclave.P256.Signing.PrivateKey {
    if let data = stored() {
      return try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: data)
    }
    let key = try SecureEnclave.P256.Signing.PrivateKey()
    store(key.dataRepresentation)
    return key
  }

  private static func softwareKey() throws -> P256.Signing.PrivateKey {
    if let data = stored() {
      return try P256.Signing.PrivateKey(rawRepresentation: data)
    }
    let key = P256.Signing.PrivateKey()
    store(key.rawRepresentation)
    return key
  }

  // MARK: - The bridge

  @objc(publicKey:rejecter:)
  func publicKey(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      /*
        `derRepresentation`, which is SPKI DER — the same encoding Node's
        `createPublicKey({ format: 'der', type: 'spki' })` reads on the server.
        `x963Representation` is the other obvious choice and the server cannot
        parse it; picking the wrong one here fails every capture with a
        signature error that says nothing about encoding.
      */
      let der: Data = SecureEnclave.isAvailable
        ? try KeysSigning.enclaveKey().publicKey.derRepresentation
        : try KeysSigning.softwareKey().publicKey.derRepresentation
      resolve(der.base64EncodedString())
    } catch {
      reject("keys_signing_key", "Could not read or create this device's key.", error)
    }
  }

  @objc(sign:resolver:rejecter:)
  func sign(
    _ message: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = message.data(using: .utf8) else {
      reject("keys_signing_message", "That message is not UTF-8.", nil)
      return
    }
    do {
      /*
        CryptoKit hashes with SHA-256 for a P-256 key, and `derRepresentation`
        gives the DER-encoded (r, s) that Node's `verify('sha256', …)` expects
        by default. The alternative, `rawRepresentation`, is the fixed 64-byte
        form and needs `dsaEncoding: 'ieee-p1363'` on the other side — a pair
        of defaults that have to agree and fail silently when they do not.
      */
      let signature: Data = SecureEnclave.isAvailable
        ? try KeysSigning.enclaveKey().signature(for: data).derRepresentation
        : try KeysSigning.softwareKey().signature(for: data).derRepresentation
      resolve(signature.base64EncodedString())
    } catch {
      reject("keys_signing_sign", "This device could not sign that.", error)
    }
  }

  @objc(hasSecureEnclave:rejecter:)
  func hasSecureEnclave(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(SecureEnclave.isAvailable)
  }
}
