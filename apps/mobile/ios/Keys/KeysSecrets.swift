import Foundation
import React
import Security

/**
 Session tokens, in the Keychain rather than in a file.

 ## What was wrong with where they were

 `AsyncStorage` on iOS is a plain file inside the app container. It is fine for
 a language choice and it is not fine for a bearer token that lets somebody
 publish listings under an agent's name: the container is readable on a
 jailbroken phone, it goes into an unencrypted iTunes backup, and anything with
 file access has it. The gap was written down as a release gate from the day it
 was introduced — R8 — with the note that no agent account should reach a real
 phone until this moved.

 ## What the Keychain gives, and what it does not

 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` is the accessibility chosen
 here, and both halves of that name are deliberate.

 **`AfterFirstUnlock`** rather than `WhenUnlocked`: an agent's phone that reboots
 in their pocket should not sign them out, and nothing in this app needs to read
 a token while the device is locked *before* the first unlock. `WhenUnlocked`
 would be stricter and would break nothing today, but it would break the moment
 anything runs in the background — and a stricter setting that gets loosened
 later under pressure is worse than the honest one now.

 **`ThisDeviceOnly`** because a session token has no business travelling in an
 iCloud backup to a phone the agent may no longer own. A token restored onto a
 replacement handset is a token that outlived the device it was issued to.

 What this does *not* give is protection from an attacker who has the unlocked
 phone in their hand. Nothing here asks for Face ID. That is a deliberate
 omission rather than an oversight: a biometric prompt on every request would
 make an agent standing in a flat with one bar of signal wait for a face scan to
 upload a photograph, and the failure that actually happens to people in this
 market is a lost or stolen phone, which `ThisDeviceOnly` plus a remote
 revocation answers.

 ## Errors are values

 Every method resolves. A Keychain that refuses is a phone that cannot keep a
 session, which is a thing the app has to *tell somebody about* — not a promise
 rejection that becomes a red screen while they are trying to sign in.
 */
@objc(KeysSecrets)
final class KeysSecrets: NSObject {
  /// Everything this app stores lives under one service, so `remove` can be sure what it is deleting.
  private static let service = "ng.keys.app.session"

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  private static func query(_ key: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
  }

  /**
   Store a value, replacing whatever was there.

   Delete-then-add rather than `SecItemUpdate`. An update on an item that does
   not exist fails with `errSecItemNotFound`, so the update path needs the add
   path anyway; doing it in this order means one code path instead of two and no
   branch that only runs on a phone that has signed in before.
   */
  @objc(setSecret:value:resolver:rejecter:)
  func setSecret(
    _ key: String,
    value: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = value.data(using: .utf8) else {
      resolve(false)
      return
    }

    SecItemDelete(Self.query(key) as CFDictionary)

    var attributes = Self.query(key)
    attributes[kSecValueData as String] = data
    attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

    let status = SecItemAdd(attributes as CFDictionary, nil)
    resolve(status == errSecSuccess)
  }

  /// The value, or null. A missing item is not an error — it is a signed-out phone.
  @objc(getSecret:resolver:rejecter:)
  func getSecret(
    _ key: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    var query = Self.query(key)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    guard status == errSecSuccess,
          let data = item as? Data,
          let value = String(data: data, encoding: .utf8)
    else {
      resolve(nil)
      return
    }
    resolve(value)
  }

  /// Forget it. Deleting something that is not there is a success, not a failure.
  @objc(removeSecret:resolver:rejecter:)
  func removeSecret(
    _ key: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    let status = SecItemDelete(Self.query(key) as CFDictionary)
    resolve(status == errSecSuccess || status == errSecItemNotFound)
  }
}
