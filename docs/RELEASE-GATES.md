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
| R1 | Right-of-reply works end to end — the texted capability is delivered, not just generated | An SMS provider | Phase 3 |
| R2 | Review console throughput measured against real reports | A reviewer doing the job | Phase 6, Lagos launch |
| R3 | Legal review of the report policy by a Nigerian lawyer | An outside party. **Blocks public launch outright** | Before any public launch |
| R4 | An Android build somebody has watched succeed | A JDK on a build machine | Phase 2 |
| R6 | Agents can complete an ID check. Until then nobody can climb past `unverified`, and the whole ladder is theoretical | A KYC vendor, then a liveness TurboModule | Before any public launch |
| R8 | The agent's session token is in the Keychain / Android Keystore, not `AsyncStorage`. **No agent account reaches a real phone until this moves** | A secure-storage native module | Phase 4 |
| R9 | Universal links open the app. Needs `KEYS_APPLE_TEAM_ID` set, the Associated Domains capability on a real provisioning profile, and somebody watching an SMS link open the app rather than Safari | An Apple developer team | Phase 6 |
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
