#import <React/RCTBridgeModule.h>

/*
  The bridge declaration for `KeysSecrets.swift`.

  **The JS name is the selector up to its first colon.** `setSecret:value:...`
  exports a method called `setSecret`, which is what the TurboModule spec
  declares. Naming the first part `setSecretWithKey` would export
  `setSecretWithKey` and a spec calling `setSecret()` would fail at the call
  site with `undefined is not a function` and nothing pointing at the naming —
  which cost half an hour on `KeysSigning`.
*/
@interface RCT_EXTERN_MODULE (KeysSecrets, NSObject)

RCT_EXTERN_METHOD(setSecret
                  : (NSString *)key value
                  : (NSString *)value resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSecret
                  : (NSString *)key resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeSecret
                  : (NSString *)key resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
