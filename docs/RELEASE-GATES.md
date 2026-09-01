# Open release gates

Everything here must be true before v1.0 ships. None of it blocks the next
phase — see
[ADR 0007](adr/0007-a-gate-blocks-the-next-phase-or-it-blocks-the-release.md)
for why those are different questions.

**This list is the commitment.** "We will do it before launch" is a sentiment;
this is a ledger. If it grows past what one screen holds, the product is being
built past the point anybody can honestly ship it.

| # | Gate | Waiting on | Expected to clear in |
|---|---|---|---|
| R1 | Right-of-reply works end to end — **the message now exists and is addressed**; what is left is a provider that sends it, and somebody watching a real phone receive one | An SMS provider | Phase 3 |
| R2 | Review console throughput measured against real reports | A reviewer doing the job | Phase 6, Lagos launch |
| R3 | Legal review of the report policy by a Nigerian lawyer | An outside party. **Blocks public launch outright** | Before any public launch |
| R4 | An Android build somebody has watched succeed | A JDK on a build machine | Phase 2 |
| R6 | Agents can complete an ID check. Until then nobody can climb past `unverified`, and the whole ladder is theoretical | A KYC vendor, then a liveness TurboModule | Before any public launch |
| R8 | The agent's session token is in the Keychain / Android Keystore, not `AsyncStorage`. **No agent account reaches a real phone until this moves** | A secure-storage native module | Phase 4 |
| R11 | A photograph taken on a real phone, at a real property, accepted as a capture. A simulator has no camera, so every path *except* taking the photograph has been exercised — the refusal, the permission prompt, the signing, the hash, the upload | A phone and somebody standing at a property | Phase 6 |
| R10 | The server can tell an enclave-signed capture from a software-signed one. A simulator has no enclave and falls back to a Keychain key; the server cannot see the difference, because a P-256 public key does not say where its private half lives. Needs attestation | App Attest, or a key attestation flow | Phase 6 |
| R9 | Universal links open the app. Needs `KEYS_APPLE_TEAM_ID` set, the Associated Domains capability on a real provisioning profile, and somebody watching an SMS link open the app rather than Safari | An Apple developer team | Phase 6 |
| R12 | The outbox can address a real phone. `OutboundText` holds `toPhoneHash` and nothing else, so *no message in this product can currently be delivered to anybody* — R7 cannot be closed by connecting a provider alone. Found while building contact exchange, which solved the same problem differently: the number is supplied when somebody offers it and stored on the conversation, so the account hash is never un-hashed | Decide whether the outbox stores a number beside the hash, or whether landlord codes move to a link-with-token the way contact exchange moved to per-conversation numbers | Phase 5 |
| R13 | Somebody can actually buy a paid slot. `featured_until` exists and the band renders; there is no payment provider, no amount, and no route that sells one — a placement is set by hand in the database. Deliberately no `paid_kobo` column sitting at zero on every row, which would read like a feature that works | A payment provider, and a decision about whether a slot is sold by time or by query | Phase 6 |
| R7 | An SMS a real phone received. R1 covers right-of-reply; landlord co-verification rides the same provider, and without it no landlord can confirm anybody | The same SMS provider | Phase 3 |

## Cleared

| # | Gate | How |
|---|---|---|
| R5 | Dark mode reachable in the app | A settings screen mounts `ThemeToggle`, and the dark half of the generated palette has now been on a screen. Open for two phases because `wired-check` exempts components — the exemption is right, and this was its price. |

## How a gate leaves this list

By being demonstrated, and by the demonstration being written down where
somebody who was not there can check it. A gate is not cleared because the work
it named was done; it is cleared because somebody watched the thing it was
worried about not happen.
