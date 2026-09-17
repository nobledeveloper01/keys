package ng.keys.app.secrets

import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Session tokens, in EncryptedSharedPreferences under a Keystore master key
 * rather than in a file (ADR-0018, R16).
 *
 * The same three methods as the Keychain on iOS and the same rule — *errors
 * are values*: a store that refuses resolves `false`, and `state/secrets.ts`
 * turns that into a phone that does not keep a token and says so. Nothing
 * here falls back to plain preferences, because a fallback would make R16
 * look closed while the exact thing it names carried on.
 *
 * The master key lives in the Android Keystore; values are AES-256-GCM and
 * keys AES-256-SIV. A token restored onto another handset from a backup does
 * not decrypt, which is the Android half of `ThisDeviceOnly`.
 */
class KeysSecretsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "KeysSecrets"

  private val prefs by lazy {
    val master = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
    EncryptedSharedPreferences.create(
      context,
      "ng.keys.app.session",
      master,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
  }

  @ReactMethod
  fun setSecret(key: String, value: String, promise: Promise) {
    promise.resolve(runCatching { prefs.edit().putString(key, value).commit() }.getOrDefault(false))
  }

  /** The value, or null. A missing item is a signed-out phone, not an error. */
  @ReactMethod
  fun getSecret(key: String, promise: Promise) {
    promise.resolve(runCatching { prefs.getString(key, null) }.getOrNull())
  }

  /** Forget it. Removing something absent is a success. */
  @ReactMethod
  fun removeSecret(key: String, promise: Promise) {
    promise.resolve(runCatching { prefs.edit().remove(key).commit() }.getOrDefault(false))
  }
}
