# Release gates

Everything under **Blocks v1.0** must be true before v1.0 ships. None of it
blocks the next phase — see
[ADR 0007](adr/0007-a-gate-blocks-the-next-phase-or-it-blocks-the-release.md)
for why those are different questions.

**This list is the commitment.** "We will do it before launch" is a sentiment;
this is a ledger. If it grows past what one screen holds, the product is being
built past the point anybody can honestly ship it.

## That warning fired

It reached fifteen open and one closed, with six added in two days — not by
discovering old debt but by the work itself: build the shape of a feature, log a
gate for the half that needs a vendor, move on. Nine of the fifteen could not be
closed by writing any amount of code.

[`V1-SCOPE.md`](V1-SCOPE.md) is the answer: **where v1.0 has no vendor, Keys does
the work by hand, and the product says so.** A reviewer telephones the landlord
and looks at the ID document. Published reports and paid placement leave v1.0
entirely.

Seven gates left the v1.0 path that way, and **not one was closed by pretending**
— each is either done by hand or gates a feature that is no longer in scope.

## Blocks v1.0

| # | Gate | Waiting on | Expected to clear in |
|---|---|---|---|
| R2 | Review console throughput measured against real reports | A reviewer doing the job | Phase 6, Lagos launch |
| R4 | An Android build somebody has watched succeed | A JDK on a build machine | Phase 2 |
| R11 | A photograph taken on a real phone, at a real property, accepted as a capture. A simulator has no camera, so every path *except* taking the photograph has been exercised — the refusal, the permission prompt, the signing, the hash, the upload | A phone and somebody standing at a property | Phase 6 |
| R14 | The capture module emits a real photograph alongside the greyscale grid. The server accepts media and binds *both* hashes inside one signature (`keys.capture.v3`); the phone has nothing to put in the media field, because `KeysCapture` produces only the grid. Until the Swift side emits a JPEG and an MP4, every listing's "photograph" is still a 40×32 grid nobody can look at | AVFoundation writing the still and the clip beside the grid it already derives, and `MAX_CAPTURE_BYTES` checked against the real file | Phase 6 |

## Blocks v1.0 — Android

| # | Gate | Waiting on | Expected to clear in |
|---|---|---|---|
| R16 | The same, on Android: session tokens in the Keystore rather than unencrypted shared preferences. **The module exists since 2026-09-17** — `EncryptedSharedPreferences` under a Keystore master key, the same three methods as the Keychain, compiled where an Android build runs — and the camera and the signing key now refuse at use rather than failing at launch ([ADR-0018](adr/0018-android-keeps-a-token-in-the-keystore-and-a-platform-without-a-module-refuses-at-use-not-at-launch.md)). What is left is R4: somebody watching it on a handset | R4's build machine and a handset | Phase 6 |

## Blocks v1.1

Real, and not on the path to launch. Each one gates a feature
[`V1-SCOPE.md`](V1-SCOPE.md) takes out of v1.0, or a vendor the manual path
replaces.

| # | Gate | Waiting on | Expected to clear in |
|---|---|---|---|
| R1 | Right-of-reply works end to end — **the message now exists and is addressed**; what is left is a provider that sends it, and somebody watching a real phone receive one | An SMS provider | Phase 3 |
| R3 | Legal review of the report policy by a Nigerian lawyer | An outside party. **Blocks public launch outright** | Before any public launch |
| R7 | An SMS a real phone received. R1 covers right-of-reply; landlord co-verification rides the same provider, and without it no landlord can confirm anybody | The same SMS provider | Phase 3 |
| R13 | Somebody can actually buy a paid slot. `featured_until` exists and the band renders; there is no payment provider, no amount, and no route that sells one — a placement is set by hand in the database. Deliberately no `paid_kobo` column sitting at zero on every row, which would read like a feature that works | A payment provider, and a decision about whether a slot is sold by time or by query | Phase 6 |
| R15 | Media has somewhere durable to live. `MediaStore` has a filesystem implementation and an in-memory one that says `durable: false`; a deployment with no `KEYS_MEDIA_DIR` gets the second, deliberately, rather than a temp directory that looks like it worked until the machine is replaced | An object-storage bucket and the S3 implementation of the two methods `MediaStore` declares | Phase 6 |
| R17 | The shipped tenancy agreement template read by a Nigerian tenancy lawyer. Until then the agreement screen says, in every language, that the template has not been reviewed and that Keys gives no legal advice ([ADR-0012](adr/0012-a-ticket-and-a-tenancy-are-append-only-and-the-agreement-is-a-reviewed-template.md)) | An outside party, an hour | Phase 7 |
| R18 | A 360° tour captured on a real camera and shown in the app. No model, no route and no screen exists for it; the capture path is signed photographs and walkthrough video, and a panorama would be a third kind that needs a device to design against ([ADR-0016](adr/0016-a-city-is-data-and-a-listing-belongs-to-one-by-its-coordinates.md)) | A 360° camera, or a phone with a panorama mode worth trusting | Phase 8 |

| R9 | Universal links open the app. Needs `KEYS_APPLE_TEAM_ID` set, the Associated Domains capability on a real provisioning profile, and somebody watching an SMS link open the app rather than Safari | An Apple developer team | Phase 6 |

## Cleared

| # | Gate | How |
|---|---|---|
| R12 | The outbox can address a real phone | **Done, 2026-09-17.** [ADR-0017](adr/0017-the-outbox-holds-a-number-for-one-message-and-forgets-it-when-sent.md): the outbox is the one place a number is written in plain, for one message, and it is deleted when the message is sent or given up on — every caller already held the number at that instant, so nothing is un-hashed. The withdrawal route checks the typed number against the granting hash and texts only a match; an agent, whose number is only a hash, reads their right of reply in their account. A test drains the queue and searches the record for the number afterwards |
| R5 | Dark mode reachable in the app | A settings screen mounts `ThemeToggle`, and the dark half of the generated palette has now been on a screen. Open for two phases because `wired-check` exempts components — the exemption is right, and this was its price. |
| R8 | The agent's and tenant's session tokens are in the iOS Keychain | **Done, and watched.** `KeysSecrets`, a Keychain module, with `AfterFirstUnlockThisDeviceOnly` — a rebooted phone does not sign an agent out, and a token does not travel to a replacement handset in a backup. Verified on the simulator: signed up, killed the app, relaunched still signed in, and nothing resembling a token anywhere in the app container. Any existing token is lifted out of `AsyncStorage` on first launch and the old copy deleted. **There is deliberately no fallback** — a phone with nowhere safe refuses to open an account and says so in Settings, because a fallback would make this look closed while the exact thing it names carried on |
| R6 | Agents can complete an ID check | **Done by hand.** A reviewer looks at the document and records what they saw under their own name, instead of Smile ID's API answering. Not a relaxation: the evidence is still evidence a claimant cannot write, and the attestation says which kind it was. See [`V1-SCOPE.md`](V1-SCOPE.md) |

## How a gate leaves this list

By being demonstrated, and by the demonstration being written down where
somebody who was not there can check it. A gate is not cleared because the work
it named was done; it is cleared because somebody watched the thing it was
worried about not happen.
