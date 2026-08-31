#import <React/RCTBridgeModule.h>

/*
  The bridge declaration for `KeysCapture.swift`.

  One method. The JS name is the selector up to its first colon — `capture` —
  which is the name the TurboModule spec declares.
*/
@interface RCT_EXTERN_MODULE (KeysCapture, NSObject)

RCT_EXTERN_METHOD(capture
                  : (NSString *)kind resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(whereAmI
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
