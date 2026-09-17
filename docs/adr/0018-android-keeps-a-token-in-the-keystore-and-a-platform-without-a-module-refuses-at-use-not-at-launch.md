# 18. Android keeps a token in the Keystore, and a platform without a module refuses at use, not at launch

Date: 2026-09-17

## Status

Accepted

## Context

R16: Android cannot open an account, because `KeysSecrets` has only an iOS
implementation and `state/secrets.ts` refuses, correctly, to keep a bearer
token in a file. The same shape was built for Sentinel on 2026-09-16 —
`EncryptedSharedPreferences` under a Keystore master key — and compiles in
CI there.

There is a second thing in the way that R16 does not name. The camera and
the signing key are reached with `getEnforcing`, which throws at *import*
on a platform without the module — so the Android app does not get as far
as refusing to sign in; it does not start. R4 has never watched an Android
build succeed, and this is one reason it would not have.

## Decision

**`KeysSecrets` on Android is `EncryptedSharedPreferences` with a master
key in the Android Keystore**, the same three methods as the Keychain, the
same *errors are values* rule: a store that refuses resolves `false`, and
the app says a phone that cannot keep a token does not keep one. Nothing
falls back to a file.

**A module absent from a platform refuses at use, with a sentence, not at
launch.** `KeysCapture` and `KeysSigning` resolve to a stand-in whose every
method rejects with *not on this platform* when the registry has no module;
the callers already treat a rejection from the camera or the key as a
refusal to show. An Android phone therefore opens, signs in, searches,
reads a listing, and is told plainly that it cannot capture or sign — which
is true, and is the Android work R14 and the Keystore signing key are.

## Consequences

R16's code exists and compiles where an Android build runs. R4 and R16
stay open until somebody watches the build and the Keystore on a handset;
an unwatched build is not a gate cleared. The refusal sentences for capture
and signing on Android are in the phrase table, in four languages, because
an Android agent will read them.
