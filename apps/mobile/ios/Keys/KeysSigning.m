#import <React/RCTBridgeModule.h>

/*
  The bridge declaration for `KeysSigning.swift`.

  Swift alone cannot export a module to React Native — the macros are
  Objective-C — so the class is declared here and implemented there.

  **The JS name is the selector up to its first colon.** Writing
  `publicKeyWithResolver:rejecter:` exports a method called
  `publicKeyWithResolver`, and a spec that calls `publicKey()` gets
  `undefined is not a function` at the call site with nothing pointing at the
  naming. The first part of each selector below is exactly the name the
  TurboModule spec declares.
*/
@interface RCT_EXTERN_MODULE (KeysSigning, NSObject)

RCT_EXTERN_METHOD(publicKey
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(sign
                  : (NSString *)message resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasSecureEnclave
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
